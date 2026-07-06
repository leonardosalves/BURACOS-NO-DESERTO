# Plan: Motion Scenes

## Constitution Check

- Reutiliza Remotion PRO existente (`remotion-renderer/src/overlays/*`)
- Não gera código React em runtime
- Brownfield: estende `storyboard.json` + `timeline_studio.json`
- Preview editável no Timeline Studio

## Arquitetura

```
visual_prompts[] + narrative_script
        ↓
motionScenePlanner (heurística → opcional Gemini)
        ↓
storyboard.motion_scenes[]
        ↓
syncMotionScenesToTimelineStudio()
        ↓
timeline_studio.clips (track overlays)
        ↓
prepareRemotionRender → OverlayLayer
```

## Catálogo (Fase 1)

| Trigger           | Template                        | Layout           | Inspiração RVE / Remotion |
| ----------------- | ------------------------------- | ---------------- | ------------------------- |
| `stat_number`     | `counter`                       | fullscreen / pip | circular-progress         |
| `comparison`      | `bar-chart` / `pictogram-chart` | fullscreen       | bar-chart, pie-chart      |
| `location`        | `location-intro`                | fullscreen       | mapbox-example            |
| `region_pin`      | `geo-map`                       | pip              | GeoMapOverlay             |
| `timeline_date`   | `timeline`                      | fullscreen       | line-chart (trend)        |
| `historical_fact` | `lower-third`                   | pip              | popping-text              |
| `curiosity_punch` | `kinetic-text`                  | fullscreen       | popping-scale-text        |

## Fases de implementação

| Fase            | Entrega                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| **1** (esta PR) | `motionSceneCatalog.js`, `motionScenePlanner.js`, API, sync timeline, botão UI |
| **2**           | `backgroundImage` satélite real (Mapbox Static) em `LocationIntro`             |
| **3**           | LLM enrichment opcional + merge com `overlays_ai` sem duplicar                 |
| **4**           | `media_mode: remotion` em `visual_prompts` substituindo cena image/video       |
| **5**           | Earth fly (POI) + contorno OSM (cidade) em `location-intro`                    |

## Arquivos

- `dashboard-qanat/shared/motionSceneCatalog.js`
- `dashboard-qanat/backend/motionScenePlanner.js`
- `dashboard-qanat/backend/motionSceneRoutes.js`
- `dashboard-qanat/backend/timelineStudioMigration.js` (migrate motion_scenes)
- `dashboard-qanat/frontend/src/TimelineStudio.tsx` (botão)
