# Deploy FTP - Doxologos Frontend
# Uso: powershell -ExecutionPolicy Bypass -File deploy-prod.ps1

param(
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy: novo.doxologos.com.br" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Configurações FTP
$ftpServer = "ftp.doxologos.com.br"
$ftpUser = "u711104499.temp_deploy_2025"
$ftpPass = "doxologos#2A_ftp"
$remoteBase = "/public_html/novo"

# 1. Build (se não estiver pulando)
if (-not $SkipBuild) {
    Write-Host "1. Gerando build de producao..." -ForegroundColor Cyan
    try {
        $output = npx vite build 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Build falhou"
        }
        Write-Host "   Build concluido!" -ForegroundColor Green
    }
    catch {
        Write-Host "   ERRO no build: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "1. Pulando build (usando dist/ existente)..." -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar pasta dist
if (-not (Test-Path "dist")) {
    Write-Host "ERRO: Pasta dist/ nao encontrada!" -ForegroundColor Red
    exit 1
}

# 3. Criar webclient
Write-Host "2. Conectando ao servidor FTP..." -ForegroundColor Cyan
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

Write-Host "   Conectado!" -ForegroundColor Green
Write-Host ""

# 4. Upload de arquivos
Write-Host "3. Fazendo upload dos arquivos..." -ForegroundColor Cyan
Write-Host ""

$uploaded = 0
$failed = 0

function Upload-File {
    param($LocalPath, $RemotePath)
    try {
        $uri = "ftp://$ftpServer$RemotePath"
        $fileName = Split-Path $LocalPath -Leaf
        Write-Host "   Uploading: $fileName" -ForegroundColor Gray
        $webclient.UploadFile($uri, $LocalPath)
        Write-Host "   OK: $fileName" -ForegroundColor Green
        $script:uploaded++
        return $true
    }
    catch {
        Write-Host "   ERRO: $fileName - $_" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

# Upload index.html
Upload-File "dist\index.html" "$remoteBase/index.html" | Out-Null

# Upload .htaccess se existir
if (Test-Path ".htaccess.production") {
    Upload-File ".htaccess.production" "$remoteBase/.htaccess" | Out-Null
}

# Upload robots.txt
if (Test-Path "dist\robots.txt") {
    Upload-File "dist\robots.txt" "$remoteBase/robots.txt" | Out-Null
}

# Upload sitemap.xml
if (Test-Path "dist\sitemap.xml") {
    Upload-File "dist\sitemap.xml" "$remoteBase/sitemap.xml" | Out-Null
}

# Upload pasta assets
Write-Host ""
Write-Host "   Uploading assets..." -ForegroundColor Gray

$assetsFiles = Get-ChildItem "dist\assets" -File
foreach ($file in $assetsFiles) {
    Upload-File $file.FullName "$remoteBase/assets/$($file.Name)" | Out-Null
}

# Upload outras pastas se existirem
$folders = @("img", "images", "fonts", "public")
foreach ($folder in $folders) {
    if (Test-Path "dist\$folder") {
        Write-Host ""
        Write-Host "   Uploading $folder..." -ForegroundColor Gray
        $files = Get-ChildItem "dist\$folder" -File -Recurse
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring((Resolve-Path "dist").Path.Length + 1).Replace("\", "/")
            Upload-File $file.FullName "$remoteBase/$relativePath" | Out-Null
        }
    }
}

# Limpar
$webclient.Dispose()

# 5. Resultado
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy Concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos enviados: $uploaded" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "Arquivos com erro: $failed" -ForegroundColor Red
}
Write-Host ""
Write-Host "URL: https://novo.doxologos.com.br" -ForegroundColor Cyan
Write-Host ""
Write-Host "Teste o pagamento com cartao em:" -ForegroundColor Yellow
Write-Host "https://novo.doxologos.com.br/checkout-direct" -ForegroundColor Cyan
Write-Host ""
