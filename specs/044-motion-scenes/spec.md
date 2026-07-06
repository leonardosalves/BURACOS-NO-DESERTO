# Feature Specification: Motion Scenes (Remotion planejado pela IA)

**Feature Branch**: `044-motion-scenes`
**Created**: 2026-07-06
**Status**: In Progress
**Input**: IA planeja cenas Remotion (dados, mapas, curiosidades) além de prompts image/video

## Referências externas

- [RVE Remotion Templates](https://www.reactvideoeditor.com/remotion-templates) — bar/line/pie charts, kinetic text, circular progress, pixel transition
- [Remotion Resources](https://cloudrun.remotion.dev/docs/resources) — mapbox-example, morph-text, typewriter, D3, audiogram

## Princípio

**Templates + JSON**, nunca TSX gerado na hora. A IA escolhe `template_id` e preenche `props` do catálogo Lumiera/HyperFrames.

## User Stories

### US1 — Planejador heurístico (P1)

Ao gerar ou revisar roteiro, o sistema detecta trechos com dado numérico, lugar, data ou curiosidade e produz `motion_scenes[]` no `storyboard.json`.

**Teste independente**: POST `/api/ai/creator/plan-motion-scenes` em projeto com `visual_prompts` → retorna ≥1 cena `location-intro` ou `counter` onde aplicável.

### US2 — Sync Timeline Studio (P1)

Cenas planejadas viram clips na trilha Templates/Overlays com timing ancorado na narração.

**Teste**: após plan + sync, GET `/api/timeline-studio` contém clips `templateId` das motion scenes.

### US3 — Mapa satélite com zoom (P2)

`location-intro` aceita `backgroundImage` (tile estático) + sequência `zoom_from`/`zoom_to` (inspirado mapbox-example).

### US4 — PIP explicativo (P2)

Layout `pip`: fundo stock/satélite + overlay `geo-map` ou `counter` no canto.

## Success Criteria

- SC-001: `motion_scenes[]` persistido em `storyboard.json`
- SC-002: Catálogo documenta mapeamento RVE ↔ template Lumiera
- SC-003: Perfil de nicho (`geography-explorer`, `data-journalist`, etc.) influencia escolha de template
- SC-004: Preview Timeline Studio mostra cenas fullscreen (`location-intro`, `pictogram-chart`)
