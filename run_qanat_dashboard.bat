@echo off
title Lumiera Studio
echo ========================================================
echo   Lumiera Studio
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-lumiera.ps1"
if errorlevel 1 (
    echo.
    echo Falha ao iniciar. Tentando install uniport...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-lumiera-uniport.ps1"
    if errorlevel 1 (
        echo.
        echo Falha ao iniciar. Veja .lumiera-logs\
        pause
        exit /b 1
    )
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-lumiera-dashboard.ps1"
pause