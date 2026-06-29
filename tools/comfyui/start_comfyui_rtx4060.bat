@echo off
title ComfyUI LTX - RTX 4060 Ti 8GB
cd /d "%~dp0ComfyUI"
if not exist venv (
  echo Execute install_comfyui_ltx.bat primeiro.
  pause
  exit /b 1
)
call venv\Scripts\activate.bat
echo Iniciando ComfyUI com --lowvram --reserve-vram 1024 (otimizado 8GB)...
python main.py --listen 127.0.0.1 --port 8188 --lowvram --reserve-vram 1024 --preview-method auto