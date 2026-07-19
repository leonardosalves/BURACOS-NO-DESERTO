# Lumiera Dev Loop

The Lumiera Dev Loop applies the proven Ralph pattern to this Windows/Codex repository without putting an autonomous coding loop inside the video-production runtime.

It creates a dedicated Git worktree and branch, starts a fresh `codex exec` context for one prioritized story, enforces story-level path boundaries, runs declarative quality gates, and commits only the validated paths. It never merges automatically.

## Validate and preview a PRD

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lumiera-dev-loop/lumiera-dev-loop.ps1 `
  -PrdPath scripts/lumiera-dev-loop/example.prd.json `
  -ValidateOnly

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lumiera-dev-loop/lumiera-dev-loop.ps1 `
  -PrdPath scripts/lumiera-dev-loop/example.prd.json `
  -DryRun
```

Copy `example.prd.json`, replace its placeholder story and narrow `allowedPaths`, then validate it before execution.

## Execute

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lumiera-dev-loop/lumiera-dev-loop.ps1 `
  -PrdPath tasks/my-feature.prd.json `
  -MaxIterations 10
```

The default worktree is `.lumiera-worktrees/<branch-slug>`. Runtime PRD state, progress, Codex JSONL, and gate logs live under that worktree's ignored `.lumiera-dev-loop/` directory.

## Safety properties

- `codex exec --ignore-user-config --ephemeral --sandbox danger-full-access` runs from the dedicated worktree. On Windows, headless `workspace-write` is currently downgraded to read-only, so safety is enforced by the isolated worktree, per-story path allowlist, explicit staging, and mandatory quality gates.
- The agent is prohibited from committing; the supervisor detects unexpected HEAD changes.
- Files outside a story's `allowedPaths` block the run before staging.
- Quality checks use an executable plus an argument array, not `Invoke-Expression`.
- Only explicitly changed and allowed paths are staged.
- Failed attempts remain inspectable in the isolated worktree for the next fresh context.
- Completion leaves a reviewable branch; merge and deletion are always manual.

## PRD fields

- `branchName`: dedicated branch, normally prefixed with `codex/`.
- `baseBranch`: branch used when creating a new worktree; defaults to `main`.
- `qualityChecks`: named commands with `workingDirectory`, `file`, and `arguments`.
- `userStories`: prioritized stories with acceptance criteria, narrow `allowedPaths`, gate IDs, and a `passes` flag.

Run the local smoke tests with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lumiera-dev-loop/test-lumiera-dev-loop.ps1
```
