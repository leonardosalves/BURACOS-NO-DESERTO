# Agent Reach — busca na internet (Exa, Jina, YouTube, GitHub, etc.)
# https://github.com/Panniantong/Agent-Reach
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Venv = Join-Path $env:USERPROFILE ".agent-reach-venv"
$ArExe = Join-Path $Venv "Scripts\agent-reach.exe"
$CursorMcp = Join-Path $env:APPDATA "Cursor\User\mcp.json"
$McporterConfig = Join-Path $RepoRoot "config\mcporter.json"

function Ensure-AgentReachVenv {
    if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
        Write-Host "Criando venv em $Venv ..." -ForegroundColor Yellow
        py -3 -m venv $Venv
    }
    & (Join-Path $Venv "Scripts\python.exe") -m pip install --upgrade pip -q
    if (-not (Test-Path $ArExe)) {
        Write-Host "Instalando agent-reach (pip) ..." -ForegroundColor Yellow
        & (Join-Path $Venv "Scripts\python.exe") -m pip install "https://github.com/Panniantong/Agent-Reach/archive/main.zip" -q
    }
    & (Join-Path $Venv "Scripts\python.exe") -m pip install yt-dlp -q 2>$null
}

function Add-UserPathEntry([string]$Dir) {
    if (-not (Test-Path $Dir)) { return }
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$Dir*") {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$Dir", "User")
        $env:Path = "$env:Path;$Dir"
        Write-Host "PATH do usuário: + $Dir" -ForegroundColor Green
    }
}

Ensure-AgentReachVenv
Add-UserPathEntry (Join-Path $Venv "Scripts")

if (-not (Get-Command mcporter -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando mcporter (npm global) ..." -ForegroundColor Yellow
    npm install -g mcporter 2>&1 | Out-Null
}

& $ArExe install --env=auto 2>&1

New-Item -ItemType Directory -Path (Split-Path $McporterConfig) -Force | Out-Null
if (-not (Test-Path $McporterConfig)) {
    @{ mcpServers = @{ exa = @{ baseUrl = "https://mcp.exa.ai/mcp" } } } | ConvertTo-Json -Depth 6 | Set-Content $McporterConfig -Encoding UTF8
} else {
    mcporter config add exa https://mcp.exa.ai/mcp --config $McporterConfig 2>$null
}

# Mescla Exa HTTP MCP no Cursor (busca semântica no IDE)
$exaEntry = @{ url = "https://mcp.exa.ai/mcp" }
if (-not (Test-Path $CursorMcp)) {
    @{ mcpServers = @{ exa = $exaEntry } } | ConvertTo-Json -Depth 6 | Set-Content $CursorMcp -Encoding UTF8
    Write-Host "Criado $CursorMcp com exa." -ForegroundColor Green
} else {
    $raw = Get-Content $CursorMcp -Raw -Encoding UTF8
    $cfg = $raw | ConvertFrom-Json
    if (-not $cfg.mcpServers) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
    if (-not $cfg.mcpServers.exa) {
        $cfg.mcpServers | Add-Member -NotePropertyName exa -NotePropertyValue ([pscustomobject]$exaEntry) -Force
    }
    $cfg | ConvertTo-Json -Depth 10 | Set-Content $CursorMcp -Encoding UTF8
    Write-Host "Atualizado $CursorMcp → exa (web search)" -ForegroundColor Green
}

Write-Host ""
& $ArExe doctor 2>&1
Write-Host ""
Write-Host "Busca na internet (Agent Reach):" -ForegroundColor Cyan
Write-Host "  CLI: mcporter call exa.web_search_exa query=`"tema`" numResults=5 --config $McporterConfig" -ForegroundColor DarkGray
Write-Host "  Web: curl https://r.jina.ai/URL" -ForegroundColor DarkGray
Write-Host "  Skill: C:\Users\Leo\.agents\skills\agent-reach\SKILL.md" -ForegroundColor DarkGray
Write-Host "Reinicie o Cursor para carregar o MCP exa." -ForegroundColor Cyan