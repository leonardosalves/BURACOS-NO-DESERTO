# Setup n8n para Lumiera — clone opcional do repo + Docker
# Repositório: https://github.com/n8n-io/n8n

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $Root "dashboard-qanat"))) {
    $Root = Split-Path $PSScriptRoot -Parent
    if (-not (Test-Path (Join-Path $Root "dashboard-qanat"))) {
        $Root = Get-Location
    }
}

$Upstream = Join-Path $PSScriptRoot "upstream"
$Compose = Join-Path $PSScriptRoot "docker-compose.yml"

Write-Host "Lumiera n8n setup" -ForegroundColor Cyan
Write-Host "Workspace: $Root"

if (-not (Test-Path $Upstream)) {
    Write-Host "Clonando n8n-io/n8n em integrations/n8n/upstream ..."
    git clone --depth 1 https://github.com/n8n-io/n8n.git $Upstream
} else {
    Write-Host "Repositório upstream já existe: $Upstream"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker não encontrado. Instale Docker Desktop e rode:" -ForegroundColor Yellow
    Write-Host "  docker compose -f `"$Compose`" up -d"
    exit 1
}

Write-Host "Subindo n8n na porta 5678 ..."
Push-Location $PSScriptRoot
try {
    docker compose -f $Compose up -d
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "n8n: http://127.0.0.1:5678" -ForegroundColor Green
Write-Host "Dashboard Lumiera: aba 'n8n Orquestração' no menu Estúdio"
Write-Host ""
Write-Host "Próximos passos:"
Write-Host "  1. Abra n8n e crie uma API Key (Settings -> API)"
Write-Host "  2. No Lumiera, aba n8n -> Config -> cole a API key"
Write-Host "  3. Clique 'Sync Lumiera -> n8n' para publicar o mapa de funcionamento"