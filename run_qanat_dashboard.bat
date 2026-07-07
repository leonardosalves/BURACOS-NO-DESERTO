@echo off
title Lumiera Studio
echo ========================================================
echo   Lumiera Studio (backend + frontend + watchdog)
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-lumiera.ps1"
if errorlevel 1 (
    echo.
    echo Falha ao iniciar. Veja .lumiera-logs\
    pause
    exit /b 1
)
pause