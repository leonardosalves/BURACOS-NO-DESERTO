# Starts Lumiera for Windows logon without leaving a console waiting on-screen.
$ErrorActionPreference = "SilentlyContinue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendDir = Join-Path $RepoRoot "dashboard-qanat\backend"
$FrontendDir = Join-Path $RepoRoot "dashboard-qanat\frontend"
$LogDir = Join-Path $RepoRoot ".lumiera-logs"
$DashboardUrl = "http://127.0.0.1:5176/"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$CleanupScript = Join-Path $PSScriptRoot "cleanup-lumiera-logs.ps1"
if (Test-Path -LiteralPath $CleanupScript) {
    & $CleanupScript -RetentionDays 3 -JobRetentionHours 24 -MaxLogBytes 5242880 | Out-Null
}

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-HiddenNodeProcess([string]$WorkingDirectory, [string]$Command, [string]$OutLog, [string]$ErrLog) {
    $args = "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$WorkingDirectory'; $Command`""
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList $args `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog | Out-Null
}

if (-not (Test-PortListening 3005)) {
    Start-HiddenNodeProcess `
        -WorkingDirectory $BackendDir `
        -Command "node server.js" `
        -OutLog (Join-Path $LogDir "login-backend-out.log") `
        -ErrLog (Join-Path $LogDir "login-backend-error.log")
}

if (-not (Test-PortListening 5176)) {
    Start-HiddenNodeProcess `
        -WorkingDirectory $FrontendDir `
        -Command "npm.cmd run dev -- --host 127.0.0.1 --port 5176 --strictPort" `
        -OutLog (Join-Path $LogDir "login-frontend-out.log") `
        -ErrLog (Join-Path $LogDir "login-frontend-error.log")
}

Start-Sleep -Seconds 8
Start-Process $DashboardUrl
