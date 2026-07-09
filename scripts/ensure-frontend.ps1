# Sobe o Vite (5176) apenas se estiver offline.
$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$FrontendDir = Join-Path (Join-Path $script:RepoRoot "dashboard-qanat") "frontend"
$FrontendPort = 5176
$DashboardUrl = "http://127.0.0.1:$FrontendPort/"

function Test-PortListening([int]$Port) {
    return [bool](Get-PortListenerPidFast $Port)
}

if (Test-PortListening $FrontendPort) {
    Write-Host "Frontend OK em $DashboardUrl" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install --no-audit --no-fund
    Pop-Location
}

Ensure-LumieraLogDir
$outLog = Join-Path $script:LogDir "frontend-stdout.log"
$errLog = Join-Path $script:LogDir "frontend-stderr.log"
$pidFile = Join-Path $script:LogDir "frontend.pid"
$cmdLine = 'npm run dev 1>> "{0}" 2>> "{1}"' -f $outLog, $errLog

Write-Host "Subindo frontend Vite na porta $FrontendPort..." -ForegroundColor Cyan
$proc = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/d", "/s", "/c", $cmdLine) `
    -WorkingDirectory $FrontendDir `
    -WindowStyle Hidden `
    -PassThru

if ($proc -and $proc.Id) {
    Set-Content -Path $pidFile -Value $proc.Id -Encoding UTF8
}

$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if (Test-PortListening $FrontendPort) {
        Write-Host "Frontend OK em $DashboardUrl" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Host "Falha ao subir frontend - veja $errLog" -ForegroundColor Red
exit 1