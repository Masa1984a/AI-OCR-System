import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { Template } from '../entities/template.entity';
import { Extraction } from '../entities/extraction.entity';
import { Page } from '../entities/page.entity';
import { Document } from '../entities/document.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LLMProviderFactory } from './providers';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Template, Extraction, Page, Document]),
    AuthModule,
    StorageModule,
    TenantsModule,
  ],
  controllers: [OcrController],
  providers: [OcrService, LLMProviderFactory],
  exports: [OcrService],
})
export class OcrModule {}