# Instala skill externa via npx skills e lembra de adaptar para Lumiera
param(
    [Parameter(Mandatory = $true)]
    [string]$SkillRef  # ex: vyralcontent/content-skills@viral-hooks
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Instalando: $SkillRef"
npx skills add $SkillRef --yes

Write-Host ""
Write-Host "Proximos passos (obrigatorio):"
Write-Host "  1. Editar .agents/skills/<nome>/SKILL.md — secao Lumiera, triggers PT-BR"
Write-Host "  2. Criar .agents/skills/<nome>.md (stub Obsidian)"
Write-Host "  3. Atualizar .agents/SKILLS.md e AGENTS.md"
Write-Host "  4. git add + git commit"
Write-Host "Ver: .agents/skills/skills-registry-external/SKILL.md"