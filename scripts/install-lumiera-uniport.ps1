# Modo UNIPORT: 1 processo Node na porta 3005 (API + UI estatica). Sem PM2, sem Vite.
# Rode UMA vez: .\scripts\install-lumiera-uniport.ps1
param(
    [switch]$Uninstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$TaskWatchdog = "Lumiera-Backend-Watchdog"
$WatchScript = Join-Path $PSScriptRoot "watch-lumiera-backend.ps1"
$EnsureScript = Join-Path $PSScriptRoot "ensure-lumiera.ps1"
$PermanentUninstall = Join-Path $PSScriptRoot "install-lumiera-permanent.ps1"

if ($Uninstall) {
    Disable-LumieraLegacyStack
    Remove-Item -LiteralPath $script:UniportModeFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $script:StackModeFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $script:LogDir "permanent.mode") -Force -ErrorAction SilentlyContinue
    if (Test-Path $PermanentUninstall) {
        & $PermanentUninstall -Uninstall | Out-Null
    }
    Write-Host "Modo uniport removido." -ForegroundColor Green
    exit 0
}

Write-Host "=== Lumiera UNIPORT (1 processo, porta 3005) ===" -ForegroundColor Cyan

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js com erro de sintaxe." -ForegroundColor Red
    exit 1
}

Write-Host "Desativando PM2, guardian e Vite legado..." -ForegroundColor DarkGray
if (Test-Path $PermanentUninstall) {
    & $PermanentUninstall -Uninstall | Out-Null
}
Disable-LumieraLegacyStack

if (-not $SkipBuild) {
    Write-Host "Compilando frontend (pode levar alguns minutos)..." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "build-lumiera-frontend.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha no build. Tente: .\scripts\build-lumiera-frontend.ps1 -Lite" -ForegroundColor Red
        exit 1
    }
} elseif (-not (Test-LumieraFrontendDistReady)) {
    Write-Host "ERRO: dist/ ausente. Rode sem -SkipBuild." -ForegroundColor Red
    exit 1
}

Ensure-LumieraLogDir
Set-Content -Path $script:UniportModeFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path $script:StackModeFile -Value "uniport" -Encoding UTF8
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8

Write-Host "Subindo backend (serve API + UI em :3005)..." -ForegroundColor Cyan
$stackOk = Repair-LumieraStackUnified
if (-not $stackOk) {
    Write-Host "Falha ao subir stack. Veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
    exit 1
}

$watchArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $watchArgs -WorkingDirectory $script:RepoRoot
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

$taskOk = $false
try {
    Register-ScheduledTask `
        -TaskName $TaskWatchdog `
        -Action $action `
        -Trigger @($triggerLogon, $triggerBoot) `
        -Settings $settings `
        -Description "Mantem Lumiera uniport (porta 3005) online." `
        -Force -ErrorAction Stop | Out-Null
    Start-ScheduledTask -TaskName $TaskWatchdog -ErrorAction SilentlyContinue
    $taskOk = $true
    Write-Host "Watchdog: tarefa agendada '$TaskWatchdog'" -ForegroundColor Green
} catch {
    Write-Host "Watchdog: sem admin - boot via Startup apenas" -ForegroundColor Yellow
}

$startupDir = [Environment]::GetFolderPath("Startup")
$bootVbs = Join-Path $startupDir "Lumiera-Uniport.vbs"
$bootLine = 'sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{0}"" -Quiet", 0, False' -f $EnsureScript
Set-Content -Path $bootVbs -Value @(
    'Set sh = CreateObject("Wscript.Shell")',
    $bootLine
) -Encoding ASCII
Write-Host "Boot: ensure-lumiera na pasta Inicializar" -ForegroundColor DarkGray

if (-not $taskOk) {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
        "-File", $WatchScript
    ) -WorkingDirectory $script:RepoRoot -WindowStyle Hidden | Out-Null
    Write-Host "Watchdog: processo em background iniciado" -ForegroundColor Green
}

Write-Host ""
Write-Host "OK - modo UNIPORT ativo." -ForegroundColor Green
Write-Host "  Dashboard: http://127.0.0.1:3005/" -ForegroundColor White
Write-Host "  API:       http://127.0.0.1:3005/api/health" -ForegroundColor White
Write-Host "  Stack:     1 processo Node (sem PM2, sem Vite)" -ForegroundColor White
Write-Host ""
Write-Host "Apos mudar UI:  .\scripts\build-lumiera-frontend.ps1 && .\scripts\restart-backend.ps1 -Force" -ForegroundColor Cyan
Write-Host "Diagnostico:    .\scripts\status-lumiera.ps1" -ForegroundColor Cyan
exit 0