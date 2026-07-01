# Feature Specification: OpenCut Timeline Controls

**Feature Branch**: `043-opencut-timeline`
**Created**: 2026-07-01
**Status**: Implemented
**Input**: Integrar features OpenCut v0.3.0 na timeline Lumiera

## User Scenarios

### User Story 1 - Controles por clip (P1)

Operador ajusta volume e velocidade de B-roll por asset na grade da timeline.

**Independent Test**: Slider em clip vídeo → salvar → render com áudio/playbackRate diferente.

### User Story 2 - Barra OpenCut (P1)

Zoom preview, fundo canvas, import JSON, bulk delete.

**Independent Test**: Importar Whisper JSON; word_transcripts.json criado; fundo visível no render.

### User Story 3 - Ajuda contextual (P2)

Cada controle tem botão ? explicando função.

**Independent Test**: Hover/click em ? na barra e nos cards.

## Success Criteria

- SC-001: POST /api/workflow/import-transcript grava word_transcripts.json
- SC-002: canvas_background, volume, playback_rate no Remotion
- SC-003: ? em zoom, fundo, import, bulk delete, volume, velocidade, multi-seleção