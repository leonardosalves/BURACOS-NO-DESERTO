@echo off
title Restaurar Lumiera - Modo DEV
echo.
echo  Restaura o Lumiera como era antes:
echo    - Vite com hot reload em http://127.0.0.1:5176/
echo    - Backend API em http://127.0.0.1:3005/
echo    - Remove o Servico Windows que desconfigurou tudo
echo.
echo  Precisa de Administrador (UAC). Aguarde...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0scripts\restore-lumiera-dev-mode.ps1""'"
pause