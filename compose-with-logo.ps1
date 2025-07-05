# SHARE LAB AI システム起動スクリプト (PowerShell版)

# スクリプトの場所に移動
Set-Location -Path $PSScriptRoot

# ロゴを表示
Write-Host ""
Write-Host -ForegroundColor Cyan @"
 ███████╗ ██╗  ██╗  █████╗  ██████╗  ███████╗     ██╗       █████╗  ██████╗           █████╗  ██╗
 ██╔════╝ ██║  ██║ ██╔══██╗ ██╔══██╗ ██╔════╝     ██║      ██╔══██╗ ██╔══██╗         ██╔══██╗ ██║
 ███████╗ ███████║ ███████║ ██████╔╝ █████╗       ██║      ███████║ ██████╔╝         ███████║ ██║
 ╚════██║ ██╔══██║ ██╔══██║ ██╔══██╗ ██╔══╝       ██║      ██╔══██║ ██╔══██╗         ██╔══██║ ██║
 ███████║ ██║  ██║ ██║  ██║ ██║  ██║ ███████╗     ███████╗ ██║  ██║ ██████╔╝ ██╗     ██║  ██║ ██║
 ╚══════╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚══════╝     ╚══════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═╝     ╚═╝  ╚═╝ ╚═╝
"@
Write-Host ""
Write-Host -ForegroundColor Green "🚀 汎用ドキュメント点検補正システム 起動中..."
Write-Host ""

# コンテナを起動
Write-Host -ForegroundColor Yellow "⏳ コンテナを起動しています..."
Write-Host ""
podman compose up -d

# 起動結果を確認
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host -ForegroundColor Green "✅ システム起動完了！"
    Write-Host ""
    Write-Host -ForegroundColor Cyan "📌 アクセスURL:"
    Write-Host "   - フロントエンド: http://localhost:5173"
    Write-Host "   - バックエンドAPI: http://localhost:3000"
    Write-Host "   - Swagger UI: http://localhost:3000/api"
    Write-Host "   - MinIO Console: http://localhost:9001"
    Write-Host ""
    Write-Host -ForegroundColor Yellow "💡 ヒント: 'podman compose logs -f' でログを確認できます"
} else {
    Write-Host ""
    Write-Host -ForegroundColor Red "❌ エラーが発生しました。ログを確認してください。"
    exit 1
}