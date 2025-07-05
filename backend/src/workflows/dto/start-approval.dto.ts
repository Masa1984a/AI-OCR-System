import { IsUUID, IsOptional, IsObject, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartApprovalDto {
  @ApiProperty({ description: 'ドキュメントID' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: 'ワークフローID' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiPropertyOptional({ description: 'メタデータ（優先度、金額など）' })
  @IsOptional()
  @IsObject()
  metadata?: { [key: string]: any };
}