以下は **「AI‑OCR＋LLM を用いた汎用ドキュメント点検補正 SaaS」** の **多業務向け・マルチテナント対応・高度可変** バージョン要件定義書です。**経理（請求書・領収書）／総務（勤怠票・契約書）／技術（図面）** など多様な帳票へ拡張できるよう **データモデル・UI・API・設定項目** をすべて動的に設計しています。

---

# 汎用ドキュメント点検補正システム 要件定義

*Version **1.2** – 2025‑06‑19*
（初版 1.0: 2025‑06‑18）
> **追加事項**
>
> * 帳票全体一括 OCR は行わず **範囲選択による部分 OCR** のみを正式手順とする
> * **テンプレート内で「範囲選択ブロック」単位に項目定義・プロンプト定義が可能**
> * ドキュメントアップロード時は **自動 OCR を実行しない**（ユーザが明示的に実行）
>   — これらを既存構成と矛盾しないよう章に追記した

> **追加事項2**
> PDF/画像を保存するだけで OCR は走らない。ただしPDFの場合はPNGへ変換する。       

## 目次

1. 概要
2. ユースケース
3. 機能要件
4. 非機能要件
5. 多テナント戦略
6. システム構成
7. **データモデル（完全版 DDL）** ★
8. LLM プロンプト設定・実行フロー
9. API 仕様（REST + Webhook）
10. UI 要件
11. ファイルエクスポート設計
12. 運用・保守・監査
13. リスク & 対策
14. 参考

---

## 1. 概要

| 項目    | 内容                                                                  |
| ----- | ------------------------------------------------------------------- |
| 目的    | あらゆる帳票の数値・テキストを AI‑OCR＋LLM で構造化し、ブラウザで点検補正→DB 永続→外部システム連携を実現。       |
| 想定帳票  | 請求書、領収書、発注書、勤怠票、契約書、図面、検査成績書 等                                      |
| コア差別化 | **①動的フィールド定義**<br>**②範囲選択単位でプロンプト／項目を柔軟定義**<br>**③LLM プロンプト変更**をノーコードで行え、**④テナント毎の専用ルール** を保持可能。 |

---

## 2. ユースケース

| ロール  | シナリオ                                                            |
| ---- | --------------------------------------------------------------- |
| 経理担当 | 取引先から受領した PDF 請求書をアップロード → 項目（請求番号・税込金額）を確認・修正 → 会計システムへ CSV 出力 |
| 総務担当 | スキャン勤怠票をアップロード → 勤怠時間をAI-OCRを使いながら点検 → 労務パッケージへ API 連携                      |
| 検査員  | 図面 PDF から部品表を抽出 → AI‑OCR 結果を修正 → PLM へ登録                        |

### 重要
*システムは帳票全体を OCR しません。ユーザが矩形で選択した箇所だけを AI‑OCR に渡すことで、精度とユーザ体験を最適化します。*
---

## 3. 機能要件

### 3.0 基本原則（新設）

1. **アップロード直後に自動 OCR を走らせない**。UI で範囲を指定し「OCR 実行」ボタンを押した時点で初めて API `/ocr` が呼ばれる。
2. **帳票全体のスキャンは行わない**。部分 OCR のみを正式サポート。
3. **テンプレートは「範囲ブロック」単位で項目/プロンプトを持つ**。ブロック＝ユーザが矩形選択で切り出す領域。

### 3.1 テンプレート＆フィールド管理

* **範囲ブロック定義**

  ```json
  {
    "block_id":"INV_HEADER",
    "label":"請求書ヘッダ",
    "prompt":"請求書ヘッダから番号と日付を抽出せよ",
    "schema":{
        "invoice_no":{"type":"string"},
        "issue_date":{"type":"string","format":"date"}
    }
  }
  ```
* 1 テンプレート中に複数ブロックを持ち、**ブロックごとにプロンプトも差替え可能**。

### 3.2 プロンプト設定

