import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { TransitionActionDto } from './dto/transition-action.dto';
import { StartApprovalDto } from './dto/start-approval.dto';
import { WorkflowDefinition, ApprovalInstance, ApprovalStep } from '../entities';
import { UserRole } from '../entities/user.entity';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ワークフロー定義のCRUD操作
  @Post('definitions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ワークフロー定義を作成' })
  @ApiResponse({ status: 201, description: '作成成功', type: WorkflowDefinition })
  async createWorkflowDefinition(
    @Body() createDto: CreateWorkflowDefinitionDto,
    @CurrentUser() user: any,
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.createWorkflowDefinition(
      user.tenantId,
      user.userId,
      createDto,
    );
  }

  @Get('definitions')
  @ApiOperation({ summary: 'ワークフロー定義一覧を取得' })
  @ApiResponse({ status: 200, description: '取得成功', type: [WorkflowDefinition] })
  async getWorkflowDefinitions(@CurrentUser() user: any): Promise<WorkflowDefinition[]> {
    return this.workflowsService.findAllWorkflowDefinitions(user.tenantId);
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'ワークフロー定義詳細を取得' })
  @ApiResponse({ status: 200, description: '取得成功', type: WorkflowDefinition })
  async getWorkflowDefinition(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.findWorkflowDefinition(user.tenantId, id);
  }

  @Put('definitions/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ワークフロー定義を更新' })
  @ApiResponse({ status: 200, description: '更新成功', type: WorkflowDefinition })
  async updateWorkflowDefinition(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDefinitionDto,
    @CurrentUser() user: any,
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.updateWorkflowDefinition(user.tenantId, id, updateDto);
  }

  @Delete('definitions/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'ワークフロー定義を削除' })
  @ApiResponse({ status: 204, description: '削除成功' })
  async deleteWorkflowDefinition(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.workflowsService.deleteWorkflowDefinition(user.tenantId, id);
  }

  // 承認フロー操作
  @Post('start')
  @ApiOperation({ summary: '承認フローを開始' })
  @ApiResponse({ status: 201, description: '開始成功', type: ApprovalInstance })
  async startApproval(
    @Body() startDto: StartApprovalDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalInstance> {
    console.log('Received start approval request:', {
      body: startDto,
      user: { tenantId: user.tenantId, userId: user.userId },
    });
    return this.workflowsService.startApproval(user.tenantId, user.userId, startDto);
  }

  @Post('transition')
  @ApiOperation({ summary: '状態遷移を実行' })
  @ApiResponse({ status: 200, description: '遷移成功', type: ApprovalInstance })
  async executeTransition(
    @Body() transitionDto: TransitionActionDto,
    @CurrentUser() user: any,
  ): Promise<ApprovalInstance> {
    return this.workflowsService.executeTransition(user.tenantId, user.userId, transitionDto);
  }

  @Get('instances/document/:documentId')
  @ApiOperation({ summary: 'ドキュメントの承認インスタンスを取得' })
  @ApiResponse({ status: 200, description: '取得成功', type: ApprovalInstance })
  async getApprovalInstance(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ): Promise<ApprovalInstance | null> {
    return this.workflowsService.getApprovalInstance(user.tenantId, documentId);
  }

  @Get('history/document/:documentId')
  @ApiOperation({ summary: 'ドキュメントの承認履歴を取得' })
  @ApiResponse({ status: 200, description: '取得成功', type: [ApprovalStep] })
  async getApprovalHistory(
    @Param('documentId') documentId: string,
    @CurrentUser() user: any,
  ): Promise<ApprovalStep[]> {
    return this.workflowsService.getApprovalHistory(user.tenantId, documentId);
  }

  @Get('pending')
  @ApiOperation({ summary: '承認待ちタスクを取得' })
  @ApiResponse({ status: 200, description: '取得成功', type: [ApprovalStep] })
  async getPendingApprovals(@CurrentUser() user: any): Promise<ApprovalStep[]> {
    return this.workflowsService.getPendingApprovals(user.tenantId, user.userId);
  }

  // 状態とアクションの情報取得
  @Get('definitions/:workflowId/states')
  @ApiOperation({ summary: 'ワークフローの状態一覧を取得' })
  async getWorkflowStates(
    @Param('workflowId') workflowId: string,
    @CurrentUser() user: any,
  ) {
    const workflow = await this.workflowsService.findWorkflowDefinition(user.tenantId, workflowId);
    return workflow.states;
  }

  @Get('states/:stateId/actions')
  @ApiOperation({ summary: '状態で実行可能なアクション一覧を取得' })
  async getStateActions(
    @Param('stateId') stateId: string,
    @CurrentUser() user: any,
  ) {
    // TODO: 状態に対するアクション一覧を取得するロジックを実装
    return [];
  }
}