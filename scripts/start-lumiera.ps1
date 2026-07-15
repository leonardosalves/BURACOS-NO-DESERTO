# Inicia Lumiera Studio e abre o dashboard (uniport :3005 ou dev :5176).
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

# Remove caches Remotion/Puppeteer deixados por execucoes encerradas antes do boot atual.
# Falhas de limpeza nunca impedem a inicializacao do Studio.
& (Join-Path $PSScriptRoot "cleanup-lumiera-temp.ps1") -Apply -Quiet | Out-Null

Write-Host "Lumiera Studio" -ForegroundColor Magenta

& (Join-Path $PSScriptRoot "ensure-lumiera.ps1") -Quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao iniciar. Veja .lumiera-logs\" -ForegroundColor Red
    exit 1
}

$url = Get-LumieraDashboardUrl
Write-Host "Dashboard OK em $url" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process $url
}
exit 0
