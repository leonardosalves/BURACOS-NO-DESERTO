# Reinicia o backend Lumiera (porta 3005) em processo separado
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$NotebookLmData = Join-Path $RepoRoot ".notebooklm-data"
$env:NOTEBOOKLM_MCP_CLI_PATH = $NotebookLmData
if (-not (Test-Path $NotebookLmData)) {
    New-Item -ItemType Directory -Path $NotebookLmData -Force | Out-Null
}

$connections = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

$check = & nlm login --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "NotebookLM: sessao expirada ou ausente. Rode: .\nlm-login.ps1" -ForegroundColor Yellow
} else {
    Write-Host "NotebookLM: sessao OK ($NotebookLmData)" -ForegroundColor DarkGray
}

$backendDir = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "dashboard-qanat") "backend"
Write-Host "Iniciando backend em http://127.0.0.1:3005 ..."
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $backendDir -WindowStyle Hidden

$ready = $false
$deadline = (Get-Date).AddSeconds(25)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3005/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
}

if ($ready) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
} else {
    Write-Host "Backend ainda subindo - aguarde alguns segundos e tente de novo." -ForegroundColor Yellow
}