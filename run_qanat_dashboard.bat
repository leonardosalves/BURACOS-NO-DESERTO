@echo off
title Qanat Cinematic Studio Dashboard Launcher
echo ========================================================
echo   Iniciando Qanat Cinematic Studio Dashboard...
echo ========================================================

echo Liberando portas 3005 (backend) e 5176 (frontend) se estiverem em uso...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3005,5176 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul

cd "%~dp0dashboard-qanat\backend"
if not exist node_modules (
    echo Instalando dependencias do Backend...
    call npm install --no-audit --no-fund
)
echo Iniciando servidor Backend...
start /b cmd /c "npm start"

cd "%~dp0dashboard-qanat\frontend"
if not exist node_modules (
    echo Instalando dependencias do Frontend...
    call npm install --no-audit --no-fund
)
echo Iniciando servidor Frontend...
start /b cmd /c "npm run dev"

echo Aguardando inicializacao (backend + frontend)...
timeout /t 8 /nobreak >nul
start http://127.0.0.1:5176/

echo Painel rodando com sucesso!
pause