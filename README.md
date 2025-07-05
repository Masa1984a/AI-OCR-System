# 汎用ドキュメント点検補正システム

AIドリブン開発ツールとコンテナ技術を活用した、ドキュメントのOCR処理と点検補正を行うWebアプリケーションです。React（フロントエンド）とNest.js（バックエンド）で構築されており、Claude・Gemini等のAIモデルを使用してドキュメント内容を自動抽出します。

![システム概要](https://img.shields.io/badge/Frontend-React_+_TypeScript-blue)
![バックエンド](https://img.shields.io/badge/Backend-NestJS_+_TypeScript-red)
![データベース](https://img.shields.io/badge/Database-PostgreSQL-blue)
![AI](https://img.shields.io/badge/AI-Claude_+_Gemini-green)

## 主な機能

- **AIドリブンOCR**: Claude、Gemini等のLLMを使用した高精度文字認識
- **範囲選択OCR**: ドキュメント内の任意の範囲を選択してOCR実行
- **テンプレート管理**: 業務別にドキュメントフォーマットを定義
- **点検補正機能**: OCR結果の手動編集・修正
- **承認ワークフロー**: 多段階承認プロセスの管理
- **エクスポート機能**: CSV、JSON、XML等の形式でデータ出力

## 前提条件

以下のツールがインストール済みであることを確認してください：

- ✅ **AI駆動開発ツール**（いずれか一つ）
  - [GitHub Copilot](https://github.com/features/copilot)
  - [Gemini CLI](https://ai.google.dev/gemini-api)
  - [Claude Code](https://claude.ai/code)
  - [Roo Code](https://roo.dev/) など
- ✅ **コンテナランタイム**（いずれか一つ）
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - [Podman](https://podman.io/getting-started/installation) （推奨：軽量）
- ✅ **Git**
  - [Git for Windows](https://gitforwindows.org/) （Windows）
  - または既存のGitクライアント
- ✅ **GitHubアカウント**
  - [GitHub アカウント作成](https://github.com/signup) （未作成の場合）
- ✅ **Googleアカウント**
  - [Google アカウント作成](https://accounts.google.com/signup) （未作成の場合）

## 📋 利用手順

### 0. 事前準備：GeminiのAPIキー取得

システムのAI機能を利用するために、まずGoogle GeminiのAPIキーを取得します。

#### 手順1：Google AI Studioにアクセス

1. ウェブブラウザで以下のURLを開きます：
   ```
   https://aistudio.google.com/
   ```
2. **「Sign in」** または **「ログイン」** ボタンをクリック
3. お持ちのGoogleアカウントでログイン
4. 利用規約が表示された場合は、内容を確認して **「同意する」** をクリック

#### 手順2：Google Cloud プロジェクトを作成

1. Google AI Studio画面の左側メニューから **「</> Get API key」**（APIキーを取得）をクリック
2. **「APIキーを取得」** ページが表示されます
3. **「Create API key in new project」**（新しいプロジェクトでAPIキーを作成）ボタンをクリック
4. 新しいGoogle Cloudプロジェクトが自動的に作成されます（1-2分かかる場合があります）

#### 手順3：APIキーの生成と保管

1. プロジェクト作成完了後、画面に **「Your API key」**（あなたのAPIキー）として長い文字列が表示されます
   - 例：`AIzaSyD-9tIhRt****************YOUR_KEY****************`
2. APIキーの右側にある **「コピー」** ボタン（📋アイコン）をクリック
3. **【重要】** コピーしたAPIキーを安全な場所に保管してください
   - パスワード管理ツール（推奨）
   - 自分だけがアクセスできるテキストファイル
   - ⚠️ **このキーは第三者に知られないよう厳重に管理してください**

#### 手順4：APIキーの動作確認

1. Google AI Studio画面で **「Chat」** または **「Prompt」** をクリック
2. 簡単なテスト入力（例：「こんにちは」）を実行
3. Geminiからの応答が表示されれば、APIキーが正常に動作しています

### 1. リポジトリのフォーク

1. GitHubの本リポジトリページで **「Fork」** ボタンをクリック
2. 自分のGitHubアカウントにリポジトリをフォーク

### 2. プロジェクトのクローン

```bash
# forkしたリポジトリのURLを使用（YOUR_USERNAMEは自分のGitHubユーザー名）
git clone https://github.com/YOUR_USERNAME/generic-document-correction-system.git
cd generic-document-correction-system
```

### 3. 環境設定ファイルの準備

```bash
# .env.example を .env にコピー
cp .env.example .env
```

### 4. GeminiのAPIキーを設定

**「### 0. 事前準備」** で取得したAPIキーを、テキストエディタで `.env` ファイルを開き、以下の行を編集：

```bash
# 変更前
GEMINI_API_KEY=your-gemini-api-key-here

# 変更後（事前準備で取得したAPIキーに置き換え）
GEMINI_API_KEY=AIzaSyD-9tIhRt******YOUR_ACTUAL_API_KEY_HERE******
```

### 5. コンテナの起動

**Docker Composeを使用する場合：**
```bash
docker compose up -d
```

**Podman Composeを使用する場合：**
```bash
podman compose up -d
```

起動完了まで1-2分待ちます。

### 6. ブラウザでアプリケーションを開く

ブラウザで以下のURLにアクセス：
```
http://localhost:5173
```

### 7. ログイン

以下のデモアカウントでログイン：

**管理者アカウント：**
- **企業ID**: `デモ株式会社`
- **メールアドレス**: `admin@demo.com` 
- **パスワード**: `demo123`

**一般ユーザーアカウント：**
- **企業ID**: `デモ株式会社`
- **メールアドレス**: `user@demo.com`
- **パスワード**: `demo123`

### 8. LLMモデル設定の変更

1. ログイン後、画面下部のナビゲーションで **「設定」** タブ（歯車アイコン）をクリック
2. **「AI・OCR設定」** タブが選択されていることを確認
3. **「デフォルトモデル」** のドロップダウンをクリック
4. **「Gemini 2.0 Flash」** を選択
5. 下部の **「LLM設定を保存」** ボタンをクリック
6. 緑色の成功メッセージ「LLM設定が保存されました」が表示されることを確認

### 9. ドキュメントのアップロード

1. 画面下部のナビゲーションで **「ドキュメント」** タブ（ダッシュボードアイコン）をクリック
2. 右上の **「ドキュメントアップロード」** ボタンをクリック
3. **「ドキュメントアップロード」** ダイアログが表示されます

### 10. テンプレートの選択

1. **「テンプレート」** ドロップダウンをクリック
2. **「領収書テンプレート (v1)」** を選択
3. **「ファイルを選択」** ボタンをクリック
4. 領収書の画像ファイル（PDF、PNG、JPG）を選択
   - サポート形式：`.pdf`, `.png`, `.jpg`, `.jpeg`
5. **「アップロード」** ボタンをクリック

### 11. ドキュメント詳細画面への移動

1. アップロード完了後、**「最近のドキュメント」** セクションに新しいドキュメントが表示されます
2. そのドキュメントの **「詳細表示」** ボタンをクリック

### 12. 範囲選択OCRの実行

1. ドキュメント詳細画面で、右側に **「領収書基本情報」** ボタンが表示されています
2. **「領収書基本情報」** ボタンをクリック
3. 画面左側のドキュメント画像で、抽出したい範囲をマウスでドラッグして選択
   - 例：会社名、金額、日付が記載されている領域
4. 範囲選択後、自動的にOCR処理が開始されます
5. 処理完了後、右側にOCR結果が表示されます

### 13. OCR結果の確認と編集

1. 右側パネルに以下の形式でOCR結果が表示されます：
   ```json
   {
     "company_name": "○○商事株式会社",
     "issue_date": "2024-03-15",
     "total_amount": 10800,
     "currency": "JPY"
   }
   ```
2. 必要に応じて **「編集」** ボタン（ペンアイコン）をクリックして結果を修正
3. 修正後は **「保存」** ボタンをクリック

## 🔧 トラブルシューティング

### コンテナが起動しない場合

```bash
# コンテナの状態確認
docker compose ps
# または
podman compose ps

# ログの確認
docker compose logs
# または
podman compose logs
```

### データベース接続エラーの場合

```bash
# コンテナの再起動
docker compose down
docker compose up -d
# または
podman compose down
podman compose up -d
```

### ファイルアップロードエラーの場合

1. ファイルサイズが30MB以下であることを確認
2. ファイル形式がPDF、PNG、JPG、JPEGであることを確認
3. ブラウザのコンソールでエラーメッセージを確認

### LLM設定エラーの場合

1. `.env` ファイルの `GEMINI_API_KEY` が正しく設定されていることを確認
2. APIキーの有効性をGoogle AI Studioで確認
3. バックエンドコンテナを再起動

## 🚀 学習のポイント

### React初学者向け

- **コンポーネント構造**: `frontend/src/pages/` と `frontend/src/components/` の役割分担
- **状態管理**: `useState` と `useEffect` の使い方
- **API通信**: `services/api.ts` でのHTTP通信パターン
- **ルーティング**: React Routerによるページ遷移

### コンテナ初学者向け

- **Docker Compose**: 複数サービスの連携方法
- **環境変数**: `.env` ファイルでの設定管理
- **ボリューム**: データ永続化の仕組み
- **ネットワーク**: コンテナ間通信の基本

### AI統合初学者向け

- **LLM API**: Claude・Gemini APIの使い分け
- **プロンプトエンジニアリング**: `database/init/02_dml.sql` のプロンプト例
- **画像解析**: OCRでの文字認識プロセス

## 📖 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Material-UI (MUI)** - UIコンポーネント
- **React Router** - ページルーティング
- **PDF.js** - PDF表示

### バックエンド
- **NestJS** + **TypeScript**
- **TypeORM** - データベースORM
- **PostgreSQL** - メインデータベース
- **Redis** - キャッシュ・セッション管理
- **MinIO** - ファイルストレージ

### AI・機械学習
- **Claude (Anthropic)** - 高精度テキスト解析
- **Gemini (Google)** - 画像・テキスト理解
- **Sharp** - 画像処理・クロップ

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご確認ください。

## 🤝 貢献

プルリクエストやIssueは大歓迎です。機能追加や改善提案がございましたら、お気軽にContributeしてください。

## 📧 サポート

質問や技術的な問題については、[Issues](https://github.com/Masa1984a/AI-OCR-System/issues) にてお気軽にお尋ねください。

---

**Happy Coding! 🚀**

*このプロジェクトは、AI駆動開発と、Webサービス、コンテナ技術の学習を目的とした実践的なWebアプリケーションです。*