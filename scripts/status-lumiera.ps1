# Status rapido: backend (3005), frontend (5176), ultimas linhas do log
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

function Test-PortListen([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $c) { return $null }
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    return @{ Port = $Port; Pid = $c.OwningProcess; Name = $proc.ProcessName }
}

Write-Host "=== Lumiera - status ===" -ForegroundColor Cyan

$backend = Test-PortListen 3005
$frontend = Test-PortListen 5176
$healthy = Test-LumieraBackendHealthy

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

$watchProc = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*watch-lumiera-backend.ps1*" } |
    Select-Object -First 1
$task = Get-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -ErrorAction SilentlyContinue
if ($watchProc) {
    Write-Host ("Watchdog : ATIVO (PID {0})" -f $watchProc.ProcessId) -ForegroundColor Green
} elseif ($task) {
    Write-Host ("Watchdog : instalado mas PARADO (tarefa {0}) — rode .\scripts\ensure-watchdog.ps1" -f $task.State) -ForegroundColor Yellow
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