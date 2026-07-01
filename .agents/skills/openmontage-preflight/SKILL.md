---
name: openmontage-preflight
description: |
  Capability envelope Lumiera — o que está configurado antes de propor produção.
  Inspirado no provider_menu / support_envelope do OpenMontage.
  Use antes de reference video, VideoAgent execute ou Creator pipeline.
  Triggers: preflight, capability, o que posso produzir, falta chave, envelope, provider menu.
license: MIT
metadata:
  lumiera: true
  source: calesthio/OpenMontage (padrão preflight, adaptado)
tasks: [ideas, script, overlay, metadata]
formats: [SHORT, LONG]
---

# OpenMontage Preflight (Lumiera)

## Quando usar

- Antes de analisar referência de vídeo
- Antes de executar VideoAgent automaticamente
- Quando o usuário pergunta "dá para fazer X?" ou "falta o quê?"

## API

`GET /api/workflow/capability-menu` — retorna categorias:

| Categoria | Itens |
|-----------|-------|
| narration | Kokoro, Edge, Fish, Chatterbox |
| stock | Pexels, Pixabay |
| composition | Remotion PRO, HyperFrames |
| music | Epidemic Sound |
| ai_video | ComfyUI + LTX |
| llm | Gemini, xAI, OpenRouter, NVIDIA |
| research | NotebookLM, YouTube Studio Pro |

## Como apresentar gaps

```
REFERÊNCIA PRECISA     SEU LUMIERA              GAP
─────────────────      ───────────              ───
B-roll stock           Pexels: ✓                OK
Narração PT            Kokoro: ✓                OK
Vídeo IA sci-fi        ComfyUI: ✗               Configure ComfyUI ou use stock
Trilha premium         Epidemic: ✗              Settings → Epidemic token
```

Seja honesto. Ofereça fallback: "sem ComfyUI → stock + motion graphics HyperFrames".

## Remotion vs HyperFrames

Quando **ambos** disponíveis, apresentar tradeoffs ao usuário — não silenciar default:

- **Remotion** — timeline integrada, overlays catalogados, render local
- **HyperFrames** — motion graphics HTML, Anime.js/GSAP, atelier

## Settings

Chaves em Settings → API Keys ou `POST /api/workflow/save-keys` (Pexels/Pixabay globais).