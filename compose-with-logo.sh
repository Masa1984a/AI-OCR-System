#!/bin/bash

# SHARE LAB AI システム起動スクリプト

# スクリプトが存在するディレクトリに移動
cd "$(dirname "$0")"

# ロゴを表示
./scripts/show-logo.sh

# コンテナを起動
echo -e "\033[33m⏳ コンテナを起動しています...\033[0m"
echo ""
docker compose up -d

# 起動状態を確認
echo ""
echo -e "\033[32m✅ システム起動完了！\033[0m"
echo ""
echo -e "\033[36m📌 アクセスURL:\033[0m"
echo "   - フロントエンド: http://localhost:5173"
echo "   - バックエンドAPI: http://localhost:3000"
echo "   - Swagger UI: http://localhost:3000/api"
echo "   - MinIO Console: http://localhost:9001"
echo ""
echo -e "\033[33m💡 ヒント: 'podman compose logs -f' でログを確認できます\033[0m"