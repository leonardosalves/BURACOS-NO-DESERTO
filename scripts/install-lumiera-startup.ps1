# Registra tarefa do Windows: backend Lumiera sobe ao ligar o PC e se auto-reinicia se cair.
# Execute uma vez: .\scripts\install-lumiera-startup.ps1
param(
    [switch]$IncludeFrontend,
    [switch]$Uninstall
)

$TaskName = "Lumiera-Backend-Watchdog"
$TaskNameFrontend = "Lumiera-Dashboard-Dev"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$WatchScript = Join-Path $PSScriptRoot "watch-lumiera-backend.ps1"
$DashboardBat = Join-Path $RepoRoot "run_qanat_dashboard.bat"

function Remove-LumieraTask([string]$Name) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
}

if ($Uninstall) {
    Remove-LumieraTask $TaskName
    Remove-LumieraTask $TaskNameFrontend
    Write-Host "Tarefas Lumiera removidas do Agendador de Tarefas." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $WatchScript)) {
    Write-Host "Arquivo nao encontrado: $WatchScript" -ForegroundColor Red
    exit 1
}

$watchArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $watchArgs -WorkingDirectory $RepoRoot
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger @($triggerLogon, $triggerBoot) `
    -Settings $settings `
    -Description "Mantem o backend Lumiera (porta 3005) sempre online com auto-reinicio." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

Write-Host "OK: tarefa '$TaskName' - backend sobe no login e no boot do Windows." -ForegroundColor Green

if ($IncludeFrontend) {
    if (-not (Test-Path $DashboardBat)) {
        Write-Host "AVISO: run_qanat_dashboard.bat nao encontrado - frontend nao registrado." -ForegroundColor Yellow
    } else {
        $feAction = New-ScheduledTaskAction -Execute $DashboardBat -WorkingDirectory $RepoRoot
        $feTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $feSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        Register-ScheduledTask `
            -TaskName $TaskNameFrontend `
            -Action $feAction `
            -Trigger $feTrigger `
            -Settings $feSettings `
            -Description "Inicia Vite (5176) + backend via run_qanat_dashboard.bat no login." `
            -Force | Out-Null
        Write-Host "OK: tarefa '$TaskNameFrontend' - dashboard completo no login." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Iniciar agora (sem reiniciar o PC):" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host ""
Write-Host "Ver logs:" -ForegroundColor Cyan
Write-Host "  $RepoRoot\.lumiera-logs\backend-watch.log" -ForegroundColor White
Write-Host ""
Write-Host "Desinstalar:" -ForegroundColor Cyan
Write-Host "  .\scripts\install-lumiera-startup.ps1 -Uninstall" -ForegroundColor White