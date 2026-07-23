# Setup roomi-fields/notebooklm-mcp como serviço Windows (LumieraNotebooklm)
# Uso: .\scripts\setup-notebooklm-rest.ps1
# Requer: Node.js >= 18, Git
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InstallDir = "C:\Lumiera\tools\notebooklm-mcp"
$ServiceName = "LumieraNotebooklm"
$RepoUrl = "https://github.com/roomi-fields/notebooklm-mcp.git"
$Port = 3000

Write-Host "=== Setup NotebookLM REST API (roomi-fields) ===" -ForegroundColor Cyan
Write-Host "Instalacao: $InstallDir" -ForegroundColor DarkGray
Write-Host "Servico: $ServiceName (porta $Port)" -ForegroundColor DarkGray
Write-Host ""

# 1. Verificar Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js nao encontrado. Instale Node.js >= 18." }
$nodeVersion = (node --version) -replace "v(\d+)\..*", '$1'
if ([int]$nodeVersion -lt 18) { throw "Node.js >= 18 necessario. Atual: $(node --version)" }
Write-Host "[OK] Node.js $(node --version)" -ForegroundColor Green

# 2. Clonar ou atualizar repo
if (Test-Path -LiteralPath $InstallDir) {
    Write-Host "Atualizando repositorio existente..." -ForegroundColor Yellow
    Push-Location $InstallDir
    git pull --ff-only 2>$null
    Pop-Location
} else {
    Write-Host "Clonando repositorio..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path (Split-Path $InstallDir) -Force | Out-Null
    git clone $RepoUrl $InstallDir
}

# 3. Instalar dependencias e build
Push-Location $InstallDir
Write-Host "Instalando dependencias (npm install)..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
npm install --include=dev 2>&1 | Out-Null
Write-Host "Compilando (npm run build)..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Pop-Location
Write-Host "[OK] Build concluido" -ForegroundColor Green

# 4. Autenticacao inicial (abre Chrome)
Write-Host ""
Write-Host "=== AUTENTICACAO ===" -ForegroundColor Magenta
Write-Host "Abrindo Chrome para login Google no NotebookLM..." -ForegroundColor Yellow
Write-Host "Faca login na conta Google desejada e aguarde a confirmacao." -ForegroundColor Yellow
Write-Host ""
Push-Location $InstallDir
npm run setup-auth
Pop-Location
Write-Host "[OK] Autenticacao concluida" -ForegroundColor Green

# 5. Criar script de inicializacao do servico
$StartScript = Join-Path $InstallDir "start-http.bat"
@"
@echo off
cd /d "$InstallDir"
set NOTEBOOKLM_REST_PORT=$Port
node dist/http-server.js
"@ | Set-Content -LiteralPath $StartScript -Encoding ASCII

# 6. Registrar como Windows Service (via nssm ou sc)
Write-Host ""
Write-Host "=== SERVICO WINDOWS ===" -ForegroundColor Magenta

$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssm) {
    Write-Host "Registrando servico via nssm..." -ForegroundColor Yellow
    nssm install $ServiceName "node" "dist/http-server.js"
    nssm set $ServiceName AppDirectory $InstallDir
    nssm set $ServiceName DisplayName "Lumiera NotebookLM REST API"
    nssm set $ServiceName Description "NotebookLM REST API (roomi-fields) - auto-reauth habilitado"
    nssm set $ServiceName Start SERVICE_AUTO_START
    nssm set $ServiceName AppEnvironmentExtra "NOTEBOOKLM_REST_PORT=$Port"
    nssm start $ServiceName
    Write-Host "[OK] Servico '$ServiceName' registrado e iniciado via nssm" -ForegroundColor Green
} else {
    Write-Host "nssm nao encontrado. Criando servico via sc.exe..." -ForegroundColor Yellow
    $nodeExe = (Get-Command node).Source
    $httpServer = Join-Path $InstallDir "dist\http-server.js"
    sc.exe create $ServiceName binPath= "`"$nodeExe`" `"$httpServer`"" start= auto DisplayName= "Lumiera NotebookLM REST API"
    sc.exe description $ServiceName "NotebookLM REST API (roomi-fields) - auto-reauth habilitado"
    sc.exe start $ServiceName
    Write-Host "[OK] Servico '$ServiceName' criado via sc.exe" -ForegroundColor Green
}

# 7. Verificar se esta respondendo
Write-Host ""
Write-Host "Verificando saude do servico..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 10
    Write-Host "[OK] REST API respondendo: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Servico ainda nao respondeu. Pode levar alguns segundos." -ForegroundColor Yellow
    Write-Host "  Verifique: Invoke-RestMethod http://127.0.0.1:$Port/health" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
Write-Host "Servico: $ServiceName" -ForegroundColor White
Write-Host "URL: http://127.0.0.1:$Port" -ForegroundColor White
Write-Host "Auto-reauth: habilitado (sessao nunca expira)" -ForegroundColor White
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor DarkGray
Write-Host "  Restart-Service -Name '$ServiceName' -Force" -ForegroundColor DarkGray
Write-Host "  Get-Service -Name '$ServiceName'" -ForegroundColor DarkGray
Write-Host "  Invoke-RestMethod http://127.0.0.1:$Port/health" -ForegroundColor DarkGray
