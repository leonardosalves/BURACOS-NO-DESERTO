# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: `specs/[###-feature-name]/spec.md`

## Summary

[1–3 frases: abordagem técnica no Lumiera]

## Technical Context

**Backend**: Node (`dashboard-qanat/backend/server.js`, `workflowRoutes.js`, …)
**Frontend**: React + Vite (`dashboard-qanat/frontend/src/`)
**Render**: Remotion (`dashboard-qanat/remotion-renderer/src/LumieraTimeline.tsx`)
**Python pipeline**: scripts na raiz do projeto (TTS, Whisper, build_video)
**Config**: `config_qanat.json`, `storyboard.json` por projeto

## Constitution Check

*GATE: deve passar antes de implementar. Ver `.specify/memory/constitution.md`.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. Ops (commit/restart) | ☐ | |
| II. Legendas/overlays | ☐ | |
| III. RPM/retenção | ☐ | |
| IV. Código focado | ☐ | |
| V. SDD artifacts | ☐ | spec + tasks presentes |
| VI. Segurança | ☐ | |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── spec.md
├── plan.md          # this file
├── research.md      # optional
├── tasks.md         # from /speckit.tasks
└── quickstart.md    # optional — como testar manualmente
```

### Source Code (typical Lumiera)

```text
dashboard-qanat/
├── backend/
├── frontend/src/
└── remotion-renderer/src/
```

**Structure Decision**: [pastas concretas que esta feature toca]

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| | | |