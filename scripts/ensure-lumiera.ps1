# Verifica backend (3005), frontend (5176) e watchdog — corrige automaticamente.
param([switch]$Quiet)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

function Show-LogTail([string]$Path, [int]$Lines = 6) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content -LiteralPath $Path -Tail $Lines | ForEach-Object {
        if (-not $Quiet) { Write-Host "  $_" -ForegroundColor DarkGray }
    }
}

function Test-LogHasErrors([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return @() }
    $patterns = "ECONNREFUSED|Error:|FATAL|Unhandled|Cannot find module|SyntaxError|ENOMEM|EADDRINUSE"
    return Select-String -Path $Path -Pattern $patterns -SimpleMatch:$false -ErrorAction SilentlyContinue |
        Select-Object -Last 5
}

if (-not $Quiet) {
    Write-Host "=== Lumiera ensure ===" -ForegroundColor Cyan
}

& (Join-Path $PSScriptRoot "ensure-watchdog.ps1") | Out-Null

$backendOk = $false
if (Test-LumieraBackendHealthy -Retries 4 -TimeoutSec 10) {
    $backendOk = $true
    if (-not $Quiet) { Write-Host "Backend ja OK" -ForegroundColor Green }
} else {
    if (-not $Quiet) { Write-Host "Backend offline - subindo..." -ForegroundColor Yellow }
    $backendOk = Start-LumieraBackendProcess
}

$frontendExit = 0
& (Join-Path $PSScriptRoot "ensure-frontend.ps1")
$frontendExit = $LASTEXITCODE

$backendErrors = Test-LogHasErrors (Join-Path $script:LogDir "backend-stderr.log")
$frontendErrors = Test-LogHasErrors (Join-Path $script:LogDir "frontend-stderr.log")

if (-not $Quiet) {
    Write-Host ""
    & (Join-Path $PSScriptRoot "status-lumiera.ps1")
    if ($backendErrors.Count) {
        Write-Host ""
        Write-Host "backend-stderr (erros recentes):" -ForegroundColor Yellow
        $backendErrors | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Yellow }
    }
    if ($frontendErrors.Count) {
        Write-Host ""
        Write-Host "frontend-stderr (erros recentes):" -ForegroundColor Yellow
        $frontendErrors | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Yellow }
    }
}

if ($backendOk -and $frontendExit -eq 0) { exit 0 }
exit 1