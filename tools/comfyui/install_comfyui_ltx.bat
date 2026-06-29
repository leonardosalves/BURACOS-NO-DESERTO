@echo off
setlocal EnableDelayedExpansion
title Lumiera - Instalar ComfyUI + LTX (RTX 4060 Ti 8GB)
cd /d "%~dp0"

echo ========================================================
echo   ComfyUI + LTX-2 GGUF para RTX 4060 Ti 8GB
echo ========================================================

if not exist ComfyUI (
  echo [1/5] Clonando ComfyUI...
  git clone https://github.com/Comfy-Org/ComfyUI.git
  if errorlevel 1 goto :fail
) else (
  echo [1/5] ComfyUI ja existe, atualizando...
  pushd ComfyUI
  git pull --ff-only
  popd
)

echo [2/5] Criando ambiente Python...
cd ComfyUI
if not exist venv (
  python -m venv venv
  if errorlevel 1 goto :fail
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
pip uninstall -y torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
python -c "import torch; assert torch.cuda.is_available(), 'CUDA indisponivel - reinstale torch cu124'"
pip install huggingface_hub
if errorlevel 1 goto :fail

echo [3/5] Instalando custom nodes (GGUF + KJNodes)...
if not exist custom_nodes mkdir custom_nodes
cd custom_nodes

if not exist ComfyUI-GGUF (
  git clone https://github.com/city96/ComfyUI-GGUF.git
)
pushd ComfyUI-GGUF
git fetch origin
git checkout f083506720f2f049631ed6b6e937440f5579f6c7 2>nul || git pull --ff-only
pip install -r requirements.txt
popd

if not exist ComfyUI-KJNodes (
  git clone https://github.com/kijai/ComfyUI-KJNodes.git
)
pushd ComfyUI-KJNodes
git pull --ff-only 2>nul
pip install -r requirements.txt
popd

cd ..\..

echo [4/5] Baixando workflows LTX GGUF...
if not exist workflows mkdir workflows
powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/HerrDehy/SharePublic/main/LTX2_T2V_GGUF.json' -OutFile 'workflows\LTX2_T2V_GGUF.json' -UseBasicParsing"
powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/HerrDehy/SharePublic/main/LTX2_I2V_GGUF%20v0.3.json' -OutFile 'workflows\LTX2_I2V_GGUF.json' -UseBasicParsing"

echo [5/5] Criando pastas de modelos...
mkdir models\diffusion_models 2>nul
mkdir models\vae 2>nul
mkdir models\text_encoders 2>nul
mkdir models\loras 2>nul
mkdir models\latent_upscale_models 2>nul
mkdir output 2>nul

cd ..
echo.
echo Instalacao base concluida!
echo Proximo passo: baixar modelos LTX (~18 GB) via dashboard ou:
echo   cd tools\comfyui\ComfyUI ^&^& venv\Scripts\activate ^&^& python ..\download_ltx_models.py
echo.
if not "%1"=="silent" pause
exit /b 0

:fail
echo ERRO na instalacao.
if not "%1"=="silent" pause
exit /b 1