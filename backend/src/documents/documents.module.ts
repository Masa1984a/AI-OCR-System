import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from '../entities/document.entity';
import { Page } from '../entities/page.entity';
import { Record } from '../entities/record.entity';
import { Extraction } from '../entities/extraction.entity';
import { Template } from '../entities/template.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      Page,
      Record,
      Extraction,
      Template,
      AuditLog,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 32 * 1024 * 1024, // 32MB
      },
    }),
    StorageModule,
    AuthModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}