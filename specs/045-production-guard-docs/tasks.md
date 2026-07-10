# Tasks: Production Guard and Usable Documentation

**Input**: `specs/045-production-guard-docs/spec.md`, `plan.md`

## Phase 1: Documentation and safety

- [x] T001 Create SDD artifacts in `specs/045-production-guard-docs/`.
- [x] T002 [US1] Expand the allowlisted documentation index and global search API in `dashboard-qanat/backend/server.js`.
- [x] T003 [US1] Replace raw HTML rendering with safe Markdown React rendering and global results in `dashboard-qanat/frontend/src/AppDocsTab.tsx`.

## Phase 2: Format-safe planning

- [x] T004 [US2] Add format normalization to `dashboard-qanat/backend/videoAgentPlanner.js`.
- [x] T005 [US2] Add Node coverage in `dashboard-qanat/backend/videoAgentPlanner.test.js`.

## Phase 3: Production readiness

- [x] T006 [US3] Add a read-only readiness endpoint in `dashboard-qanat/backend/server.js` using existing quality/workflow analysis.

## Phase 4: Verify and ship

- [x] T007 Run backend tests and frontend typecheck/build (frontend typecheck has unrelated pre-existing errors; changed file lint passes).
- [ ] T008 Restart the backend, run Lumiera health verification, commit all implementation and SDD files.
