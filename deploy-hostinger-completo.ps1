# Deploy Completo - Hostinger (Do Zero)
# Dominio: novo.doxologos.com.br
# Caminho: /public_html/novo/

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETO - DOXOLOGOS" -ForegroundColor Cyan
Write-Host "  novo.doxologos.com.br" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Credenciais FTP
$ftpServer = "ftp.doxologos.com.br"
$ftpUser = "u711104499.temp_deploy_2025"
$ftpPass = "doxologos#2A_ftp"
$remotePath = "/public_html/novo"
$localPath = "dist"

$wc = New-Object System.Net.WebClient
$wc.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

Write-Host "1. Criando estrutura de diretorios..." -ForegroundColor Yellow

# Criar public_html
try {
    $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpServer/public_html")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $req.Credentials = $wc.Credentials
    $resp = $req.GetResponse()
    $resp.Close()
    Write-Host "   /public_html/ criado" -ForegroundColor Green
} catch {
    Write-Host "   /public_html/ ja existe (ok)" -ForegroundColor Gray
}

# Criar public_html/novo
try {
    $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpServer/public_html/novo")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $req.Credentials = $wc.Credentials
    $resp = $req.GetResponse()
    $resp.Close()
    Write-Host "   /public_html/novo/ criado" -ForegroundColor Green
} catch {
    Write-Host "   /public_html/novo/ ja existe (ok)" -ForegroundColor Gray
}

# Criar public_html/novo/assets
try {
    $req = [System.Net.FtpWebRequest]::Create("ftp://$ftpServer/public_html/novo/assets")
    $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    $req.Credentials = $wc.Credentials
    $resp = $req.GetResponse()
    $resp.Close()
    Write-Host "   /public_html/novo/assets/ criado" -ForegroundColor Green
} catch {
    Write-Host "   /public_html/novo/assets/ ja existe (ok)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "2. Fazendo upload dos arquivos..." -ForegroundColor Yellow
Write-Host ""

$uploaded = 0
$failed = 0

# Funcao de upload
function Upload-File {
    param($local, $remote, $name)
    try {
        Write-Host "   [$name]" -NoNewline
        $wc.UploadFile("ftp://$ftpServer$remote", $local)
        Write-Host " OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host " ERRO" -ForegroundColor Red
        Write-Host "      $_" -ForegroundColor Gray
        return $false
    }
}

# Upload dos arquivos principais
if (Upload-File "$localPath\index.html" "$remotePath/index.html" "index.html") { $uploaded++ } else { $failed++ }
if (Upload-File ".htaccess.production" "$remotePath/.htaccess" ".htaccess") { $uploaded++ } else { $failed++ }
if (Upload-File "$localPath\favicon.svg" "$remotePath/favicon.svg" "favicon.svg") { $uploaded++ } else { $failed++ }
if (Upload-File "$localPath\robots.txt" "$remotePath/robots.txt" "robots.txt") { $uploaded++ } else { $failed++ }
if (Upload-File "$localPath\sitemap.xml" "$remotePath/sitemap.xml" "sitemap.xml") { $uploaded++ } else { $failed++ }
if (Upload-File "$localPath\site.webmanifest" "$remotePath/site.webmanifest" "site.webmanifest") { $uploaded++ } else { $failed++ }

if (Test-Path "$localPath\llms.txt") {
    if (Upload-File "$localPath\llms.txt" "$remotePath/llms.txt" "llms.txt") { $uploaded++ } else { $failed++ }
}

# Upload CSS
Write-Host ""
Write-Host "   Assets CSS:" -ForegroundColor Cyan
Get-ChildItem "$localPath\assets\*.css" | ForEach-Object {
    if (Upload-File $_.FullName "$remotePath/assets/$($_.Name)" "   $($_.Name)") { $uploaded++ } else { $failed++ }
}

# Upload JS
Write-Host ""
Write-Host "   Assets JS:" -ForegroundColor Cyan
Get-ChildItem "$localPath\assets\*.js" | ForEach-Object {
    if (Upload-File $_.FullName "$remotePath/assets/$($_.Name)" "   $($_.Name)") { $uploaded++ } else { $failed++ }
}

$wc.Dispose()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY FINALIZADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enviados: $uploaded arquivos" -ForegroundColor Green
Write-Host "Falhas: $failed arquivos" -ForegroundColor $(if($failed -gt 0){"Red"}else{"Green"})
Write-Host ""

if ($failed -eq 0) {
    Write-Host "SUCESSO! Aplicacao publicada em:" -ForegroundColor Green
    Write-Host "https://novo.doxologos.com.br" -ForegroundColor Cyan
} else {
    Write-Host "ATENCAO: Houve falhas no upload!" -ForegroundColor Yellow
}

Write-Host ""
