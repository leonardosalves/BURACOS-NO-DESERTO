# Instalacao DEFINITIVA: PM2 + guardian a cada 1 min + boot/login.
# Rode UMA vez (como usuario normal): .\scripts\install-lumiera-permanent.ps1
param([switch]$Uninstall)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$TaskGuardian = "Lumiera-Guardian"
$TaskWatchdog = "Lumiera-Backend-Watchdog"
$GuardianScript = Join-Path $PSScriptRoot "lumiera-guardian.ps1"

function Remove-LumieraTask([string]$Name) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
}

if ($Uninstall) {
    Remove-LumieraTask $TaskGuardian
    Remove-LumieraTask $TaskWatchdog
    & (Join-Path $PSScriptRoot "install-lumiera-pm2.ps1") -Uninstall | Out-Null
    Write-Host "Modo permanente removido." -ForegroundColor Green
    exit 0
}

Write-Host "=== Lumiera PERMANENTE (PM2 + Guardian) ===" -ForegroundColor Cyan

# 1) PM2 stack
& (Join-Path $PSScriptRoot "install-lumiera-pm2.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao subir PM2. Corrija sintaxe/logs e tente de novo." -ForegroundColor Red
    exit 1
}

# 2) Remove watchdog legado (mata processo e compete com PM2)
Remove-LumieraTask $TaskWatchdog
$watchPidFile = Join-Path $script:LogDir "watchdog.pid"
if (Test-Path -LiteralPath $watchPidFile) {
    try {
        $wp = [int](Get-Content -LiteralPath $watchPidFile -TotalCount 1)
        if ($wp -gt 0) { Stop-Process -Id $wp -Force -ErrorAction SilentlyContinue }
    } catch { }
    Remove-Item -LiteralPath $watchPidFile -Force -ErrorAction SilentlyContinue
}

# 3) Guardian — tarefa agendada (admin) ou daemon na pasta Startup (sem admin)
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8

$taskOk = $false
Remove-LumieraTask $TaskGuardian
try {
    $guardArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$GuardianScript`" -Quiet"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $guardArgs -WorkingDirectory $script:RepoRoot
    $triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $triggerBoot = New-ScheduledTaskTrigger -AtStartup
    $triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
        -MultipleInstances IgnoreNew `
        -RestartCount 999 `
        -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask `
        -TaskName $TaskGuardian `
        -Action $action `
        -Trigger @($triggerLogon, $triggerBoot, $triggerRepeat) `
        -Settings $settings `
        -Description "Mantem Lumiera (3005+5176) online via PM2." `
        -Force -ErrorAction Stop | Out-Null
    Start-ScheduledTask -TaskName $TaskGuardian -ErrorAction SilentlyContinue
    $taskOk = $true
    Write-Host "Guardian: tarefa agendada '$TaskGuardian'" -ForegroundColor Green
} catch {
    Write-Host "Guardian: sem admin — usando pasta Startup + daemon" -ForegroundColor Yellow
    $daemonScript = Join-Path $PSScriptRoot "start-lumiera-guardian-daemon.ps1"
    $startupDir = [Environment]::GetFolderPath("Startup")
    $vbsPath = Join-Path $startupDir "Lumiera-Guardian.vbs"
    $vbs = @"
Set sh = CreateObject("Wscript.Shell")
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$daemonScript""", 0, False
"@
    Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", "`"$daemonScript`"") `
        -WorkingDirectory $script:RepoRoot `
        -WindowStyle Hidden | Out-Null
    Write-Host "Guardian: daemon ativo + $vbsPath" -ForegroundColor Green
}

& $GuardianScript -Quiet | Out-Null

Write-Host ""
Write-Host "OK — modo PERMANENTE ativo." -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:3005" -ForegroundColor White
Write-Host "  Frontend: http://127.0.0.1:5176" -ForegroundColor White
Write-Host "  Guardian: tarefa '$TaskGuardian' (cada 1 min + login + boot)" -ForegroundColor White
Write-Host ""
Write-Host "Diagnostico: .\scripts\status-lumiera.ps1" -ForegroundColor Cyan
Write-Host "Log guardian: .lumiera-logs\guardian.log" -ForegroundColor Cyan
Write-Host "Desinstalar:  .\scripts\install-lumiera-permanent.ps1 -Uninstall" -ForegroundColor DarkGray