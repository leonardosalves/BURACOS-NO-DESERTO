# Corrige falha "Restart failed" ao ativar CUDA no Voicebox
# Causa comum: download CUDA incompleto (arquivo .download-CUDA-libraries.tmp) ou DLL torch corrompida
$ErrorActionPreference = "Stop"
$CudaDir = Join-Path $env:APPDATA "sh.voicebox.app\backends\cuda"
$VoiceboxExe = "C:\Program Files\Voicebox\voicebox.exe"
$CpuServer = "C:\Program Files\Voicebox\voicebox-server.exe"

Write-Host "Voicebox CUDA fix" -ForegroundColor Cyan
Write-Host ""

function Test-VoiceboxHealth([string]$Url) {
    try {
        return @{ ok = $true; health = Invoke-RestMethod -Uri "$Url/health" -TimeoutSec 6 }
    } catch {
        return @{ ok = $false; error = $_.Exception.Message }
    }
}

Write-Host "1) Encerrando processos Voicebox..." -ForegroundColor DarkGray
Stop-Process -Name voicebox-server -Force -ErrorAction SilentlyContinue
Get-Process voicebox -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if (Test-Path $CudaDir) {
    $tmp = Join-Path $CudaDir ".download-CUDA-libraries.tmp"
    if (Test-Path $tmp) {
        $sizeGb = [math]::Round((Get-Item $tmp).Length / 1GB, 2)
        Write-Host "2) Download CUDA incompleto detectado ($sizeGb GB em .tmp)" -ForegroundColor Yellow
    } else {
        Write-Host "2) Backend CUDA presente mas com erro de DLL (caffe2_nvrtc)" -ForegroundColor Yellow
    }
    Write-Host "   Removendo $CudaDir ..." -ForegroundColor DarkGray
    Remove-Item $CudaDir -Recurse -Force
    Write-Host "   Backend CUDA removido." -ForegroundColor Green
} else {
    Write-Host "2) Pasta CUDA ja ausente." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "3) Subindo Voicebox em modo CPU (pytorch)..." -ForegroundColor Cyan
if (Test-Path $VoiceboxExe) { Start-Process $VoiceboxExe | Out-Null }
Start-Sleep -Seconds 5
if (Test-Path $CpuServer) {
    Start-Process -FilePath $CpuServer -ArgumentList @("--host", "127.0.0.1", "--port", "17493") -WindowStyle Hidden | Out-Null
}

$ready = $null
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    $hit = Test-VoiceboxHealth "http://127.0.0.1:17493"
    if ($hit.ok) { $ready = $hit; break }
    Start-Sleep -Seconds 3
}

if ($ready) {
    $h = $ready.health
    Write-Host "Voicebox online (CPU): http://127.0.0.1:17493" -ForegroundColor Green
    Write-Host "GPU: $($h.gpu_available) | backend: $($h.backend_type)" -ForegroundColor DarkGray
} else {
    Write-Host "Voicebox ainda nao respondeu. Abra o app manualmente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Para tentar CUDA de novo (opcional):" -ForegroundColor Cyan
Write-Host "  A) No Voicebox: Settings > CUDA Backend > baixar de novo" -ForegroundColor DarkGray
Write-Host "  B) Aguarde o download terminar SEM fechar o app (pasta .tmp some)" -ForegroundColor DarkGray
Write-Host "  C) So entao clique Restart" -ForegroundColor DarkGray
Write-Host "  D) Se falhar de novo, reinstale o MSI Voicebox" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Lumiera funciona em CPU — use Fish Audio cloud se precisar de velocidade." -ForegroundColor DarkGray