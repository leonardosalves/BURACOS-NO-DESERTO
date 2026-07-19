# Lumiera Dev Loop — Codex iteration

You are implementing exactly one small user story in the Lumiera repository.

Project: {{PROJECT}}
Project description: {{DESCRIPTION}}

## Story

```json
{{STORY_JSON}}
```

## Persistent progress from earlier fresh contexts

{{PROGRESS}}

## Contract

1. Read every applicable `AGENTS.md` before editing.
2. Inspect the current worktree and any uncommitted changes left by a previous failed attempt.
3. Implement only this story and keep the change minimal.
4. Modify only paths matched by `allowedPaths` in the story JSON.
5. Do not stage or commit anything. The supervisor validates and commits selectively.
6. Do not edit `.lumiera-dev-loop/`, the PRD state, progress log, Git configuration, credentials, or files outside this worktree.
7. Do not run costly media generation, publish content, contact external services, rotate credentials, or alter the running Lumiera installation.
8. Run focused, inexpensive checks when helpful. The supervisor will run the declared quality gates afterward.
9. If blocked, leave the worktree in the most useful inspectable state and explain the blocker in the final response.
10. Finish with a concise summary of changed files and checks performed.
