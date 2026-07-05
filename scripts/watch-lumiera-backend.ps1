# Vigia o backend Lumiera e reinicia se cair. Deixe rodando (ou use install-lumiera-startup.ps1).
param(
    [int]$CheckIntervalSec = 30,
    [int]$FailThreshold = 3,
    [int]$GraceAfterRestartSec = 90
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

Write-LumieraLog "=== Watchdog iniciado (intervalo ${CheckIntervalSec}s, limiar ${FailThreshold} falhas) ==="

$consecutiveFails = 0
$graceUntil = [datetime]::MinValue

Start-LumieraBackendProcess | Out-Null
$graceUntil = (Get-Date).AddSeconds($GraceAfterRestartSec)

while ($true) {
    Start-Sleep -Seconds $CheckIntervalSec

    if ((Get-Date) -lt $graceUntil) { continue }

    if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 8) {
        if ($consecutiveFails -gt 0) {
            Write-LumieraLog "Backend recuperado apos $consecutiveFails falha(s) de health"
        }
        $consecutiveFails = 0
        continue
    }

    $consecutiveFails++
    Write-LumieraLog "Health falhou ($consecutiveFails/$FailThreshold)" "WARN"

    if ($consecutiveFails -lt $FailThreshold) { continue }

    Write-LumieraLog "Backend OFFLINE - reiniciando apos $FailThreshold falhas consecutivas" "WARN"
    $consecutiveFails = 0
    Start-LumieraBackendProcess -ForceRestart | Out-Null
    $graceUntil = (Get-Date).AddSeconds($GraceAfterRestartSec)
}