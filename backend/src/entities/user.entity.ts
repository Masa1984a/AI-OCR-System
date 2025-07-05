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
import { Exclude } from 'class-transformer';
import { Tenant } from './tenant.entity';
import { Document } from './document.entity';
import { Record } from './record.entity';
import { Export } from './export.entity';
import { AuditLog } from './audit-log.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',       // 部長
  SUPERVISOR = 'supervisor', // 係長
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('users')
@Unique(['tenantId', 'email'])
@Unique(['tenantId', 'username'])
@Index('idx_users_tenant', ['tenantId'])
@Index('idx_users_email', ['email'])
@Index('idx_users_role', ['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  username: string;

  @Column({ name: 'password_hash', type: 'text' })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'text',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Document, (document) => document.uploadedBy)
  uploadedDocuments: Document[];

  @OneToMany(() => Document, (document) => document.approvedBy)
  approvedDocuments: Document[];

  @OneToMany(() => Record, (record) => record.validatedBy)
  validatedRecords: Record[];

  @OneToMany(() => Export, (export_) => export_.createdBy)
  exports: Export[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];
}