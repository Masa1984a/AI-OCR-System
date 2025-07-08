-- 汎用ドキュメント点検補正システム DML Ver 1.1
-- 2025-06-19 更新版

-- デモ用テナントデータ
INSERT INTO tenants (id, name, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'デモ株式会社', true),
  ('22222222-2222-2222-2222-222222222222', 'テスト商事', true);

-- デモ用ユーザーデータ（パスワード: demo123）
INSERT INTO users (id, tenant_id, email, username, role, password_hash) VALUES
  ('12345678-abcd-1234-abcd-123456789001', '11111111-1111-1111-1111-111111111111', 
   'admin@demo.com', 'admin', 'admin', 
   '$2b$10$ez5LMl5IgfsGMuZyoZL5Se2VEi3.F1MtHWbVKlrzRTOk3xAgUw1lq'),
  ('12345678-abcd-1234-abcd-123456789002', '11111111-1111-1111-1111-111111111111', 
   'user@demo.com', 'user', 'editor', 
   '$2b$10$ez5LMl5IgfsGMuZyoZL5Se2VEi3.F1MtHWbVKlrzRTOk3xAgUw1lq'),
  ('12345678-abcd-1234-abcd-123456789003', '22222222-2222-2222-2222-222222222222', 
   'test@test.com', 'test', 'admin', 
   '$2b$10$YKxX3.sSs1ibcJvg6l1s2.W0h7uPUkODkYS3J6rKXI2NZeKxPKb3y'),
  ('12345678-abcd-1234-abcd-123456789004', '11111111-1111-1111-1111-111111111111', 
   'supervisor@demo.com', 'supervisor', 'supervisor', 
   '$2b$10$ez5LMl5IgfsGMuZyoZL5Se2VEi3.F1MtHWbVKlrzRTOk3xAgUw1lq'),
  ('12345678-abcd-1234-abcd-123456789005', '11111111-1111-1111-1111-111111111111', 
   'manager@demo.com', 'manager', 'manager', 
   '$2b$10$ez5LMl5IgfsGMuZyoZL5Se2VEi3.F1MtHWbVKlrzRTOk3xAgUw1lq');

-- 請求書テンプレート（Ver 1.1: blocks定義付き）
INSERT INTO templates (id, tenant_id, name, description, version, blocks, created_by) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 
   '請求書テンプレート', '標準的な請求書フォーマット', 1,
   '[
     {
       "block_id": "invoice_header",
       "label": "請求書ヘッダー",
       "prompt": "請求書のヘッダー部分から会社名、請求書番号、発行日を抽出してください",
       "schema": {
         "type": "object",
         "properties": {
           "company_name": {
             "type": "string",
             "title": "請求先会社名"
           },
           "invoice_no": {
             "type": "string",
             "title": "請求書番号"
           },
           "issue_date": {
             "type": "string",
             "format": "date",
             "title": "発行日"
           }
         },
         "required": ["company_name", "invoice_no", "issue_date"]
       }
     },
     {
       "block_id": "invoice_details",
       "label": "明細部",
       "prompt": "請求書の明細部分から品目、数量、単価、金額を抽出してください",
       "schema": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "item_name": {
               "type": "string",
               "title": "品目"
             },
             "quantity": {
               "type": "number",
               "title": "数量"
             },
             "unit_price": {
               "type": "number",
               "title": "単価"
             },
             "amount": {
               "type": "number",
               "title": "金額"
             }
           },
           "required": ["item_name", "quantity", "unit_price", "amount"]
         }
       }
     },
     {
       "block_id": "invoice_summary",
       "label": "合計欄",
       "prompt": "請求書の合計欄から小計、消費税、合計金額を抽出してください",
       "schema": {
         "type": "object",
         "properties": {
           "subtotal": {
             "type": "number",
             "title": "小計"
           },
           "tax": {
             "type": "number",
             "title": "消費税"
           },
           "total": {
             "type": "number",
             "title": "合計金額"
           }
         },
         "required": ["subtotal", "tax", "total"]
       }
     }
   ]',
   '12345678-abcd-1234-abcd-123456789001');

