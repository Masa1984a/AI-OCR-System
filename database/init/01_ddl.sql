-- 汎用ドキュメント点検補正システム DDL Ver 1.1
-- 2025-06-19 更新版

-- 既存テーブルを削除（開発環境用）
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS extractions CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS prompt_templates CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- tenants テーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  role TEXT CHECK (role IN ('viewer','editor','supervisor','manager','admin')) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- templates テーブル (Ver 1.1: blocks カラム追加)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  schema_json JSONB,  -- 旧形式互換性のため残す
  blocks JSONB,       -- Ver 1.1: 範囲ブロック定義
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,  -- Ver 1.3: 論理削除フラグ
  deleted_at TIMESTAMPTZ,  -- Ver 1.3: 削除日時
  deleted_by UUID REFERENCES users(id),  -- Ver 1.3: 削除者
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_template_ver ON templates(tenant_id, name, version);

-- prompt_templates テーブル (Ver 1.1: block_id カラム追加)
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  block_id VARCHAR(100),  -- Ver 1.1: ブロック単位のプロンプト
  role TEXT CHECK (role IN ('system','user','assistant')) NOT NULL,
  content TEXT NOT NULL,
  sequence_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- documents テーブル (Ver 1.1: status デフォルト値変更)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID NOT NULL REFERENCES templates(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  page_count INT DEFAULT 1,
  status TEXT DEFAULT 'uploaded',  -- Ver 1.1: デフォルト値変更
  uploaded_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- pages テーブル
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_no INT NOT NULL,
  image_path TEXT,
  ocr_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_page_no ON pages(document_id, page_no);

-- extractions テーブル (Ver 1.1: block_id, coordinates カラム追加)
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  block_id VARCHAR(100),     -- Ver 1.1: ブロックID
  coordinates JSONB,         -- Ver 1.1: 選択範囲座標
  content JSONB NOT NULL,
  extracted_data JSONB,      -- Ver 1.2: 抽出されたデータ（contentとは別）
  confidence FLOAT,
  model_name TEXT,
  prompt_used TEXT,
  status VARCHAR(50) DEFAULT 'completed',  -- Ver 1.2: ステータス（completed, corrected, pending, etc.）
  correction_history JSONB,  -- Ver 1.2: 修正履歴
  is_deleted BOOLEAN DEFAULT false,  -- Ver 1.3: 論理削除フラグ
  deleted_at TIMESTAMPTZ,  -- Ver 1.3: 削除日時
  deleted_by UUID REFERENCES users(id),  -- Ver 1.3: 削除者
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()  -- Ver 1.2: 更新日時
);

-- records テーブル
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES extractions(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  value TEXT,
  value_type TEXT,
  metadata JSONB,
  validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_records_field ON records(document_id, field_name);

-- exports テーブル
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_id UUID REFERENCES templates(id),
  format TEXT CHECK (format IN ('csv','xlsx','json','xml','pdf')) NOT NULL,
  filter_json JSONB,
  file_path TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- audit_logs テーブル
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  table_name TEXT NOT NULL,
  record_id TEXT,
  operation TEXT CHECK (operation IN ('INSERT','UPDATE','DELETE','SELECT')) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);

-- Row Level Security (RLS) 設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（開発環境では簡易版）
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_templates ON templates
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_documents ON documents
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_records ON records
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_exports ON exports
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- プロンプトテンプレートとページはテンプレート/ドキュメント経由でアクセス
CREATE POLICY template_access_prompt_templates ON prompt_templates
  USING (EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = prompt_templates.template_id 
    AND templates.tenant_id::text = current_setting('app.tenant_id', true)
  ));

CREATE POLICY document_access_pages ON pages
  USING (EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = pages.document_id 
    AND documents.tenant_id::text = current_setting('app.tenant_id', true)
  ));

CREATE POLICY document_access_extractions ON extractions
  USING (EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = extractions.document_id 
    AND documents.tenant_id::text = current_setting('app.tenant_id', true)
  ));

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS用のコンテキスト設定関数
CREATE OR REPLACE FUNCTION set_app_context(tenant_id UUID, user_id UUID, user_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::text, false);
  PERFORM set_config('app.user_id', user_id::text, false);
  PERFORM set_config('app.user_role', user_role, false);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_records_updated_at BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_extractions_updated_at BEFORE UPDATE ON extractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===============================================
-- Phase 8: 承認ワークフロー機能テーブル (Ver 1.3準拠)
-- ===============================================

-- workflow_definitions テーブル
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  graph_json JSONB NOT NULL, -- ワークフロー図の定義
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_workflow_ver ON workflow_definitions(tenant_id, name, version);

