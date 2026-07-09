# Login NotebookLM — Chrome com caminho SEM espacos (C:\Lumiera) + CDP externo
# Uso: cd pasta LUMIERA  ->  .\nlm-login.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Resolve-NlmDataPath {
    $link = "C:\Lumiera"
    if (Test-Path -LiteralPath $link) {
        return Join-Path $link ".notebooklm-data"
    }
    return Join-Path $PSScriptRoot ".notebooklm-data"
}

function Resolve-NlmExe {
    $candidates = @(
        (Join-Path $env:USERPROFILE ".local\bin\nlm.exe"),
        (Join-Path $env:LOCALAPPDATA ".local\bin\nlm.exe"),
        "C:\Lumiera\tools\nlm\nlm.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    $cmd = Get-Command nlm -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
    throw "nlm.exe nao encontrado. Instale o NotebookLM CLI."
}

function Resolve-ChromeExe {
    $candidates = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    throw "Google Chrome nao encontrado."
}

function Test-PortListening([int]$Port) {
    try {
        return (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
    } catch {
        return $false
    }
}

function Wait-Port([int]$Port, [int]$TimeoutSec = 30) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening $Port) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Stop-NlmChromeOnPort([int]$Port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            if ($conn.OwningProcess) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch { }
}

$DataPath = Resolve-NlmDataPath
$NlmExe = Resolve-NlmExe
$ChromeExe = Resolve-ChromeExe
$ProfileDir = Join-Path $DataPath "chrome-profiles\nlm-auth"
$CdpPort = 9225

$env:NOTEBOOKLM_MCP_CLI_PATH = $DataPath
[Environment]::SetEnvironmentVariable("NOTEBOOKLM_MCP_CLI_PATH", $DataPath, "User")
New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
New-Item -ItemType Directory -Path $ProfileDir -Force | Out-Null
Remove-Item -LiteralPath (Join-Path $DataPath "chrome-port-map.json") -Force -ErrorAction SilentlyContinue

Write-Host "NotebookLM data: $DataPath" -ForegroundColor Cyan
Write-Host "CLI: $NlmExe" -ForegroundColor DarkGray
Write-Host "Chrome: $ChromeExe" -ForegroundColor DarkGray

& $NlmExe login --check 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - NotebookLM ja conectado. No dashboard, clique em Atualizar." -ForegroundColor Green
    exit 0
}

Write-Host "Abrindo Chrome para login Google (porta $CdpPort)..." -ForegroundColor Yellow
Stop-NlmChromeOnPort $CdpPort
Start-Process -FilePath $ChromeExe -ArgumentList @(
    "--remote-debugging-port=$CdpPort",
    "--user-data-dir=$ProfileDir",
    "--no-first-run",
    "--no-default-browser-check",
    "https://notebooklm.google.com/"
)

if (-not (Wait-Port $CdpPort 35)) {
    Write-Host "ERRO: Chrome nao abriu a porta de debug $CdpPort." -ForegroundColor Red
    Write-Host "Feche instancias antigas do Chrome e rode este script de novo." -ForegroundColor Yellow
    exit 1
}

Write-Host "Faca login na janela do Chrome que abriu. Aguardando ate 5 min..." -ForegroundColor Cyan
& $NlmExe login --provider openclaw --cdp-url "http://127.0.0.1:$CdpPort"
$code = $LASTEXITCODE
if ($code -eq 0) {
    Write-Host "OK - NotebookLM conectado. No dashboard, clique em Atualizar." -ForegroundColor Green
} else {
    Write-Host "Login terminou com codigo $code." -ForegroundColor Yellow
    Write-Host "Se o Chrome abriu, conclua o login Google e rode .\nlm-login.ps1 de novo." -ForegroundColor Yellow
}
exit $code