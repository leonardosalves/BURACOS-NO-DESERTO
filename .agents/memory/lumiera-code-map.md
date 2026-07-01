# Lumiera code map

> Mapa estrutural para agentes — fonte canônica: `dashboard-qanat/backend/lumieraCodeMap.js`  
> API: `GET http://127.0.0.1:3005/api/studio-agents/code-map?compact=text`

## Stack

- **backend:** `dashboard-qanat/backend/server.js` (Express :3005)
- **frontend:** `dashboard-qanat/frontend/src/App.tsx` (Vite :5176)
- **render:** `dashboard-qanat/remotion-renderer/src/LumieraTimeline.tsx`
- **agents:** `.agents/` (skills, memory, bundles)

## Entry points

| Path | Role |
|------|------|
| `server.js` | Monólito API — Creator, render, Studio Agents, YouTube |
| `App.tsx` | UI — Creator, Timeline, Workflow, Studio |
| `skillsRegistry.js` | Bundles Hermes + `injectStudioAgentsContext` |
| `agentMemory.js` | Memória procedural — capture/promote learnings |
| `videoAgentPlanner.js` | VideoAgent → intents Lumiera |

## APIs (grupos)

- `/api/studio-agents` — status, skills, learnings, plan-overlays, **code-map**
- `/api/ai/creator` — script (narration/full), ideas
- `/api/workflow` — clip-factory, analyze-reference, capability-menu
- `/api/projects` — storyboard, wizard-session, config
- `/api/youtube/channel` — editorial-queue

## Prompt injection

- `injectStudioAgentsContext` — ideas, script, metadata, overlay
- `buildLearningsPromptAddendum` — cap 12 learnings
- `buildSkillsPromptAddendum` — cap 1200 chars/skill
- `compressTranscriptForPrompt` / `compressPromptAddendum` — metadados e addenda

## Dicas (tokens)

1. Prefira **code-map** antes de varrer `server.js`.
2. Instale **codebase-memory-mcp**: `.\scripts\setup-context-mcp.ps1`
3. Roteiro completo fica no disco; prompts usam compressão.
4. Skills L2: `GET /api/studio-agents/skills/:slug?ref=`