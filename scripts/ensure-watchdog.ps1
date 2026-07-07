# Garante que o watchdog do backend esta rodando (auto-reinicio se cair).
param([switch]$InstallIfMissing)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$TaskName = "Lumiera-Backend-Watchdog"
$WatchScript = Join-Path $PSScriptRoot "watch-lumiera-backend.ps1"

function Test-WatchdogProcessRunning {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*watch-lumiera-backend.ps1*" } |
        Select-Object -First 1
}

$running = Test-WatchdogProcessRunning
if ($running) {
    Write-Host "Watchdog ativo (PID $($running.ProcessId))" -ForegroundColor Green
    exit 0
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    if ($InstallIfMissing) {
        Write-Host "Instalando watchdog..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot "install-lumiera-startup.ps1")
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    }
    if (-not $task) {
        Write-Host "Watchdog nao instalado. Rode: .\scripts\install-lumiera-startup.ps1" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Subindo watchdog (tarefa $TaskName)..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

$deadline = (Get-Date).AddSeconds(15)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 800
    $running = Test-WatchdogProcessRunning
    if ($running) {
        Write-Host "Watchdog ativo (PID $($running.ProcessId))" -ForegroundColor Green
        exit 0
    }
}

# Fallback: sobe o loop diretamente se a tarefa agendada nao iniciou
Write-Host "Tarefa agendada nao subiu — iniciando watchdog em background..." -ForegroundColor Yellow
Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", "`"$WatchScript`"") `
    -WorkingDirectory $script:RepoRoot `
    -WindowStyle Hidden | Out-Null

Start-Sleep -Seconds 2
$running = Test-WatchdogProcessRunning
if ($running) {
    Write-Host "Watchdog ativo (PID $($running.ProcessId))" -ForegroundColor Green
    exit 0
}

Write-Host "Falha ao subir watchdog — veja .lumiera-logs\backend-watch.log" -ForegroundColor Red
exit 1