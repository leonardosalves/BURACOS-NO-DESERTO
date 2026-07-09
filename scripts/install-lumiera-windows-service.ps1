# Instala Lumiera como SERVICO Windows (NSSM) — reinicia automatico pelo SCM, sem PM2/PowerShell.
# Requer Admin. Rode: .\scripts\install-lumiera-windows-service.ps1
param([switch]$Uninstall)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$ServiceName = "LumieraBackend"
$NssmDir = Join-Path $script:RepoRoot "tools\nssm"
$NssmExe = Join-Path $NssmDir "nssm.exe"

function Get-NodePath {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { throw "Node.js nao encontrado no PATH." }
    return $node.Source
}

function Ensure-Nssm {
    if (Test-Path -LiteralPath $NssmExe) { return }

    Write-Host "Baixando NSSM (gerenciador de servico Windows)..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $NssmDir -Force | Out-Null
    $zip = Join-Path $env:TEMP "nssm-2.24.zip"
    $extract = Join-Path $env:TEMP "nssm-2.24"

    $mirrors = @(
        "https://github.com/imvickykumar999/Non-Sucking-Service-Manager/releases/download/nssm-2.24/nssm-2.24.zip",
        "https://nssm.cc/release/nssm-2.24.zip"
    )

    $downloaded = $false
    foreach ($url in $mirrors) {
        try {
            Write-Host "  Tentando: $url" -ForegroundColor DarkGray
            Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120
            if ((Get-Item $zip).Length -gt 100000) {
                $downloaded = $true
                break
            }
        } catch {
            Write-Host "  Falhou: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    }

    if (-not $downloaded) {
        throw @"
Nao foi possivel baixar NSSM (site nssm.cc fora + mirrors falharam).
Instale manualmente:
  winget install NSSM.NSSM
ou copie nssm.exe para: $NssmExe
"@
    }

    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $extract -Force

    $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
    $src = Join-Path $extract "nssm-2.24\$arch\nssm.exe"
    if (-not (Test-Path -LiteralPath $src)) { throw "nssm.exe nao encontrado no zip." }
    Copy-Item -LiteralPath $src -Destination $NssmExe -Force
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
    Write-Host "NSSM OK em $NssmExe" -ForegroundColor Green
}

function Invoke-Nssm {
    param(
        [string[]]$NssmCommandArgs,
        [switch]$AllowFailure
    )
    if (-not $NssmCommandArgs -or $NssmCommandArgs.Count -eq 0) {
        throw "Invoke-Nssm chamado sem argumentos."
    }
    $cmdLine = "nssm $($NssmCommandArgs -join ' ')"
    & $NssmExe @NssmCommandArgs
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "NSSM falhou (exit $code): $cmdLine"
    }
    return $code
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "ERRO: execute como Administrador (clique direito PowerShell > Executar como administrador)." -ForegroundColor Red
    exit 1
}

Ensure-Nssm

if ($Uninstall) {
    Invoke-Nssm -NssmCommandArgs @("stop", $ServiceName) -AllowFailure | Out-Null
    Start-Sleep -Seconds 2
    Invoke-Nssm -NssmCommandArgs @("remove", $ServiceName, "confirm") -AllowFailure | Out-Null
    Remove-Item -LiteralPath (Join-Path $script:LogDir "windows-service.mode") -Force -ErrorAction SilentlyContinue
    Write-Host "Servico $ServiceName removido." -ForegroundColor Green
    exit 0
}

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js com erro de sintaxe." -ForegroundColor Red
    exit 1
}

if (-not (Test-LumieraFrontendDistReady)) {
    Write-Host "Compilando frontend (obrigatorio para uniport)..." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "build-lumiera-frontend.ps1")
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "=== Lumiera SERVICO Windows (NSSM + Node) ===" -ForegroundColor Cyan

Disable-LumieraLegacyStack
Unregister-ScheduledTask -TaskName "Lumiera-Backend-Watchdog" -Confirm:$false -ErrorAction SilentlyContinue

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removendo servico existente $ServiceName..." -ForegroundColor DarkGray
    Invoke-Nssm -NssmCommandArgs @("stop", $ServiceName) -AllowFailure | Out-Null
    Start-Sleep -Seconds 2
    Invoke-Nssm -NssmCommandArgs @("remove", $ServiceName, "confirm") -AllowFailure | Out-Null
    Start-Sleep -Seconds 1
}

$nodePath = Get-NodePath
$serverJs = Join-Path $script:BackendDir "server.js"
$stdout = Join-Path $script:LogDir "service-stdout.log"
$stderr = Join-Path $script:LogDir "service-stderr.log"
$appParams = '--max-old-space-size=4096 "{0}"' -f $serverJs

Ensure-LumieraLogDir
Initialize-LumieraBackendEnv

# Libera porta 3005 do node manual antes do servico assumir
$manualPid = Get-BackendListenerPid
if ($manualPid) {
    Write-Host "Encerrando backend manual (PID $manualPid) para o servico assumir..." -ForegroundColor DarkGray
    Stop-Process -Id $manualPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Registrando servico $ServiceName..." -ForegroundColor Cyan
Invoke-Nssm -NssmCommandArgs @("install", $ServiceName, $nodePath)
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppParameters", $appParams)
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppDirectory", $script:BackendDir)
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "DisplayName", "Lumiera Backend (API + Dashboard)")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "Description", "Lumiera Studio - Node.js uniport porta 3005")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "Start", "SERVICE_AUTO_START")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppStdout", $stdout)
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppStderr", $stderr)
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppStdoutCreationDisposition", "4")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppStderrCreationDisposition", "4")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppRotateFiles", "1")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppRotateOnline", "1")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppRotateBytes", "5242880")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppExit", "Default", "Restart")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppRestartDelay", "3000")
Invoke-Nssm -NssmCommandArgs @("set", $ServiceName, "AppThrottle", "5000")

$envLines = @()
if ($env:NOTEBOOKLM_MCP_CLI_PATH) { $envLines += "NOTEBOOKLM_MCP_CLI_PATH=$($env:NOTEBOOKLM_MCP_CLI_PATH)" }
if ($env:NLM_BIN) { $envLines += "NLM_BIN=$($env:NLM_BIN)" }
if ($envLines.Count -gt 0) {
    Invoke-Nssm -NssmCommandArgs (@("set", $ServiceName, "AppEnvironmentExtra") + $envLines)
}

Set-Content -Path $script:UniportModeFile -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path $script:StackModeFile -Value "service" -Encoding UTF8
Set-Content -Path (Join-Path $script:LogDir "permanent.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8
Set-Content -Path (Join-Path $script:LogDir "windows-service.mode") -Value ((Get-Date).ToString("o")) -Encoding UTF8

Invoke-Nssm -NssmCommandArgs @("start", $ServiceName)
Start-Sleep -Seconds 4

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
    Write-Host "  Nome:     $ServiceName (inicia com o Windows)" -ForegroundColor White
    Write-Host "  Dashboard: http://127.0.0.1:3005/" -ForegroundColor White
    Write-Host "  Logs:     $stderr" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Gerenciar:" -ForegroundColor Cyan
    Write-Host "  Get-Service $ServiceName" -ForegroundColor White
    Write-Host "  Restart-Service $ServiceName   # apos mudar backend" -ForegroundColor White
    Write-Host "  .\scripts\install-lumiera-windows-service.ps1 -Uninstall" -ForegroundColor White
    exit 0
}

Write-Host "Servico instalado mas health falhou - veja $stderr" -ForegroundColor Red
exit 1