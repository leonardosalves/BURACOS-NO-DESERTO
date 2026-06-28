@echo off
cd /d "%~dp0"
set "NOTEBOOKLM_MCP_CLI_PATH=%~dp0.notebooklm-data"
setx NOTEBOOKLM_MCP_CLI_PATH "%NOTEBOOKLM_MCP_CLI_PATH%" >nul
if not exist "%NOTEBOOKLM_MCP_CLI_PATH%" mkdir "%NOTEBOOKLM_MCP_CLI_PATH%"
echo NotebookLM data: %NOTEBOOKLM_MCP_CLI_PATH%
echo Abrindo login no navegador...
nlm login
pause