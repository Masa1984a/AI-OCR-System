import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TenantsService, LLMSettings } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('tenants')
@Controller('api/v1/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('settings/llm')
  @ApiOperation({ summary: 'Get LLM settings for tenant' })
  @ApiResponse({ status: 200, description: 'LLM settings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getLLMSettings(@Req() req: any): Promise<LLMSettings> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new HttpException('Tenant ID not found', HttpStatus.BAD_REQUEST);
    }
    return this.tenantsService.getLLMSettings(tenantId);
  }

  @Put('settings/llm')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update LLM settings for tenant (Admin only)' })
  @ApiResponse({ status: 200, description: 'LLM settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateLLMSettings(
    @Req() req: any,
    @Body() llmSettings: LLMSettings,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new HttpException('Tenant ID not found', HttpStatus.BAD_REQUEST);
    }
    return this.tenantsService.updateLLMSettings(tenantId, llmSettings);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get all tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantSettings(@Req() req: any): Promise<{ [key: string]: any }> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new HttpException('Tenant ID not found', HttpStatus.BAD_REQUEST);
    }
    return this.tenantsService.getTenantSettings(tenantId);
  }

  @Put('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenantSettings(
    @Req() req: any,
    @Body() settings: { [key: string]: any },
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new HttpException('Tenant ID not found', HttpStatus.BAD_REQUEST);
    }
    return this.tenantsService.updateTenantSettings(tenantId, settings);
  }
}