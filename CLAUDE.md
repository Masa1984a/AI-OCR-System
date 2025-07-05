PC上ではWindows11のPowerShellを使います。BashではなくPowerShellで出力ください。PowerShellなのでgrepやtailが使えない点、考慮してください。
nmpコマンド等は私がやります。
ファイルの作成や参照はあなたが対応してください。
Webサーバ、DBサーバはContainerを作ってください。端末上にはインストールしない。
Container関連はPodmanコマンドを使います。
`podman-compose`ではなく、`podman compose`が正しい。
これまでの仕組みはGitHubに保存されています。既存ソースコードを参考にしつつ、新規システムとしてコーディングしてください。
データはすべてサンプルなので、データ移行は不要です。DDLも移行用ではなく初回稼動用に作り直してください。
作業のために一時的に保存する必要がある場合、本企画フォルダ内に「tmp」フォルダを作成し、その中に作成してください。
下記コマンドは私が実行します。あなたが実行するのではなく、実行するべきコマンドの提供をお願いします。
- podman compose down
- podman compose down -v
- podman compose up -d
- podman compose down database && podman compose up -d database
- podman volume rm 
- podman logs
- podman images
- podman logs backend
- cd /workspace/backend && npm run build
- cd /workspace/frontend && npm run build
- node generate_hash.js
