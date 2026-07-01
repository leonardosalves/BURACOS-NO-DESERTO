---
name: deer-flow-research
description: |
  Pesquisa profunda estilo DeerFlow no Lumiera — planner, pesquisadores paralelos, relatório.
  Use para "pesquisa profunda", "investigar tema", "relatório antes do roteiro", deep research.
  Triggers: pesquisa profunda, deep research, deerflow, investigar, relatório de pesquisa.
metadata:
  lumiera: true
  source: bytedance/deer-flow (padrões adaptados)
---

# DeerFlow → Lumiera (pesquisa profunda)

Não rode o harness DeerFlow completo (Python/LangGraph). Use a API Lumiera:

```http
POST /api/research/deep
{ "topic": "...", "niche": "...", "format": "SHORTS", "notebooklmDeep": false, "enqueueIdeas": true }
```

## Fluxo (espelho DeerFlow 1.x)

1. **Planner** — `planDeepResearch` decompõe em sub-perguntas
2. **Research team (paralelo)** — web (Gemini), Exa (`mcporter`), concorrentes YouTube, NotebookLM
3. **Reporter** — markdown em `.agents/memory/deep-research-reports.md` + ideias na fila editorial

## UI

Studio Agents → VideoAgent → painel **Pesquisa profunda (DeerFlow)**

## VideoAgent

Intent **Pesquisa profunda** dispara `deep_research` em `/api/ai/video-agent/execute`.

## Pré-requisitos

- Exa: `.\scripts\setup-agent-reach.ps1`
- NotebookLM: `nlm login`
- YouTube: OAuth canal conectado (concorrentes)