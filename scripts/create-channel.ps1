# create-channel.ps1 — Criar novo canal
# Uso: .\create-channel.ps1 -Id "misterios-historia" -Nome "Mistérios da História" -YtId "UCxxxxx"

param(
    [Parameter(Mandatory=$true)][string]$Id,
    [Parameter(Mandatory=$true)][string]$Nome,
    [string]$YtId = ""
)

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ChannelsDir = Join-Path $RepoRoot "channels"
$TemplateDir = Join-Path $ChannelsDir "_template"
$NewDir = Join-Path $ChannelsDir $Id

if (Test-Path $NewDir) {
    Write-Error "Canal '$Id' já existe em $NewDir"
    exit 1
}

Write-Host "🎬 Criando canal: $Nome ($Id)" -ForegroundColor Cyan

# Copiar template
if (Test-Path $TemplateDir) {
    Copy-Item -Path $TemplateDir -Destination $NewDir -Recurse
} else {
    New-Item -ItemType Directory -Path (Join-Path $NewDir "prompts") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $NewDir "templates") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $NewDir "output") -Force | Out-Null
}

# Atualizar registry
$RegistryPath = Join-Path $ChannelsDir "_registry.json"
$Registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
$NewChannel = @{
    id = $Id
    nome = $Nome
    youtube_channel_id = $YtId
    status = "rascunho"
    criado_em = (Get-Date -Format "yyyy-MM-dd")
    ultimo_video = $null
}
$Registry.channels += $NewChannel
$Registry | ConvertTo-Json -Depth 10 | Set-Content $RegistryPath -Encoding UTF8

Write-Host "✅ Canal '$Nome' criado!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Edite: $NewDir\channel.config.json"
Write-Host "  2. Edite: $NewDir\prompts\narracao.md"
Write-Host "  3. Ative: POST http://127.0.0.1:3005/api/channels/switch { channelId: '$Id' }"
