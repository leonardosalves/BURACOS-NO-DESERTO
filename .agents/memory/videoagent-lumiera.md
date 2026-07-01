# VideoAgent → Lumiera

> 🔗 [[MEMORIA-LUMIERA]] · [[skills/studio-agents-hermes]] · [[skills/lumiera-ops]]

Adaptação leve do framework [HKUDS/VideoAgent](https://github.com/HKUDS/VideoAgent) para o pipeline Lumiera — **sem** portar modelos pesados (CosyVoice, ImageBind, fish-speech, DiffSinger).

## O que o VideoAgent original faz

1. **Intent analysis** — classifica o pedido do usuário (narração, beat-sync, overview, etc.)
2. **Agent graph** — Claude desenha um DAG de ferramentas com inputs/outputs ligados
3. **Judge + reflection** — até 3 rodadas refinando o grafo
4. **Storyboard beats** — queries visuais + hints de narração por beat
5. **Execução** — chain de tools locais (TTS, Whisper, VC, etc.)

## O que o Lumiera adapta

| VideoAgent (original) | Lumiera (nosso) |
|----------------------|-----------------|
| `intents.yml` → CosyVoice, Whisper… | `LUMIERA_INTENT_MAP` → Creator, NotebookLM, render, upload |
| Agent graph (Claude) | `planVideoAgentWithLlm` + registry fixo |
| Storyboard Agent | `storyboardBeats` no plano + Creator roteiro |
| Execução automática de tools | Botões para abrir abas (`creator`, `youtube-studio`, `upload`…) |

## Intents mapeados

- **Short viral** → ideias → narração → roteiro → overlays → render Short → metadados → upload
- **Vídeo longo documental** → + NotebookLM → render longo
- **Pesquisa concorrentes** → competitor research → fila editorial
- **SEO e publicação** → metadados → thumbnail A/B → heatmap → upload
- **Diagnóstico pós-upload** → penhasco retenção → top winners → fila editorial

## Registry de agentes

Implementação: `dashboard-qanat/backend/videoAgentPlanner.js`

- `creator_ideas`, `creator_narration`, `creator_script`
- `notebooklm_enrich`, `overlay_plan`, `beat_sync`
- `render_short`, `render_long`
- `youtube_metadata`, `thumbnail_ab`, `schedule_heatmap`, `upload_youtube`
- `competitor_research`, `editorial_queue`, `top_winners`, `retention_cliff`

## Como usar no dashboard

1. Aba **Studio Agents** → bloco **VideoAgent Planner**
2. Descreva o vídeo em PT-BR (ex.: "Short viral sobre engenharia antiga com NotebookLM")
3. Opcional: enriquecer com IA (Gemini) ou só regras locais
4. Siga a cadeia clicando nas abas sugeridas
5. Planos ficam logados abaixo em **Planos gerados**

## API

- `GET /api/ai/video-agent/registry` — intents + agentes
- `POST /api/ai/video-agent/plan` — `{ requirement, format, niche, useAi, enqueueQueue }`

## Planos gerados (VideoAgent)