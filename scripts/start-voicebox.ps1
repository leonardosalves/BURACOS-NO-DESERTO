# Sobe Voicebox via Docker (CPU) em http://127.0.0.1:17600
# Para GPU no Windows, prefira o app MSI: https://voicebox.sh/download/windows (:17493)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VendorDir = Join-Path $RepoRoot ".vendor\voicebox"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker não encontrado. Instale Voicebox MSI: https://voicebox.sh/download/windows" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Rodando setup primeiro ..."
    & (Join-Path $RepoRoot "scripts\setup-voicebox.ps1")
}

Set-Location $VendorDir
Write-Host "Build + up Voicebox Docker (porta 17600 → 17493 interno) ..." -ForegroundColor Cyan
docker compose up -d --build

Start-Sleep -Seconds 8
try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:17600/health" -TimeoutSec 20
    Write-Host "Voicebox Docker ativo: http://127.0.0.1:17600" -ForegroundColor Green
    Write-Host "GPU: $($h.gpu_available) · backend: $($h.backend_type)" -ForegroundColor DarkGray
    exit 0
} catch {
    Write-Host "Container subiu mas health falhou. Logs:" -ForegroundColor Yellow
    docker compose logs --tail 30
    exit 1
}