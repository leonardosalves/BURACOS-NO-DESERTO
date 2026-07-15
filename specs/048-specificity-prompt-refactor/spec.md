# Feature Specification: Specificity Prompt Refactor

**Feature Branch**: `048-specificity-prompt-refactor`
**Created**: 2026-07-15
**Status**: Draft
**Input**: scenePromptSpecificity.js, scriptQuality/promptBuilders.js

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prompt Specificity Unification (Priority: P1)
As a script master creator, I want the prompt specificity module (`scenePromptSpecificity.js`) to reuse the central `stripAccents` utility and compile regular expressions cleanly, so that there is no duplicate string logic or accent normalization bugs.

**Why this priority**: Prompts must be clean, in English, and accurate to avoid generation errors. Accents and Portuguese fragments in prompts cause AI image/video generators to produce poor assets or texts with typos.

**Independent Test**:
Run the `scenePromptSpecificity.test.js` or evaluate that prompts with Portuguese accent characters are detected and rewritten correctly.

**Acceptance Scenarios**:
1. **Given** a prompt containing Portuguese accents (e.g. "está"), **When** checked, **Then** it must be classified as having Portuguese words and rewritten.
2. **Given** a narration containing a species name, **When** mapped, **Then** it should extract species anchors using unified glossary mapping.

---

### User Story 2 - Prompt Builders Modularization & Reduction (Priority: P2)
As a developer, I want `scriptQuality/promptBuilders.js` to be structured and modular, with duplicate rules consolidated, to make it easier to maintain and avoid 60KB+ giant files.

**Why this priority**: Giant prompt template files are prone to token waste, typos, and hard-to-debug instruction drift.

**Independent Test**:
Check syntax of `promptBuilders.js` and verify that the script generator backend test passes successfully.

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Import and reuse `stripAccents` from `shared/commonUtils.js` in `scenePromptSpecificity.js` instead of redefining custom normalization regex.
- **FR-002**: Clean up the `PT_STOPWORDS` list or redundant patterns.
- **FR-003**: Extract repeated long string constants or modularize prompt formatting options in `promptBuilders.js` to make the prompt builders easier to navigate.

### Lumiera Touchpoints
- **API/Backend**: `dashboard-qanat/backend/scenePromptSpecificity.js`
- **Quality Module**: `dashboard-qanat/backend/scriptQuality/promptBuilders.js`

## Success Criteria *(mandatory)*
- **SC-001**: Syntax validation check (`node --check`) passes on both files.
- **SC-002**: Existing unit tests for script quality and visual prompt generation pass.
