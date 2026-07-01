# Inicia Fish Speech API (Docker) em http://127.0.0.1:8080
# Requer: Docker Desktop + GPU NVIDIA (recomendado 24GB VRAM; 8GB pode falhar no S2-Pro)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VendorDir = Join-Path $RepoRoot ".vendor\fish-speech"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker não encontrado. Instale Docker Desktop ou use fish_speech.api_key (cloud) no config_qanat.json" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Clonando fish-speech em .vendor/fish-speech ..."
    New-Item -ItemType Directory -Path (Split-Path $VendorDir) -Force | Out-Null
    git clone --depth 1 https://github.com/fishaudio/fish-speech.git $VendorDir
}

$ckptDir = Join-Path $VendorDir "checkpoints\s2-pro"
if (-not (Test-Path (Join-Path $ckptDir "codec.pth"))) {
    Write-Host ""
    Write-Host "Checkpoints S2-Pro ausentes em:" -ForegroundColor Yellow
    Write-Host "  $ckptDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Baixe o modelo (HuggingFace fishaudio/s2-pro) e coloque em checkpoints/s2-pro/" -ForegroundColor Yellow
    Write-Host "Ou use API cloud: fish_speech.api_key no config_qanat.json (https://fish.audio)" -ForegroundColor Cyan
    Write-Host ""
}

Set-Location $VendorDir
Write-Host "Subindo Fish Speech API na porta 8080 (docker compose --profile server) ..."
$env:API_PORT = "8080"
$env:COMPILE = "0"
docker compose --profile server up -d --build

Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/health" -TimeoutSec 15
    if ($health.status -eq "ok") {
        Write-Host "Fish Speech ativo: http://127.0.0.1:8080" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "Container iniciado, mas health check falhou. Logs:" -ForegroundColor Yellow
    docker compose --profile server logs --tail 40
    exit 1
}