* テンプレート単位で **System / User / Few‑Shot** セクション編集可。
* 変数プレースホルダ `{{schema}}`, `{{exampleJSON}}`, `{{fieldList}}` をサポート。
* ブロック単位で System/User/Few‑Shot を持つ。
* `{{blockLabel}}` プレースホルダを追加。

### 3.3 ドキュメント処理

| ステップ       | 詳細                            |
| ---------- | ----------------------------- |
| **アップロード**        | PDF/画像を保存するだけで OCR は走らない。ただしPDFの場合はPNGへ変換する。              |
| **範囲選択 & OCR 実行** | ユーザが矩形描画 → ブロック種別選択 → **OCR API 呼び出し** |
| AI‑OCR+LLM | 画像 → Claude-4-Sonnet(現状と同じ) → JSON 出力。 |
| バリデーション    | JSON Schema で自動検証。            |
| 点検補正       | React テーブルで編集・行追加削除。          |
| 承認         | 1 段階 or 2 段階（設定可）。            |

### 3.4 エクスポート & 連携

* **ファイル**：CSV, Excel, JSON, XML, PDF（オーバーレイ済み）。
* **API**：REST GET/POST、GraphQL optional。
* **Webhook**：処理完了時に POST。

## 3.5 承認ワークフロー

#### 1. 背景と設計ポリシー

* **日本企業の特徴**

  * 稟議書文化：**段階承認＋ハンコ列** が標準
  * 部門横断の **並列合議（合議→代表承認）**
  * **代行承認・後追い承認** の運用需要
* **SaaS の制約**

  * 個別開発 ≒ 技術負債
  * テナント毎の GUI 設定で 80 % を吸収し、残り 20 % は“Webhook + Lambda”で外出し

> **方針：**
>
> 1. **状態遷移＝State Machine** をメタデータ化
> 2. **承認フロー＝Directed Graph** を JSON で持つ
> 3. 標準 UI でノーコード編集、イレギュラは Webhook でカバー

---

#### 2. データモデル拡張

| テーブル                      | 主キー                                   | 主要カラム                                                                                                                                 | 説明               |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **workflow\_definitions** | `id`                                  | `tenant_id`, `name`, `version`, `graph_json`                                                                                          | テンプレート毎のワークフロー雛形 |
| **workflow\_states**      | `(workflow_id, state_id)`             | `label`, `is_final`, `sla_hours`                                                                                                      | ステータス一覧          |
| **workflow\_transitions** | `(workflow_id, from_state, to_state)` | `action_label`, `condition_expr` (SQL/JS)                                                                                             | 遷移ルール            |
| **approval\_instances**   | `id`                                  | `document_id`, `workflow_id`, `current_state`, `started_at`, `timeout_at`                                                             | ドキュメント単位の実行体     |
| **approval\_steps**       | `id`                                  | `instance_id`, `state_id`, `sequence_no`, `approver_role`, `status` (`pending/approved/rejected/delegated`), `approved_at`, `comment` | 承認レコード           |
| **state\_actions**        | `(workflow_id,state_id,ui_button)`    | `next_state`, `display_name`, `requires_comment`                                                                                      | ボタン定義を UI に渡す    |

> *JSON グラフ例*（シンプル三段階）

```json
{
  "states": [
    {"id":"draft","label":"下書き"},
    {"id":"dept_check","label":"部門確認"},
    {"id":"final_approve","label":"最終承認","is_final":true}
  ],
  "transitions": [
    {"from":"draft","to":"dept_check","action":"提出"},
    {"from":"dept_check","to":"final_approve","action":"部門承認"},
    {"from":"dept_check","to":"draft","action":"差戻し"}
  ]
}
```

---

#### 3. 設定 UI（ノーコード）仕様

