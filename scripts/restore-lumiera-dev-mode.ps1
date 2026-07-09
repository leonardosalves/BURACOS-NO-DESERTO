# Restaura o modo DEV original: backend :3005 + Vite :5176 (hot reload).
# Remove servico Windows / uniport que desliga o Vite e serve dist/ estatico.
# Rode como Admin se o servico LumieraBackend estiver instalado:
#   .\scripts\restore-lumiera-dev-mode.ps1
param([switch]$Quiet)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

function Write-Step([string]$Message, [string]$Color = "Cyan") {
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Step "=== Restaurar Lumiera MODO DEV (3005 + Vite 5176) ==="

$serviceName = "LumieraBackend"
$nssmExe = Join-Path $script:RepoRoot "tools\nssm\nssm.exe"
if (-not (Test-Path -LiteralPath $nssmExe)) {
    $nssmExe = "C:\Lumiera\tools\nssm\nssm.exe"
}

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($svc) {
    if (-not (Test-Admin)) {
        Write-Step "ERRO: servico $serviceName instalado - execute este script como Administrador." "Red"
        Write-Step "  Botao direito PowerShell -> Executar como administrador" "Yellow"
        Write-Step "  cd '$($script:RepoRoot)'" "Yellow"
        Write-Step "  .\scripts\restore-lumiera-dev-mode.ps1" "Yellow"
        exit 1
    }

    Write-Step "Parando e removendo servico Windows $serviceName..." "Yellow"
    if (Test-Path -LiteralPath $nssmExe) {
        & $nssmExe stop $serviceName 2>$null | Out-Null
        Start-Sleep -Seconds 2
        & $nssmExe remove $serviceName confirm 2>$null | Out-Null
    }
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $serviceName 2>$null | Out-Null
    Start-Sleep -Seconds 2
}

Write-Step "Removendo marcadores uniport/servico..." "DarkGray"
foreach ($file in @(
    (Join-Path $script:LogDir "windows-service.mode"),
    (Join-Path $script:LogDir "uniport.mode"),
    $script:UniportModeFile
)) {
    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
}
Set-Content -Path $script:StackModeFile -Value "direct" -Encoding UTF8

Write-Step "Encerrando redirect 5176->3005 e Vite antigo..." "DarkGray"
$fePid = Get-PortListenerPidFast 5176
if ($fePid) {
    Stop-Process -Id $fePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$bePid = Get-BackendListenerPid
if ($bePid) {
    Stop-Process -Id $bePid -Force -ErrorAction SilentlyContinue
    Wait-BackendPortFree -TimeoutSec 20 | Out-Null
}

Write-Step "Subindo backend direto (seu usuario, projetos no Desktop)..." "Cyan"
$backendOk = Start-LumieraStackDirect -ForcePorts
if (-not $backendOk) {
    Write-Step "Falha ao subir backend - veja .lumiera-logs\backend-stderr.log" "Red"
    exit 1
}

Write-Step "Subindo Vite dev na porta 5176..." "Cyan"
$feScript = Join-Path $script:RepoRoot "scripts\ensure-frontend.ps1"
& $feScript
if ($LASTEXITCODE -ne 0) {
    Write-Step "Falha ao subir Vite" "Red"
    exit 1
}

$cmd5176 = Get-LumieraPort5176CommandLine (Get-PortListenerPidFast 5176)
if ($cmd5176 -like "*lumiera-redirect-5176*") {
    Write-Step "ERRO: porta 5176 ainda e redirect, nao Vite" "Red"
    exit 1
}

Ensure-LumieraWatchdogRunning | Out-Null
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8

Write-Step ""
Write-Step "OK - modo DEV restaurado." "Green"
Write-Step "  Dashboard (use este): http://127.0.0.1:5176/" "White"
Write-Step "  API backend:          http://127.0.0.1:3005/" "White"
Write-Step "  Hot reload:           ativo (Vite)" "White"
Write-Step ""
Write-Step "Para manter no boot sem servico Windows:" "DarkGray"
Write-Step "  .\scripts\install-lumiera-permanent.ps1" "DarkGray"
exit 0