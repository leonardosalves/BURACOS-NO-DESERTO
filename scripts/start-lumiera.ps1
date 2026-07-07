# Inicia Lumiera Studio (backend :3005 + frontend :5176) e abre o navegador.
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$FrontendDir = Join-Path (Join-Path $RepoRoot "dashboard-qanat") "frontend"
$FrontendPort = 5176
$DashboardUrl = "http://127.0.0.1:$FrontendPort/"

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-LumieraFrontend {
    if (Test-PortListening $FrontendPort) {
        Write-Host "Frontend ja ativo em $DashboardUrl" -ForegroundColor DarkGray
        return
    }

    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
        Push-Location $FrontendDir
        npm install --no-audit --no-fund
        Pop-Location
    }

    $outLog = Join-Path $LogDir "frontend-stdout.log"
    $errLog = Join-Path $LogDir "frontend-stderr.log"
    Ensure-LumieraLogDir

    & (Join-Path $PSScriptRoot "ensure-frontend.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend nao respondeu na porta $FrontendPort. Veja $errLog"
    }
    return
}

Write-Host "Lumiera Studio" -ForegroundColor Magenta
& (Join-Path $PSScriptRoot "ensure-watchdog.ps1") -InstallIfMissing | Out-Null
$backendOk = Start-LumieraBackendProcess
if (-not $backendOk) {
    Write-Host "Falha ao iniciar backend. Veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
    exit 1
}
Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green

Start-LumieraFrontend
Write-Host "Dashboard OK em $DashboardUrl" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process $DashboardUrl
}