# Instala codebase-memory-mcp (grafo de código) e mescla no MCP do Cursor.
# Headroom: compressão já integrada em lumieraContextCompress.js (backend).
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TemplatePath = Join-Path $RepoRoot "config\cursor-mcp-context-tools.json"
$CursorMcp = Join-Path $env:APPDATA "Cursor\User\mcp.json"
$CbBinary = "codebase-memory-mcp"

function Test-CbmInstalled {
    $cmd = Get-Command $CbBinary -ErrorAction SilentlyContinue
    return [bool]$cmd
}

if (-not (Test-CbmInstalled)) {
    Write-Host "codebase-memory-mcp não encontrado no PATH. Instalando..." -ForegroundColor Yellow
    $installer = Join-Path $env:TEMP "cbm-install.ps1"
    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.ps1" -OutFile $installer -UseBasicParsing
        & $installer --skip-config
    } catch {
        Write-Host "Falha no install automático: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Instale manualmente: https://github.com/DeusData/codebase-memory-mcp/releases/latest" -ForegroundColor Cyan
    }
}

if (Test-CbmInstalled) {
    Write-Host "codebase-memory-mcp: $(Get-Command $CbBinary | Select-Object -ExpandProperty Source)" -ForegroundColor Green
    Write-Host "No Cursor, peça: 'Index this project' com repo_path=$RepoRoot" -ForegroundColor DarkGray
} else {
    Write-Host "Após instalar, adicione o binário ao PATH e rode este script de novo." -ForegroundColor Yellow
}

if (-not (Test-Path $TemplatePath)) {
    Write-Host "Template ausente: $TemplatePath" -ForegroundColor Red
    exit 1
}

$template = Get-Content $TemplatePath -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not (Test-Path $CursorMcp)) {
    $template | ConvertTo-Json -Depth 10 | Set-Content $CursorMcp -Encoding UTF8
    Write-Host "Criado $CursorMcp com codebase-memory-mcp." -ForegroundColor Green
} else {
    $raw = Get-Content $CursorMcp -Raw -Encoding UTF8
    $cfg = $raw | ConvertFrom-Json
    if (-not $cfg.mcpServers) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
    if (-not $cfg.mcpServers.'codebase-memory-mcp') {
        $cfg.mcpServers | Add-Member -NotePropertyName 'codebase-memory-mcp' -NotePropertyValue ([pscustomobject]@{
            command = $CbBinary
            args    = @()
        })
    }
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $CursorMcp -Encoding UTF8
    Write-Host "Atualizado $CursorMcp → entrada codebase-memory-mcp" -ForegroundColor Green
}

Write-Host ""
Write-Host "Economia de tokens no Lumiera:" -ForegroundColor Cyan
Write-Host "  - GET http://127.0.0.1:3005/api/studio-agents/code-map?compact=text" -ForegroundColor DarkGray
Write-Host "  - MCP: search_graph / trace_path em vez de ler server.js inteiro" -ForegroundColor DarkGray
Write-Host "  - Prompts: compressTranscriptForPrompt + compressPromptAddendum (backend)" -ForegroundColor DarkGray
Write-Host "Reinicie o Cursor (ou recarregue MCP) para aplicar." -ForegroundColor Cyan