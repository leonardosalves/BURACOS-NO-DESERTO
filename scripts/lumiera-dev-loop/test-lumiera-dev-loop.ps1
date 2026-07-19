$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $PSScriptRoot "lumiera-dev-loop.ps1"
$examplePath = Join-Path $PSScriptRoot "example.prd.json"
$errors = $null
$tokens = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) {
    throw "PowerShell parser errors: $($errors.Message -join '; ')"
}

& $scriptPath -PrdPath $examplePath -ValidateOnly
if ($LASTEXITCODE -ne 0) { throw "Valid example PRD was rejected." }

$invalidPath = Join-Path ([System.IO.Path]::GetTempPath()) ("lumiera-dev-loop-invalid-{0}.json" -f [guid]::NewGuid())
try {
    '{"project":"Lumiera","branchName":"codex/test","qualityChecks":[],"userStories":[]}' |
        Set-Content -LiteralPath $invalidPath -Encoding UTF8
    $rejected = $false
    try {
        & $scriptPath -PrdPath $invalidPath -ValidateOnly
    } catch {
        $rejected = $true
    }
    if (-not $rejected) { throw "Invalid PRD was accepted." }
} finally {
    Remove-Item -LiteralPath $invalidPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Lumiera Dev Loop tests passed." -ForegroundColor Green

$integrationRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("lumiera-dev-loop-integration-{0}" -f [guid]::NewGuid())
try {
    $integrationRoot = [System.IO.Path]::GetFullPath($integrationRoot)
    New-Item -ItemType Directory -Path (Join-Path $integrationRoot "scripts\lumiera-dev-loop") -Force | Out-Null
    Copy-Item -LiteralPath $scriptPath -Destination (Join-Path $integrationRoot "scripts\lumiera-dev-loop\lumiera-dev-loop.ps1")
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "prompt.md") -Destination (Join-Path $integrationRoot "scripts\lumiera-dev-loop\prompt.md")
    @(".lumiera-worktrees/", ".lumiera-dev-loop/") | Set-Content -LiteralPath (Join-Path $integrationRoot ".gitignore") -Encoding UTF8
    New-Item -ItemType Directory -Path (Join-Path $integrationRoot "docs") -Force | Out-Null
    "seed" | Set-Content -LiteralPath (Join-Path $integrationRoot "docs\seed.md") -Encoding UTF8

    & git -C $integrationRoot init -b main | Out-Null
    & git -C $integrationRoot config user.name "Lumiera Dev Loop Test"
    & git -C $integrationRoot config user.email "dev-loop-test@localhost"
    & git -C $integrationRoot add .
    & git -C $integrationRoot commit -m "test: seed" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not create integration fixture commit." }

    $fakeCodex = Join-Path $integrationRoot "fake-codex.cmd"
    @'
@echo off
set "WT="
:parse
if "%~1"=="" goto run
if "%~1"=="--cd" (
  set "WT=%~2"
  shift
)
shift
goto parse
:run
if "%WT%"=="" exit /b 11
if not exist "%WT%\docs" mkdir "%WT%\docs"
> "%WT%\docs\result.md" echo implemented by fake codex
echo {"type":"turn.completed"}
exit /b 0
'@ | Set-Content -LiteralPath $fakeCodex -Encoding ASCII

    $integrationPrd = Join-Path $integrationRoot "integration.prd.json"
    @'
{
  "project": "Integration Fixture",
  "branchName": "codex/integration-test",
  "baseBranch": "main",
  "description": "Exercise worktree, allowed paths, gate, and commit.",
  "qualityChecks": [
    {
      "id": "always-pass",
      "workingDirectory": ".",
      "file": "powershell.exe",
      "arguments": ["-NoProfile", "-Command", "exit 0"]
    }
  ],
  "userStories": [
    {
      "id": "US-001",
      "title": "Create result",
      "description": "Create the expected integration result.",
      "acceptanceCriteria": ["docs/result.md exists"],
      "allowedPaths": ["docs/result.md"],
      "qualityChecks": ["always-pass"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
'@ | Set-Content -LiteralPath $integrationPrd -Encoding UTF8

    $integrationScript = Join-Path $integrationRoot "scripts\lumiera-dev-loop\lumiera-dev-loop.ps1"
    & $integrationScript -PrdPath $integrationPrd -MaxIterations 1 -CodexExecutable $fakeCodex
    if ($LASTEXITCODE -ne 0) { throw "Integration loop returned $LASTEXITCODE." }
    $worktree = Join-Path $integrationRoot ".lumiera-worktrees\codex-integration-test"
    if (-not (Test-Path -LiteralPath (Join-Path $worktree "docs\result.md"))) {
        throw "Integration loop did not create the expected file."
    }
    $subject = (& git -C $worktree log -1 --pretty=%s) -join ""
    if ($subject -ne "feat(dev-loop): US-001 - Create result") {
        throw "Unexpected integration commit: '$subject'."
    }
} finally {
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($integrationRoot -and $integrationRoot.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $integrationRoot -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        throw "Refusing to remove non-temp integration path '$integrationRoot'."
    }
}

Write-Host "Lumiera Dev Loop integration test passed." -ForegroundColor Green
