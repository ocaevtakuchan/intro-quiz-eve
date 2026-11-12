# Eve イントロクイズ ローカルWebサーバー (PowerShell版)
# 外部依存ゼロ（Windows標準機能のみで動作）

$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    # 8080が使われている場合は別ポートで試行
    $port = 8888
    $prefix = "http://localhost:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

$root = $PSScriptRoot
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Eve イントロクイズ ローカルサーバーを起動しました！" -ForegroundColor Green
Write-Host "   URL: $prefix" -ForegroundColor Yellow
Write-Host "   終了するには Ctrl+C を押してください。" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# ブラウザを開く
Start-Process $prefix

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".wasm" = "application/wasm"
    ".sql"  = "text/plain; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORSヘッダー
        $response.Headers.Add("Access-Control-Allow-Origin", "*")

        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($localPath)) {
            $localPath = "index.html"
        }

        # URLデコード & パス結合
        $decodedPath = [System.Uri]::UnescapeDataString($localPath)
        $filePath = Join-Path $root $decodedPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $decodedPath")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }

        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
