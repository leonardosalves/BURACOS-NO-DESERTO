# Instala Supermemory MCP no Cursor (OAuth na primeira conexão).
# Chave API opcional: https://console.supermemory.ai → API Keys

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Supermemory MCP para Cursor ===" -ForegroundColor Cyan
Write-Host "Na primeira vez, o Cursor pedirá login OAuth em supermemory.ai"
Write-Host ""

Set-Location $repoRoot
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client cursor --oauth=yes

Write-Host ""
Write-Host "MCP local do projeto: .cursor/mcp.json (supermemory + comfy-cloud)" -ForegroundColor Green
Write-Host "Dashboard Lumiera: Configurações → APIs → Supermemory (chat com memória entre sessões)"
Write-Host "Chave API: https://console.supermemory.ai"