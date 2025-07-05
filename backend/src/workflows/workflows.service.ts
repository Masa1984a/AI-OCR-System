import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  ApprovalInstance,
  ApprovalStep,
  StateAction,
  Document,
  User,
} from '../entities';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { TransitionActionDto } from './dto/transition-action.dto';
import { StartApprovalDto } from './dto/start-approval.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowState)
    private workflowStateRepository: Repository<WorkflowState>,
    @InjectRepository(WorkflowTransition)
    private workflowTransitionRepository: Repository<WorkflowTransition>,
    @InjectRepository(ApprovalInstance)
    private approvalInstanceRepository: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalStep)
    private approvalStepRepository: Repository<ApprovalStep>,
    @InjectRepository(StateAction)
    private stateActionRepository: Repository<StateAction>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  // ワークフロー定義のCRUD操作
  async createWorkflowDefinition(
    tenantId: string,
    userId: string,
    createDto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    // ワークフロー定義を作成
    const workflow = this.workflowDefinitionRepository.create({
      ...createDto,
      tenantId,
      createdById: userId,
      version: createDto.version || 1,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      graphJson: createDto.graphJson || {},
    });

    const savedWorkflow = await this.workflowDefinitionRepository.save(workflow);

    // デフォルトの状態を作成
    const states = [
      {
        workflowId: savedWorkflow.id,
        stateKey: 'start',
        label: '開始',
        isInitial: true,
        isFinal: false,
        slaHours: null,
      },
      {
        workflowId: savedWorkflow.id,
        stateKey: 'pending',
        label: '承認待ち',
        isInitial: false,
        isFinal: false,
        slaHours: 48,
      },
      {
        workflowId: savedWorkflow.id,
        stateKey: 'approved',
        label: '承認済み',
        isInitial: false,
        isFinal: true,
        slaHours: null,
      },
    ];

    const savedStates = await this.workflowStateRepository.save(states);

    // 状態間の遷移を作成
    const startState = savedStates.find(s => s.stateKey === 'start');
    const pendingState = savedStates.find(s => s.stateKey === 'pending');
    const approvedState = savedStates.find(s => s.stateKey === 'approved');

    const transitions = [
      {
        workflowId: savedWorkflow.id,
        fromStateId: startState.id,
        toStateId: pendingState.id,
        actionKey: 'start_approval',
        actionLabel: '承認開始',
        requiresComment: false,
        autoAdvance: true,
      },
      {
        workflowId: savedWorkflow.id,
        fromStateId: pendingState.id,
        toStateId: approvedState.id,
        actionKey: 'approve',
        actionLabel: '承認',
        requiresComment: false,
        autoAdvance: false,
      },
    ];

    await this.workflowTransitionRepository.save(transitions);

    // 状態アクションを作成
    const stateActions = [
      {
        stateId: pendingState.id,
        actionKey: 'approve',
        actionLabel: '承認',
        nextStateId: approvedState.id,
        requiresRole: 'editor',
        displayOrder: 1,
        isDefault: true,
      },
    ];

    await this.stateActionRepository.save(stateActions);

    // 関連データを含むワークフローを再取得
    return await this.findWorkflowDefinition(tenantId, savedWorkflow.id);
  }

  async findAllWorkflowDefinitions(tenantId: string): Promise<WorkflowDefinition[]> {
    const workflows = await this.workflowDefinitionRepository.find({
      where: { tenantId },
      relations: ['states', 'transitions', 'states.actions'],
      order: { name: 'ASC', version: 'DESC' },
    });

    // Generate graphJson for each workflow
    return workflows.map(workflow => this.enrichWorkflowWithGraphJson(workflow));
  }

  async findWorkflowDefinition(tenantId: string, id: string): Promise<WorkflowDefinition> {
    const workflow = await this.workflowDefinitionRepository.findOne({
      where: { id, tenantId },
      relations: ['states', 'transitions', 'states.actions'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow definition with ID ${id} not found`);
    }

    return this.enrichWorkflowWithGraphJson(workflow);
  }

  private enrichWorkflowWithGraphJson(workflow: WorkflowDefinition): WorkflowDefinition {
    // Generate nodes from states
    const nodes = workflow.states?.map((state, index) => ({
      id: state.id,
      type: state.isInitial ? 'start' : state.isFinal ? 'end' : 'state',
      position: { x: 250, y: 100 + index * 150 }, // Default positions
      data: {
        stateKey: state.stateKey,
        label: state.label,
        isInitial: state.isInitial || false,
        isFinal: state.isFinal || false,
        slaHours: state.slaHours || undefined,
        description: state.notificationTemplate || '', // Use notificationTemplate as description
      },
    })) || [];

    // Generate edges from transitions
    const edges = workflow.transitions?.map(transition => ({
      id: transition.id,
      source: transition.fromStateId,
      target: transition.toStateId,
      data: {
        actionKey: transition.actionKey,
        actionLabel: transition.actionLabel,
        requiresComment: transition.requiresComment || false,
        autoAdvance: transition.autoAdvance || false,
        conditionExpr: transition.conditionExpr || '',
      },
    })) || [];

    // If graphJson already exists and has positions, preserve them
    if (workflow.graphJson?.nodes) {
      const existingPositions = new Map<string, { x: number; y: number }>();
      if (Array.isArray(workflow.graphJson.nodes)) {
        workflow.graphJson.nodes.forEach((node: any) => {
          if (node.id && node.position) {
            existingPositions.set(node.id, node.position);
          }
        });
      }
      nodes.forEach(node => {
        const existingPos = existingPositions.get(node.id);
        if (existingPos) {
          node.position = existingPos;
        }
      });
    }

    // Update the graphJson property while keeping the original workflow instance
    workflow.graphJson = {
      nodes,
      edges,
    };

    return workflow;
  }

  async updateWorkflowDefinition(
    tenantId: string,
    id: string,
    updateDto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    const workflow = await this.findWorkflowDefinition(tenantId, id);
    
    Object.assign(workflow, updateDto);
    return await this.workflowDefinitionRepository.save(workflow);
  }

  async deleteWorkflowDefinition(tenantId: string, id: string): Promise<void> {
    const workflow = await this.findWorkflowDefinition(tenantId, id);
    
    // アクティブなインスタンスがある場合は削除を拒否
    const activeInstances = await this.approvalInstanceRepository.count({
      where: { workflowId: id, status: 'active' },
    });

    if (activeInstances > 0) {
      throw new BadRequestException('Cannot delete workflow with active approval instances');
    }

    await this.workflowDefinitionRepository.remove(workflow);
  }

  // 承認フローの開始
  async startApproval(
    tenantId: string,
    userId: string,
    startDto: StartApprovalDto,
  ): Promise<ApprovalInstance> {
    const { documentId, workflowId, metadata } = startDto;
    
    console.log('Starting approval process:', { documentId, workflowId, tenantId, userId });

    // ドキュメントの存在確認
    const document = await this.documentRepository.findOne({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // ワークフローの存在確認
    const workflow = await this.findWorkflowDefinition(tenantId, workflowId);
    console.log('Found workflow:', { workflowId: workflow.id, states: workflow.states?.length });
    
    const initialState = workflow.getInitialState();
    console.log('Initial state:', initialState);

    if (!initialState) {
      throw new BadRequestException('Workflow has no initial state');
    }

    // 既存のアクティブな承認インスタンスをチェック
    const existingInstance = await this.approvalInstanceRepository.findOne({
      where: { documentId, status: 'active' },
    });

    if (existingInstance) {
      throw new BadRequestException('Document already has an active approval instance');
    }

    // 承認インスタンスを作成
    const instance = this.approvalInstanceRepository.create({
      tenantId,
      documentId,
      workflowId,
      currentStateId: initialState.id,
      startedById: userId,
      status: 'active',
      metadata: metadata || {},
      startedAt: new Date(),
    });

    const savedInstance = await this.approvalInstanceRepository.save(instance);

    // リレーションを含めて再取得
    const fullInstance = await this.approvalInstanceRepository.findOne({
      where: { id: savedInstance.id },
      relations: ['workflow', 'currentState', 'steps'],
    });

    if (!fullInstance) {
      throw new Error('Failed to retrieve saved approval instance');
    }

    // 自動遷移の処理
    await this.processAutoTransitions(fullInstance);

    // 現在の状態が最終状態でなければ、最初の承認ステップを作成
    const currentState = await this.workflowStateRepository.findOne({
      where: { id: fullInstance.currentStateId },
    });
    
    if (currentState && !currentState.isFinal) {
      await this.createNextApprovalStep(fullInstance, currentState);
    }

    // 最新の状態を含めて再取得して返す
    const finalInstance = await this.approvalInstanceRepository.findOne({
      where: { id: savedInstance.id },
      relations: ['workflow', 'currentState', 'steps', 'steps.state'],
    });

    return finalInstance || savedInstance;
  }

  // 状態遷移の実行
  async executeTransition(
    tenantId: string,
    userId: string,
    transitionDto: TransitionActionDto,
  ): Promise<ApprovalInstance> {
    const { documentId, actionKey, comment, metadata, delegatedToId } = transitionDto;

    // アクティブな承認インスタンスを取得
    const instance = await this.approvalInstanceRepository.findOne({
      where: { documentId, tenantId, status: 'active' },
      relations: ['currentState', 'currentState.actions', 'workflow'],
    });

    if (!instance) {
      throw new NotFoundException('No active approval instance found for this document');
    }

    // 現在の状態でアクションが実行可能かチェック
    const action = instance.currentState?.getActionByKey(actionKey);
    if (!action) {
      throw new BadRequestException(`Action ${actionKey} is not available in current state`);
    }

    // ユーザーが現在のステップを実行可能かチェック
    const currentStep = await this.approvalStepRepository.findOne({
      where: { instanceId: instance.id, status: 'pending' },
      relations: ['assignedTo', 'delegatedTo'],
    });

    if (currentStep && !currentStep.canBeCompletedBy(userId)) {
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    // ステップを完了
    if (currentStep) {
      currentStep.status = actionKey === 'approve' ? 'approved' : actionKey === 'reject' ? 'rejected' : 'delegated';
      currentStep.actionTaken = actionKey;
      currentStep.comment = comment;
      currentStep.completedAt = new Date();
      
      if (delegatedToId && actionKey === 'delegate') {
        currentStep.delegatedToId = delegatedToId;
      }

      await this.approvalStepRepository.save(currentStep);
    }

    // 次の状態に遷移
    if (action.nextStateId) {
      instance.currentStateId = action.nextStateId;
      instance.metadata = { ...instance.metadata, ...metadata };

      // 最終状態かチェック
      const nextState = await this.workflowStateRepository.findOne({
        where: { id: action.nextStateId },
      });

      if (nextState?.isFinal) {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }

      await this.approvalInstanceRepository.save(instance);

      // 次のステップを作成（最終状態でない場合）
      if (!nextState?.isFinal) {
        await this.createNextApprovalStep(instance, nextState);
      }
    }

    return instance;
  }

  // 承認インスタンスの取得
  async getApprovalInstance(tenantId: string, documentId: string): Promise<ApprovalInstance | null> {
    return await this.approvalInstanceRepository.findOne({
      where: { documentId, tenantId },
      relations: ['workflow', 'currentState', 'steps', 'steps.assignedTo', 'steps.state'],
      order: { createdAt: 'DESC' },
    });
  }

  // 承認履歴の取得
  async getApprovalHistory(tenantId: string, documentId: string): Promise<ApprovalStep[]> {
    const instance = await this.getApprovalInstance(tenantId, documentId);
    if (!instance) {
      return [];
    }

    return await this.approvalStepRepository.find({
      where: { instanceId: instance.id },
      relations: ['state', 'assignedTo', 'delegatedTo'],
      order: { createdAt: 'ASC' },
    });
  }

  // ユーザーの承認待ちタスク取得
  async getPendingApprovals(tenantId: string, userId: string): Promise<ApprovalStep[]> {
    return await this.approvalStepRepository.find({
      where: [
        { assignedToId: userId, status: 'pending' },
        { delegatedToId: userId, status: 'pending' },
      ],
      relations: ['instance', 'instance.document', 'state'],
    });
  }

  // 自動遷移の処理
  private async processAutoTransitions(instance: ApprovalInstance): Promise<void> {
    console.log('Processing auto transitions for state:', instance.currentStateId);
    
    const autoTransitions = await this.workflowTransitionRepository.find({
      where: { 
        workflowId: instance.workflowId,
        fromStateId: instance.currentStateId,
        autoAdvance: true,
      },
      relations: ['toState'],
    });

    console.log('Found auto transitions:', autoTransitions.length);

    for (const transition of autoTransitions) {
      if (transition.evaluateCondition(instance.metadata)) {
        console.log('Auto-advancing to state:', transition.toStateId);
        instance.currentStateId = transition.toStateId;
        await this.approvalInstanceRepository.save(instance);

        if (transition.toState && !transition.toState.isFinal) {
          await this.createNextApprovalStep(instance, transition.toState);
        }
        break;
      }
    }
  }

  // 次の承認ステップを作成
  private async createNextApprovalStep(
    instance: ApprovalInstance,
    state: WorkflowState,
  ): Promise<ApprovalStep> {
    // 承認者の割り当てロジック（簡易実装）
    let assignedToId = instance.startedById; // デフォルトは申請者
    
    // 状態に応じて適切な承認者を選択
    try {
      if (state.stateKey === 'review' || state.stateKey === 'approval') {
        // レビュー・承認段階では係長・部長・管理者から選択
        const approver = await this.findApprover(instance.tenantId, state.stateKey);
        if (approver) {
          assignedToId = approver.id;
        }
      }
    } catch (error) {
      console.warn('Failed to find approver, using default:', error);
    }
    
    const step = this.approvalStepRepository.create({
      instanceId: instance.id,
      stateId: state.id,
      assignedToId,
      dueAt: state.hasSLA() ? new Date(Date.now() + state.slaHours * 60 * 60 * 1000) : null,
    });

    return await this.approvalStepRepository.save(step);
  }

  // 承認者を検索する簡易メソッド
  private async findApprover(tenantId: string, stateKey: string) {
    const userRepository = this.documentRepository.manager.getRepository('User');
    
    // 状態に応じて適切なロールの承認者を選択
    let targetRole = 'admin';
    if (stateKey === 'review') {
      targetRole = 'supervisor'; // 係長
    } else if (stateKey === 'approval') {
      targetRole = 'manager'; // 部長
    }
    
    const approver = await userRepository.findOne({
      where: { tenantId, role: targetRole, isActive: true },
    });
    
    return approver;
  }
}