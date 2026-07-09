# Abre o dashboard no navegador (3005 uniport ou 5176 dev).
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")
$url = Get-LumieraDashboardUrl
Start-Process $url | Out-Null