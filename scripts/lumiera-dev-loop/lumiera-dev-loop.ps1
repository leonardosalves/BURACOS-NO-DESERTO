[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PrdPath,

    [ValidateRange(1, 100)]
    [int]$MaxIterations = 10,

    [string]$WorktreeRoot,
    [string]$CodexExecutable = "codex",
    [switch]$ValidateOnly,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:PromptTemplatePath = Join-Path $PSScriptRoot "prompt.md"

function Write-LoopMessage {
    param([string]$Message, [string]$Color = "White")
    Write-Host ("[Lumiera Dev Loop] {0}" -f $Message) -ForegroundColor $Color
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string]$WorkingDirectory = $script:RepoRoot,
        [switch]$AllowFailure
    )

    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & git -C $WorkingDirectory @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($Arguments -join ' ') falhou ($exitCode): $($output -join [Environment]::NewLine)"
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Output = @($output) }
}

function Get-RequiredProperty {
    param([object]$Object, [string]$Name, [string]$Context)
    $property = $Object.PSObject.Properties[$Name]
    if (-not $property -or $null -eq $property.Value) {
        throw "$Context precisa definir '$Name'."
    }
    return $property.Value
}

function Read-AndValidatePrd {
    param([string]$Path)

    $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    try {
        $prd = Get-Content -LiteralPath $resolved -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        throw "PRD invalido em '$resolved': $($_.Exception.Message)"
    }

    [void](Get-RequiredProperty $prd "project" "O PRD")
    $branchName = [string](Get-RequiredProperty $prd "branchName" "O PRD")
    $stories = @(Get-RequiredProperty $prd "userStories" "O PRD")
    $qualityChecks = @(Get-RequiredProperty $prd "qualityChecks" "O PRD")

    if ([string]::IsNullOrWhiteSpace($branchName) -or
        $branchName.StartsWith("-") -or
        $branchName.Contains("..") -or
        $branchName -notmatch '^[A-Za-z0-9._/-]+$') {
        throw "branchName '$branchName' nao e seguro para Git."
    }
    if ($stories.Count -eq 0) { throw "O PRD precisa conter ao menos uma user story." }
    if ($qualityChecks.Count -eq 0) { throw "O PRD precisa conter ao menos um quality check." }

    $gateIds = @{}
    foreach ($gate in $qualityChecks) {
        $id = [string](Get-RequiredProperty $gate "id" "Quality check")
        if ($gateIds.ContainsKey($id)) { throw "Quality check duplicado: '$id'." }
        $gateIds[$id] = $true
        [void](Get-RequiredProperty $gate "file" "Quality check '$id'")
        [void](Get-RequiredProperty $gate "workingDirectory" "Quality check '$id'")
        if (-not $gate.PSObject.Properties["arguments"]) {
            $gate | Add-Member -NotePropertyName arguments -NotePropertyValue @()
        }
    }

    $storyIds = @{}
    foreach ($story in $stories) {
        $id = [string](Get-RequiredProperty $story "id" "User story")
        if ($storyIds.ContainsKey($id)) { throw "User story duplicada: '$id'." }
        $storyIds[$id] = $true
        [void](Get-RequiredProperty $story "title" "User story '$id'")
        [void](Get-RequiredProperty $story "description" "User story '$id'")
        $criteria = @(Get-RequiredProperty $story "acceptanceCriteria" "User story '$id'")
        $allowedPaths = @(Get-RequiredProperty $story "allowedPaths" "User story '$id'")
        $storyGates = @(Get-RequiredProperty $story "qualityChecks" "User story '$id'")
        if ($criteria.Count -eq 0) { throw "User story '$id' nao possui acceptanceCriteria." }
        if ($allowedPaths.Count -eq 0) { throw "User story '$id' nao possui allowedPaths." }
        if ($storyGates.Count -eq 0) { throw "User story '$id' nao possui qualityChecks." }
        foreach ($gateId in $storyGates) {
            if (-not $gateIds.ContainsKey([string]$gateId)) {
                throw "User story '$id' referencia quality check desconhecido '$gateId'."
            }
        }
        if (-not $story.PSObject.Properties["priority"]) {
            $story | Add-Member -NotePropertyName priority -NotePropertyValue 9999
        }
        if (-not $story.PSObject.Properties["passes"]) {
            $story | Add-Member -NotePropertyName passes -NotePropertyValue $false
        }
        if (-not $story.PSObject.Properties["notes"]) {
            $story | Add-Member -NotePropertyName notes -NotePropertyValue ""
        }
    }

    return [pscustomobject]@{ Path = $resolved; Data = $prd }
}

