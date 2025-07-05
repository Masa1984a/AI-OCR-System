import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Template } from './template.entity';

export enum PromptRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('prompt_templates')
@Index('idx_prompts_template', ['templateId'])
@Index('idx_prompts_role', ['role'])
export class PromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'block_id', type: 'varchar', length: 100, nullable: true })
  blockId: string | null;

  @Column({
    type: 'text',
    enum: PromptRole,
  })
  role: PromptRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'sequence_order', type: 'int', default: 0 })
  sequenceOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Template, (template) => template.promptTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  // Helper method to process placeholders
  processPlaceholders(variables: { [key: string]: any }): string {
    let processedContent = this.content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), replacement);
    });
    
    return processedContent;
  }
}