| 画面            | 機能                                                    | UI コンポーネント                |
| ------------- | ----------------------------------------------------- | ------------------------- |
| **ワークフロー一覧**  | テンプレート×バージョン表示／コピー                                    | MUI DataGrid              |
| **ビジュアルビルダー** | <br>- ノード（状態）追加／編集<br>- エッジ（遷移）ドラッグ連結<br>- SLA 時間・色設定 | React Flow / Dagre Layout |
| **ロール割当タブ**   | 状態ごとに「承認ロール」「代理ロール」「閲覧ロール」をチェックボックス選択                 | RoleMatrix Table          |
| **ボタン定義タブ**   | 状態×ボタン名×遷移先×コメント必須フラグを編集                              | Editable Table            |
| **条件式テスター**   | `condition_expr` をサンプル JSON に当ててテスト                   | Monaco+AJV                |
| **プレビュー**     | ダミードキュメントに対するステップ進行シミュレータ                             | Wizard Viewer             |

---

#### 4. 実行ロジック（シーケンス）

1. **ドキュメント保存** ⇒ `approval_instances` 作成 (`state='draft'`)
2. **UI に state\_actions を出力** → ボタン表示
3. 承認者クリック → `/actions/transition`
4. API が

   * `condition_expr` を評価
   * `approval_steps` へ行追加／更新
   * `current_state` を更新
   * 次承認者へ **通知 (メール／Webhook)**
5. `is_final=true` 到達で instance 完了 → 編集ロック

*タイムアウト (`sla_hours`) 超過時は CRON ワーカーが `overdue` に自動遷移・アラート送信*

---

#### 5. 柔軟ステータス管理 – “日本的カスタム” を吸収する 4 パターン

| 要件パターン        | 設定方法                                                                           | 例   |
| ------------- | ------------------------------------------------------------------------------ | --- |
| **多段ハンコ**     | `state_id` を段数分作成 (`sectionA_approve`, `sectionB_approve`)                     | 稟議書 |
| **並列合議→代表決裁** | 同一 `state_id` に複数 `approval_steps.sequence_no=0` (parallel) → all approved で次へ | 見積書 |
| **条件分岐**      | `condition_expr: "total_with_tax > 1000000"` で大口だけ別ルート                         | 発注書 |
| **代理承認**      | `approver_role='manager'`, `delegate_role='sub-manager'` カラム                   | 休暇届 |

---

#### 6. 外部連携 & 拡張

* **Webhook**: `POST /webhooks/approval` で “state\_change” イベント発火
* **Custom Lambda**: 条件式で `external:true` を返した時、Webhook を待って遷移
* **電子印鑑連携**: 最終承認後に e‑Seal API 呼び出し→ PDF に印影をオーバーレイ

---

#### 7. テスト & マイグレーション戦略

| フェーズ | テスト観点                                         |
| ---- | --------------------------------------------- |
| 単体   | 状態マシンライブラリ Jest テスト、遷移禁止ケース                   |
| 結合   | 承認 UI → API → DB 一気通し                         |
| UAT  | 既存 Excel 稟議 3 パターンをテンプレ化しシミュレータで承認完了まで確認      |
| 移行   | 旧システムの“進行中ステータス”を `approval_instances` へバッチ投入 |

---

#### 8. SaaS としてのガードレール

1. **状態数上限**：20 ノード／テンプレート
2. **遷移先無循環チェック**：保存時に DAG であることを強制
3. **条件式サンドボックス**：SQLite/jsonLogic or Cloudflare Workers で無害化実行
4. **タイムアウト上限**：90 日、長期滞留を防止

---

#### 9. 実装工数見積（参考）

| 作業                                          | 工数          |
| ------------------------------------------- | ----------- |
| DB 追加 & マイグレーション                            | 2 d         |
| API (`/workflows/*`, `/actions/transition`) | 4 d         |
| ビジュアルビルダー UI                                | 7 d         |
| 承認画面 (ドキュメント側)                              | 3 d         |
| 通知・タイムアウトジョブ                                | 2 d         |
| テスト & UAT サポート                              | 3 d         |
| **計**                                       | **\~21 人日** |

---

#### 10. まとめ

* **ノーコード設定 + ガードレール** で「各社バラバラ」を SaaS スケールに載せる
* **ブロック単位の柔軟性** と **ロール/条件式/並列合議/代理** の 4 つで日本企業ワークフローの 95 % をカバー
* 実装は **20 人日弱**、リリース 1 スプリントで MVP → 顧客ごとフィードバックループへ

