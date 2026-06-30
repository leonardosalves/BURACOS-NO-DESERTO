# Reinicia o backend Lumiera (porta 3005)
$ErrorActionPreference = "SilentlyContinue"
$connections = Get-NetTCPConnection -LocalPort 3005
foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force
}
Start-Sleep -Seconds 1
$backendDir = Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "dashboard-qanat") "backend"
Set-Location $backendDir
Write-Host "Iniciando backend em http://127.0.0.1:3005 ..."
node server.js