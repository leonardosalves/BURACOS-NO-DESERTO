# Sobe Voicebox para o Lumiera (API local)
# Prioridade: app MSI instalado, depois Docker CPU (17600)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VendorDir = Join-Path $RepoRoot ".vendor\voicebox"
$VoiceboxExe = "C:\Program Files\Voicebox\voicebox.exe"
$VoiceboxServerExe = "C:\Program Files\Voicebox\voicebox-server.exe"
$ProbeUrls = @("http://127.0.0.1:17493", "http://127.0.0.1:17600", "http://127.0.0.1:8000")

function Test-VoiceboxHealth([string]$BaseUrl) {
    try {
        $h = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 6
        return @{ ok = $true; url = $BaseUrl; health = $h }
    } catch {
        return @{ ok = $false; url = $BaseUrl; error = $_.Exception.Message }
    }
}

function Wait-VoiceboxReady([int]$MaxSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        foreach ($url in $ProbeUrls) {
            $hit = Test-VoiceboxHealth $url
            if ($hit.ok) { return $hit }
        }
        Start-Sleep -Seconds 3
    }
    return $null
}

function Test-DockerDaemon {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
    try {
        docker info *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Start-DockerDesktopIfNeeded {
    $desktop = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $desktop)) { return $false }
    if (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue) { return $true }
    Write-Host "Iniciando Docker Desktop (aguarde 30-60s) ..." -ForegroundColor Yellow
    Start-Process $desktop | Out-Null
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerDaemon) { return $true }
        Start-Sleep -Seconds 5
    }
    return $false
}

Write-Host "Verificando Voicebox ..." -ForegroundColor Cyan
$active = $null
foreach ($url in $ProbeUrls) {
    $hit = Test-VoiceboxHealth $url
    if ($hit.ok) { $active = $hit; break }
}
if ($active) {
    Write-Host "Voicebox ja ativo: $($active.url)" -ForegroundColor Green
    try {
        $profiles = Invoke-RestMethod -Uri "$($active.url)/profiles" -TimeoutSec 8
        $n = @($profiles).Count
        Write-Host "Perfis de voz: $n" -ForegroundColor Green
        if ($n -eq 0) {
            Write-Host "Abra o Voicebox > Voices > crie um perfil antes de gerar no Lumiera." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Nao foi possivel listar perfis." -ForegroundColor Yellow
    }
    exit 0
}

# --- App MSI (recomendado no Windows) ---
if (Test-Path $VoiceboxExe) {
    Write-Host "App Voicebox instalado - iniciando (porta 17493) ..." -ForegroundColor Cyan
    if (-not (Get-Process voicebox -ErrorAction SilentlyContinue)) {
        Start-Process $VoiceboxExe | Out-Null
    }
    if (Test-Path $VoiceboxServerExe) {
        $servers = Get-Process voicebox-server -ErrorAction SilentlyContinue
        if (-not $servers) {
            Start-Process -FilePath $VoiceboxServerExe -ArgumentList @("--host", "127.0.0.1", "--port", "17493") -WindowStyle Hidden | Out-Null
        }
    }
    $ready = Wait-VoiceboxReady 120
    if ($ready) {
        Write-Host "Voicebox ativo: $($ready.url)" -ForegroundColor Green
        Write-Host "GPU: $($ready.health.gpu_available) · backend: $($ready.health.backend_type)" -ForegroundColor DarkGray
        exit 0
    }
    Write-Host "Voicebox abriu mas a API nao respondeu a tempo." -ForegroundColor Yellow
    Write-Host "Deixe o app aberto, aguarde carregar modelos e clique 'Atualizar vozes' no Lumiera." -ForegroundColor Yellow
    exit 1
}

# --- Docker CPU ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Voicebox nao encontrado." -ForegroundColor Red
    Write-Host "Instale o MSI: https://voicebox.sh/download/windows" -ForegroundColor Cyan
    exit 1
}

if (-not (Test-DockerDaemon)) {
    Write-Host "Docker Desktop nao esta rodando." -ForegroundColor Yellow
    if (-not (Start-DockerDesktopIfNeeded)) {
        Write-Host ""
        Write-Host "Opcoes:" -ForegroundColor Cyan
        Write-Host "  A) Abra o Docker Desktop manualmente e rode este script de novo" -ForegroundColor DarkGray
        Write-Host "  B) Instale o app Voicebox (sem Docker): https://voicebox.sh/download/windows" -ForegroundColor DarkGray
        Write-Host "     Depois rode: .\scripts\start-voicebox.ps1" -ForegroundColor DarkGray
        exit 1
    }
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Rodando setup primeiro ..."
    & (Join-Path $RepoRoot "scripts\setup-voicebox.ps1")
}

Set-Location $VendorDir
Write-Host "Build + up Voicebox Docker (porta 17600) ..." -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha no docker compose. Prefira o app MSI se Docker continuar instavel." -ForegroundColor Red
    exit 1
}

$ready = Wait-VoiceboxReady 60
if ($ready) {
    Write-Host "Voicebox Docker ativo: $($ready.url)" -ForegroundColor Green
    exit 0
}

Write-Host "Container subiu mas health falhou. Logs:" -ForegroundColor Yellow
docker compose logs --tail 30
exit 1