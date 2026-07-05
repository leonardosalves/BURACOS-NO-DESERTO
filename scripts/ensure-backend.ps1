# Sobe o backend apenas se estiver offline (nunca derruba processo saudavel).
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$ok = Start-LumieraBackendProcess
if ($ok) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
    exit 0
}
Write-Host "Falha ao garantir backend - veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
exit 1