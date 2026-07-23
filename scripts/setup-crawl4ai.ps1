# Installs and starts the authenticated Crawl4AI sidecar used by Lumiera research.
param(
    [string]$Image = "unclecode/crawl4ai:0.9.2",
    [string]$ContainerName = "lumiera-crawl4ai",
    [string]$ApiToken = ""
)

$ErrorActionPreference = "Stop"
$BaseUrl = "http://127.0.0.1:11235"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LocalConfig = Join-Path $RepoRoot ".lumiera-crawl4ai.json"

try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "Docker Desktop esta instalado, mas o daemon nao esta ativo." -ForegroundColor Yellow
    Write-Host "Abra o Docker Desktop e execute este script novamente." -ForegroundColor Cyan
    exit 1
}

if (-not $ApiToken) {
    $ApiToken = [Environment]::GetEnvironmentVariable("CRAWL4AI_API_TOKEN", "User")
}
if (-not $ApiToken) {
    $ApiToken = ([Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N"))
}

[Environment]::SetEnvironmentVariable("CRAWL4AI_ENABLED", "true", "User")
[Environment]::SetEnvironmentVariable("CRAWL4AI_BASE_URL", $BaseUrl, "User")
[Environment]::SetEnvironmentVariable("CRAWL4AI_API_TOKEN", $ApiToken, "User")
$env:CRAWL4AI_ENABLED = "true"
$env:CRAWL4AI_BASE_URL = $BaseUrl
$env:CRAWL4AI_API_TOKEN = $ApiToken

@{
    enabled = $true
    baseUrl = $BaseUrl
    apiToken = $ApiToken
} | ConvertTo-Json | Set-Content -LiteralPath $LocalConfig -Encoding UTF8

# Try to copy settings to NSSM too. The ignored local config above remains the
# portable fallback when the setup process is not elevated.
$NssmExe = "C:\Lumiera\tools\nssm\nssm.exe"
$LumieraService = Get-Service -Name "LumieraBackend" -ErrorAction SilentlyContinue
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin -and $LumieraService -and (Test-Path -LiteralPath $NssmExe)) {
    & $NssmExe set LumieraBackend AppEnvironmentExtra "CRAWL4AI_ENABLED=true" 2>$null | Out-Null
    & $NssmExe set LumieraBackend AppEnvironmentExtra "CRAWL4AI_BASE_URL=$BaseUrl" 2>$null | Out-Null
    & $NssmExe set LumieraBackend AppEnvironmentExtra "CRAWL4AI_API_TOKEN=$ApiToken" 2>$null | Out-Null
}

$existing = docker ps -a --filter "name=^/$ContainerName$" --format "{{.Names}}"
if ($existing -eq $ContainerName) {
    Write-Host "Recriando container $ContainerName..." -ForegroundColor Yellow
    docker rm -f $ContainerName 2>&1 | Out-Null
}

Write-Host "Baixando $Image..." -ForegroundColor Cyan
docker pull $Image

Write-Host "Iniciando Crawl4AI em $BaseUrl..." -ForegroundColor Cyan
docker run -d `
    --name $ContainerName `
    --restart unless-stopped `
    --shm-size=1g `
    -p 127.0.0.1:11235:11235 `
    -e "CRAWL4AI_API_TOKEN=$ApiToken" `
    $Image | Out-Null

$headers = @{ Authorization = "Bearer $ApiToken" }
$healthy = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Headers $headers -TimeoutSec 3
        if ($health) {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $healthy) {
    Write-Host "O container iniciou, mas ainda nao respondeu ao health check." -ForegroundColor Yellow
    Write-Host "Verifique com: docker logs $ContainerName" -ForegroundColor DarkGray
    exit 1
}

Write-Host "Crawl4AI pronto em $BaseUrl" -ForegroundColor Green
Write-Host "Configuracao salva no ambiente do usuario e no arquivo local do Lumiera." -ForegroundColor Green
Write-Host "Reinicie o backend Lumiera para carregar a configuracao:" -ForegroundColor Cyan
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restart-backend.ps1 -Force" -ForegroundColor DarkGray
