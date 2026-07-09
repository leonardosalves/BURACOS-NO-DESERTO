# Inicia Lumiera Studio e abre o dashboard (uniport :3005 ou dev :5176).
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

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