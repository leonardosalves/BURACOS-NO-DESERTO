# Reinicia o backend Lumiera (porta 3005) - com log em .lumiera-logs/
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$check = & nlm login --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "NotebookLM: sessao expirada ou ausente. Rode: .\nlm-login.ps1" -ForegroundColor Yellow
} else {
    Write-Host "NotebookLM: sessao OK ($script:NotebookLmData)" -ForegroundColor DarkGray
}

Write-Host "Iniciando backend em http://127.0.0.1:3005 ..."
$ok = Start-LumieraBackendProcess -ForceRestart
if ($ok) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
} else {
    Write-Host "Falha ao subir - veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
}