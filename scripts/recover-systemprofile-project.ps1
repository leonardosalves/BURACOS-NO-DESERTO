# Copia projeto da pasta legada SYSTEM (servico Windows) para o Desktop do Leo.
# Rode como Administrador: .\scripts\recover-systemprofile-project.ps1 -Project lingua_cabos_submarinos
param(
    [string]$Project = "lingua_cabos_submarinos"
)

$ErrorActionPreference = "Stop"
$legacyRoot = "C:\Windows\System32\config\systemprofile\Desktop\Lumiera Videos"
$targetRoot = "C:\Users\Leo\Desktop\Lumiera Videos"

foreach ($sub in @("videos curtos shorts", "videos longos")) {
    $src = Join-Path $legacyRoot $sub $Project
    if (-not (Test-Path -LiteralPath $src)) { continue }
    $destParent = Join-Path $targetRoot $sub
    $dest = Join-Path $destParent $Project
    New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    Write-Host "Copiando $src -> $dest" -ForegroundColor Cyan
    robocopy $src $dest /E /XO /R:1 /W:1 | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy falhou com codigo $LASTEXITCODE" }
    Write-Host "Projeto copiado com sucesso." -ForegroundColor Green
    exit 0
}

Write-Host "Projeto nao encontrado em $legacyRoot" -ForegroundColor Red
exit 1