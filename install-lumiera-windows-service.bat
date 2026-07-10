@echo off
title Instalar Lumiera - Servico Windows
echo.
echo  Instala o Lumiera como Servico Windows (Uniport na porta 3005):
echo    - O backend servira a API e a dashboard estatica juntos.
echo    - Roda em segundo plano no boot do sistema.
echo.
echo  Precisa de privilegios de Administrador (UAC).
echo  Por favor, aceite o prompt de permissao que ira surgir...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0scripts\install-lumiera-windows-service.ps1""'"
echo.
echo  Se o prompt do UAC apareceu, voce ja pode fechar esta janela.
pause