-- 領収書テンプレート（経理実務最適化版）
INSERT INTO templates (id, tenant_id, name, description, version, blocks, created_by) VALUES
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 
   '領収書テンプレート', '経理実務用領収書フォーマット（適格事業者番号対応）', 1,
   '[
     {
       "block_id": "receipt_main",
       "label": "領収書基本情報",
       "prompt": "あなたは優秀な経理担当者です。受け取った領収書を画像解析して文字や金額を起こしてください。\\n\\n## 重要事項\\n- わからない項目がある場合は、正直に「N/A」と記入してください。\\n- 標準的でない形式や追加情報がある場合は、各行の注記として記載してください。\\n\\n## 出力項目（優先順位順）\\n1. 支払先会社名\\n2. 発行日\\n3. 支払金額税込\\n4. 通貨\\n5. 登録番号",
       "schema": {
         "type": "object",
         "properties": {
           "company_name": {
             "type": "string",
             "title": "支払先会社名",
             "description": "商品・サービスを提供した会社の正式名称"
           },
           "issue_date": {
             "type": "string",
             "format": "date",
             "title": "発行日",
             "description": "領収書の発行日（YYYY-MM-DD形式）"
           },
           "total_amount": {
             "type": "number",
             "title": "支払金額税込",
             "description": "消費税を含む合計支払金額"
           },
           "currency": {
             "type": "string",
             "title": "通貨",
             "default": "JPY",
             "description": "支払通貨（JPY、USD等）"
           }
         },
         "required": ["company_name", "issue_date", "total_amount", "currency"]
       }
     },
     {
       "block_id": "receipt_biz_num",
       "label": "適格事業者番号",
       "prompt": "日本の適格事業者番号Tを先頭に含む13桁（例：T123456789012）",
       "schema": {
         "type": "object",
         "properties": {
           "biz_num": {
             "type": "string",
             "title": "宛名",
             "description": "適格事業者番号"
           }
         }
       }
     }
   ]',
   '12345678-abcd-1234-abcd-123456789001');

-- 勤怠票テンプレート（デモ株式会社用）
INSERT INTO templates (id, tenant_id, name, description, version, schema_json, created_by) VALUES
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 
   '勤怠票テンプレート', '月次勤怠票のデータ抽出', 1,
   '{
     "type": "object",
     "properties": {
       "employee_name": {
         "type": "string",
         "title": "氏名"
       },
       "employee_id": {
         "type": "string",
         "title": "社員番号"
       },
       "month": {
         "type": "string",
         "title": "対象月"
       },
       "total_hours": {
         "type": "number",
         "title": "総労働時間"
       },
       "overtime_hours": {
         "type": "number",
         "title": "残業時間"
       },
       "holiday_work": {
         "type": "number",
         "title": "休日出勤日数"
       },
       "paid_leave": {
         "type": "number",
         "title": "有給消化日数"
       }
     },
     "required": ["employee_name", "month", "total_hours"]
   }',
   '12345678-abcd-1234-abcd-123456789001');


-- プロンプトテンプレート（領収書用）
-- 共通プロンプト（block_id = NULL）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('55555555-5555-5555-5555-555555555555', NULL, 'system', 
   'あなたは優秀な経理担当者として、領収書の画像から情報を正確に抽出するAIアシスタントです。', 1, true);

