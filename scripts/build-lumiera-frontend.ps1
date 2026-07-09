# Compila o frontend React para dashboard-qanat/frontend/dist (modo uniport).
param(
    [switch]$Quiet,
    [switch]$Lite
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

$FrontendDir = Join-Path (Join-Path $script:RepoRoot "dashboard-qanat") "frontend"
$buildScript = if ($Lite) { "build:lite" } else { "build" }

function Write-Build([string]$Message, [string]$Color = "White") {
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Build "Instalando dependencias do frontend..." "Yellow"
    Push-Location $FrontendDir
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Build "Falha no npm install do frontend." "Red"
        exit 1
    }
    Pop-Location
}

Write-Build "Compilando frontend (npm run $buildScript)..." "Cyan"
Push-Location $FrontendDir
npm run $buildScript
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
    Write-Build "Falha no build do frontend." "Red"
    exit 1
}

if (-not (Test-LumieraFrontendDistReady)) {
    Write-Build "Build terminou mas index.html nao encontrado em dist/." "Red"
    exit 1
}

Write-Build "Frontend compilado: $script:FrontendDistDir" "Green"
exit 0