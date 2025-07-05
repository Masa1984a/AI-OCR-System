import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

export interface LLMSettings {
  defaultModel: string;
  enabledModels: string[];
  modelConfigs?: {
    [key: string]: {
      apiKey?: string;
      maxTokens?: number;
      temperature?: number;
    };
  };
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Get LLM settings for a tenant
   */
  async getLLMSettings(tenantId: string): Promise<LLMSettings> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId, isActive: true },
      });

      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      // Return LLM settings from tenant settings or defaults
      const llmSettings = tenant.settings?.llm || {
        defaultModel: 'claude-3-5-sonnet-20241022',
        enabledModels: ['claude-3-5-sonnet-20241022'],
        modelConfigs: {},
      };

      return llmSettings;
    } catch (error) {
      this.logger.error('Failed to get LLM settings:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'LLM設定の取得に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update LLM settings for a tenant
   */
  async updateLLMSettings(
    tenantId: string,
    llmSettings: LLMSettings,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId, isActive: true },
      });

      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      // Validate settings
      if (!['claude', 'gemini'].includes(llmSettings.defaultModel)) {
        throw new HttpException('Invalid default model', HttpStatus.BAD_REQUEST);
      }

      if (!llmSettings.enabledModels.includes(llmSettings.defaultModel)) {
        throw new HttpException(
          'Default model must be included in enabled models',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update tenant settings
      const updatedSettings: { [key: string]: any } = {
        ...tenant.settings,
        llm: llmSettings,
      };

      await this.tenantRepository.update(tenantId, {
        settings: updatedSettings as any,
      });

      this.logger.log(`LLM settings updated for tenant ${tenantId}`);

      return {
        success: true,
        message: 'LLM設定が更新されました',
      };
    } catch (error) {
      this.logger.error('Failed to update LLM settings:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'LLM設定の更新に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tenant settings (general)
   */
  async getTenantSettings(tenantId: string): Promise<{ [key: string]: any }> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId, isActive: true },
      });

      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      return tenant.settings || {};
    } catch (error) {
      this.logger.error('Failed to get tenant settings:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'テナント設定の取得に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update tenant settings (general)
   */
  async updateTenantSettings(
    tenantId: string,
    settings: { [key: string]: any },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId, isActive: true },
      });

      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      const updatedSettings: { [key: string]: any } = {
        ...tenant.settings,
        ...settings,
      };

      await this.tenantRepository.update(tenantId, {
        settings: updatedSettings as any,
      });

      this.logger.log(`Settings updated for tenant ${tenantId}`);

      return {
        success: true,
        message: '設定が更新されました',
      };
    } catch (error) {
      this.logger.error('Failed to update tenant settings:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '設定の更新に失敗しました',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}