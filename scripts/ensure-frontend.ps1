# Sobe o Vite (5176) apenas se estiver offline.
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$FrontendDir = Join-Path (Join-Path $script:RepoRoot "dashboard-qanat") "frontend"
$FrontendPort = 5176
$DashboardUrl = "http://127.0.0.1:$FrontendPort/"

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (Test-PortListening $FrontendPort) {
    Write-Host "Frontend OK em $DashboardUrl" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install --no-audit --no-fund
    Pop-Location
}

Ensure-LumieraLogDir
$outLog = Join-Path $script:LogDir "frontend-stdout.log"
$errLog = Join-Path $script:LogDir "frontend-stderr.log"
$npmCmd = if (Test-Path (Join-Path $FrontendDir "npm.cmd")) { "npm.cmd" } else { "npm" }

Write-Host "Subindo frontend Vite na porta $FrontendPort..." -ForegroundColor Cyan
Start-Process `
    -FilePath $npmCmd `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $FrontendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog | Out-Null

$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline) {
    if (Test-PortListening $FrontendPort) {
        Write-Host "Frontend OK em $DashboardUrl" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Host "Falha ao subir frontend - veja $errLog" -ForegroundColor Red
exit 1