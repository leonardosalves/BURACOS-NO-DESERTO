@echo off
title Lumiera - Instalar Servico Windows
cd /d "%~dp0"
echo ========================================================
echo   Lumiera - Servico Windows (requer Admin)
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-lumiera-windows-service.ps1"
echo.
if errorlevel 1 (
    echo FALHOU - veja mensagem acima.
) else (
    echo OK - abrindo http://127.0.0.1:3005/
    start "" "http://127.0.0.1:3005/"
)
echo.
pause