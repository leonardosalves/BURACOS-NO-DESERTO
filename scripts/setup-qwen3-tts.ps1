# Instala Qwen3-TTS CustomVoice (1.7B) no venv isolado do backend Lumiera.
# Modelo: Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice — PT + EN
# Uso: .\scripts\setup-qwen3-tts.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "dashboard-qanat\backend"))) {
  $Root = (Get-Location).Path
}
$Backend = Join-Path $Root "dashboard-qanat\backend"
$Venv = Join-Path $Backend ".venv-qwen3-tts"
$PyVenv = Join-Path $Venv "Scripts\python.exe"

function Find-Python311 {
  $candidates = @(
    "C:\Users\Leo\AppData\Roaming\uv\python\cpython-3.11.15-windows-x86_64-none\python.exe",
    (Get-Command py -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { return $c }
  }
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($py) { return $py.Source }
  throw "Python 3.11+ não encontrado."
}

Write-Host "==> Qwen3-TTS setup (CustomVoice 1.7B, PT/EN)" -ForegroundColor Cyan
$basePy = Find-Python311
Write-Host "Python base: $basePy"

if (-not (Test-Path $PyVenv)) {
  Write-Host "Criando venv: $Venv"
  & $basePy -m venv $Venv
}

Write-Host "Instalando torch CUDA 12.4 + qwen-tts..."
& $PyVenv -m pip install -U pip setuptools wheel
& $PyVenv -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
& $PyVenv -m pip install -U "qwen-tts" soundfile numpy

Write-Host "Probe..."
& $PyVenv (Join-Path $Backend "qwen3_tts_narration.py") --probe

Write-Host "Pré-download do modelo (HF cache — primeira vez demora)..."
& $PyVenv -c @"
from huggingface_hub import snapshot_download
print(snapshot_download('Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice'))
print(snapshot_download('Qwen/Qwen3-TTS-Tokenizer-12Hz'))
"@

Write-Host "OK. No dashboard: motor TTS = Qwen3-TTS CustomVoice (local, PT/EN)." -ForegroundColor Green
