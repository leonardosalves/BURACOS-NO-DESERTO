# Vigia o backend Lumiera e reinicia se cair. Deixe rodando (ou use install-lumiera-startup.ps1).
param(
    [int]$CheckIntervalSec = 20
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

Write-LumieraLog "=== Watchdog iniciado (intervalo ${CheckIntervalSec}s) ==="

# Primeira subida
Start-LumieraBackendProcess | Out-Null

while ($true) {
    Start-Sleep -Seconds $CheckIntervalSec
    if (Test-LumieraBackendHealthy) { continue }
    Write-LumieraLog "Backend OFFLINE - tentando reiniciar..." "WARN"
    Start-LumieraBackendProcess -ForceRestart | Out-Null
}