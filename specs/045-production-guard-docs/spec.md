# Feature Specification: Production Guard and Usable Documentation

**Feature Branch**: `045-production-guard-docs`  
**Created**: 2026-07-10  
**Status**: In progress  
**Input**: Improve Lumiera documentation and protect video creation plans from incompatible output formats.

## Clarifications

- Scope is the dashboard documentation and VideoAgent planning layer; it does not change the Remotion render output.
- Existing project quality checks remain the source of truth. This feature exposes their readiness state instead of duplicating validation.

## User Scenarios & Testing

### User Story 1 - Read the operational documentation (Priority: P1)

As a Lumiera operator, I can search the documentation globally and open the relevant operational notes, including the VideoAgent guide and agent rules.

**Why this priority**: Documentation is useful only if it makes the next production action discoverable.

**Independent Test**: Search for `render` and open a matching document; click a supported wiki link.

**Acceptance Scenarios**:

1. **Given** the documentation tab, **When** I search a term, **Then** I see matching documents and excerpts across the published documentation set.
2. **Given** Markdown documentation, **When** it includes links, lists or a table, **Then** the viewer renders safe, readable React content without injecting source HTML.

---

### User Story 2 - Generate a format-safe plan (Priority: P1)

As a video producer, when I choose LONGO or SHORTS, the VideoAgent plan has only the corresponding render action even if the text mentions another intent such as narration.

**Why this priority**: An incompatible render plan wastes production time and cost.

**Independent Test**: Plan a LONGO documentary with narration and assert `render_long` is present while `render_short` is absent.

**Acceptance Scenarios**:

1. **Given** format LONGO, **When** the planner receives any valid requirement, **Then** the chain never contains `render_short`.
2. **Given** format SHORTS, **When** the planner receives any valid requirement, **Then** the chain never contains `render_long`.

---

### User Story 3 - Know whether a project can be rendered (Priority: P2)

As a producer, I can retrieve a compact readiness report that explains automatic checks, remaining manual approvals and the next action before render.

**Why this priority**: The VideoAgent intentionally defers costly and publishing actions; the operator needs an explicit boundary.

**Independent Test**: Request the readiness endpoint for a project and inspect the quality report, manual gates and recommendation.

## Edge Cases

- A query that matches no document returns an empty result rather than an error.
- A missing documentation file is omitted from the public index.
- An LLM returning the wrong render key is normalized to the chosen format.
- A project without a storyboard returns a blocked readiness report, not a server error.

## Requirements

### Functional Requirements

- **FR-001**: Publish the existing VideoAgent, agent instructions and skill index alongside the architecture maps.
- **FR-002**: Provide global documentation search with case-insensitive excerpts.
- **FR-003**: Render the supported Markdown subset without `dangerouslySetInnerHTML`.
- **FR-004**: Normalize planner chains to exactly one output format whenever a render action exists.
- **FR-005**: Expose a read-only production-readiness endpoint based on existing quality and project workflow checks.
- **FR-006**: Cover format normalization with Node tests.

### Lumiera Touchpoints

- **UI**: `dashboard-qanat/frontend/src/AppDocsTab.tsx`
- **API**: `dashboard-qanat/backend/server.js`
- **Pipeline**: `dashboard-qanat/backend/videoAgentPlanner.js`, `storyboard.json`, `config_qanat.json`

## Success Criteria

- **SC-001**: A LONGO plan cannot contain `render_short`, and a SHORTS plan cannot contain `render_long`.
- **SC-002**: The docs API indexes at least the operational VideoAgent and agent-rule documents when they exist.
- **SC-003**: Global search returns matching document identifiers and excerpts.
- **SC-004**: Existing backend tests plus the new planner test pass.

## Assumptions

- The dashboard continues to be the trusted local reader for `.agents/` documents.
- “Approval” in this increment is a reported human gate; it does not automatically publish or render.