-- 領収書基本情報用プロンプト
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('55555555-5555-5555-5555-555555555555', 'receipt_main', 'user', 
   '領収書の情報を抽出してください：

{{schema}}

## 重要事項
- わからない項目がある場合は、"N/A"と記入してください
- 金額は数値として抽出（カンマや円マークは除去）
- 日付はYYYY-MM-DD形式で統一', 2, true);

-- 適格事業者番号用プロンプト
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('55555555-5555-5555-5555-555555555555', 'receipt_biz_num', 'user', 
   '適格事業者番号を抽出してください。

{{schema}}

- 登録番号（適格請求書発行事業者登録番号）は必ず"T"+12桁の数字です。(つまり13桁)
  - 正しい例: T123456789012
  - よくある記載: 「登録番号:T123456789012」「インボイス登録番号:T123456789012」「適格請求書発行事業者登録番号:T123456789012」
  - 領収書の下部や発行者情報の近くに記載されることが多いです', 2, true);


-- 勤怠票テンプレート（テスト商事用）
INSERT INTO templates (id, tenant_id, name, description, version, blocks, created_by) VALUES
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 
   '勤怠票テンプレート', '月次勤怠票フォーマット', 1,
   '[
     {
       "block_id": "attendance_header",
       "label": "勤怠票ヘッダー",
       "prompt": "勤怠票から社員名、社員番号、対象年月を抽出してください",
       "schema": {
         "type": "object",
         "properties": {
           "employee_name": {
             "type": "string",
             "title": "社員名"
           },
           "employee_id": {
             "type": "string",
             "title": "社員番号"
           },
           "target_month": {
             "type": "string",
             "pattern": "^[0-9]{4}-[0-9]{2}$",
             "title": "対象年月"
           }
         },
         "required": ["employee_name", "employee_id", "target_month"]
       }
     },
     {
       "block_id": "attendance_daily",
       "label": "日次勤怠",
       "prompt": "勤怠票から各日の出勤時刻、退勤時刻、休憩時間を抽出してください",
       "schema": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "date": {
               "type": "string",
               "format": "date",
               "title": "日付"
             },
             "start_time": {
               "type": "string",
               "pattern": "^[0-9]{2}:[0-9]{2}$",
               "title": "出勤時刻"
             },
             "end_time": {
               "type": "string",
               "pattern": "^[0-9]{2}:[0-9]{2}$",
               "title": "退勤時刻"
             },
             "break_time": {
               "type": "number",
               "title": "休憩時間（分）"
             }
           }
         }
       }
     }
   ]',
   '12345678-abcd-1234-abcd-123456789003');

