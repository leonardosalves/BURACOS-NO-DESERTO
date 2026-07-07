# Vigia o backend Lumiera — SOBE se cair, NUNCA mata processo ocupado (render/Gemini).
param(
    [int]$CheckIntervalSec = 20,
    [int]$BusyFailBeforeKill = 80,
    [int]$GraceAfterStartSec = 45
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$script:WatchdogPidFile = Join-Path $script:LogDir "watchdog.pid"
Set-Content -Path $script:WatchdogPidFile -Value $PID -Encoding UTF8 -ErrorAction SilentlyContinue

Write-LumieraLog "=== Watchdog v2 (intervalo ${CheckIntervalSec}s, nao mata processo ocupado) ==="

$consecutiveBusyFails = 0
$graceUntil = [datetime]::MinValue

Start-LumieraBackendProcess | Out-Null
$graceUntil = (Get-Date).AddSeconds($GraceAfterStartSec)

while ($true) {
    Start-Sleep -Seconds $CheckIntervalSec

    if ((Get-Date) -lt $graceUntil) { continue }

    if (Test-LumieraBackendHealthy -Retries 3 -TimeoutSec 45) {
        if ($consecutiveBusyFails -gt 0) {
            Write-LumieraLog "Backend respondeu apos $consecutiveBusyFails cheque(s) lentos"
        }
        $consecutiveBusyFails = 0
        continue
    }

    $livePid = Get-BackendListenerPid
    if ($livePid) {
        $consecutiveBusyFails++
        Write-LumieraLog (
            "Health lento mas processo ativo (PID $livePid) - mantendo ($consecutiveBusyFails/$BusyFailBeforeKill)"
        ) "WARN"

        if ($consecutiveBusyFails -ge $BusyFailBeforeKill) {
            if (Test-ActiveLumieraRender) {
                Write-LumieraLog (
                    "Render ativo - reinicio forcado bloqueado (PID $livePid ocupado)"
                ) "WARN"
                $consecutiveBusyFails = [math]::Max(0, $BusyFailBeforeKill - 6)
                continue
            }
            Write-LumieraLog (
                "PID $livePid sem health por muito tempo - reinicio forcado"
            ) "ERROR"
            $consecutiveBusyFails = 0
            Start-LumieraBackendProcess -ForceRestart | Out-Null
            $graceUntil = (Get-Date).AddSeconds($GraceAfterStartSec)
        }
        continue
    }

    Write-LumieraLog "Porta 3005 livre - subindo backend" "WARN"
    $consecutiveBusyFails = 0
    Start-LumieraBackendProcess | Out-Null
    $graceUntil = (Get-Date).AddSeconds($GraceAfterStartSec)
}