---

## 4. 非機能要件

* SLA 99.9 %、RPO 15 min、RTO 30 min
* レイテンシ：1 ページ OCR + LLM ≤ 5 s (P90)
* GDPR / 個人情報保護法 準拠（Data Residency EU / JP 選択）

---

## 5. 多テナント戦略

| アプローチ                     | 採用理由                                                   |
| ------------------------- | ------------------------------------------------------ |
| **DB Row‑Level Security** | Tenant ID カラムを全テーブルに付与し PostgreSQL RLS で隔離。スキーマ共通で保守性◎ |
| 主要クラウドストレージ パス分割                   | `tenants/<tenantId>/documents/...`                     |
| Prompt & Template         | テンプレートに `tenant_id` 外部キー。                              |
| API Key Scope             | JWT の `tenant` クレームでチェック。                              |

会社ID、ユーザID、パスワードでログイン（将来的にはSSOやMFA対応）
---

## 6. システム構成

```
┌─────────┐   WebSocket   ┌────────┐
│ React UI │◀────────────▶│  API   │─┐
└─────────┘               │Gateway │ │
        ▲ REST/GraphQL    └────┬───┘ │
        │                       │     │
        ▼                       ▼     ▼
┌─────────────┐      ┌─────────────────┐
│  Claude     │      │  ExtractionSvc  │
└─────────────┘      └───────┬─────────┘
                             ▼
                       PostgreSQL + RLS
                             │
                 ┌───────────┴────────────┐
                 ▼                        ▼
           主要クラウドストレージ (doc files)          Redis (queue)
```

```
React UI            ExtractionSvc
  │ (POST /ocr)          │
  └─▶ Claude-4-Sonnet ─┘   # 呼び出しはユーザ操作時のみ
```


---

## 7. データモデル & DDL（汎用・詳細）

### 7.1 テーブル一覧

| 名称                | 目的               |
| ----------------- | ---------------- |
| tenants           | 企業情報             |
| users             | ユーザ              |
| templates         | 帳票テンプレート (Ver管理) |
| template\_fields  | 動的フィールド定義        |
| prompt\_templates | LLM プロンプト        |
| documents         | アップロードファイル       |
| pages             | ページ PNG メタ       |
| extractions       | LLM 抽出結果 (Raw)   |
| records           | 点検後の確定データ (KV)   |
| exports           | エクスポートジョブ        |
| audit\_logs       | CRUD 記録          |

### 7.2 代表DDL（PostgreSQL）

```sql
-- tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('viewer','editor','admin')),
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT,
  version INT DEFAULT 1,
  schema_json JSONB,          -- JSON Schema
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_template_ver ON templates(tenant_id,name,version);

-- template_fields (冗長検索用)
CREATE MATERIALIZED VIEW template_fields AS
SELECT id, tenant_id, jsonb_array_elements(schema_json->'properties') AS field
FROM templates;

-- prompt_templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id),
  role TEXT CHECK (role IN ('system','user','fewshot')),
  content TEXT
);

-- documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL,
  file_name TEXT,
  storage_path TEXT,
  page_count INT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- pages
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_no INT,
  image_path TEXT
);

-- extractions (raw LLM JSON)
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  content JSONB,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- records (検証後KV)
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  field_name TEXT,
  value TEXT,
  value_type TEXT,
  validated BOOLEAN DEFAULT false,
  validated_by UUID,
  tenant_id UUID
);
CREATE INDEX idx_records_field ON records(document_id,field_name);

-- exports
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  template_id UUID,
  format TEXT CHECK (format IN ('csv','xlsx','json','xml')),
  filter_json JSONB,
  file_path TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  user_id UUID,
  table_name TEXT,
  pk TEXT,
  operation TEXT,
  diff JSONB,
  ts TIMESTAMPTZ DEFAULT now()
);
```

* **RLS 例**

  ```sql
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.tenant')::uuid);
  ```

