# Reinicia a tarefa do watchdog para carregar watch-lumiera-backend.ps1 atualizado.
$ErrorActionPreference = "SilentlyContinue"
$TaskName = "Lumiera-Backend-Watchdog"

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    try {
        $_.CommandLine -like "*watch-lumiera-backend.ps1*"
    } catch { $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
    Write-Host "Watchdog nao instalado. Rode: .\scripts\install-lumiera-startup.ps1" -ForegroundColor Yellow
    . (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $PSScriptRoot 'watch-lumiera-backend.ps1')`"" -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
    Write-Host "Watchdog iniciado em background." -ForegroundColor Green
    exit 0
}

Write-Host "Watchdog reiniciado (tarefa $TaskName)." -ForegroundColor Green