-- プロンプトテンプレート（請求書ヘッダー用）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'invoice_header', 'system', 
   'あなたは請求書から情報を正確に抽出するAIアシスタントです。画像から指定された情報を抽出し、JSON形式で出力してください。', 1, true),
  ('44444444-4444-4444-4444-444444444444', 'invoice_header', 'user', 
   '以下の画像は{{blockLabel}}の部分です。次のJSON Schemaに従って情報を抽出してください：

{{schema}}

抽出したデータをJSON形式で出力してください。', 2, true),
  ('44444444-4444-4444-4444-444444444444', 'invoice_header', 'assistant', 
   '{
  "company_name": "株式会社サンプル",
  "invoice_no": "INV-2024-0001",
  "issue_date": "2024-01-15"
}', 3, true);

-- プロンプトテンプレート（請求書明細用）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'invoice_details', 'system', 
   'あなたは請求書の明細から情報を正確に抽出するAIアシスタントです。表形式のデータを解析し、各行の情報を配列として抽出してください。', 1, true),
  ('44444444-4444-4444-4444-444444444444', 'invoice_details', 'user', 
   '以下の画像は{{blockLabel}}の部分です。表の各行から以下の情報を抽出してください：

{{schema}}

各行のデータを配列形式のJSONで出力してください。', 2, true);

-- 全体用プロンプトテンプレート（block_id = NULL）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('66666666-6666-6666-6666-666666666666', NULL, 'system', 
   'あなたは勤怠票から情報を抽出するAIアシスタントです。日本語の勤怠票を正確に読み取り、構造化されたデータとして出力してください。', 1, true),
  ('66666666-6666-6666-6666-666666666666', NULL, 'user', 
   '以下の勤怠票画像から情報を抽出してください。

期待される出力形式：
{{exampleJson}}', 2, true);

-- エクスポートテストデータ
INSERT INTO exports (id, tenant_id, template_id, format, filter_json, file_path, file_size, status, error_message, created_by, created_at, completed_at) VALUES
  ('12345678-abcd-1234-abcd-123456789004', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'csv', 
   '{"status": ["completed"], "startDate": "2024-06-01", "endDate": "2024-06-30"}', 
   '/exports/invoice_data_20240620.csv', 2048576, 'completed', NULL, 
   '12345678-abcd-1234-abcd-123456789001', now() - interval '2 hours', now() - interval '1 hour'),
  
  ('12345678-abcd-1234-abcd-123456789005', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'xlsx', 
   '{"status": ["completed", "processing"]}', 
   '/exports/receipt_data_20240621.xlsx', 5242880, 'processing', NULL, 
   '12345678-abcd-1234-abcd-123456789001', now() - interval '30 minutes', NULL),
   
  ('12345678-abcd-1234-abcd-123456789006', '11111111-1111-1111-1111-111111111111', NULL, 'json', 
   '{"startDate": "2024-06-01", "endDate": "2024-06-15"}', 
   NULL, NULL, 'failed', 'データ取得中にタイムアウトが発生しました', 
   '12345678-abcd-1234-abcd-123456789001', now() - interval '4 hours', NULL),
   
  ('12345678-abcd-1234-abcd-123456789007', '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'pdf', 
   '{"status": ["completed"]}', 
   '/exports/timesheet_report_20240620.pdf', 1024000, 'completed', NULL, 
   '12345678-abcd-1234-abcd-123456789002', now() - interval '1 day', now() - interval '20 hours'),
   
  ('12345678-abcd-1234-abcd-123456789008', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'xml', 
   '{}', 
   NULL, NULL, 'pending', NULL, 
   '12345678-abcd-1234-abcd-123456789001', now() - interval '10 minutes', NULL);

-- ===============================================
-- Phase 8: 承認ワークフロー機能サンプルデータ
-- ===============================================

-- サンプル承認ワークフロー定義（3段階承認）
INSERT INTO workflow_definitions (id, tenant_id, name, description, version, graph_json, is_active, created_by) VALUES
  ('12345678-1234-1234-1234-123456789011', '11111111-1111-1111-1111-111111111111', 
   '請求書3段階承認', '請求書の標準的な3段階承認ワークフロー', 1,
   '{
     "nodes": [
       {"id": "start", "type": "start", "position": {"x": 100, "y": 100}},
       {"id": "pending_supervisor", "type": "approval", "position": {"x": 300, "y": 100}},
       {"id": "pending_manager", "type": "approval", "position": {"x": 500, "y": 100}},
       {"id": "approved", "type": "end", "position": {"x": 700, "y": 100}},
       {"id": "rejected", "type": "end", "position": {"x": 500, "y": 300}}
     ],
     "edges": [
       {"id": "e1", "source": "start", "target": "pending_supervisor"},
       {"id": "e2", "source": "pending_supervisor", "target": "pending_manager", "label": "承認"},
       {"id": "e3", "source": "pending_manager", "target": "approved", "label": "承認"},
       {"id": "e4", "source": "pending_supervisor", "target": "rejected", "label": "却下"},
       {"id": "e5", "source": "pending_manager", "target": "rejected", "label": "却下"}
     ]
   }', true, '12345678-abcd-1234-abcd-123456789001'),

  ('12345678-1234-1234-1234-123456789012', '11111111-1111-1111-1111-111111111111', 
   '領収書簡易承認', '領収書の簡易承認ワークフロー（1段階）', 1,
   '{
     "nodes": [
       {"id": "start", "type": "start", "position": {"x": 100, "y": 100}},
       {"id": "pending_approval", "type": "approval", "position": {"x": 300, "y": 100}},
       {"id": "approved", "type": "end", "position": {"x": 500, "y": 100}},
       {"id": "rejected", "type": "end", "position": {"x": 300, "y": 300}}
     ],
     "edges": [
       {"id": "e1", "source": "start", "target": "pending_approval"},
       {"id": "e2", "source": "pending_approval", "target": "approved", "label": "承認"},
       {"id": "e3", "source": "pending_approval", "target": "rejected", "label": "却下"}
     ]
   }', true, '12345678-abcd-1234-abcd-123456789001');

-- ワークフロー状態定義（3段階承認用）
INSERT INTO workflow_states (id, workflow_id, state_key, label, is_initial, is_final, sla_hours, notification_template) VALUES
  ('12345678-1234-1234-1234-123456789021', '12345678-1234-1234-1234-123456789011', 'start', '申請開始', true, false, NULL, NULL),
  ('12345678-1234-1234-1234-123456789022', '12345678-1234-1234-1234-123456789011', 'pending_supervisor', '係長承認待ち', false, false, 48, '係長承認をお待ちしています'),
  ('12345678-1234-1234-1234-123456789023', '12345678-1234-1234-1234-123456789011', 'pending_manager', '部長承認待ち', false, false, 72, '部長承認をお待ちしています'),
  ('12345678-1234-1234-1234-123456789024', '12345678-1234-1234-1234-123456789011', 'approved', '承認完了', false, true, NULL, '承認が完了しました'),
  ('12345678-1234-1234-1234-123456789025', '12345678-1234-1234-1234-123456789011', 'rejected', '却下', false, true, NULL, '申請が却下されました');

-- ワークフロー状態定義（簡易承認用）
INSERT INTO workflow_states (id, workflow_id, state_key, label, is_initial, is_final, sla_hours, notification_template) VALUES
  ('12345678-1234-1234-1234-123456789031', '12345678-1234-1234-1234-123456789012', 'start', '申請開始', true, false, NULL, NULL),
  ('12345678-1234-1234-1234-123456789032', '12345678-1234-1234-1234-123456789012', 'pending_approval', '承認待ち', false, false, 24, '承認をお待ちしています'),
  ('12345678-1234-1234-1234-123456789033', '12345678-1234-1234-1234-123456789012', 'approved', '承認完了', false, true, NULL, '承認が完了しました'),
  ('12345678-1234-1234-1234-123456789034', '12345678-1234-1234-1234-123456789012', 'rejected', '却下', false, true, NULL, '申請が却下されました');

-- ワークフロー遷移定義（3段階承認用）
INSERT INTO workflow_transitions (id, workflow_id, from_state_id, to_state_id, action_key, action_label, condition_expr, requires_comment, auto_advance) VALUES
  ('12345678-1234-1234-1234-123456789041', '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789021', '12345678-1234-1234-1234-123456789022', 'start_approval', '承認開始', NULL, false, true),
  ('12345678-1234-1234-1234-123456789042', '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789022', '12345678-1234-1234-1234-123456789023', 'approve', '承認', NULL, false, false),
  ('12345678-1234-1234-1234-123456789043', '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789022', '12345678-1234-1234-1234-123456789025', 'reject', '却下', NULL, true, false),
  ('12345678-1234-1234-1234-123456789044', '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789023', '12345678-1234-1234-1234-123456789024', 'approve', '最終承認', NULL, false, false),
  ('12345678-1234-1234-1234-123456789045', '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789023', '12345678-1234-1234-1234-123456789025', 'reject', '最終却下', NULL, true, false);

-- ワークフロー遷移定義（簡易承認用）
INSERT INTO workflow_transitions (id, workflow_id, from_state_id, to_state_id, action_key, action_label, condition_expr, requires_comment, auto_advance) VALUES
  ('12345678-1234-1234-1234-123456789051', '12345678-1234-1234-1234-123456789012', '12345678-1234-1234-1234-123456789031', '12345678-1234-1234-1234-123456789032', 'start_approval', '承認開始', NULL, false, true),
  ('12345678-1234-1234-1234-123456789052', '12345678-1234-1234-1234-123456789012', '12345678-1234-1234-1234-123456789032', '12345678-1234-1234-1234-123456789033', 'approve', '承認', NULL, false, false),
  ('12345678-1234-1234-1234-123456789053', '12345678-1234-1234-1234-123456789012', '12345678-1234-1234-1234-123456789032', '12345678-1234-1234-1234-123456789034', 'reject', '却下', NULL, true, false);

-- 状態アクション定義（3段階承認・係長承認待ち）
INSERT INTO state_actions (id, state_id, action_key, action_label, next_state_id, requires_role, display_order, is_default) VALUES
  ('12345678-1234-1234-1234-123456789061', '12345678-1234-1234-1234-123456789022', 'approve', '承認', '12345678-1234-1234-1234-123456789023', 'editor', 1, true),
  ('12345678-1234-1234-1234-123456789062', '12345678-1234-1234-1234-123456789022', 'reject', '却下', '12345678-1234-1234-1234-123456789025', 'editor', 2, false),
  ('12345678-1234-1234-1234-123456789063', '12345678-1234-1234-1234-123456789022', 'delegate', '代理依頼', NULL, 'editor', 3, false);

-- 状態アクション定義（3段階承認・部長承認待ち）
INSERT INTO state_actions (id, state_id, action_key, action_label, next_state_id, requires_role, display_order, is_default) VALUES
  ('12345678-1234-1234-1234-123456789064', '12345678-1234-1234-1234-123456789023', 'approve', '最終承認', '12345678-1234-1234-1234-123456789024', 'admin', 1, true),
  ('12345678-1234-1234-1234-123456789065', '12345678-1234-1234-1234-123456789023', 'reject', '最終却下', '12345678-1234-1234-1234-123456789025', 'admin', 2, false),
  ('12345678-1234-1234-1234-123456789066', '12345678-1234-1234-1234-123456789023', 'request_changes', '修正依頼', '12345678-1234-1234-1234-123456789022', 'admin', 3, false);

-- 状態アクション定義（簡易承認）
INSERT INTO state_actions (id, state_id, action_key, action_label, next_state_id, requires_role, display_order, is_default) VALUES
  ('12345678-1234-1234-1234-123456789071', '12345678-1234-1234-1234-123456789032', 'approve', '承認', '12345678-1234-1234-1234-123456789033', 'editor', 1, true),
  ('12345678-1234-1234-1234-123456789072', '12345678-1234-1234-1234-123456789032', 'reject', '却下', '12345678-1234-1234-1234-123456789034', 'editor', 2, false);

-- サンプルドキュメントデータ（承認対象）
INSERT INTO documents (id, tenant_id, template_id, file_name, file_type, file_size, storage_path, page_count, status, uploaded_by) VALUES
  ('12345678-1234-1234-1234-123456789091', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 
   'sample_invoice_001.pdf', 'application/pdf', 1024576, '/storage/invoices/sample_invoice_001.pdf', 
   1, 'pending_approval', '12345678-abcd-1234-abcd-123456789002'),
  ('12345678-1234-1234-1234-123456789092', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 
   'sample_receipt_001.pdf', 'application/pdf', 512000, '/storage/receipts/sample_receipt_001.pdf', 
   1, 'approved', '12345678-abcd-1234-abcd-123456789002');

-- 承認インスタンス（進行中）
INSERT INTO approval_instances (id, tenant_id, document_id, workflow_id, current_state_id, status, started_by, due_at, metadata) VALUES
  ('12345678-1234-1234-1234-123456789101', '11111111-1111-1111-1111-111111111111', '12345678-1234-1234-1234-123456789091', 
   '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789022', 'active', 
   '12345678-abcd-1234-abcd-123456789002', now() + interval '48 hours', 
   '{"priority": "normal", "amount": 150000, "vendor": "株式会社サンプル"}');

-- 承認インスタンス（完了済み）
INSERT INTO approval_instances (id, tenant_id, document_id, workflow_id, current_state_id, status, started_by, completed_at, metadata) VALUES
  ('12345678-1234-1234-1234-123456789102', '11111111-1111-1111-1111-111111111111', '12345678-1234-1234-1234-123456789092', 
   '12345678-1234-1234-1234-123456789012', '12345678-1234-1234-1234-123456789033', 'completed', 
   '12345678-abcd-1234-abcd-123456789002', now() - interval '1 day', 
   '{"priority": "high", "amount": 35000, "vendor": "交通費精算"}');

-- 承認ステップ（進行中の承認）
INSERT INTO approval_steps (id, instance_id, state_id, assigned_to, status, due_at) VALUES
  ('12345678-1234-1234-1234-123456789081', '12345678-1234-1234-1234-123456789101', '12345678-1234-1234-1234-123456789022', 
   '12345678-abcd-1234-abcd-123456789001', 'pending', now() + interval '48 hours');

-- 承認ステップ（完了済みの承認）
INSERT INTO approval_steps (id, instance_id, state_id, assigned_to, status, action_taken, comment, completed_at) VALUES
  ('12345678-1234-1234-1234-123456789082', '12345678-1234-1234-1234-123456789102', '12345678-1234-1234-1234-123456789032', 
   '12345678-abcd-1234-abcd-123456789001', 'approved', 'approve', '領収書の内容を確認しました。承認いたします。', now() - interval '1 day');

-- 監査ログ（承認アクション）
INSERT INTO audit_logs (tenant_id, user_id, table_name, record_id, operation, old_values, new_values, ip_address, user_agent) VALUES
  ('11111111-1111-1111-1111-111111111111', '12345678-abcd-1234-abcd-123456789001', 'approval_steps', '12345678-1234-1234-1234-123456789082', 'UPDATE',
   '{"status": "pending", "completed_at": null}', '{"status": "approved", "completed_at": "2024-06-20T10:30:00Z", "action_taken": "approve", "comment": "領収書の内容を確認しました。承認いたします。"}',
   '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- ===============================================
-- デモ動画用 追加サンプルデータ
-- ===============================================

-- プロンプトテンプレート（請求書合計欄用）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'invoice_summary', 'system', 
   'あなたは請求書の合計欄から数値情報を正確に抽出するAIアシスタントです。小計、消費税、合計金額を正確に読み取ってください。', 1, true),
  ('44444444-4444-4444-4444-444444444444', 'invoice_summary', 'user', 
   '以下の画像は{{blockLabel}}の部分です。次のJSON Schemaに従って数値情報を抽出してください：

{{schema}}

数値は必ず数字（整数または小数）として抽出し、カンマや円マークは除去してください。
抽出したデータをJSON形式で出力してください。', 2, true),
  ('44444444-4444-4444-4444-444444444444', 'invoice_summary', 'assistant', 
   '{
  "subtotal": 136364,
  "tax": 13636,
  "total": 150000
}', 3, true);

-- デモ用サンプルドキュメント（詳細データ付き）
INSERT INTO documents (id, tenant_id, template_id, file_name, file_type, file_size, storage_path, page_count, status, uploaded_by, metadata) VALUES
  ('a0000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 
   'demo_invoice_001.pdf', 'application/pdf', 1048576, '/storage/demo/demo_invoice_001.pdf', 
   1, 'uploaded', '12345678-abcd-1234-abcd-123456789002',
   '{"vendor": "株式会社デモサプライヤー", "invoice_date": "2024-06-22", "demo_purpose": true}'),
  
  ('a0000002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 
   'demo_receipt_001.pdf', 'application/pdf', 524288, '/storage/demo/demo_receipt_001.pdf', 
   1, 'uploaded', '12345678-abcd-1234-abcd-123456789002',
   '{"vendor": "交通費精算", "receipt_date": "2024-06-21", "demo_purpose": true}');

-- デモ用 範囲選択OCR結果サンプル
INSERT INTO extractions (id, document_id, block_id, coordinates, content, extracted_data, confidence, model_name, status, created_by) VALUES
  ('ae000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', 'invoice_header',
   '{"x": 50, "y": 80, "width": 500, "height": 120}',
   '{"type": "text", "value": "株式会社デモサプライヤー\\nINV-2024-0622\\n2024-06-22"}',
   '{
     "company_name": "株式会社デモサプライヤー",
     "invoice_no": "INV-2024-0622",
     "issue_date": "2024-06-22"
   }', 0.95, 'claude-3-haiku', 'completed', '12345678-abcd-1234-abcd-123456789002'),
   
  ('ae000002-0002-0002-0002-000000000002', 'a0000001-0001-0001-0001-000000000001', 'invoice_details',
   '{"x": 50, "y": 220, "width": 700, "height": 200}',
   '{"type": "table", "value": "品目\\t数量\\t単価\\t金額\\nシステム開発費\\t1\\t100,000\\t100,000\\n保守サポート費\\t2\\t18,182\\t36,364"}',
   '[
     {
       "item_name": "システム開発費",
       "quantity": 1,
       "unit_price": 100000,
       "amount": 100000
     },
     {
       "item_name": "保守サポート費",
       "quantity": 2,
       "unit_price": 18182,
       "amount": 36364
     }
   ]', 0.92, 'claude-3-haiku', 'completed', '12345678-abcd-1234-abcd-123456789002'),
   
  ('ae000003-0003-0003-0003-000000000003', 'a0000001-0001-0001-0001-000000000001', 'invoice_summary',
   '{"x": 400, "y": 450, "width": 350, "height": 150}',
   '{"type": "text", "value": "小計: 136,364\\n消費税: 13,636\\n合計: 150,000"}',
   '{
     "subtotal": 136364,
     "tax": 13636,
     "total": 150000
   }', 0.98, 'claude-3-haiku', 'completed', '12345678-abcd-1234-abcd-123456789002');

-- デモ用 点検補正履歴（records テーブル）
INSERT INTO records (id, tenant_id, document_id, extraction_id, field_name, value, value_type, metadata, validated, validated_by) VALUES
  ('a1000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000001', 'ae000002-0002-0002-0002-000000000002', 
   'quantity', '2', 'number', 
   '{"original_value": "1", "correction_reason": "OCR誤読により数量を修正", "corrected_at": "2024-06-22T12:00:00Z"}', 
   true, '12345678-abcd-1234-abcd-123456789001'),
  ('a1000002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000001', 'ae000003-0003-0003-0003-000000000003', 
   'tax', '13636', 'number', 
   '{"original_value": "12636", "correction_reason": "消費税計算ミスを修正", "corrected_at": "2024-06-22T12:05:00Z"}', 
   true, '12345678-abcd-1234-abcd-123456789001');

-- デモ用承認インスタンス（動画撮影用）
INSERT INTO approval_instances (id, tenant_id, document_id, workflow_id, current_state_id, status, started_by, due_at, metadata) VALUES
  ('aa000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000001', 
   '12345678-1234-1234-1234-123456789011', '12345678-1234-1234-1234-123456789022', 'active', 
   '12345678-abcd-1234-abcd-123456789002', now() + interval '48 hours', 
   '{"priority": "normal", "amount": 150000, "vendor": "株式会社デモサプライヤー", "demo_purpose": true}');

-- デモ用承認ステップ（係長承認待ち）
INSERT INTO approval_steps (id, instance_id, state_id, assigned_to, status, due_at, comment) VALUES
  ('a5000001-0001-0001-0001-000000000001', 'aa000001-0001-0001-0001-000000000001', '12345678-1234-1234-1234-123456789022', 
   '12345678-abcd-1234-abcd-123456789001', 'pending', now() + interval '48 hours',
   'デモ動画撮影用：システム開発費の請求書を確認してください');

-- 追加プロンプトテンプレート（デモ用詳細版）
INSERT INTO prompt_templates (template_id, block_id, role, content, sequence_order, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'invoice_details', 'assistant', 
   '[
  {
    "item_name": "システム開発費",
    "quantity": 1,
    "unit_price": 100000,
    "amount": 100000
  },
  {
    "item_name": "保守サポート費", 
    "quantity": 2,
    "unit_price": 18182,
    "amount": 36364
  }
]', 3, true);

-- デモ用エクスポートデータ
INSERT INTO exports (id, tenant_id, template_id, format, filter_json, file_path, file_size, status, created_by, created_at, completed_at) VALUES
  ('a6000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'csv', 
   '{"demo_purpose": true, "startDate": "2024-06-01", "endDate": "2024-06-30"}', 
   '/exports/demo_invoice_data_20240622.csv', 4096, 'completed', 
   '12345678-abcd-1234-abcd-123456789002', now() - interval '1 hour', now() - interval '30 minutes'),
   
  ('a6000002-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'xlsx', 
   '{"demo_purpose": true}', 
   '/exports/demo_invoice_summary_20240622.xlsx', 8192, 'processing', 
   '12345678-abcd-1234-abcd-123456789002', now() - interval '5 minutes', NULL);

-- デモ用監査ログ（OCR・点検補正・承認アクション）
INSERT INTO audit_logs (tenant_id, user_id, table_name, record_id, operation, old_values, new_values, ip_address, user_agent) VALUES
  ('11111111-1111-1111-1111-111111111111', '12345678-abcd-1234-abcd-123456789002', 'extractions', 'ae000001-0001-0001-0001-000000000001', 'INSERT',
   NULL, '{"block_id": "invoice_header", "confidence_score": 0.95, "status": "completed"}',
   '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
   
  ('11111111-1111-1111-1111-111111111111', '12345678-abcd-1234-abcd-123456789001', 'records', 'a1000001-0001-0001-0001-000000000001', 'INSERT',
   NULL, '{"field_name": "quantity", "original_value": "1", "corrected_value": "2", "correction_reason": "OCR誤読により数量を修正"}',
   '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
   
  ('11111111-1111-1111-1111-111111111111', '12345678-abcd-1234-abcd-123456789002', 'approval_instances', 'aa000001-0001-0001-0001-000000000001', 'INSERT',
   NULL, '{"workflow_id": "12345678-1234-1234-1234-123456789011", "status": "active"}',
   '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');