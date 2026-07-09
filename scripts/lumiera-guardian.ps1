# Guardian Lumiera — verifica a cada minuto e recupera PM2 sem matar render ativo.
param([switch]$Quiet)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$GuardianLog = Join-Path $script:LogDir "guardian.log"
$GuardianLock = Join-Path $script:LogDir "guardian.lock"

function Write-GuardianLog {
    param([string]$Message, [string]$Level = "INFO")
    Ensure-LumieraLogDir
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -Path $GuardianLog -Value $line -Encoding UTF8
    if (-not $Quiet) {
        $color = switch ($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            default { "DarkGray" }
        }
        Write-Host $line -ForegroundColor $color
    }
}

function Test-GuardianLock {
    if (-not (Test-Path -LiteralPath $GuardianLock)) { return $false }
    try {
        $stamp = [datetime]::Parse((Get-Content -LiteralPath $GuardianLock -TotalCount 1 -ErrorAction Stop))
        return (((Get-Date) - $stamp).TotalSeconds -lt 25)
    } catch {
        return $false
    }
}

function Set-GuardianLock {
    Ensure-LumieraLogDir
    Set-Content -Path $GuardianLock -Value ((Get-Date).ToString("o")) -Encoding UTF8
}

if (Test-GuardianLock) { exit 0 }

$backendOk = Test-LumieraBackendHealthy -Retries 4 -TimeoutSec 12
$frontendOk = [bool](Get-PortListenerPidFast 5176)

if ($backendOk -and $frontendOk) {
    Remove-Item (Join-Path $script:LogDir "guardian-miss.stamp") -Force -ErrorAction SilentlyContinue
    exit 0
}

$missStamp = Join-Path $script:LogDir "guardian-miss.stamp"
if (-not (Test-Path -LiteralPath $missStamp)) {
    Set-Content -Path $missStamp -Value ((Get-Date).ToString("o")) -Encoding UTF8
    Write-GuardianLog "Stack lento/offline - aguardando 1 ciclo antes de reparar (backend=$backendOk frontend=$frontendOk)" "WARN"
    exit 0
}

Set-GuardianLock
Write-GuardianLog "Recuperando stack (backend=$backendOk frontend=$frontendOk)" "WARN"

$repaired = Repair-LumieraPm2Stack
if ($repaired) {
    Write-GuardianLog "Stack OK apos recuperacao"
    exit 0
}

Write-GuardianLog "Falha na recuperacao - veja pm2-backend-error.log e backend-syntax-check.log" "ERROR"
exit 1