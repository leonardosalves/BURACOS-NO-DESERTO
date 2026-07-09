# Modo PERMANENTE estavel: processos diretos + guardian (sem PM2 instavel no Windows).
# Rode UMA vez: .\scripts\install-lumiera-permanent.ps1
param([switch]$Uninstall)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$TaskGuardian = "Lumiera-Guardian"
$TaskWatchdog = "Lumiera-Backend-Watchdog"
$GuardianScript = Join-Path $PSScriptRoot "lumiera-guardian.ps1"
$EnsureScript = Join-Path $PSScriptRoot "ensure-lumiera.ps1"

function Remove-LumieraTask([string]$Name) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
}

if ($Uninstall) {
    Remove-LumieraTask $TaskGuardian
    Remove-LumieraTask $TaskWatchdog
    Stop-LumieraGuardianDaemon
    Remove-Item -LiteralPath $script:StackModeFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $script:LogDir "permanent.mode") -Force -ErrorAction SilentlyContinue
    $startupDir = [Environment]::GetFolderPath("Startup")
    foreach ($vbs in @("Lumiera-Guardian.vbs", "Lumiera-PM2-Resurrect.vbs", "Lumiera-Ensure.vbs")) {
        Remove-Item (Join-Path $startupDir $vbs) -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Modo permanente removido." -ForegroundColor Green
    exit 0
}

Write-Host "=== Lumiera PERMANENTE (modo direto + guardian) ===" -ForegroundColor Cyan

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js com erro de sintaxe." -ForegroundColor Red
    exit 1
}

Stop-LumieraGuardianDaemon
Disable-LumieraPm2Competition
Remove-LumieraTask $TaskWatchdog

Ensure-LumieraLogDir
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path $script:StackModeFile -Value "direct" -Encoding UTF8
Remove-Item -LiteralPath $script:Pm2ModeFile -Force -ErrorAction SilentlyContinue

Write-Host "Subindo stack (backend direto + Vite)..." -ForegroundColor Cyan
$stackOk = Repair-LumieraStackUnified
if (-not $stackOk) {
    Write-Host "Falha ao subir stack. Veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
    exit 1
}

$startupDir = [Environment]::GetFolderPath("Startup")
$ensureVbs = Join-Path $startupDir "Lumiera-Ensure.vbs"
$ensureLine = 'sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{0}"" -Quiet", 0, False' -f $EnsureScript
Set-Content -Path $ensureVbs -Value @(
    'Set sh = CreateObject("Wscript.Shell")',
    $ensureLine
) -Encoding ASCII
Remove-Item (Join-Path $startupDir "Lumiera-PM2-Resurrect.vbs") -Force -ErrorAction SilentlyContinue
Write-Host "Boot: ensure-lumiera na pasta Inicializar" -ForegroundColor DarkGray

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
        -Description "Mantem Lumiera (3005+5176) online - modo direto." `
        -Force -ErrorAction Stop | Out-Null
    Start-ScheduledTask -TaskName $TaskGuardian -ErrorAction SilentlyContinue
    $taskOk = $true
    Stop-LumieraGuardianDaemon
    Remove-Item (Join-Path $startupDir "Lumiera-Guardian.vbs") -Force -ErrorAction SilentlyContinue
    Write-Host "Guardian: tarefa agendada '$TaskGuardian'" -ForegroundColor Green
} catch {
    Write-Host "Guardian: sem admin - daemon unico no Startup" -ForegroundColor Yellow
    Stop-LumieraGuardianDaemon
    $daemonScript = Join-Path $PSScriptRoot "start-lumiera-guardian-daemon.ps1"
    $vbsPath = Join-Path $startupDir "Lumiera-Guardian.vbs"
    $runLine = 'sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{0}""", 0, False' -f $daemonScript
    Set-Content -Path $vbsPath -Value @(
        'Set sh = CreateObject("Wscript.Shell")',
        $runLine
    ) -Encoding ASCII
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
        "-File", $daemonScript
    ) -WorkingDirectory $script:RepoRoot -WindowStyle Hidden | Out-Null
    Write-Host "Guardian: daemon ativo + $vbsPath" -ForegroundColor Green
}

& $GuardianScript -Quiet | Out-Null

Write-Host ""
Write-Host "OK - modo PERMANENTE (direto) ativo." -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:3005" -ForegroundColor White
Write-Host "  Frontend: http://127.0.0.1:5176" -ForegroundColor White
Write-Host "  Stack:    direct (PM2 desativado - mais estavel no Windows)" -ForegroundColor White
Write-Host ""
Write-Host "Diagnostico: .\scripts\status-lumiera.ps1" -ForegroundColor Cyan
Write-Host "Emergencia:  run_qanat_dashboard.bat" -ForegroundColor Cyan
exit 0