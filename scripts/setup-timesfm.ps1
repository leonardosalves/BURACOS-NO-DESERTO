# TimesFM - previsao de series temporais para Radar de Tendencias Lumiera
# https://github.com/google-research/timesfm
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendDir = Join-Path $RepoRoot "dashboard-qanat\backend"
$VenvDir = Join-Path $BackendDir ".venv-timesfm"
$VendorDir = Join-Path $RepoRoot ".vendor\timesfm"
$Python = Join-Path $VenvDir "Scripts\python.exe"

function Resolve-SystemPython {
    $candidates = @(
        $env:PYTHON_PATH,
        (Join-Path $env:LOCALAPPDATA "Python\pythoncore-3.12-64\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Python\bin\python.exe"),
        "C:\Users\Leo\AppData\Local\Python\bin\python.exe"
    ) | Where-Object { $_ -and (Test-Path $_) }
    if ($candidates.Count -gt 0) { return $candidates[0] }
    return "python"
}

if (-not (Test-Path $VendorDir)) {
    Write-Host "Clonando timesfm em .vendor/timesfm ..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path (Split-Path $VendorDir) -Force | Out-Null
    git clone --depth 1 https://github.com/google-research/timesfm.git $VendorDir
} else {
    Write-Host "Repo timesfm ja em $VendorDir" -ForegroundColor DarkGray
}

$sysPython = Resolve-SystemPython
Write-Host "Python base: $sysPython" -ForegroundColor DarkGray

if (-not (Test-Path $Python)) {
    Write-Host "Criando venv .venv-timesfm ..." -ForegroundColor Cyan
    & $sysPython -m venv $VenvDir
}

Write-Host "Instalando timesfm[torch] (pode demorar; baixa modelo ~200M) ..." -ForegroundColor Cyan
& $Python -m pip install --upgrade pip wheel
& $Python -m pip install "timesfm[torch]"

Write-Host ""
Write-Host "Verificando import timesfm + torch ..." -ForegroundColor Cyan
$check = & $Python -c "import timesfm, torch; print('ok')" 2>&1
if ($LASTEXITCODE -eq 0 -and "$check" -match "ok") {
    Write-Host "TimesFM instalado com sucesso." -ForegroundColor Green
    Write-Host "Venv: $VenvDir" -ForegroundColor DarkGray
} else {
    Write-Host "Falha na verificacao:" -ForegroundColor Yellow
    Write-Host $check
    Write-Host ""
    Write-Host "O Lumiera ainda funciona com fallback estatistico." -ForegroundColor Yellow
    Write-Host "GPU/CUDA: instale PyTorch adequado em https://pytorch.org/get-started/locally/" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Lumiera: aba Radar Tendencias (sidebar global)" -ForegroundColor Cyan
Write-Host "API: GET /api/trends/status  POST /api/trends/forecast" -ForegroundColor DarkGray