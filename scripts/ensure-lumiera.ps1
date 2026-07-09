# Verifica stack Lumiera — corrige automaticamente (uniport :3005 ou dev :5176).
param([switch]$Quiet)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

function Test-LogHasErrors([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return @() }
    $patterns = "ECONNREFUSED|Error:|FATAL|Unhandled|Cannot find module|SyntaxError|ENOMEM|EADDRINUSE"
    return Select-String -Path $Path -Pattern $patterns -SimpleMatch:$false -ErrorAction SilentlyContinue |
        Select-Object -Last 5
}

if (-not $Quiet) {
    Write-Host "=== Lumiera ensure ===" -ForegroundColor Cyan
}

$stackMode = Get-LumieraStackMode
$uniport = $stackMode -eq "uniport"
$dashboardUrl = Get-LumieraDashboardUrl

if (-not $Quiet) {
    Write-Host "Modo stack: $stackMode" -ForegroundColor DarkGray
}

$health = Test-LumieraStackHealthy
$stackOk = $health.ok

if (-not $stackOk) {
    if (-not $Quiet) {
        Write-Host "Stack offline - reparando..." -ForegroundColor Yellow
    }
    $stackOk = Repair-LumieraStackUnified
}

$health = Test-LumieraStackHealthy
$backendOk = $health.backend

if ($stackOk -and -not $Quiet) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
    if ($uniport) {
        Write-Host "Dashboard OK em $dashboardUrl (UI estatica via backend)" -ForegroundColor Green
    } elseif ($health.frontend) {
        Write-Host "Frontend OK em http://127.0.0.1:5176/" -ForegroundColor Green
    } else {
        Write-Host "Frontend OFFLINE em :5176" -ForegroundColor Yellow
    }
} elseif (-not $Quiet) {
    Write-Host "Falha - execute run_qanat_dashboard.bat ou install-lumiera-uniport.ps1" -ForegroundColor Yellow
}

$backendErrors = Test-LogHasErrors (Join-Path $script:LogDir "backend-stderr.log")

if (-not $Quiet) {
    Write-Host ""
    & (Join-Path $PSScriptRoot "status-lumiera.ps1")
    if ($backendErrors.Count) {
        Write-Host ""
        Write-Host "backend-stderr (erros recentes):" -ForegroundColor Yellow
        $backendErrors | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Yellow }
    }
}

if ($uniport) {
    if ($backendOk -and (Test-LumieraFrontendDistReady)) {
        Start-LumieraLegacyRedirect | Out-Null
        exit 0
    }
    exit 1
}

$frontendOk = [bool](Get-PortListenerPidFast 5176)
if ($backendOk -and $frontendOk) { exit 0 }
exit 1