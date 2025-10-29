# Deploy FTP Simplificado - Doxologos
# Upload via WebClient .NET

$ftpServer = "ftp.doxologos.com.br"
$ftpUser = "u711104499.temp_deploy_2025"
$ftpPass = "doxologos#2A_ftp"
$remoteBase = "/public_html/novo"

Write-Host "🚀 Deploy para: novo.doxologos.com.br" -ForegroundColor Cyan
Write-Host ""

# Criar webclient
$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

# Função de upload
function Upload-FileToFtp {
    param($LocalPath, $RemotePath)
    try {
        $uri = "ftp://$ftpServer$RemotePath"
        Write-Host "📤 $LocalPath" -ForegroundColor Gray
        $webclient.UploadFile($uri, $LocalPath)
        Write-Host "   ✅ OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   ❌ ERRO: $_" -ForegroundColor Red
        return $false
    }
}

$success = 0
$total = 0

# Upload index.html
$total++
if (Upload-FileToFtp "dist\index.html" "$remoteBase/index.html") { $success++ }

# Upload .htaccess
$total++
if (Upload-FileToFtp ".htaccess.production" "$remoteBase/.htaccess") { $success++ }

# Upload robots.txt
if (Test-Path "dist\robots.txt") {
    $total++
    if (Upload-FileToFtp "dist\robots.txt" "$remoteBase/robots.txt") { $success++ }
}

# Upload sitemap.xml
if (Test-Path "dist\sitemap.xml") {
    $total++
    if (Upload-FileToFtp "dist\sitemap.xml" "$remoteBase/sitemap.xml") { $success++ }
}

# Upload site.webmanifest
if (Test-Path "dist\site.webmanifest") {
    $total++
    if (Upload-FileToFtp "dist\site.webmanifest" "$remoteBase/site.webmanifest") { $success++ }
}

Write-Host ""
Write-Host "📁 Uploading assets..." -ForegroundColor Yellow

# Upload CSS
Get-ChildItem "dist\assets\*.css" | ForEach-Object {
    $total++
    if (Upload-FileToFtp $_.FullName "$remoteBase/assets/$($_.Name)") { $success++ }
}

# Upload JS
Get-ChildItem "dist\assets\*.js" | ForEach-Object {
    $total++
    if (Upload-FileToFtp $_.FullName "$remoteBase/assets/$($_.Name)") { $success++ }
}

Write-Host ""
Write-Host "═══════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESUMO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════" -ForegroundColor Cyan
Write-Host "Total: $total | Sucesso: $success | Falhas: $($total - $success)" -ForegroundColor White
Write-Host ""

if ($success -eq $total) {
    Write-Host "🎉 Deploy 100% concluído!" -ForegroundColor Green
    Write-Host "🌐 https://novo.doxologos.com.br" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Deploy parcial" -ForegroundColor Yellow
}

$webclient.Dispose()
