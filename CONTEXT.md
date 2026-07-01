# Lumiera — domain context

> Vídeo studio para YouTube Shorts e Long-form. Mapa de código: `.agents/memory/lumiera-code-map.md` · API: `GET /api/studio-agents/code-map`

## Glossary

| Term | Meaning |
|------|---------|
| **Creator** | UI de roteiro e ideias (`App.tsx`, `/api/ai/creator`) |
| **Clip Factory** | Workflow que gera fila editorial a partir de vídeo longo (`clipFactory.js`) |
| **Editorial queue** | Fila de ideias Short no YouTube Studio (`youtubeEditorialQueue.js`) |
| **Studio Agents** | Injeção de skills/bundles Hermes (`skillsRegistry.js`) |
| **VideoAgent** | Planner de automação (pesquisa, render, concorrentes) |
| **SHORT / LONG** | Formatos 9:16 vs 16:9 |
| **HyperFrames** | Overlays HTML determinísticos no render PRO |
| **LumieraTimeline** | Composição Remotion principal |
| **Spec Kit / SDD** | `specs/<###-nome>/` — spec, plan, tasks |
| **Bundle** | Conjunto de skills em `.agents/skill-bundles/*.json` |

## Stack seams (test/debug)

| Seam | Path |
|------|------|
| API monolith | `dashboard-qanat/backend/server.js` (:3005) |
| Frontend | `dashboard-qanat/frontend/src/App.tsx` (:5176) |
| Render | `dashboard-qanat/remotion-renderer/src/LumieraTimeline.tsx` |
| Agent config | `.agents/skills/`, `.agents/skill-bundles/` |

## Architectural notes

- Brownfield monolith — novas rotas em módulos `*Routes.js`, montados em `server.js`.
- Specs de feature vivem em `specs/` (Speckit); issues rápidas em `.scratch/` (mattpocock).
- Não commitar `config_qanat.json` nem `studio_agents_config.json` (config local).