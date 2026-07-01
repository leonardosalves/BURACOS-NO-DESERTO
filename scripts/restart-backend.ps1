# Reinicia o backend Lumiera (porta 3005)
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$NotebookLmData = Join-Path $RepoRoot ".notebooklm-data"
$env:NOTEBOOKLM_MCP_CLI_PATH = $NotebookLmData
if (-not (Test-Path $NotebookLmData)) {
    New-Item -ItemType Directory -Path $NotebookLmData -Force | Out-Null
}

$connections = Get-NetTCPConnection -LocalPort 3005
foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force
}
Start-Sleep -Seconds 1

# Só pede login se a sessão expirou — não abre navegador a cada restart
$check = & nlm login --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "NotebookLM: sessão expirada ou ausente. Rode: .\nlm-login.ps1" -ForegroundColor Yellow
} else {
    Write-Host "NotebookLM: sessão OK ($NotebookLmData)" -ForegroundColor DarkGray
}

$backendDir = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "dashboard-qanat") "backend"
Set-Location $backendDir
Write-Host "Iniciando backend em http://127.0.0.1:3005 ..."
node server.js