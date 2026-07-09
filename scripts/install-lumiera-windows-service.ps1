# Instala Lumiera como SERVICO Windows (NSSM) — caminhos sem espacos via C:\Lumiera
# Requer Admin. Rode: .\scripts\install-lumiera-windows-service.ps1
param([switch]$Uninstall)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$ServiceName = "LumieraBackend"
$LinkRoot = "C:\Lumiera"
$NssmDirRepo = Join-Path $script:RepoRoot "tools\nssm"
$NssmExeRepo = Join-Path $NssmDirRepo "nssm.exe"

function Get-NodeExePath {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { throw "Node.js nao encontrado no PATH." }
    $src = $node.Source
    if ($src -match '\.(cmd|bat)$') {
        $dir = Split-Path -Parent $src
        $exe = Join-Path $dir "node.exe"
        if (Test-Path -LiteralPath $exe) { return $exe }
        $pf = Join-Path ${env:ProgramFiles} "nodejs\node.exe"
        if (Test-Path -LiteralPath $pf) { return $pf }
        throw "node.cmd encontrado mas node.exe nao. Instale Node.js LTS."
    }
    return $src
}

function Ensure-NssmDownload {
    if (Test-Path -LiteralPath $NssmExeRepo) { return }

    Write-Host "Baixando NSSM..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $NssmDirRepo -Force | Out-Null
    $zip = Join-Path $env:TEMP "nssm-2.24.zip"
    $extract = Join-Path $env:TEMP "nssm-2.24"
    $mirrors = @(
        "https://github.com/imvickykumar999/Non-Sucking-Service-Manager/releases/download/nssm-2.24/nssm-2.24.zip",
        "https://nssm.cc/release/nssm-2.24.zip"
    )
    $downloaded = $false
    foreach ($url in $mirrors) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120
            if ((Get-Item $zip).Length -gt 100000) { $downloaded = $true; break }
        } catch { }
    }
    if (-not $downloaded) { throw "Falha ao baixar NSSM." }

    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
    $src = Join-Path $extract "nssm-2.24\$arch\nssm.exe"
    Copy-Item -LiteralPath $src -Destination $NssmExeRepo -Force
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
}

function Ensure-LumieraServicePaths {
    Ensure-NssmDownload

    if (-not (Test-Path -LiteralPath $LinkRoot)) {
        Write-Host "Criando junction $LinkRoot -> $($script:RepoRoot)" -ForegroundColor Cyan
        cmd /c mklink /J "$LinkRoot" "$($script:RepoRoot)" | Out-Null
        if (-not (Test-Path -LiteralPath $LinkRoot)) {
            throw "Falha ao criar junction $LinkRoot (precisa Admin)."
        }
    }

    $nodeSrc = Get-NodeExePath
    $nodeDstDir = Join-Path $LinkRoot "tools\node"
    $nodeDst = Join-Path $nodeDstDir "node.exe"
    New-Item -ItemType Directory -Path $nodeDstDir -Force | Out-Null
    if (-not (Test-Path -LiteralPath $nodeDst) -or
        ((Get-Item $nodeSrc).Length -ne (Get-Item $nodeDst).Length)) {
        Copy-Item -LiteralPath $nodeSrc -Destination $nodeDst -Force
        Write-Host "Node copiado para $nodeDst" -ForegroundColor DarkGray
    }

    return @{
        NssmExe     = Join-Path $LinkRoot "tools\nssm\nssm.exe"
        NodeExe     = $nodeDst
        BackendDir  = Join-Path $LinkRoot "dashboard-qanat\backend"
        LogDir      = Join-Path $LinkRoot ".lumiera-logs"
    }
}

