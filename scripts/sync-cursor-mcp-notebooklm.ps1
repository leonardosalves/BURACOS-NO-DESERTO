# Aplica NOTEBOOKLM_MCP_CLI_PATH no MCP do Cursor (evita login repetido / pasta corrompida em ~/.notebooklm-mcp-cli)
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DataPath = Join-Path $RepoRoot ".notebooklm-data"
$TemplatePath = Join-Path $RepoRoot "config\cursor-mcp-notebooklm.json"
$CursorMcp = Join-Path $env:APPDATA "Cursor\User\mcp.json"

[Environment]::SetEnvironmentVariable("NOTEBOOKLM_MCP_CLI_PATH", $DataPath, "User")
$env:NOTEBOOKLM_MCP_CLI_PATH = $DataPath
New-Item -ItemType Directory -Path $DataPath -Force | Out-Null

if (-not (Test-Path $CursorMcp)) {
    Copy-Item $TemplatePath $CursorMcp
    Write-Host "Criado $CursorMcp com NotebookLM apontando para o projeto." -ForegroundColor Green
} else {
    $raw = Get-Content $CursorMcp -Raw -Encoding UTF8
    $cfg = $raw | ConvertFrom-Json
    if (-not $cfg.mcpServers) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
    if (-not $cfg.mcpServers.'notebooklm-mcp') {
        $cfg.mcpServers | Add-Member -NotePropertyName 'notebooklm-mcp' -NotePropertyValue ([pscustomobject]@{})
    }
    $entry = $cfg.mcpServers.'notebooklm-mcp'
    if (-not $entry.PSObject.Properties['command']) { $entry | Add-Member -NotePropertyName command -NotePropertyValue 'notebooklm-mcp' }
    if (-not $entry.PSObject.Properties['args']) { $entry | Add-Member -NotePropertyName args -NotePropertyValue @() }
    if (-not $entry.env) { $entry | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) }
    $entry.env | Add-Member -NotePropertyName NOTEBOOKLM_MCP_CLI_PATH -NotePropertyValue $DataPath -Force
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $CursorMcp -Encoding UTF8
    Write-Host "Atualizado $CursorMcp → NOTEBOOKLM_MCP_CLI_PATH=$DataPath" -ForegroundColor Green
}

Write-Host "Reinicie o Cursor (ou recarregue MCP) para aplicar." -ForegroundColor Cyan
Write-Host "Login só quando expirar: nlm login --check  |  .\nlm-login.ps1" -ForegroundColor DarkGray