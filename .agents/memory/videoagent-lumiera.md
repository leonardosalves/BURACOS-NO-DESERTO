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

1. Aba **Studio Agents** → **VideoAgent — Automação**
2. Descreva o vídeo em PT-BR
3. **Executar automaticamente** (botão verde) — roda a cadeia:
   - Creator: cria projeto + gera narração (igual ▶ do YouTube Studio)
   - Pesquisa concorrentes + fila editorial (servidor)
   - Top 3 winners → fila
   - Overlays com memória do estúdio (se na cadeia)
4. **Só ver plano** — preview sem executar
5. Usa `postAi` + extensão Gemini Chrome — **não** pede colar resposta manual

## API

- `GET /api/ai/video-agent/registry` — intents + agentes
- `POST /api/ai/video-agent/plan` — `{ requirement, format, niche, useAi, enqueueQueue }`
- `POST /api/ai/video-agent/execute` — plano + execução server-side + `creatorTrigger` para UI

## Planos gerados (VideoAgent)

### 2026-07-01 06:29 — Short viral sobre engenharia antiga
- **Feasibility:** Feasible
- **Intents:** Short viral
- **Implícitos:** Enriquecer com fatos (NotebookLM)
- **Chain:** Creator — ideias → Creator — narração → Creator — roteiro + cenas → Overlays / HyperFrames → Render Short 9:16 → Metadados YouTube → Upload YouTube
- **Reasoning:** Plano Lumiera com 7 etapas derivadas dos intents VideoAgent: Short viral.

#### Storyboard beats
- Beat 1: Gancho visual — rosto/objeto + texto ≤8 palavras · _Primeira frase paga a promessa do título_
- Beat 2: Pattern interrupt ~10s — fato visual concreto · _Transição com open loop_
- Beat 3: Pattern interrupt ~12s — fato visual concreto · _Transição com open loop_
- Beat 4: Pattern interrupt ~14s — fato visual concreto · _Transição com open loop_
- Beat 5: CTA — pergunta específica ou parte 2 · _Transição com open loop_
