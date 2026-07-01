# Matt Pocock engineering skills — https://github.com/mattpocock/skills
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

Write-Host "Instalando mattpocock/skills em .agents/skills/ ..." -ForegroundColor Cyan
npx skills@latest add mattpocock/skills --yes

$docsAgents = Join-Path $RepoRoot "docs\agents"
New-Item -ItemType Directory -Path $docsAgents -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $RepoRoot "docs\adr") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $RepoRoot ".scratch") -Force | Out-Null

$required = @(
    "docs\agents\issue-tracker.md",
    "docs\agents\triage-labels.md",
    "docs\agents\domain.md",
    "CONTEXT.md"
)
$missing = $required | Where-Object { -not (Test-Path (Join-Path $RepoRoot $_)) }

if ($missing.Count -gt 0) {
    Write-Host "Config Lumiera incompleta. Rode o agente com skill setup-matt-pocock-skills ou restaure docs/agents/ do repo." -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor DarkGray }
} else {
    Write-Host "docs/agents/ + CONTEXT.md OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "Matt Pocock skills (engenharia):" -ForegroundColor Cyan
Write-Host "  grill-with-docs, tdd, diagnosing-bugs, code-review, writing-great-skills" -ForegroundColor DarkGray
Write-Host "  Bundle Studio Agents: dev-sdd.json" -ForegroundColor DarkGray
Write-Host "  Issue tracker: specs/ + .scratch/ (ver docs/agents/issue-tracker.md)" -ForegroundColor DarkGray