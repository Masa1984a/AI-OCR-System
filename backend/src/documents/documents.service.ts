import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Page, OcrStatus } from '../entities/page.entity';
import { Record } from '../entities/record.entity';
import { Extraction } from '../entities/extraction.entity';
import { Template } from '../entities/template.entity';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SaveRecordsDto } from './dto/save-records.dto';
import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs';
const { fromBuffer } = require('pdf2pic');

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Record)
    private readonly recordRepository: Repository<Record>,
    @InjectRepository(Extraction)
    private readonly extractionRepository: Repository<Extraction>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
    tenantId: string,
  ): Promise<Document> {
    // ファイル名の文字化け対策
    const originalname = Buffer.from(file.originalname, 'latin1').toString(
      'utf-8',
    );

    // テンプレートの確認
    const template = await this.templateRepository.findOne({
      where: { id: createDocumentDto.templateId, tenantId, isActive: true },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // ファイルのアップロード
    const objectName = `tenants/${tenantId}/documents/${Date.now()}_${originalname}`;
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);
    
    const storagePath = await this.storageService.uploadFile(
      objectName,
      stream,
      file.size,
      file.mimetype,
    );

    // ドキュメントの作成
    const document = this.documentRepository.create({
      ...createDocumentDto,
      tenantId,
      fileName: originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath,
      uploadedById: userId,
      status: DocumentStatus.UPLOADED,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Ver 1.1: アップロード時は自動変換を行わない
    // PDFの場合はページ数のみを取得してページレコードを作成（画像変換は行わない）
    if (file.mimetype === 'application/pdf') {
      await this.createPagesMetadataForPdf(savedDocument.id, storagePath);
    } else {
      // 画像の場合は単一ページとして扱う
      await this.createSinglePage(savedDocument.id, storagePath);
    }

    // 監査ログ
    await this.createAuditLog(
      tenantId,
      userId,
      'documents',
      savedDocument.id,
      AuditOperation.INSERT,
      null,
      savedDocument,
    );

    return savedDocument;
  }

  async findAll(
    tenantId: string,
    options?: {
      templateId?: string;
      status?: DocumentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ documents: Document[]; total: number }> {
    const query = this.documentRepository.createQueryBuilder('document')
      .where('document.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('document.template', 'template')
      .leftJoinAndSelect('document.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('document.extractions', 'extractions', 'extractions.isDeleted = false')
      .orderBy('document.createdAt', 'DESC');

    if (options?.templateId) {
      query.andWhere('document.templateId = :templateId', { templateId: options.templateId });
    }

    if (options?.status) {
      query.andWhere('document.status = :status', { status: options.status });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const [documents, total] = await query.getManyAndCount();

    return { documents, total };
  }

  async findOne(id: string, tenantId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, tenantId },
      relations: ['template', 'pages', 'uploadedBy', 'approvedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
    tenantId: string,
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    const oldValues = { ...document };

    Object.assign(document, updateDocumentDto);
    const updatedDocument = await this.documentRepository.save(document);

    // 監査ログ
    await this.createAuditLog(
      tenantId,
      userId,
      'documents',
      id,
      AuditOperation.UPDATE,
      oldValues,
      updatedDocument,
    );

    return updatedDocument;
  }

  async delete(id: string, userId: string, tenantId: string): Promise<void> {
    const document = await this.findOne(id, tenantId);

    // ストレージからファイルを削除
    await this.storageService.deleteFile(document.storagePath);

    // データベースから削除（関連エンティティはCASCADEで削除される）
    await this.documentRepository.remove(document);

    // 監査ログ
    await this.createAuditLog(
      tenantId,
      userId,
      'documents',
      id,
      AuditOperation.DELETE,
      document,
      null,
    );
  }

  async getDocumentData(
    documentId: string,
    tenantId: string,
  ): Promise<Record[]> {
    // ドキュメントの確認
    await this.findOne(documentId, tenantId);

    // レコードを取得
    const records = await this.recordRepository.find({
      where: { documentId, tenantId },
      order: { tableGroupId: 'ASC', rowIndex: 'ASC', fieldName: 'ASC' },
    });

    return records;
  }

  async saveDocumentData(
    documentId: string,
    saveRecordsDto: SaveRecordsDto,
    userId: string,
    tenantId: string,
  ): Promise<Record[]> {
    const document = await this.findOne(documentId, tenantId);

    // トランザクション内で処理
    return await this.dataSource.transaction(async manager => {
      // 既存のレコードを削除（オプション）
      if (saveRecordsDto.replaceAll) {
        await manager.delete(Record, { documentId, tenantId });
      }

      // 新しいレコードを保存
      const records: Record[] = [];
      
      for (const recordData of saveRecordsDto.records) {
        const record = manager.create(Record, {
          ...recordData,
          documentId,
          tenantId,
          validatedById: userId,
          validatedAt: new Date(),
          isValidated: true,
        });
        
        const savedRecord = await manager.save(record);
        records.push(savedRecord);
      }

      // ドキュメントのステータスを更新
      await manager.update(Document, documentId, {
        status: DocumentStatus.COMPLETED,
      });

      // 監査ログ
      await this.createAuditLog(
        tenantId,
        userId,
        'records',
        documentId,
        AuditOperation.UPDATE,
        null,
        { recordCount: records.length },
      );

      return records;
    });
  }

  async approve(
    documentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Document> {
    const document = await this.findOne(documentId, tenantId);

    if (document.status !== DocumentStatus.COMPLETED) {
      throw new BadRequestException('Document must be completed before approval');
    }

    document.approvedById = userId;
    document.approvedAt = new Date();
    
    const updatedDocument = await this.documentRepository.save(document);

    // 監査ログ
    await this.createAuditLog(
      tenantId,
      userId,
      'documents',
      documentId,
      AuditOperation.UPDATE,
      { approvedById: null, approvedAt: null },
      { approvedById: userId, approvedAt: document.approvedAt },
    );

    return updatedDocument;
  }

  async getExtractions(
    documentId: string,
    tenantId: string,
  ): Promise<Extraction[]> {
    const document = await this.findOne(documentId, tenantId);

    const extractions = await this.extractionRepository
      .createQueryBuilder('extraction')
      .innerJoin('extraction.page', 'page')
      .innerJoin('page.document', 'document')
      .where('document.id = :documentId', { documentId })
      .andWhere('document.tenantId = :tenantId', { tenantId })
      .orderBy('page.pageNo', 'ASC')
      .addOrderBy('extraction.createdAt', 'DESC')
      .getMany();

    return extractions;
  }

  async getPageImage(documentId: string, pageNo: number, tenantId: string): Promise<{ contentType: string; buffer: Buffer }> {
    // ドキュメントの存在確認
    const document = await this.findOne(documentId, tenantId);
    
    // ページの取得
    const page = await this.pageRepository.findOne({
      where: {
        documentId,
        pageNo,
      }
    });

    if (!page) {
      throw new NotFoundException(`Page ${pageNo} not found for document ${documentId}`);
    }

    // 画像が存在しない場合は、オンデマンドで変換を実行
    if (!page.imagePath) {
      this.logger.log(`画像が存在しないため、オンデマンド変換を実行: ${documentId}, ページ ${pageNo}`);
      await this.convertPdfPageToImage(document, page);
      
      // 更新されたページ情報を再取得
      const updatedPage = await this.pageRepository.findOne({
        where: { documentId, pageNo }
      });
      
      if (!updatedPage || !updatedPage.imagePath) {
        throw new NotFoundException(`Failed to generate image for page ${pageNo}`);
      }
      
      page.imagePath = updatedPage.imagePath;
    }

    try {
      // MinIOから画像を取得
      const imageBuffer = await this.storageService.getFile(page.imagePath);
      
      return {
        contentType: 'image/png',
        buffer: imageBuffer
      };
    } catch (error) {
      this.logger.error(`Failed to get page image: ${error.message}`, error.stack);
      throw new NotFoundException(`Failed to load page image: ${error.message}`);
    }
  }

  // Helper methods

  private async convertPdfPageToImage(document: Document, page: Page): Promise<void> {
    try {
      this.logger.log(`単一ページ変換開始: ${document.id}, ページ ${page.pageNo}`);
      
      // MinIOからPDFファイルを取得
      const pdfBuffer = await this.storageService.getFile(document.storagePath);
      
      // PDF to Image 変換設定
      const convert = fromBuffer(pdfBuffer, {
        density: 200,           // DPI (200で十分な画質)
        saveFilename: 'page',   
        savePath: '/tmp',       
        format: 'png',          
      });

      // 指定ページのみを変換
      const result = await convert(page.pageNo, { responseType: 'buffer' });
      
      this.logger.log(`ページ変換完了: ${document.id}, ページ ${page.pageNo}`);

      // 画像をMinIOに保存
      const imagePath = `tenants/${document.tenantId}/documents/${document.id}/pages/page_${page.pageNo}.png`;
      
      const imageStream = new Readable({
        read() {
          this.push(result.buffer);
          this.push(null);
        }
      });
      
      await this.storageService.uploadFile(imagePath, imageStream, result.buffer.length, 'image/png');
      
      // Pageレコードを更新
      await this.pageRepository.update(page.id, { imagePath });
      
      this.logger.log(`ページ保存完了: ${imagePath}`);
    } catch (error) {
      this.logger.error(`単一ページ変換エラー: ${error.message}`, error.stack);
      throw new BadRequestException(`Page conversion failed: ${error.message}`);
    }
  }

  private async createPagesMetadataForPdf(documentId: string, pdfPath: string): Promise<void> {
    try {
      this.logger.log(`PDFメタデータ取得開始: ${pdfPath}`);
      
      // MinIOからPDFファイルを取得
      const pdfBuffer = await this.storageService.getFile(pdfPath);
      
      // PDF to Image 変換設定（ページ数取得のみ）
      const convert = fromBuffer(pdfBuffer, {
        density: 72,            // 低解像度でページ数のみ取得
        saveFilename: 'temp',   
        savePath: '/tmp',       
        format: 'png',          
        width: 100,             // 最小サイズ
        height: 100             
      });

      // 最初のページのみを変換してページ数を取得
      const firstPage = await convert(1, { responseType: 'buffer' });
      
      // 実際のページ数を取得するため、bulk変換を試行
      let pageCount = 1;
      try {
        const results = await convert.bulk(-1, { responseType: 'buffer' });
        pageCount = results.length;
      } catch (error) {
        this.logger.warn(`ページ数取得でエラー、デフォルト値1を使用: ${error.message}`);
      }
      
      this.logger.log(`PDFページ数: ${pageCount}`);

      // 各ページのメタデータレコードを作成（画像は保存しない）
      for (let i = 0; i < pageCount; i++) {
        const page = this.pageRepository.create({
          documentId,
          pageNo: i + 1,
          imagePath: null, // 画像変換は後で実行
          ocrStatus: OcrStatus.PENDING,
        });
        await this.pageRepository.save(page);
      }

      // ドキュメントのページ数を更新
      await this.documentRepository.update(documentId, { pageCount });
      
      this.logger.log(`PDFメタデータ処理完了: ${documentId}, ${pageCount}ページ`);
    } catch (error) {
      this.logger.error(`PDFメタデータ取得エラー: ${error.message}`, error.stack);
      
      // エラーの場合は1ページとして扱う
      const page = this.pageRepository.create({
        documentId,
        pageNo: 1,
        imagePath: null,
        ocrStatus: OcrStatus.PENDING,
      });
      await this.pageRepository.save(page);
      await this.documentRepository.update(documentId, { pageCount: 1 });
      
      this.logger.log(`PDFメタデータ処理（エラー時デフォルト）: ${documentId}, 1ページ`);
    }
  }

  private async createPagesForPdf(documentId: string, pdfPath: string): Promise<void> {
    try {
      this.logger.log(`PDF処理開始: ${pdfPath}`);
      
      // MinIOからPDFファイルを取得
      const pdfBuffer = await this.storageService.getFile(pdfPath);
      
      // PDF to Image 変換設定
      const convert = fromBuffer(pdfBuffer, {
        density: 200,           // DPI (200で十分な画質)
        saveFilename: 'page',   // ファイル名プレフィックス
        savePath: '/tmp',       // 一時保存パス
        format: 'png',          // 出力形式
        width: 2000,            // 最大幅
        height: 2800            // 最大高さ
      });

      // PDFの全ページを変換
      const results = await convert.bulk(-1, { responseType: 'buffer' });
      const pageCount = results.length;
      
      this.logger.log(`PDF変換完了: ${pageCount}ページ`);

      // 各ページの画像をMinIOに保存し、Pageレコードを作成
      for (let i = 0; i < pageCount; i++) {
        const pageNo = i + 1;
        const imagePath = `tenants/${documentId}/pages/page_${pageNo}.png`;
        
        // 画像をMinIOに保存
        const imageStream = new Readable({
          read() {
            this.push(results[i].buffer);
            this.push(null);
          }
        });
        
        await this.storageService.uploadFile(imagePath, imageStream, results[i].buffer.length, 'image/png');
        
        // Pageレコードを作成
        const page = this.pageRepository.create({
          documentId,
          pageNo,
          imagePath,
          ocrStatus: OcrStatus.PENDING,
        });
        await this.pageRepository.save(page);
        
        this.logger.log(`ページ ${pageNo} 保存完了: ${imagePath}`);
      }

      // ドキュメントのページ数を更新
      await this.documentRepository.update(documentId, { pageCount });
      
      this.logger.log(`PDF処理完了: ${documentId}, ${pageCount}ページ`);
    } catch (error) {
      this.logger.error(`PDF変換エラー: ${error.message}`, error.stack);
      throw new BadRequestException(`PDF変換に失敗しました: ${error.message}`);
    }
  }

  private async createSinglePage(documentId: string, imagePath: string): Promise<void> {
    const page = this.pageRepository.create({
      documentId,
      pageNo: 1,
      imagePath,
      ocrStatus: OcrStatus.PENDING,
    });
    
    await this.pageRepository.save(page);
    await this.documentRepository.update(documentId, { pageCount: 1 });
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