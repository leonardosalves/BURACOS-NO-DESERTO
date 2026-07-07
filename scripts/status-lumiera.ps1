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

$pm2Mode = Test-LumieraPm2Mode
$permanentMode = Test-Path -LiteralPath (Join-Path $script:LogDir "permanent.mode")
if ($permanentMode) {
    Write-Host "Modo     : PERMANENTE (PM2 + guardian 1 min)" -ForegroundColor Green
    $guardTask = Get-ScheduledTask -TaskName "Lumiera-Guardian" -ErrorAction SilentlyContinue
    $daemonPidFile = Join-Path $script:LogDir "guardian-daemon.pid"
    if ($guardTask) {
        Write-Host ("Guardian : tarefa {0}" -f $guardTask.State) -ForegroundColor $(if ($guardTask.State -eq "Running") { "Green" } else { "Yellow" })
    } elseif (Test-Path -LiteralPath $daemonPidFile) {
        try {
            $gpid = [int](Get-Content -LiteralPath $daemonPidFile -TotalCount 1)
            if ($gpid -gt 0 -and (Get-Process -Id $gpid -ErrorAction SilentlyContinue)) {
                Write-Host ("Guardian : daemon ativo (PID {0})" -f $gpid) -ForegroundColor Green
            } else {
                Write-Host "Guardian : daemon parado — rode install-lumiera-permanent.ps1" -ForegroundColor Yellow
            }
        } catch { }
    }
} elseif ($pm2Mode) {
    Write-Host "Modo     : PM2 (auto-reinicio nativo)" -ForegroundColor Green
    if (Resolve-LumieraPm2Bin) {
        foreach ($app in @("lumiera-backend", "lumiera-frontend")) {
            $row = Get-LumieraPm2AppRow $app
            if ($row) {
                $st = $row.pm2_env.status
                $color = if ($st -eq "online") { "Green" } else { "Yellow" }
                Write-Host ("PM2 {0}: {1} (restarts: {2})" -f $app, $st, $row.pm2_env.restart_time) -ForegroundColor $color
            }
        }
    }
}

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

$watchProc = $null
$task = $null
if (-not $pm2Mode) {
    $watchProc = Test-LumieraWatchdogActive
    if (-not $watchProc) {
        $task = Get-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -ErrorAction SilentlyContinue
    }
}
if ($pm2Mode) {
    Write-Host "Watchdog : desativado (PM2 cuida do processo)" -ForegroundColor DarkGray
} elseif ($watchProc) {
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