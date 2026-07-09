# Vigia o backend Lumiera v4 — SOBE se porta 3005 vazia; NUNCA mata processo ativo.
param(
    [int]$CheckIntervalSec = 20,
    [int]$GraceAfterStartSec = 45
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$script:WatchdogPidFile = Join-Path $script:LogDir "watchdog.pid"
Set-Content -Path $script:WatchdogPidFile -Value $PID -Encoding UTF8 -ErrorAction SilentlyContinue

Write-LumieraLog "=== Watchdog v4 (intervalo ${CheckIntervalSec}s, nunca mata) ==="

$graceUntil = [datetime]::MinValue

function Wait-BackendHealthySoft {
    param([int]$TimeoutSec = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 12) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 6) {
    Write-LumieraLog "Backend ja responde em $script:HealthUrl"
} elseif (Get-BackendListenerPid) {
    Write-LumieraLog "Porta 3005 ocupada, health lento - aguardando (sem matar)" "WARN"
    Wait-BackendHealthySoft | Out-Null
} else {
    Write-LumieraLog "Porta 3005 livre - subindo backend" "WARN"
    Start-LumieraBackendProcess -Direct -SpawnOnly | Out-Null
    $graceUntil = (Get-Date).AddSeconds($GraceAfterStartSec)
}

if (Test-LumieraUniportMode) {
    Start-LumieraLegacyRedirect | Out-Null
}

while ($true) {
    Start-Sleep -Seconds $CheckIntervalSec

    if ((Get-Date) -lt $graceUntil) { continue }

    if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 10) {
        continue
    }

    $livePid = Get-BackendListenerPid
    if ($livePid) {
        if ((Get-Random -Maximum 6) -eq 0) {
            Write-LumieraLog "Health lento, PID $livePid ativo - mantendo (v4 nunca mata)" "WARN"
        }
        continue
    }

    Write-LumieraLog "Porta 3005 livre - subindo backend" "WARN"
    Start-LumieraBackendProcess -Direct -SpawnOnly | Out-Null
    $graceUntil = (Get-Date).AddSeconds($GraceAfterStartSec)

    if (Test-LumieraUniportMode) {
        Start-LumieraLegacyRedirect | Out-Null
    }
}