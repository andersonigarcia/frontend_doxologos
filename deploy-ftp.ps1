# Script de Deploy FTP - Doxologos
# Domínio: novo.doxologos.com.br
# Data: 28/10/2025

Write-Host "🚀 Iniciando deploy FTP para Hostinger..." -ForegroundColor Cyan
Write-Host ""

# Configurações FTP
$ftpServer = "ftp://ftp.doxologos.com.br"
$ftpUser = "u711104499.temp_deploy_2025"
$ftpPass = "doxologos#2A_ftp"
$remoteDir = "/public_html/novo"
$localDir = "dist"

# Verificar se a pasta dist existe
if (-not (Test-Path $localDir)) {
    Write-Host "❌ Erro: Pasta 'dist' não encontrada!" -ForegroundColor Red
    Write-Host "Execute 'npm run build' antes de fazer o deploy." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Pasta dist encontrada" -ForegroundColor Green

# Função para fazer upload de arquivo
function Upload-File {
    param (
        [string]$LocalFile,
        [string]$RemoteFile
    )
    
    try {
        $uri = "$ftpServer$RemoteFile"
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        
        Write-Host "  📤 Uploading: $LocalFile" -ForegroundColor Gray
        $webclient.UploadFile($uri, $LocalFile)
        
        return $true
    }
    catch {
        Write-Host "  ❌ Erro ao enviar $LocalFile : $_" -ForegroundColor Red
        return $false
    }
}

# Função para criar diretório FTP
function Create-FtpDirectory {
    param (
        [string]$RemotePath
    )
    
    try {
        $uri = "$ftpServer$RemotePath"
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        
        $response = $request.GetResponse()
        $response.Close()
        
        return $true
    }
    catch {
        # Diretório pode já existir, não é erro crítico
        return $false
    }
}

Write-Host ""
Write-Host "📁 Criando estrutura de diretórios..." -ForegroundColor Cyan

# Criar diretórios principais
Create-FtpDirectory "$remoteDir" | Out-Null
Create-FtpDirectory "$remoteDir/assets" | Out-Null

Write-Host "✅ Estrutura de diretórios criada" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Iniciando upload de arquivos..." -ForegroundColor Cyan

$totalFiles = 0
$successFiles = 0
$failedFiles = 0

# Upload do index.html
if (Test-Path "$localDir/index.html") {
    $totalFiles++
    if (Upload-File "$localDir/index.html" "$remoteDir/index.html") {
        $successFiles++
    } else {
        $failedFiles++
    }
}

# Upload do .htaccess
if (Test-Path ".htaccess.production") {
    $totalFiles++
    Write-Host "  📤 Uploading: .htaccess" -ForegroundColor Gray
    if (Upload-File ".htaccess.production" "$remoteDir/.htaccess") {
        $successFiles++
    } else {
        $failedFiles++
    }
}

# Upload de robots.txt e sitemap.xml
@("robots.txt", "sitemap.xml", "site.webmanifest") | ForEach-Object {
    if (Test-Path "$localDir/$_") {
        $totalFiles++
        if (Upload-File "$localDir/$_" "$remoteDir/$_") {
            $successFiles++
        } else {
            $failedFiles++
        }
    }
}

# Upload da pasta assets
if (Test-Path "$localDir/assets") {
    Write-Host ""
    Write-Host "  📁 Uploading pasta assets/..." -ForegroundColor Yellow
    
    Get-ChildItem "$localDir/assets" -File | ForEach-Object {
        $totalFiles++
        if (Upload-File $_.FullName "$remoteDir/assets/$($_.Name)") {
            $successFiles++
        } else {
            $failedFiles++
        }
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESUMO DO DEPLOY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Total de arquivos: $totalFiles" -ForegroundColor White
Write-Host "  ✅ Sucesso: $successFiles" -ForegroundColor Green
Write-Host "  ❌ Falhas: $failedFiles" -ForegroundColor Red
Write-Host ""

if ($failedFiles -eq 0) {
    Write-Host "🎉 Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Acesse: https://novo.doxologos.com.br" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "  1. Verifique se o SSL está ativo" -ForegroundColor White
    Write-Host "  2. Configure o Supabase (novo projeto)" -ForegroundColor White
    Write-Host "  3. Atualize .env.production com credenciais do Supabase" -ForegroundColor White
    Write-Host "  4. Gere novo build e faça upload novamente" -ForegroundColor White
} else {
    Write-Host "⚠️  Deploy concluído com erros" -ForegroundColor Yellow
    Write-Host "Verifique os arquivos que falharam e tente novamente." -ForegroundColor White
}

Write-Host ""
