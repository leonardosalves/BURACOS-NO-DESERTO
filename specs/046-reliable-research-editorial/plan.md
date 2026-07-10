# Implementation Plan: Reliable Research and Editorial Pipeline

**Branch**: `046-reliable-research-editorial` | **Date**: 2026-07-10 | **Spec**: `specs/046-reliable-research-editorial/spec.md`

## Summary

Cache connection status instead of polling the NotebookLM CLI, enforce source readiness after every upload/import, remove Gemini Browser bypasses from Creator, and introduce a pure editorial-contract validator for Shorts and long videos.

## Technical Context

**Backend**: `dashboard-qanat/backend/notebooklmService.js`, `server.js`, `scriptQuality.js`  
**Frontend**: Existing Creator UI consumes API phase/status data; no Browser integration added.  
**Config**: Project `notebooklm_session.json`, `notebooklm_research_brief.md`, `storyboard.json`.

## Constitution Check

| Principle            | Status | Notes                                                 |
| -------------------- | ------ | ----------------------------------------------------- |
| I. Ops               | ✅     | Restart and commit after backend verification.        |
| II. Legends/overlays | ✅     | No render-layout change.                              |
| III. Retention       | ✅     | Hook, payoff and CTA become testable editorial gates. |
| IV. Focused code     | ✅     | Reuses NotebookLM service and script-quality module.  |
| V. SDD artifacts     | ✅     | This spec, plan and tasks are present.                |
| VI. Security         | ✅     | No credentials/tokens are stored in code or logs.     |

## Structure Decision

Keep provider readiness in `notebooklmService.js`; put pure editorial validation in `scriptQuality.js` so it can be tested without AI or filesystem access.
