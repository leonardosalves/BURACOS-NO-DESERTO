@echo off
title Qanat Cinematic Studio Dashboard Launcher
echo ========================================================
echo   Iniciando Qanat Cinematic Studio Dashboard...
echo ========================================================

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

echo Aguardando inicialização...
timeout /t 3 /nobreak >nul
start http://localhost:5176/

echo Painel rodando com sucesso!
pause