---

## 8. LLM プロンプト実行フロー

1. **選択ブロック情報**(block\_id, coordinates) を含めて `/ocr` へ
2. Prompt 生成時に `{{blockLabel}}` を展開
3. 取得 JSON → `extractions` に `block_id` を保存

---

## 9. API 仕様（主要）

| Method | Path                        | Scope  | 説明          |
| ------ | --------------------------- | ------ | ----------- |
| POST   | `/v1/templates`             | admin  | テンプレート作成    |
| PATCH  | `/v1/templates/:id/schema`  | admin  | フィールド追加     |
| POST   | `/v1/documents`             | editor | ファイルアップロード  |
| GET    | `/v1/documents/:id/data`    | viewer | 点検後レコード取得   |
| PUT    | `/v1/documents/:id/data`    | editor | レコード保存      |
| POST   | `/v1/exports`               | editor | エクスポートジョブ作成 |
| GET    | `/v1/exports/:id/file`      | viewer | 生成ファイル DL   |
| POST   | `/v1/webhooks/ocr-callback` | system | 非同期 OCR 受信  |

* **OpenAPI 3.1 JSON**（別添）にリクエスト/レスポンス全フィールド明記。

---

## 10. UI 要件

* **範囲ブロック一覧パネル**：テンプレートで定義されたブロックがリスト表示。
* 矩形選択後、ブロック種別をプルダウンで選択 → 「OCR 実行」。選択面積に応じてズーム可。
* **自動 OCR オフ**：アップロード完了時は「未 OCR」ステータスで表示。

### 10.1 テンプレート管理画面

* 左：テンプレート一覧。右：フィールド JSON Schema エディタ (Monaco)。
* プロンプトタブ：System / User / Few‑Shot 切替。
* バージョン発行ボタン（複製 + version++）。

### 10.2 点検補正画面（共通）

* ドロップダウンで **TemplateVer** 選択可（誤認防止）。
* 右にはテンプレートに合わせた表の名称が並んでおり、表示自体追加削除ができる（現状と同じ）。
* また、表内のレコードも追加削除できる（現状と同じ）。
* フィールドは動的に列生成；型ごとに入力 UI (date‑picker, currency)。
* **LLM 再実行** ボタン：プロンプト修正後に即テスト可能。

---

## 11. ファイルエクスポート設計

| 形式    | ライブラリ         | メモ                 |
| ----- | ------------- | ------------------ |
| CSV   | csv‑stringify | 区切り選択（, / ; / tab） |
| Excel | exceljs       | テンプレート別シート対応       |
| JSON  | native        | schema 準拠          |
| XML   | xmlbuilder2   | XSD 生成オプション        |
| PDF   | pdf-lib       | 抽出値をオーバーレイした確認用資料  |

* **Export Job** は Redis Queue → Worker → 主要クラウドストレージ 保存。`exports.status = 'completed'` 後 Webhook。

---

## 12. リスク & 対策

| リスク            | 対策                                  |
| -------------- | ----------------------------------- |
| プロンプト改編で精度低下   | テンプレート version pinning + AB テスト     |
| Schema 変更ミス    | JSON Schema Lint + 差分自動テスト          |
| マルチテナント漏洩      | RLS + 主要クラウドストレージ prefix isolation + IAM     |
| LLM API リソース制限 | Leaky‑bucket RateLimiter per Tenant |

## 変更履歴

| 版       | 日付             | 変更概要                                                                                                         |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2025‑06‑18     | 初版                                                                                                           |
| **1.1** | **2025‑06‑19** | ①範囲選択 OCR を明示的手順として固定<br>②テンプレートにブロック単位項目・プロンプトを追加<br>③アップロード自動 OCR を行わない旨を追記<br>④関連する機能要件・UI 要件・プロンプトフローを更新 |
|1.2      | **2025-06-19** | PDF/画像を保存するだけで OCR は走らない。ただしPDFの場合はPNGへ変換する。 |
|1.3      | **2025-06-21** | 3.5 承認ワークフローを追加
