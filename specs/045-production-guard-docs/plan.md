# Implementation Plan: Production Guard and Usable Documentation

**Branch**: `045-production-guard-docs` | **Date**: 2026-07-10 | **Spec**: `specs/045-production-guard-docs/spec.md`

## Summary

Extend the existing documentation API into a safe, searchable operational index, normalize VideoAgent render targets by selected format, and add a read-only readiness summary that reuses existing quality/workflow checks.

## Technical Context

**Backend**: Node/Express in `dashboard-qanat/backend/server.js`; pure planner in `videoAgentPlanner.js`  
**Frontend**: React + Vite in `dashboard-qanat/frontend/src/AppDocsTab.tsx`  
**Render**: Unchanged; the feature only gates and describes render readiness.  
**Config**: Existing project `config_qanat.json` and `storyboard.json`.

## Constitution Check

| Principle              | Status | Notes                                                     |
| ---------------------- | ------ | --------------------------------------------------------- |
| I. Ops                 | ✅     | Backend restart, verification and commit are final tasks. |
| II. Subtitles/overlays | ✅     | No overlay or caption rendering changes.                  |
| III. RPM/retention     | ✅     | Format-safe plans reduce wrong-format production.         |
| IV. Focused code       | ✅     | Reuses existing quality/workflow functions.               |
| V. SDD artifacts       | ✅     | Spec, plan and tasks are present.                         |
| VI. Security           | ✅     | Removes raw HTML injection from the docs reader.          |

## Project Structure

```text
specs/045-production-guard-docs/
├── spec.md
├── plan.md
└── tasks.md
dashboard-qanat/
├── backend/server.js
├── backend/videoAgentPlanner.js
├── backend/videoAgentPlanner.test.js
└── frontend/src/AppDocsTab.tsx
```

**Structure Decision**: Keep planner normalization pure and testable in its existing module. Keep readiness orchestration in `server.js`, where the current quality and workflow functions already live.
