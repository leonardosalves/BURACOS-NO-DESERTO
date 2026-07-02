# Inicia GPT-SoVITS API v2 em http://127.0.0.1:9880
# Requer: clone do repo + ambiente Python (conda GPTSoVits recomendado)
# Docs: https://github.com/RVC-Boss/GPT-SoVITS
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$VendorDir = Join-Path $RepoRoot ".vendor\GPT-SoVITS"
if ($env:GPT_SOVITS_PORT) {
    $Port = $env:GPT_SOVITS_PORT
} else {
    $Port = "9880"
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Clone GPT-SoVITS em .vendor/GPT-SoVITS ..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path (Split-Path $VendorDir) -Force | Out-Null
    git clone --depth 1 https://github.com/RVC-Boss/GPT-SoVITS.git $VendorDir
}

Set-Location $VendorDir

$python = $null
if ($env:GPT_SOVITS_PYTHON -and (Test-Path $env:GPT_SOVITS_PYTHON)) {
    $python = $env:GPT_SOVITS_PYTHON
}

if (-not $python -and (Get-Command conda -ErrorAction SilentlyContinue)) {
    if ($env:GPT_SOVITS_CONDA_ENV) {
        $condaEnv = $env:GPT_SOVITS_CONDA_ENV
    } else {
        $condaEnv = "GPTSoVits"
    }
    $condaPy = Join-Path $env:USERPROFILE "miniconda3\envs\$condaEnv\python.exe"
    if (-not (Test-Path $condaPy)) {
        $condaPy = Join-Path $env:USERPROFILE "anaconda3\envs\$condaEnv\python.exe"
    }
    if (Test-Path $condaPy) {
        $python = $condaPy
    }
}

if (-not $python) {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd) {
        $python = $pyCmd.Source
    }
}

if (-not $python) {
    Write-Host "Python nao encontrado. Instale GPT-SoVITS (conda env GPTSoVits) ou defina GPT_SOVITS_PYTHON." -ForegroundColor Red
    exit 1
}

Write-Host "Iniciando GPT-SoVITS API v2 em http://127.0.0.1:$Port ..." -ForegroundColor Cyan
Write-Host "Configure no Lumiera (config_qanat.json):" -ForegroundColor DarkGray
Write-Host '  "gpt_sovits": { "base_url": "http://127.0.0.1:9880", "voices": [{ "id": "minha_voz", "label": "...", "ref_audio_path": "C:/caminho/ref.wav", "prompt_text": "texto da amostra" }] }' -ForegroundColor DarkGray

$apiScript = Join-Path $VendorDir "api_v2.py"
if (-not (Test-Path $apiScript)) {
    Write-Host "api_v2.py nao encontrado em $VendorDir" -ForegroundColor Red
    exit 1
}

Start-Process -FilePath $python -ArgumentList @($apiScript, "-a", "127.0.0.1", "-p", $Port) -WorkingDirectory $VendorDir
Start-Sleep -Seconds 4

$apiOk = $false
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/tts" -Method GET -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $apiOk = $true
    }
} catch {
    $statusCode = $null
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -eq 400) {
        $apiOk = $true
    }
}

if ($apiOk) {
    Write-Host "GPT-SoVITS API ativa: http://127.0.0.1:$Port" -ForegroundColor Green
} else {
    Write-Host "Servidor iniciando - aguarde o carregamento dos modelos e teste no Lumiera." -ForegroundColor Yellow
}