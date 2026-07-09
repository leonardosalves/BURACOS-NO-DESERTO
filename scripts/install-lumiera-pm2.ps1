# Modo "set and forget": PM2 mantém backend + frontend sempre no ar.
# Rode UMA vez: .\scripts\install-lumiera-pm2.ps1
param(
    [switch]$Uninstall,
    [switch]$BackendOnly
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$Pm2ModeFile = Join-Path $script:LogDir "pm2.mode"
$Ecosystem = Join-Path $script:RepoRoot "ecosystem.config.cjs"
$TaskName = "Lumiera-Backend-Watchdog"

function Remove-LumieraWatchdogTask {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    $watchPidFile = Join-Path $script:LogDir "watchdog.pid"
    if (Test-Path -LiteralPath $watchPidFile) {
        try {
            $watchPid = [int](Get-Content -LiteralPath $watchPidFile -TotalCount 1)
            if ($watchPid -gt 0) {
                Stop-Process -Id $watchPid -Force -ErrorAction SilentlyContinue
            }
        } catch { }
        Remove-Item -LiteralPath $watchPidFile -Force -ErrorAction SilentlyContinue
    }
}

if ($Uninstall) {
    Write-Host "Removendo modo PM2..." -ForegroundColor Yellow
    Invoke-LumieraPm2 @("delete", "lumiera-backend", "lumiera-frontend") | Out-Null
    Invoke-LumieraPm2 @("save", "--force") | Out-Null
    Remove-Item -LiteralPath $Pm2ModeFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $script:LogDir "permanent.mode") -Force -ErrorAction SilentlyContinue
    Write-Host "PM2 desinstalado. Para voltar ao watchdog: .\scripts\install-lumiera-startup.ps1" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path -LiteralPath $Ecosystem)) {
    Write-Host "ecosystem.config.cjs nao encontrado em $script:RepoRoot" -ForegroundColor Red
    exit 1
}

Write-Host "=== Lumiera PM2 (modo estavel) ===" -ForegroundColor Cyan
Write-Host "Instalando PM2 localmente..." -ForegroundColor DarkGray
Push-Location $script:RepoRoot
npm install pm2 --save-dev --no-audit --no-fund 2>&1 | Out-Null
Pop-Location

Ensure-LumieraLogDir
Initialize-LumieraBackendEnv

Write-Host "Desativando watchdog PowerShell antigo..." -ForegroundColor Yellow
Remove-LumieraWatchdogTask

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js tem erro de sintaxe - corrija antes de subir o PM2." -ForegroundColor Red
    Write-Host "Veja: .lumiera-logs\backend-syntax-check.log" -ForegroundColor Yellow
    exit 1
}

Write-Host "Reset PM2 (kill, sockets, portas 3005/5176)..." -ForegroundColor DarkGray
if (-not (Reset-LumieraPm2Daemon)) {
    Write-Host "AVISO: pm2 ping falhou apos reset - continuando..." -ForegroundColor Yellow
}
Stop-LumieraBackendOnPort
try {
    $fePid = Get-PortListenerPidFast 5176
    if ($fePid) { Stop-Process -Id $fePid -Force -ErrorAction SilentlyContinue }
} catch { }

$apps = @("lumiera-backend")
if (-not $BackendOnly) { $apps += "lumiera-frontend" }

Write-Host "Subindo PM2: $($apps -join ', ')..." -ForegroundColor Cyan
$env:PM2_HOME = Join-Path $env:USERPROFILE ".pm2"
foreach ($app in @("lumiera-backend", "lumiera-frontend")) {
    Invoke-LumieraPm2 @("delete", $app) | Out-Null
}
$startArgs = @("start", $Ecosystem, "--update-env")
if ($BackendOnly) { $startArgs += "--only"; $startArgs += "lumiera-backend" }
Invoke-LumieraPm2 $startArgs | Out-Null
Start-Sleep -Seconds 12
$backendOk = Repair-LumieraPm2Stack

if (-not $backendOk) {
    Write-Host "Backend nao respondeu - veja .lumiera-logs\pm2-backend-error.log" -ForegroundColor Red
    Invoke-LumieraPm2 @("logs", "lumiera-backend", "--lines", "20", "--nostream") -CaptureOutput | Out-Host
    exit 1
}

Invoke-LumieraPm2 @("save", "--force") | Out-Null

$startup = Invoke-LumieraPm2 @("startup") 2>&1 | Out-String
if ($startup -match "pm2\.exe startup") {
    Write-Host ""
    Write-Host "Para auto-start no boot do Windows, execute o comando que o PM2 imprimiu acima (como Admin)." -ForegroundColor Yellow
}

Set-Content -Path $Pm2ModeFile -Value ((Get-Date).ToString("o")) -Encoding UTF8

Write-Host ""
Write-Host "OK - Lumiera rodando em modo PM2 (auto-reinicio nativo)." -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:3005" -ForegroundColor White
if (-not $BackendOnly) {
    Write-Host "  Frontend: http://127.0.0.1:5176" -ForegroundColor White
}
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Cyan
Write-Host "  .\scripts\status-lumiera.ps1" -ForegroundColor White
Write-Host "  npx pm2 logs lumiera-backend" -ForegroundColor White
Write-Host "  npx pm2 reload lumiera-backend   # apos mudar codigo do backend" -ForegroundColor White
Write-Host "  .\scripts\install-lumiera-pm2.ps1 -Uninstall" -ForegroundColor White
exit 0