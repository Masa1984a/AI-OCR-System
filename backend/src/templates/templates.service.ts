import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../entities/template.entity';
import { PromptTemplate, PromptRole } from '../entities/prompt-template.entity';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly ajv: Ajv;

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv); // Add support for date, time, email, etc. formats
  }

  async create(
    createTemplateDto: CreateTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<Template> {
    this.logger.log(`=== TemplatesService.create START ===`);
    this.logger.log(`DTO: ${JSON.stringify(createTemplateDto, null, 2)}`);
    this.logger.log(`UserId: ${userId}, TenantId: ${tenantId}`);

    try {
      // Validate JSON Schema or blocks
      if (createTemplateDto.schemaJson) {
        this.logger.log('Validating JSON Schema...');
        this.validateJsonSchema(createTemplateDto.schemaJson);
        this.logger.log('JSON Schema validation passed');
      } else if (createTemplateDto.blocks && createTemplateDto.blocks.length > 0) {
        this.logger.log('Validating blocks...');
        for (const block of createTemplateDto.blocks) {
          this.validateJsonSchema(block.schema);
        }
        this.logger.log('Blocks validation passed');
      } else {
        throw new BadRequestException('Either schemaJson or blocks must be provided');
      }

      // Check if template with same name exists
      this.logger.log('Checking for existing template...');
      const existingTemplate = await this.templateRepository.findOne({
        where: {
          tenantId,
          name: createTemplateDto.name,
          isActive: true,
        },
      });

      if (existingTemplate) {
        this.logger.error(`Template with name '${createTemplateDto.name}' already exists`);
        throw new BadRequestException(`Template with name '${createTemplateDto.name}' already exists`);
      }
      this.logger.log('No existing template found');

      // Create template
      this.logger.log('Creating template entity...');
      const template = this.templateRepository.create({
        ...createTemplateDto,
        tenantId,
        createdById: userId,
        version: 1,
        isActive: true,
      });
      this.logger.log(`Template entity created: ${JSON.stringify(template, null, 2)}`);

      this.logger.log('Saving template to database...');
      const savedTemplate = await this.templateRepository.save(template);
      this.logger.log(`Template saved with ID: ${savedTemplate.id}`);

      // Create audit log
      this.logger.log('Creating audit log...');
      await this.createAuditLog(
        tenantId,
        userId,
        'templates',
        savedTemplate.id,
        AuditOperation.INSERT,
        null,
        savedTemplate,
      );
      this.logger.log('Audit log created');

      // Create default prompts if provided
      if (createTemplateDto.prompts?.length) {
        this.logger.log(`Creating ${createTemplateDto.prompts.length} prompts...`);
        await this.createPrompts(savedTemplate.id, createTemplateDto.prompts, userId, tenantId);
        this.logger.log('Prompts created');
      }

      this.logger.log(`=== TemplatesService.create SUCCESS ===`);
      return savedTemplate;
    } catch (error) {
      this.logger.error(`=== TemplatesService.create ERROR ===`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    options?: {
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ templates: Template[]; total: number }> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId })
      .andWhere('template.isDeleted = :isDeleted', { isDeleted: false })
      .leftJoinAndSelect('template.promptTemplates', 'prompts', 'prompts.deleted_at IS NULL')
      .orderBy('template.createdAt', 'DESC');

    if (options?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const [templates, total] = await query.getManyAndCount();

    return { templates, total };
  }

  async findOne(id: string, tenantId: string): Promise<Template> {
    const template = await this.templateRepository
      .createQueryBuilder('template')
      .where('template.id = :id', { id })
      .andWhere('template.tenantId = :tenantId', { tenantId })
      .andWhere('template.isDeleted = :isDeleted', { isDeleted: false })
      .leftJoinAndSelect(
        'template.promptTemplates',
        'prompts',
        'prompts.deleted_at IS NULL',
      )
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .getOne();

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<Template> {
    const template = await this.findOne(id, tenantId);

    // If schema is being updated, validate it
    if (updateTemplateDto.schemaJson) {
      this.validateJsonSchema(updateTemplateDto.schemaJson);
    }

    // If blocks are being updated, validate their schemas
    if (updateTemplateDto.blocks && updateTemplateDto.blocks.length > 0) {
      for (const block of updateTemplateDto.blocks) {
        this.validateJsonSchema(block.schema);
      }
    }

    const oldValues = { ...template };

    // Update template
    Object.assign(template, updateTemplateDto);
    const updatedTemplate = await this.templateRepository.save(template);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'templates',
      id,
      AuditOperation.UPDATE,
      oldValues,
      updatedTemplate,
    );

    return updatedTemplate;
  }

  async createNewVersion(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<Template> {
    const currentTemplate = await this.templateRepository.findOne({
      where: { id, tenantId },
      relations: ['promptTemplates'],
    });

    if (!currentTemplate) {
      throw new NotFoundException('Template not found');
    }

    // Get the latest version
    const latestVersion = await this.templateRepository
      .createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId })
      .andWhere('template.name = :name', { name: currentTemplate.name })
      .orderBy('template.version', 'DESC')
      .getOne();

    // Create new version
    const newTemplate = this.templateRepository.create({
      ...currentTemplate,
      id: undefined,
      version: (latestVersion?.version || 0) + 1,
      createdById: userId,
      createdAt: undefined,
      updatedAt: undefined,
    });

    const savedTemplate = await this.templateRepository.save(newTemplate);

    // Copy prompts
    if (currentTemplate.promptTemplates?.length) {
      const newPrompts = currentTemplate.promptTemplates.map(prompt => ({
        templateId: savedTemplate.id,
        role: prompt.role,
        content: prompt.content,
        sequenceOrder: prompt.sequenceOrder,
        isActive: prompt.isActive,
      }));

      await this.promptTemplateRepository.save(newPrompts);
    }

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'templates',
      savedTemplate.id,
      AuditOperation.INSERT,
      null,
      { ...savedTemplate, sourceTemplateId: id },
    );

    return savedTemplate;
  }

  async delete(id: string, userId: string, tenantId: string): Promise<void> {
    const template = await this.findOne(id, tenantId);

    const oldValues = { ...template };

    // Soft delete by setting deletion flags
    template.isDeleted = true;
    template.deletedAt = new Date();
    template.deletedById = userId;
    template.isActive = false;
    
    await this.templateRepository.save(template);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'templates',
      id,
      AuditOperation.DELETE,
      oldValues,
      { isDeleted: true, deletedAt: template.deletedAt, deletedById: userId, isActive: false },
    );
  }

  // Prompt Template Methods

  async createPrompts(
    templateId: string,
    prompts: CreatePromptDto[],
    userId: string,
    tenantId: string,
  ): Promise<PromptTemplate[]> {
    // Verify template exists and belongs to tenant
    const template = await this.findOne(templateId, tenantId);

    // プロンプト作成時のblock_idバリデーション
    for (const prompt of prompts) {
      if (prompt.blockId) {
        await this.validateBlockExists(template, prompt.blockId);
        this.logger.log(`Creating prompt with block ID: ${prompt.blockId}`);
      }
    }

    const promptEntities = prompts.map((prompt, index) => 
      this.promptTemplateRepository.create({
        ...prompt,
        templateId,
        sequenceOrder: prompt.sequenceOrder ?? index,
        isActive: true,
      })
    );

    const savedPrompts = await this.promptTemplateRepository.save(promptEntities);

    // Create audit logs
    for (const prompt of savedPrompts) {
      await this.createAuditLog(
        tenantId,
        userId,
        'prompt_templates',
        prompt.id,
        AuditOperation.INSERT,
        null,
        prompt,
      );
    }

    return savedPrompts;
  }

  async updatePrompt(
    promptId: string,
    updatePromptDto: UpdatePromptDto,
    userId: string,
    tenantId: string,
  ): Promise<PromptTemplate> {
    const prompt = await this.promptTemplateRepository.findOne({
      where: { id: promptId },
      relations: ['template'],
    });

    if (!prompt || prompt.template.tenantId !== tenantId) {
      throw new NotFoundException('Prompt template not found');
    }

    const oldValues = { ...prompt };

    // block_id変更時のバリデーション
    if (updatePromptDto.blockId !== undefined) {
      if (updatePromptDto.blockId) {
        // 指定されたblock_idがテンプレートのブロック定義に存在するかチェック
        await this.validateBlockExists(prompt.template, updatePromptDto.blockId);
        
        // 重複チェック（警告のみ）
        await this.checkBlockIdDuplication(prompt.templateId, updatePromptDto.blockId, promptId);
      }
      // null（共通プロンプト）への変更は常に許可

      // block_id変更時の詳細ログ
      if (oldValues.blockId !== updatePromptDto.blockId) {
        this.logger.log(`Block ID changed for prompt ${promptId}: ${oldValues.blockId || 'null'} → ${updatePromptDto.blockId || 'null'}`);
      }
    }

    Object.assign(prompt, updatePromptDto);
    const updatedPrompt = await this.promptTemplateRepository.save(prompt);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'prompt_templates',
      promptId,
      AuditOperation.UPDATE,
      oldValues,
      updatedPrompt,
    );

    return updatedPrompt;
  }

  async deletePrompt(
    promptId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const prompt = await this.promptTemplateRepository.findOne({
      where: { id: promptId },
      relations: ['template'],
    });

    if (!prompt || prompt.template.tenantId !== tenantId) {
      throw new NotFoundException('Prompt template not found');
    }

    // Create a plain object for the audit log to avoid circular references
    const { template, ...oldValuesForAudit } = prompt;

    await this.promptTemplateRepository.softDelete(prompt.id);

    // Create audit log
    await this.createAuditLog(
      tenantId,
      userId,
      'prompt_templates',
      promptId,
      AuditOperation.DELETE,
      oldValuesForAudit,
      { deleted_at: new Date() },
    );
  }

  async processPromptTemplate(
    templateId: string,
    tenantId: string,
    variables?: Record<string, any>,
  ): Promise<string[]> {
    const template = await this.findOne(templateId, tenantId);

    if (!template.promptTemplates?.length) {
      throw new BadRequestException('No prompt templates found');
    }

    // Sort by sequence order
    const sortedPrompts = template.promptTemplates
      .filter(p => p.isActive)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Process variables
    const defaultVariables = {
      schema: JSON.stringify(template.schemaJson, null, 2),
      exampleJSON: JSON.stringify(template.getExampleJson(), null, 2),
      fieldList: template.getFieldList(),
    };

    const mergedVariables = { ...defaultVariables, ...variables };

    // Process each prompt
    return sortedPrompts.map(prompt => 
      prompt.processPlaceholders(mergedVariables)
    );
  }

  // Helper Methods

  private async validateBlockExists(template: Template, blockId: string): Promise<void> {
    if (!template.blocks || !Array.isArray(template.blocks)) {
      throw new BadRequestException('Template has no block definitions');
    }
    
    const blockExists = template.blocks.some(block => block.block_id === blockId);
    if (!blockExists) {
      throw new BadRequestException(`Block '${blockId}' does not exist in template`);
    }
  }

  private async checkBlockIdDuplication(
    templateId: string, 
    blockId: string, 
    excludePromptId?: string
  ): Promise<void> {
    const existingPrompts = await this.promptTemplateRepository.find({
      where: { templateId, blockId },
    });
    
    const duplicates = existingPrompts.filter(p => p.id !== excludePromptId);
    if (duplicates.length > 0) {
      this.logger.warn(`Multiple prompts found for block '${blockId}' in template '${templateId}'. Existing prompts: ${duplicates.length}`);
      // 警告ログのみ（エラーにはしない）
    }
  }

  private validateJsonSchema(schema: any): void {
    try {
      // Basic validation that it's a valid JSON Schema
      if (!schema || typeof schema !== 'object') {
        throw new Error('Schema must be an object');
      }

      if (!schema.type || schema.type !== 'object') {
        throw new Error('Schema type must be "object"');
      }

      if (!schema.properties || typeof schema.properties !== 'object') {
        throw new Error('Schema must have properties');
      }

      // Compile schema to check for errors
      this.ajv.compile(schema);
    } catch (error) {
      throw new BadRequestException(`Invalid JSON Schema: ${error.message}`);
    }
  }

  private async createAuditLog(
    tenantId: string,
    userId: string,
    tableName: string,
    recordId: string,
    operation: AuditOperation,
    oldValues: any,
    newValues: any,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      tenantId,
      userId,
      tableName,
      recordId,
      operation,
      oldValues,
      newValues,
    });

    await this.auditLogRepository.save(auditLog);
  }
}