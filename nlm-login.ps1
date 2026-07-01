# Login NotebookLM usando pasta de dados do projeto (evita ~/.notebooklm-mcp-cli corrompida)
# Uso: cd para a pasta LUMIERA, depois:  .\nlm-login.ps1
Set-Location -LiteralPath $PSScriptRoot
$DataPath = Join-Path $PSScriptRoot ".notebooklm-data"
$env:NOTEBOOKLM_MCP_CLI_PATH = $DataPath
[Environment]::SetEnvironmentVariable("NOTEBOOKLM_MCP_CLI_PATH", $DataPath, "User")
New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
Write-Host "NotebookLM data: $DataPath" -ForegroundColor Cyan
Write-Host "Abrindo login no navegador..." -ForegroundColor Yellow
nlm login