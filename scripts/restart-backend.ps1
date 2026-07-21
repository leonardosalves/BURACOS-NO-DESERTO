# Reinicia o backend Lumiera (porta 3005) - com log em .lumiera-logs/
# Padrao: so reinicia se offline. Use -Force apos mudar codigo do backend.
param(
    [switch]$Force
)

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "lumiera-backend-common.ps1")

# Garantir OmniRoute Local (gateway IA) rodando
& (Join-Path $PSScriptRoot "ensure-omniroute.ps1") -Quiet

$check = & nlm login --check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "NotebookLM: sessao expirada ou ausente. Rode: .\nlm-login.ps1" -ForegroundColor Yellow
} else {
    Write-Host "NotebookLM: sessao OK ($script:NotebookLmData)" -ForegroundColor DarkGray
}

if (-not (Test-BackendSyntaxOk)) {
    Write-Host "ERRO: server.js com sintaxe invalida." -ForegroundColor Red
    Write-Host "Veja: .lumiera-logs\backend-syntax-check.log" -ForegroundColor Yellow
    exit 1
}

$stackMode = Get-LumieraStackMode
if (Test-LumieraWindowsServiceMode) {
    if ($Force) {
        Write-Host "Reiniciando servico Windows LumieraBackend..." -ForegroundColor Yellow
        try {
            Invoke-RestMethod -Uri "http://127.0.0.1:3005/api/ops/restart-service" -Method Post -ContentType 'application/json' -Body '{"force":true}' -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
            Start-Sleep -Seconds 2
        } catch { }
        Restart-Service -Name "LumieraBackend" -Force -ErrorAction SilentlyContinue
    } else {
        $svc = Get-Service -Name "LumieraBackend" -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -ne "Running") {
            Start-Service -Name "LumieraBackend" -ErrorAction SilentlyContinue
        }
    }
    $ok = Test-LumieraBackendHealthy -Retries 4 -TimeoutSec 15
} elseif ($stackMode -eq "pm2" -and (Test-LumieraPm2Mode)) {
    if ($Force) {
        Write-Host "PM2 reload do backend (codigo alterado)..." -ForegroundColor Yellow
        $ok = Ensure-LumieraPm2Backend -Reload
    } else {
        Write-Host "PM2: garantindo backend online..." -ForegroundColor Cyan
        $ok = Ensure-LumieraPm2Backend
    }
} elseif ($Force) {
    Write-Host "Reinicio FORCADO do backend (modo direto)..." -ForegroundColor Yellow
    $ok = Start-LumieraBackendProcess -Direct -ForceRestart
} else {
    Write-Host "Garantindo backend em http://127.0.0.1:3005..." -ForegroundColor Cyan
    $ok = Start-LumieraBackendProcess -Direct
}

if (-not $ok) {
    Write-Host "Aguardando subida lenta do server.js (ate 90s)..." -ForegroundColor Yellow
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if (Test-LumieraBackendHealthy -Retries 2 -TimeoutSec 10) {
            $ok = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $ok -and -not (Get-BackendListenerPid)) {
        Write-Host "Tentativa extra de subida..." -ForegroundColor Yellow
        $ok = Start-LumieraBackendProcess
    }
}

if ($ok) {
    Write-Host "Backend OK em http://127.0.0.1:3005" -ForegroundColor Green
    if (Test-LumieraUniportMode) {
        Write-Host "Dashboard: http://127.0.0.1:3005/" -ForegroundColor DarkGray
    }
    exit 0
}

Write-Host "Falha ao subir - veja .lumiera-logs\backend-stderr.log" -ForegroundColor Red
exit 1