function Get-WorktreePath {
    param([object]$Prd, [string]$Root)
    $base = if ($Root) { $Root } else { Join-Path $script:RepoRoot ".lumiera-worktrees" }
    if (-not [System.IO.Path]::IsPathRooted($base)) { $base = Join-Path $script:RepoRoot $base }
    $slug = ([string]$Prd.branchName -replace '[^A-Za-z0-9._-]', '-')
    return Join-Path $base $slug
}

function Ensure-Worktree {
    param([object]$Prd, [string]$Path)

    $branchName = [string]$Prd.branchName
    $baseBranch = if ($Prd.PSObject.Properties["baseBranch"] -and $Prd.baseBranch) {
        [string]$Prd.baseBranch
    } else { "main" }

    if (Test-Path -LiteralPath (Join-Path $Path ".git")) {
        $current = (Invoke-Git -WorkingDirectory $Path -Arguments @("branch", "--show-current")).Output | Select-Object -First 1
        if ($current -ne $branchName) {
            throw "O worktree '$Path' pertence a '$current', nao a '$branchName'."
        }
        return
    }

    if (Test-Path -LiteralPath $Path) {
        $existingItems = @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue)
        if ($existingItems.Count -gt 0) { throw "O destino do worktree ja existe e nao esta vazio: '$Path'." }
    } else {
        New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
    }

    $branchExists = (Invoke-Git -Arguments @("show-ref", "--verify", "--quiet", "refs/heads/$branchName") -AllowFailure).ExitCode -eq 0
    if ($branchExists) {
        [void](Invoke-Git -Arguments @("worktree", "add", $Path, $branchName))
    } else {
        [void](Invoke-Git -Arguments @("worktree", "add", "-b", $branchName, $Path, $baseBranch))
    }
}

function Initialize-RunState {
    param([object]$Prd, [string]$WorktreePath)

    $stateDir = Join-Path $WorktreePath ".lumiera-dev-loop"
    $statePath = Join-Path $stateDir "prd.json"
    $progressPath = Join-Path $stateDir "progress.md"
    $logsDir = Join-Path $stateDir "logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

    if (-not (Test-Path -LiteralPath $statePath)) {
        $Prd | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $statePath -Encoding UTF8
    }
    if (-not (Test-Path -LiteralPath $progressPath)) {
        @(
            "# Lumiera Dev Loop Progress",
            "",
            "Started: $((Get-Date).ToString('o'))",
            "",
            "## Codebase patterns",
            "",
            "- Read the repository AGENTS.md files before changing code.",
            ""
        ) | Set-Content -LiteralPath $progressPath -Encoding UTF8
    }
    return [pscustomobject]@{ StatePath = $statePath; ProgressPath = $progressPath; LogsDir = $logsDir }
}

function Get-NextStory {
    param([object]$Prd)
    return @($Prd.userStories | Where-Object { -not [bool]$_.passes } | Sort-Object { [int]$_.priority }, id) | Select-Object -First 1
}

function Resolve-StoryGates {
    param([object]$Prd, [object]$Story)
    $ids = @($Story.qualityChecks)
    return @($Prd.qualityChecks | Where-Object { $ids -contains $_.id })
}

function Build-AgentPrompt {
    param([object]$Prd, [object]$Story, [string]$ProgressPath)
    $template = Get-Content -LiteralPath $script:PromptTemplatePath -Raw -Encoding UTF8
    $progress = Get-Content -LiteralPath $ProgressPath -Raw -Encoding UTF8
    $storyJson = $Story | ConvertTo-Json -Depth 20
    return $template.Replace("{{PROJECT}}", [string]$Prd.project).
        Replace("{{DESCRIPTION}}", [string]$Prd.description).
        Replace("{{STORY_JSON}}", $storyJson).
        Replace("{{PROGRESS}}", $progress)
}

function Invoke-CodexIteration {
    param(
        [string]$CodexPath,
        [string]$WorktreePath,
        [string]$Prompt,
        [string]$LogPath
    )

    $codex = Get-Command $CodexPath -ErrorAction Stop
    $arguments = @(
        "exec", "--ignore-user-config", "--ephemeral", "--sandbox", "workspace-write", "--json",
        "--cd", $WorktreePath, "-"
    )
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $events = @($Prompt | & $codex.Source @arguments 2>&1 | Tee-Object -FilePath $LogPath)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
    }
    foreach ($eventLine in $events) { Write-Host $eventLine }
    return $exitCode
}

