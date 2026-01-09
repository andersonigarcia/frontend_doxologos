# ================================================
# Script de Deploy: Webhook Corrigido
# Data: 2026-01-08
# ================================================

Write-Host "🚀 Iniciando deploy do webhook corrigido..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
$currentDir = Get-Location
if (-not (Test-Path "supabase\functions\mp-webhook\index.ts")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# 1. Verificar se Supabase CLI está instalado
Write-Host "📦 Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseCmd = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ npx não encontrado. Instale Node.js primeiro." -ForegroundColor Red
    exit 1
}

# 2. Deploy do webhook
Write-Host ""
Write-Host "🔄 Fazendo deploy do mp-webhook..." -ForegroundColor Yellow
npx supabase functions deploy mp-webhook

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no deploy do webhook" -ForegroundColor Red
    exit 1
}

# 3. Deploy do mp-create-payment (também foi atualizado)
Write-Host ""
Write-Host "🔄 Fazendo deploy do mp-create-payment..." -ForegroundColor Yellow
npx supabase functions deploy mp-create-payment

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️ Aviso: Erro no deploy do mp-create-payment" -ForegroundColor Yellow
    Write-Host "   O webhook principal foi deployado com sucesso" -ForegroundColor Yellow
}

# 4. Sucesso
Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Execute o script de sincronização: database/scripts/sync_existing_bookings.sql"
Write-Host "  2. Faça um pagamento de teste"
Write-Host "  3. Monitore os logs: database/scripts/webhook_health_check.sql"
Write-Host ""
