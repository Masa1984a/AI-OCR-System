import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { PromptTemplate } from './prompt-template.entity';
import { Document } from './document.entity';
import { BlockDefinition } from '../interfaces/block-definition.interface';

@Entity('templates')
@Unique('uq_template_ver', ['tenantId', 'name', 'version'])
@Index('idx_templates_tenant', ['tenantId'])
@Index('idx_templates_active', ['isActive'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'schema_json', type: 'jsonb', nullable: true })
  schemaJson: { [key: string]: any } | null;

  @Column({ type: 'jsonb', nullable: true })
  blocks: BlockDefinition[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedById: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.templates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedBy: User | null;

  @OneToMany(() => PromptTemplate, (promptTemplate) => promptTemplate.template)
  promptTemplates: PromptTemplate[];

  @OneToMany(() => Document, (document) => document.template)
  documents: Document[];

  // Helper methods
  getFieldList(): string {
    const properties = this.schemaJson.properties || {};
    return Object.entries(properties)
      .map(([key, value]: [string, any]) => `${key}:${value.type}`)
      .join(', ');
  }

  getExampleJson(): { [key: string]: any } {
    const properties = this.schemaJson.properties || {};
    const example: { [key: string]: any } = {};
    
    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      switch (value.type) {
        case 'string':
          example[key] = value.example || 'サンプルテキスト';
          break;
        case 'number':
          example[key] = value.example || 123.45;
          break;
        case 'boolean':
          example[key] = value.example || true;
          break;
        case 'array':
          example[key] = value.example || [];
          break;
        case 'object':
          example[key] = value.example || {};
          break;
        default:
          example[key] = null;
      }
    });
    
    return example;
  }
}