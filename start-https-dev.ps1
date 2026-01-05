# Script para iniciar dev server com HTTPS via Cloudflare Tunnel
# Uso: powershell -ExecutionPolicy Bypass -File start-https-dev.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Doxologos - Dev Server com HTTPS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verificar se cloudflared existe
$cloudflaredPath = ".\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "ERRO: cloudflared.exe nao encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '.\cloudflared.exe'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Iniciando dev server..." -ForegroundColor Cyan
Write-Host ""

# Iniciar dev server em background
$devServer = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

Write-Host "Aguardando dev server inicializar (8 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Criando tunel HTTPS..." -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar o tunel" -ForegroundColor Yellow
Write-Host ""

# Iniciar túnel
& $cloudflaredPath tunnel --url http://localhost:3000

# Cleanup quando parar
Write-Host ""
Write-Host "Parando dev server..." -ForegroundColor Yellow
Stop-Process -Id $devServer.Id -Force -ErrorAction SilentlyContinue
Write-Host "Servidor parado!" -ForegroundColor Green
