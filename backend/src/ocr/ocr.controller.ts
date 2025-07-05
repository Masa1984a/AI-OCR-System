import { 
  Controller, 
  Post, 
  Body, 
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsUUID } from 'class-validator';
import { OcrService, OCRResult, OCRRequest } from './ocr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { ExtractOcrDto } from './dto/extract-ocr.dto';
import { AvailableModelsResponseDto } from './dto/available-models.dto';

export class OcrRequestDto implements Omit<OCRRequest, 'imageBase64'> {
  @ApiProperty({ description: 'Base64エンコードされた画像データ' })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @ApiProperty({ description: 'テンプレートID' })
  // @IsUUID()  // 一時的に無効化
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'ページID（オプション）' })
  @IsUUID()
  @IsOptional()
  pageId?: string;

  @ApiProperty({ description: 'テーブルグループID（オプション）' })
  @IsString()
  @IsOptional()
  tableGroupId?: string;

  @ApiProperty({ description: 'プロンプト変数（オプション）' })
  @IsObject()
  @IsOptional()
  variables?: { [key: string]: any };
}

export class UpdateExtractionDto {
  @ApiProperty({ description: '修正されたOCR結果データ' })
  @IsObject()
  @IsNotEmpty()
  correctedData: any;

  @ApiProperty({ description: '修正理由（オプション）' })
  @IsString()
  @IsOptional()
  correctionReason?: string;
}

@ApiTags('ocr')
@Controller('api/v1/ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI-OCRを実行して情報を抽出' })
  @ApiBody({
    description: 'OCRリクエスト',
    type: OcrRequestDto,
  })
  async performOcr(
    @Body() ocrRequest: OcrRequestDto,
    @CurrentUser() user: User,
  ): Promise<OCRResult> {
    return this.ocrService.performOcr(ocrRequest, user.tenantId);
  }

  @Post('extract/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '範囲選択によるブロック単位のOCR実行' })
  @ApiBody({
    description: 'ブロックOCRリクエスト',
    type: ExtractOcrDto,
  })
  async extractBlock(
    @Body() extractOcrDto: ExtractOcrDto,
    @CurrentUser() user: User,
  ): Promise<OCRResult> {
    return this.ocrService.performBlockOcr(extractOcrDto, user.tenantId, user.id);
  }

  @Post('reprocess/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '抽出結果を再処理' })
  async reprocessExtraction(
    @Param('extractionId', ParseUUIDPipe) extractionId: string,
    @CurrentUser() user: User,
  ): Promise<OCRResult> {
    return this.ocrService.reprocessExtraction(extractionId, user.tenantId);
  }

  @Patch('extractions/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OCR結果の修正を保存' })
  @ApiBody({
    description: 'OCR結果修正データ',
    type: UpdateExtractionDto,
  })
  async updateExtraction(
    @Param('extractionId', ParseUUIDPipe) extractionId: string,
    @Body() updateData: UpdateExtractionDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    return this.ocrService.updateExtraction(extractionId, updateData, user.tenantId);
  }

  @Get('extractions/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '抽出結果の取得' })
  async getExtraction(
    @Param('extractionId', ParseUUIDPipe) extractionId: string,
    @CurrentUser() user: User,
  ) {
    return this.ocrService.getExtraction(extractionId, user.tenantId);
  }

  @Get('documents/:documentId/extractions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ドキュメントの全抽出結果取得' })
  async getDocumentExtractions(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.ocrService.getDocumentExtractions(documentId, user.tenantId);
  }

  @Delete('extractions/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '抽出結果の論理削除' })
  async deleteExtraction(
    @Param('extractionId', ParseUUIDPipe) extractionId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    return this.ocrService.deleteExtraction(extractionId, user.tenantId);
  }

  @Get('models/available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '利用可能なLLMモデルの一覧を取得' })
  async getAvailableModels(
    @CurrentUser() user: User,
  ): Promise<AvailableModelsResponseDto> {
    return this.ocrService.getAvailableModels(user.tenantId);
  }
}