function Get-ChangedPaths {
    param([string]$WorktreePath)
    $tracked = (Invoke-Git -WorkingDirectory $WorktreePath -Arguments @("diff", "--name-only", "--diff-filter=ACDMRTUXB", "HEAD")).Output
    $untracked = (Invoke-Git -WorkingDirectory $WorktreePath -Arguments @("ls-files", "--others", "--exclude-standard")).Output
    return @($tracked + $untracked | ForEach-Object { ([string]$_).Replace('\', '/') } |
        Where-Object { $_ -and -not $_.StartsWith(".lumiera-dev-loop/") } | Sort-Object -Unique)
}

function Test-AllowedChanges {
    param([string[]]$Paths, [object]$Story)
    $violations = @()
    foreach ($path in $Paths) {
        $allowed = $false
        foreach ($patternValue in @($Story.allowedPaths)) {
            $pattern = ([string]$patternValue).Replace('\', '/')
            if ($path -like $pattern) { $allowed = $true; break }
        }
        if (-not $allowed) { $violations += $path }
    }
    return $violations
}

function Invoke-QualityGate {
    param([object]$Gate, [string]$WorktreePath, [string]$LogPath)
    $workingDirectory = Join-Path $WorktreePath ([string]$Gate.workingDirectory)
    if (-not (Test-Path -LiteralPath $workingDirectory)) {
        "Diretorio inexistente: $workingDirectory" | Set-Content -LiteralPath $LogPath -Encoding UTF8
        return $false
    }

    Push-Location $workingDirectory
    try {
        $file = [string]$Gate.file
        $arguments = @($Gate.arguments | ForEach-Object { [string]$_ })
        $gateOutput = @(& $file @arguments 2>&1 | Tee-Object -FilePath $LogPath)
        $exitCode = $LASTEXITCODE
        foreach ($line in $gateOutput) { Write-Host $line }
        return $exitCode -eq 0
    } catch {
        $_ | Out-String | Set-Content -LiteralPath $LogPath -Encoding UTF8
        return $false
    } finally {
        Pop-Location
    }
}

function Add-ProgressEntry {
    param(
        [string]$ProgressPath,
        [object]$Story,
        [string]$Status,
        [string[]]$ChangedPaths,
        [string[]]$Details
    )
    $entry = @(
        "## $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) - $($Story.id) - $Status",
        "",
        "Story: $($Story.title)",
        "",
        "Changed paths: $($(if ($ChangedPaths.Count) { $ChangedPaths -join ', ' } else { '(none)' }))",
        ""
    ) + @($Details | ForEach-Object { "- $_" }) + @("", "---", "")
    Add-Content -LiteralPath $ProgressPath -Value $entry -Encoding UTF8
}

$validated = Read-AndValidatePrd -Path $PrdPath
$inputPrd = $validated.Data
$worktreePath = Get-WorktreePath -Prd $inputPrd -Root $WorktreeRoot

Write-LoopMessage "PRD valido: $($validated.Path)" "Green"
Write-LoopMessage "Branch isolada: $($inputPrd.branchName)"
Write-LoopMessage "Worktree: $worktreePath"

if ($ValidateOnly) { exit 0 }
if ($DryRun) {
    foreach ($story in @($inputPrd.userStories | Sort-Object { [int]$_.priority }, id)) {
        Write-LoopMessage ("{0} [{1}] paths={2} gates={3}" -f $story.id, $(if ($story.passes) { "done" } else { "pending" }), (@($story.allowedPaths) -join ","), (@($story.qualityChecks) -join ","))
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $script:PromptTemplatePath)) {
    throw "Prompt template ausente: $script:PromptTemplatePath"
}
[void](Get-Command $CodexExecutable -ErrorAction Stop)
Ensure-Worktree -Prd $inputPrd -Path $worktreePath
$runState = Initialize-RunState -Prd $inputPrd -WorktreePath $worktreePath

for ($iteration = 1; $iteration -le $MaxIterations; $iteration++) {
    $state = Get-Content -LiteralPath $runState.StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $story = Get-NextStory -Prd $state
    if (-not $story) {
        Write-LoopMessage "Todas as historias foram concluidas. A branch esta pronta para revisao humana." "Green"
        exit 0
    }

    Write-LoopMessage ("Iteracao {0}/{1}: {2} - {3}" -f $iteration, $MaxIterations, $story.id, $story.title) "Cyan"
    $beforeHead = ((Invoke-Git -WorkingDirectory $worktreePath -Arguments @("rev-parse", "HEAD")).Output | Select-Object -First 1)
    $prompt = Build-AgentPrompt -Prd $state -Story $story -ProgressPath $runState.ProgressPath
    $codexLog = Join-Path $runState.LogsDir ("{0:000}-{1}-codex.jsonl" -f $iteration, $story.id)
    $codexExit = Invoke-CodexIteration -CodexPath $CodexExecutable -WorktreePath $worktreePath -Prompt $prompt -LogPath $codexLog
    $afterHead = ((Invoke-Git -WorkingDirectory $worktreePath -Arguments @("rev-parse", "HEAD")).Output | Select-Object -First 1)
    if ($beforeHead -ne $afterHead) {
        throw "O agente criou um commit, contrariando o contrato. Inspecione o worktree '$worktreePath'."
    }

    $changedPaths = @(Get-ChangedPaths -WorktreePath $worktreePath)
    $violations = @(Test-AllowedChanges -Paths $changedPaths -Story $story)
    if ($violations.Count -gt 0) {
        Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "BLOCKED_OUT_OF_SCOPE" -ChangedPaths $changedPaths -Details @("Paths fora de allowedPaths: $($violations -join ', ')")
        throw "Mudancas fora do escopo permitido: $($violations -join ', '). Nada foi commitado."
    }
    if ($codexExit -ne 0) {
        Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "CODEX_FAILED" -ChangedPaths $changedPaths -Details @("codex exec retornou $codexExit; log: $codexLog")
        continue
    }
    if ($changedPaths.Count -eq 0) {
        Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "NO_CHANGES" -ChangedPaths @() -Details @("O agente nao produziu alteracoes.")
        continue
    }

    $failedGates = @()
    foreach ($gate in @(Resolve-StoryGates -Prd $state -Story $story)) {
        Write-LoopMessage "Gate: $($gate.id)" "Yellow"
        $gateLog = Join-Path $runState.LogsDir ("{0:000}-{1}-gate-{2}.log" -f $iteration, $story.id, $gate.id)
        if (-not (Invoke-QualityGate -Gate $gate -WorktreePath $worktreePath -LogPath $gateLog)) {
            $failedGates += [string]$gate.id
        }
    }
    if ($failedGates.Count -gt 0) {
        Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "QUALITY_FAILED" -ChangedPaths $changedPaths -Details @("Gates com falha: $($failedGates -join ', ')")
        continue
    }

    $changedPaths = @(Get-ChangedPaths -WorktreePath $worktreePath)
    $violations = @(Test-AllowedChanges -Paths $changedPaths -Story $story)
    if ($violations.Count -gt 0) {
        Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "BLOCKED_GATE_SIDE_EFFECT" -ChangedPaths $changedPaths -Details @("Quality gates geraram paths fora de allowedPaths: $($violations -join ', ')")
        throw "Quality gates geraram mudancas fora do escopo: $($violations -join ', '). Nada foi commitado."
    }

    [void](Invoke-Git -WorkingDirectory $worktreePath -Arguments (@("add", "--") + $changedPaths))
    $commitMessage = "feat(dev-loop): $($story.id) - $($story.title)"
    [void](Invoke-Git -WorkingDirectory $worktreePath -Arguments @("commit", "-m", $commitMessage))
    $story.passes = $true
    $story.notes = "Passed by Lumiera Dev Loop at $((Get-Date).ToString('o'))"
    $state | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $runState.StatePath -Encoding UTF8
    Add-ProgressEntry -ProgressPath $runState.ProgressPath -Story $story -Status "PASSED" -ChangedPaths $changedPaths -Details @("Commit: $commitMessage", "Gates: $(@($story.qualityChecks) -join ', ')")
    if (-not (Get-NextStory -Prd $state)) {
        Write-LoopMessage "Todas as historias foram concluidas. A branch esta pronta para revisao humana." "Green"
        exit 0
    }
}

Write-LoopMessage "Limite de $MaxIterations iteracoes atingido. Inspecione $($runState.ProgressPath)." "Yellow"
exit 2
