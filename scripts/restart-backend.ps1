# Reinicia o backend Lumiera (porta 3005) - com log em .lumiera-logs/
# Padrao: so reinicia se offline. Use -Force apos mudar codigo do backend.
param(
    [switch]$Force
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$check = & nlm login --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "NotebookLM: sessao expirada ou ausente. Rode: .\nlm-login.ps1" -ForegroundColor Yellow
} else {
    Write-Host "NotebookLM: sessao OK ($script:NotebookLmData)" -ForegroundColor DarkGray
}

if ($Force) {
    Write-Host "Reinicio FORCADO do backend (codigo alterado)..." -ForegroundColor Yellow
    $ok = Start-LumieraBackendProcess -ForceRestart
} else {
    Write-Host "Garantindo backend em http://127.0.0.1:3005 (sem derrubar se ja estiver OK)..." -ForegroundColor Cyan
    $ok = Start-LumieraBackendProcess
}

if ($ok) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
} else {
    Write-Host "Falha ao subir - veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
    exit 1
}