@echo off
title Instalar extensao Lumiera Gemini Bridge v1.1.8
echo.
echo === Lumiera Gemini Bridge ===
echo.
echo IMPORTANTE: use o Google Chrome (nao Edge/Firefox) para o dashboard E a extensao.
echo URL do dashboard: http://127.0.0.1:5176
echo.
echo 1. Abra chrome://extensions
echo 2. Ative "Modo do desenvolvedor"
echo 3. "Carregar sem compactacao" - selecione ESTA pasta:
echo    %~dp0
echo 4. Confirme que "Lumiera Gemini Bridge" esta ATIVADA (toggle azul)
echo 5. Clique em Recarregar na extensao
echo 6. Abra http://127.0.0.1:5176 no MESMO Chrome
echo 7. Pressione F5 no dashboard
echo 8. Configuracoes - IA - Testar extensao
echo.
start chrome://extensions/
start http://127.0.0.1:5176/
explorer "%~dp0"
pause