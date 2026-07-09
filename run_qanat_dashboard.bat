@echo off
title Lumiera Studio
echo ========================================================
echo   Lumiera Studio (backend + frontend + watchdog)
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-lumiera.ps1"
if errorlevel 1 (
    echo.
    echo Falha ao iniciar. Tentando reparo PM2 completo...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-lumiera-pm2.ps1"
    if errorlevel 1 (
        echo.
        echo Falha ao iniciar. Veja .lumiera-logs\
        pause
        exit /b 1
    )
)
echo.
echo Abrindo http://127.0.0.1:5176/
start "" "http://127.0.0.1:5176/"
pause