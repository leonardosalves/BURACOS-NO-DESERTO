# Feature Specification: Reliable Research and Editorial Pipeline

**Feature Branch**: `046-reliable-research-editorial`  
**Created**: 2026-07-10  
**Status**: In progress  
**Input**: Run Creator without Gemini Browser, make NotebookLM connection resilient, wait for sources, and enforce clear humanized scripts for Shorts and long-form videos.

## Clarifications

- Gemini Browser is explicitly out of scope. Creator must not select it as a fallback or skip quality steps because it exists.
- Google authentication still requires one initial user authorization and any future reauthorization mandated by Google. The system must reuse the authenticated user session and report real failures without login polling.
- This implementation increment covers reliable connection state, source readiness and the Creator path. TTS/audio and multi-platform learning are follow-up increments after editorial evidence is reliable.

## User Scenarios & Testing

### User Story 1 - Connected research without login polling (Priority: P1)

As an operator, I see the latest NotebookLM connection state immediately and the backend does not spawn a login-status CLI check for every status request.

**Independent Test**: Read the status endpoint twice after a successful check and assert the cached status is returned before the configured refresh interval.

### User Story 2 - Research before writing (Priority: P1)

As a producer, the Creator waits until all required NotebookLM sources are usable before it queries research or generates a narration based on that research.

**Independent Test**: A source set with an empty/processing source is rejected as not ready; a set with all sources populated is ready.

### User Story 3 - Clear narration in both formats (Priority: P1)

As a viewer, I receive a complete and understandable message: a truthful hook, logical development, payoff and a relevant final CTA.

**Independent Test**: The editorial contract validates format-specific required sections and blocks a script missing the payoff or central thesis.

## Edge Cases

- A revoked session becomes `reauth_required` after the actual failed request, without retry loops.
- A source never reaches ready state returns a visible timeout failure; it never silently continues as enriched.
- A research provider failure permits an explicitly marked local-only draft, not a falsely sourced script.
- No browser response is accepted by Creator while Gemini Browser is disabled.

## Requirements

- **FR-001**: Creator script endpoints must not use Gemini Browser availability to skip NotebookLM, humanization or enrichment.
- **FR-002**: NotebookLM status must be cached in-process and refreshed only on startup, explicit connection action, TTL expiry, or actual provider failure.
- **FR-003**: Every source upload/import must be followed by full source-readiness verification before querying.
- **FR-004**: A failed readiness check must surface `research_degraded` and prevent an enriched claim.
- **FR-005**: Add an editorial contract with format-specific thesis, development, payoff and CTA checks.
- **FR-006**: Persist the research/readiness result in the project brief for auditability.

## Success Criteria

- **SC-001**: Repeated status reads do not run `nlm login --check` while the cached state is fresh.
- **SC-002**: A script cannot report NotebookLM enrichment unless its source set reached ready state.
- **SC-003**: Browser mode no longer bypasses the Creator editorial post-process.
- **SC-004**: Tests cover status cache, source readiness and editorial contract rules.

## Assumptions

- The user will restore the dashboard from Windows-service mode to user-session DEV mode once, because that external service cannot own an interactive Google session.
