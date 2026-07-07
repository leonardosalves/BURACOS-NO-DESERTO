# Status rapido: backend (3005), frontend (5176), ultimas linhas do log
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

function Get-PortStatus([int]$Port) {
    $portPid = Get-PortListenerPidFast $Port
    if (-not $portPid) { return $null }
    $proc = Get-Process -Id $portPid -ErrorAction SilentlyContinue
    return @{
        Port = $Port
        Pid  = $portPid
        Name = if ($proc) { $proc.ProcessName } else { "?" }
    }
}

Write-Host "=== Lumiera - status ===" -ForegroundColor Cyan

$backend = Get-PortStatus 3005
$frontend = Get-PortStatus 5176
$healthy = if ($backend) { Test-LumieraBackendHealthy -Quick -TimeoutSec 3 } else { $false }

if ($backend) {
    $color = if ($healthy) { "Green" } else { "Yellow" }
    $healthLabel = if ($healthy) { "OK" } else { "sem resposta" }
    Write-Host ("Backend  : porta 3005 - PID {0} ({1}) - health: {2}" -f $backend.Pid, $backend.Name, $healthLabel) -ForegroundColor $color
} else {
    Write-Host "Backend  : OFFLINE (porta 3005 livre)" -ForegroundColor Red
}

if ($frontend) {
    Write-Host ("Frontend : porta 5176 - PID {0} ({1})" -f $frontend.Pid, $frontend.Name) -ForegroundColor Green
} else {
    Write-Host "Frontend : OFFLINE (rode run_qanat_dashboard.bat ou npm run dev)" -ForegroundColor Yellow
}

$watchProc = Test-LumieraWatchdogActive
if (-not $watchProc) {
    $task = Get-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -ErrorAction SilentlyContinue
}
if ($watchProc) {
    if ($watchProc.ProcessId -gt 0) {
        Write-Host ("Watchdog : ATIVO (PID {0})" -f $watchProc.ProcessId) -ForegroundColor Green
    } elseif ($watchProc.FromTask) {
        Write-Host "Watchdog : ATIVO (tarefa agendada em execucao)" -ForegroundColor Green
    } else {
        Write-Host "Watchdog : ATIVO (log recente)" -ForegroundColor Green
    }
} elseif ($task) {
    Write-Host ("Watchdog : instalado mas PARADO (tarefa {0}) - rode .\scripts\ensure-watchdog.ps1" -f $task.State) -ForegroundColor Yellow
} else {
    Write-Host "Watchdog : nao instalado (.\scripts\install-lumiera-startup.ps1)" -ForegroundColor DarkGray
}

$watchLog = Join-Path $script:LogDir "backend-watch.log"
if (Test-Path $watchLog) {
    Write-Host ""
    Write-Host "Ultimas linhas do log:" -ForegroundColor DarkGray
    Get-Content $watchLog -Tail 8 | ForEach-Object { Write-Host "  $_" }
}

$errLog = Join-Path $script:LogDir "backend-stderr.log"
if ((Test-Path $errLog) -and ((Get-Item $errLog).Length -gt 0)) {
    Write-Host ""
    Write-Host "backend-stderr.log (ultimas linhas):" -ForegroundColor Yellow
    Get-Content $errLog -Tail 5 | ForEach-Object { Write-Host "  $_" }
}