function Invoke-Nssm {
    param(
        [string]$NssmExe,
        [string[]]$NssmCommandArgs,
        [switch]$AllowFailure
    )
    if (-not $NssmCommandArgs -or $NssmCommandArgs.Count -eq 0) {
        throw "Invoke-Nssm chamado sem argumentos."
    }
    $cmdLine = "`"$NssmExe`" $($NssmCommandArgs -join ' ')"
    & $NssmExe @NssmCommandArgs
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "NSSM falhou (exit $code): $cmdLine"
    }
    return $code
}

function Remove-LumieraService {
    param([string]$NssmExe)
    Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("stop", $ServiceName) -AllowFailure | Out-Null
    Start-Sleep -Seconds 2
    Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("remove", $ServiceName, "confirm") -AllowFailure | Out-Null
    sc.exe delete $ServiceName 2>$null | Out-Null
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "ERRO: execute como Administrador." -ForegroundColor Red
    exit 1
}

$paths = Ensure-LumieraServicePaths
$NssmExe = $paths.NssmExe

if ($Uninstall) {
    Remove-LumieraService -NssmExe $NssmExe
    Remove-Item -LiteralPath (Join-Path $script:LogDir "windows-service.mode") -Force -ErrorAction SilentlyContinue
    Write-Host "Servico $ServiceName removido." -ForegroundColor Green
    exit 0
}

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js com erro de sintaxe." -ForegroundColor Red
    exit 1
}

if (-not (Test-LumieraFrontendDistReady)) {
    Write-Host "Compilando frontend..." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "build-lumiera-frontend.ps1")
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "=== Lumiera SERVICO Windows (NSSM) ===" -ForegroundColor Cyan
Write-Host "Caminhos sem espacos via $LinkRoot" -ForegroundColor DarkGray

Disable-LumieraLegacyStack
Unregister-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -Confirm:$false -ErrorAction SilentlyContinue

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Write-Host "Removendo servico antigo..." -ForegroundColor DarkGray
    Remove-LumieraService -NssmExe $NssmExe
    Start-Sleep -Seconds 1
}

$stdout = Join-Path $paths.LogDir "service-stdout.log"
$stderr = Join-Path $paths.LogDir "service-stderr.log"
Ensure-LumieraLogDir

$manualPid = Get-BackendListenerPid
if ($manualPid) {
    Stop-Process -Id $manualPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Registrando $ServiceName..." -ForegroundColor Cyan
Write-Host "  NSSM:    $NssmExe" -ForegroundColor DarkGray
Write-Host "  Node:    $($paths.NodeExe)" -ForegroundColor DarkGray
Write-Host "  Backend: $($paths.BackendDir)" -ForegroundColor DarkGray

Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("install", $ServiceName, $paths.NodeExe)
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "Application", $paths.NodeExe)
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppParameters", "--max-old-space-size=4096 server.js")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppDirectory", $paths.BackendDir)
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "DisplayName", "Lumiera Backend (API + Dashboard)")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "Description", "Lumiera Studio uniport porta 3005")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "Start", "SERVICE_AUTO_START")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppStdout", $stdout)
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppStderr", $stderr)
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppStdoutCreationDisposition", "4")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppStderrCreationDisposition", "4")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppRotateFiles", "1")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppRotateOnline", "1")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppRotateBytes", "5242880")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppExit", "Default", "Restart")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppRestartDelay", "3000")
Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("set", $ServiceName, "AppThrottle", "5000")

Set-Content -Path $script:UniportModeFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path $script:StackModeFile -Value "service" -Encoding UTF8
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path (Join-Path $script:LogDir "windows-service.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8

Invoke-Nssm -NssmExe $NssmExe -NssmCommandArgs @("start", $ServiceName)
Start-Sleep -Seconds 5

$ok = $false
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 10) { $ok = $true; break }
    Start-Sleep -Seconds 2
}

Start-LumieraLegacyRedirect | Out-Null

if ($ok) {
    Write-Host ""
    Write-Host "OK - Servico Windows ativo." -ForegroundColor Green
    Write-Host "  Servico:   $ServiceName" -ForegroundColor White
    Write-Host "  Dashboard: http://127.0.0.1:3005/" -ForegroundColor White
    Write-Host "  Junction:  $LinkRoot" -ForegroundColor DarkGray
    Write-Host "  Logs:      $stderr" -ForegroundColor DarkGray
    exit 0
}

Write-Host "Servico instalado mas health falhou - veja $stderr" -ForegroundColor Red
Write-Host "Diagnostico: & `"$NssmExe`" status $ServiceName" -ForegroundColor Yellow
exit 1