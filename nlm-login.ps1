# Login NotebookLM usando pasta de dados do projeto (evita ~/.notebooklm-mcp-cli corrompida)
# Uso: cd para a pasta LUMIERA, depois:  .\nlm-login.ps1
Set-Location -LiteralPath $PSScriptRoot
$DataPath = Join-Path $PSScriptRoot ".notebooklm-data"
$env:NOTEBOOKLM_MCP_CLI_PATH = $DataPath
[Environment]::SetEnvironmentVariable("NOTEBOOKLM_MCP_CLI_PATH", $DataPath, "User")
New-Item -ItemType Directory -Path $DataPath -Force | Out-Null

$nlmCandidates = @(
    (Join-Path $env:USERPROFILE ".local\bin\nlm.exe"),
    (Join-Path $env:LOCALAPPDATA ".local\bin\nlm.exe"),
    "C:\Lumiera\tools\nlm\nlm.exe"
)
$nlm = $null
foreach ($candidate in $nlmCandidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $nlm = $candidate
        break
    }
}
if (-not $nlm) {
    $cmd = Get-Command nlm -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { $nlm = $cmd.Source }
}
if (-not $nlm) {
    Write-Host "ERRO: nlm.exe nao encontrado. Instale o NotebookLM CLI (nlm)." -ForegroundColor Red
    exit 1
}

Write-Host "NotebookLM data: $DataPath" -ForegroundColor Cyan
Write-Host "CLI: $nlm" -ForegroundColor DarkGray
Write-Host "Abrindo login no navegador..." -ForegroundColor Yellow
& $nlm login
$code = $LASTEXITCODE
if ($code -eq 0) {
    Write-Host "OK - NotebookLM conectado. No dashboard, clique em Atualizar." -ForegroundColor Green
} else {
    Write-Host "Login terminou com codigo $code. Tente de novo ou verifique a rede." -ForegroundColor Yellow
}
exit $code