-- workflow_states テーブル  
CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL, -- 状態のキー (start, pending_manager, pending_director, approved, rejected, etc.)
  label TEXT NOT NULL, -- 日本語表示名
  is_initial BOOLEAN DEFAULT false, -- 初期状態フラグ
  is_final BOOLEAN DEFAULT false, -- 終了状態フラグ
  sla_hours INT, -- SLA時間（null=制限なし）
  notification_template TEXT, -- 通知テンプレート
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_workflow_state_key ON workflow_states(workflow_id, state_key);

-- workflow_transitions テーブル
CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  from_state_id UUID REFERENCES workflow_states(id) ON DELETE CASCADE,
  to_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL, -- アクションキー (approve, reject, delegate, etc.)
  action_label TEXT NOT NULL, -- 日本語表示名
  condition_expr JSONB, -- jsonLogic形式の条件式
  requires_comment BOOLEAN DEFAULT false, -- コメント必須フラグ
  auto_advance BOOLEAN DEFAULT false, -- 自動遷移フラグ
  created_at TIMESTAMPTZ DEFAULT now()
);

-- approval_instances テーブル
CREATE TABLE approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  current_state_id UUID REFERENCES workflow_states(id),
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  started_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ, -- SLA期限
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- approval_steps テーブル
CREATE TABLE approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  state_id UUID NOT NULL REFERENCES workflow_states(id),
  assigned_to UUID REFERENCES users(id), -- 承認者
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, delegated, timeout
  action_taken TEXT, -- 実際に実行されたアクション
  comment TEXT,
  delegated_to UUID REFERENCES users(id), -- 代理承認者
  assigned_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ, -- ステップ個別のSLA期限
  created_at TIMESTAMPTZ DEFAULT now()
);

-- state_actions テーブル (各状態で可能なアクション定義)
CREATE TABLE state_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL, -- approve, reject, delegate, request_changes, etc.
  action_label TEXT NOT NULL, -- 日本語表示名
  next_state_id UUID REFERENCES workflow_states(id), -- 遷移先状態
  requires_role TEXT, -- 必要なロール
  display_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false, -- デフォルトアクション
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_state_action ON state_actions(state_id, action_key);

-- 承認ワークフロー関連のインデックス
CREATE INDEX idx_approval_instances_document ON approval_instances(document_id);
CREATE INDEX idx_approval_instances_workflow ON approval_instances(workflow_id);
CREATE INDEX idx_approval_instances_status ON approval_instances(status);
CREATE INDEX idx_approval_steps_instance ON approval_steps(instance_id);
CREATE INDEX idx_approval_steps_assigned ON approval_steps(assigned_to);
CREATE INDEX idx_approval_steps_status ON approval_steps(status);
CREATE INDEX idx_workflow_transitions_from ON workflow_transitions(from_state_id);
CREATE INDEX idx_workflow_transitions_to ON workflow_transitions(to_state_id);

-- 承認ワークフローテーブルのRLS有効化
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_actions ENABLE ROW LEVEL SECURITY;

-- 承認ワークフローテーブルのRLSポリシー
CREATE POLICY tenant_isolation_workflow_definitions ON workflow_definitions
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_approval_instances ON approval_instances
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ワークフロー状態・遷移・アクションはワークフロー定義経由でアクセス制御
CREATE POLICY workflow_access_states ON workflow_states
  USING (EXISTS (
    SELECT 1 FROM workflow_definitions 
    WHERE workflow_definitions.id = workflow_states.workflow_id 
    AND workflow_definitions.tenant_id::text = current_setting('app.tenant_id', true)
  ));

CREATE POLICY workflow_access_transitions ON workflow_transitions
  USING (EXISTS (
    SELECT 1 FROM workflow_definitions 
    WHERE workflow_definitions.id = workflow_transitions.workflow_id 
    AND workflow_definitions.tenant_id::text = current_setting('app.tenant_id', true)
  ));

CREATE POLICY workflow_access_state_actions ON state_actions
  USING (EXISTS (
    SELECT 1 FROM workflow_states 
    JOIN workflow_definitions ON workflow_definitions.id = workflow_states.workflow_id
    WHERE workflow_states.id = state_actions.state_id 
    AND workflow_definitions.tenant_id::text = current_setting('app.tenant_id', true)
  ));

-- 承認ステップは承認インスタンス経由でアクセス制御
CREATE POLICY instance_access_approval_steps ON approval_steps
  USING (EXISTS (
    SELECT 1 FROM approval_instances 
    WHERE approval_instances.id = approval_steps.instance_id 
    AND approval_instances.tenant_id::text = current_setting('app.tenant_id', true)
  ));

-- 承認ワークフローテーブルの更新日時自動更新トリガー
CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_approval_instances_updated_at BEFORE UPDATE ON approval_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();