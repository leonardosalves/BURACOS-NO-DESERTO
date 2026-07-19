# ADR 001 — Adapter Pattern for Video Engines

**Status**: Accepted  
**Date**: 2026-07-19

## Context

The suite integrates 5 different video engines (Remotion, HyperFrames, VoxDirector, VoxExplainer, GbroCollage) plus FFmpeg as a universal fallback. Each engine has its own input format, rendering approach, and output structure.

## Decision

Use the **adapter pattern** with a shared `VideoEngineAdapter` interface:

- `supports(scene)` — declarative routing
- `prepare(scene)` → engine-specific input
- `execute(input, ctx)` → render
- `normalize(output)` → common `RenderManifest`

A `SceneRouter` selects the correct adapter based on `engineHint` and always falls back to FFmpeg.

## Consequences

- Adding a new engine requires only implementing the interface and registering in the router
- No core code changes needed for new engines
- Each adapter handles its own CLI/API integration
- FFmpeg fallback ensures the pipeline never completely fails

---

# ADR 002 — Prompt-Based Asset Generation (Whiteboard System)

**Status**: Accepted  
**Date**: 2026-07-19

## Context

The user does not have API keys for image/video generation services. The system needs to support manual asset creation where prompts are provided and the user generates images/videos externally.

## Decision

Implement a **prompt-generation endpoint** (`GET /v1/projects/:id/prompts`) that:

1. Generates structured image and video prompts for each scene
2. Includes visual metaphor, palette, motion profile, and script context
3. Returns prompts in Portuguese with English instructions
4. User generates assets externally and uploads via `POST /v1/scenes/:sceneId/assets`

## Consequences

- Zero dependency on external image/video generation APIs
- User retains full creative control over visual assets
- Pipeline can proceed with uploaded assets or use FFmpeg-generated placeholders
- Future: can add API integration as an optional accelerator

---

# ADR 003 — VO-First Pipeline

**Status**: Accepted  
**Date**: 2026-07-19

## Context

Visual timing must be driven by actual voiceover duration, not estimated text-to-duration ratios.

## Decision

The pipeline follows a strict VO-first order:

1. Generate TTS audio (Fish Speech, pt-BR)
2. Measure real duration via ffprobe
3. Update scene manifests with actual timing
4. Only then route to visual engines

## Consequences

- Audio duration is the master clock for the entire timeline
- Prevents audio-visual desync
- Requires TTS to complete before any visual rendering begins
