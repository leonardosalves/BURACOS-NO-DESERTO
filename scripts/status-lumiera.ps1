# Status rapido: backend (3005), modo uniport ou Vite (5176)
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
$stackMode = Get-LumieraStackMode
$uniport = $stackMode -eq "uniport"

if (Test-LumieraWindowsServiceMode) {
    $svc = Get-Service -Name "LumieraBackend" -ErrorAction SilentlyContinue
    if ($svc) {
        $sc = if ($svc.Status -eq "Running") { "Green" } else { "Red" }
        Write-Host ("Modo     : SERVICO WINDOWS ({0})" -f $svc.Status) -ForegroundColor $sc
    } else {
        Write-Host "Modo     : SERVICO WINDOWS (nao instalado)" -ForegroundColor Red
    }
} elseif ($uniport) {
    Write-Host "Modo     : UNIPORT (1 processo :3005, UI em dist/)" -ForegroundColor Green
} elseif ($permanentMode) {
    Write-Host ("Modo     : PERMANENTE (stack={0})" -f $stackMode) -ForegroundColor Green
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

$watchTask = Get-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -ErrorAction SilentlyContinue
if ($uniport -and $watchTask) {
    Write-Host ("Watchdog : tarefa {0}" -f $watchTask.State) -ForegroundColor $(if ($watchTask.State -eq "Running") { "Green" } else { "Yellow" })
} elseif ($permanentMode -and -not $uniport) {
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
                Write-Host "Guardian : daemon parado" -ForegroundColor Yellow
            }
        } catch { }
    }
}

$backend = Get-PortStatus 3005
$healthy = if ($backend) { Test-LumieraBackendHealthy -Quick -TimeoutSec 3 } else { $false }

if ($backend) {
    $color = if ($healthy) { "Green" } else { "Yellow" }
    $healthLabel = if ($healthy) { "OK" } else { "sem resposta" }
    Write-Host ("Backend  : porta 3005 - PID {0} ({1}) - health: {2}" -f $backend.Pid, $backend.Name, $healthLabel) -ForegroundColor $color
} else {
    Write-Host "Backend  : OFFLINE (porta 3005 livre)" -ForegroundColor Red
}

if ($uniport) {
    if (Test-LumieraFrontendDistReady) {
        $distAge = (Get-Item (Join-Path $script:FrontendDistDir "index.html")).LastWriteTime
        Write-Host ("UI       : dist/ OK (compilado {0})" -f $distAge.ToString("yyyy-MM-dd HH:mm")) -ForegroundColor Green
        Write-Host "Dashboard: http://127.0.0.1:3005/" -ForegroundColor Green
    } else {
        Write-Host "UI       : dist/ AUSENTE - rode build-lumiera-frontend.ps1" -ForegroundColor Red
    }
    $vite = Get-PortStatus 5176
    if ($vite) {
        Write-Host ("Vite     : porta 5176 ainda ativa (PID {0}) - desnecessario no uniport" -f $vite.Pid) -ForegroundColor Yellow
    }
} else {
    $frontend = Get-PortStatus 5176
    if ($frontend) {
        Write-Host ("Frontend : porta 5176 - PID {0} ({1})" -f $frontend.Pid, $frontend.Name) -ForegroundColor Green
    } else {
        Write-Host "Frontend : OFFLINE (rode run_qanat_dashboard.bat ou install-lumiera-uniport.ps1)" -ForegroundColor Yellow
    }
}

if (-not ($pm2Mode -or $permanentMode -or $uniport)) {
    $watchProc = Test-LumieraWatchdogActive
    if ($watchProc) {
        Write-Host "Watchdog : ATIVO" -ForegroundColor Green
    } elseif ($watchTask) {
        Write-Host ("Watchdog : instalado ({0})" -f $watchTask.State) -ForegroundColor Yellow
    } else {
        Write-Host "Watchdog : nao instalado" -ForegroundColor DarkGray
    }
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