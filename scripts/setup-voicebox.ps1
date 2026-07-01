# Voicebox - estudio TTS local (clone de voz) para narracao Lumiera
# https://github.com/jamiepine/voicebox
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VendorDir = Join-Path $RepoRoot ".vendor\voicebox"
$CursorMcp = Join-Path $env:APPDATA "Cursor\User\mcp.json"

function Test-VoiceboxHealth([string]$BaseUrl) {
    try {
        $h = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 5
        return @{ ok = $true; url = $BaseUrl; health = $h }
    } catch {
        return @{ ok = $false; url = $BaseUrl; error = $_.Exception.Message }
    }
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Clonando voicebox em .vendor/voicebox ..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path (Split-Path $VendorDir) -Force | Out-Null
    git clone --depth 1 https://github.com/jamiepine/voicebox.git $VendorDir
} else {
    Write-Host "Repo voicebox ja em $VendorDir" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Verificando API Voicebox ..." -ForegroundColor Cyan
$hits = @(
    (Test-VoiceboxHealth "http://127.0.0.1:17493"),
    (Test-VoiceboxHealth "http://127.0.0.1:17600"),
    (Test-VoiceboxHealth "http://127.0.0.1:8000")
) | Where-Object { $_.ok }

if ($hits.Count -gt 0) {
    $active = $hits[0]
    Write-Host "Voicebox ATIVO: $($active.url)" -ForegroundColor Green
    try {
        $profiles = Invoke-RestMethod -Uri "$($active.url)/profiles" -TimeoutSec 8
        $n = @($profiles).Count
        Write-Host "Perfis de voz: $n" -ForegroundColor Green
        if ($n -eq 0) {
            Write-Host "Crie um perfil no app (Voices) antes de gerar narracao no Lumiera." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Nao foi possivel listar perfis." -ForegroundColor Yellow
    }
} else {
    Write-Host "Voicebox offline." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Windows recomendado (CUDA/GPU):" -ForegroundColor Cyan
    Write-Host "  1. Baixe o MSI: https://voicebox.sh/download/windows" -ForegroundColor DarkGray
    Write-Host "  2. Abra o Voicebox e deixe rodando (API :17493)" -ForegroundColor DarkGray
    Write-Host "  3. Voices - crie perfil (clone ou preset Kokoro PT)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Alternativa Docker CPU (porta 17600):" -ForegroundColor Cyan
    Write-Host "  .\scripts\start-voicebox.ps1" -ForegroundColor DarkGray
}

$voiceboxMcp = @{
    url     = "http://127.0.0.1:17493/mcp"
    headers = @{ "X-Voicebox-Client-Id" = "cursor" }
}
if (Test-Path $CursorMcp) {
    $raw = Get-Content $CursorMcp -Raw -Encoding UTF8
    $cfg = $raw | ConvertFrom-Json
    if (-not $cfg.mcpServers) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
    if (-not $cfg.mcpServers.voicebox) {
        $cfg.mcpServers | Add-Member -NotePropertyName voicebox -NotePropertyValue ([pscustomobject]$voiceboxMcp) -Force
        $cfg | ConvertTo-Json -Depth 10 | Set-Content $CursorMcp -Encoding UTF8
        Write-Host ""
        Write-Host "MCP voicebox adicionado em $CursorMcp (reinicie o Cursor)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Lumiera: Workflow - Narracao TTS - engine Voicebox" -ForegroundColor Cyan
Write-Host "Opcional em config_qanat.json: voicebox.engine, voicebox.language, voicebox.default_profile_id" -ForegroundColor DarkGray