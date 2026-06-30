> 🔗 [[MEMORIA-LUMIERA]] · [[skills/ugc-scriptwriter|UGC]] · [[skills/viral-hooks|Hooks]] · [[skills/viral-youtube-shorts|YouTube Shorts]] · [[SKILLS]]

---
name: viral-short-form
description: |
  Framework viral para Shorts/TikTok/Reels — curadoria, 10 arquétipos de gancho, retenção e power-ups.
  Lumiera: integrado em scriptQuality.js (VIRAL_SHORT_FORM_REINFORCEMENT). Referências Vyral em references/.
  Triggers: viral, short form, gancho, hook, wow-facts, TikTok, Reels, listicle Short, retenção.
license: MIT
metadata:
  lumiera: true
  sources: [vyralcontent/content-skills, lucaswalter/n8n-ai-workflows]
---

# Viral Short-Form (Lumiera)

Umbrella skill para roteiros curtos. Combina:

- **Vyral** `content-skills` (referências em `references/` — hooks, retention, formats)
- **n8n Lucas Walter** (1.8M+ views) — já em `scriptQuality.js`
- **Regras Lumiera** — gancho limpo 1.5s, UGC, fechamento declarativo, NotebookLM

## Princípios (Lumiera)

1. **Saves e conclusão > views** — otimize para “salvaria / assistiria de novo”.
2. **6–10 ganchos** em arquétipos diferentes — nunca um só.
3. **Específico > inteligente** — números, nomes, datas.
4. **Gancho anuncia payoff real** — sem clickbait que o roteiro não entrega.
5. **Fechamento declarativo** (skill `ugc-scriptwriter`) — sem “comenta aí”.

## Curadoria (1 categoria por vídeo)

| ID | Quando |
|----|--------|
| impactful | Consequência real na vida das pessoas |
| practical | Dá para aplicar hoje |
| provocative | Desafia crença comum — com fatos |
| astonishing | Dado que parece impossível |

Descartar: ad-driven, política vazia, sem substância factual.

## Workflow Lumiera

1. **Ideação** — Creator: `hook_candidates`, `viral_category`, `wow_facts_preview`
2. **Pesquisa** — NotebookLM + web (fatos verificáveis)
3. **Ganchos** — 6–10 rotulados por arquétipo → `references/hooks.md`
4. **Roteiro** — hook → escalation → payoff → mic drop (30–50s, 80–130 palavras)
5. **Visual** — gancho limpo 1.5s sem overlay informativo (`preRenderAdvice`)
6. **Humanizar** — skill `ugc-scriptwriter` + `sanitizeLameEndingQuestions()`

## Estrutura 30–50s

```
1. Gancho (≤10 palavras, frame 1)
2. Contexto (1 frase)
3. 3–5 wow-facts
4. Stakes / por que importa hoje
5. Fechamento declarativo
```

## Power-ups (1–2 por roteiro)

Authority bump · Hook spice · Then-vs-now · Stat escalation · Real-world fallout · Zoom-out · Rhythm check

## 8 tipos Lumiera (mapeamento n8n)

question · shock · problem_solution · before_after · breaking · challenge · secret · personal

Ver também **10 arquétipos Vyral** em `references/hooks.md` (curiosity gap, withhold, contrarian, etc.).

## Referências locais (carregar sob demanda)

- `references/hooks.md` — arquétipos e anti-patterns
- `references/retention.md` — 3 modos de falha, escalation, payoff
- `references/formats.md` — listicle, demo, storytime
- `references/platforms.md` — TikTok / Reels / Shorts
- `assets/script-template.md` — esqueleto de roteiro
- `assets/hook-checklist.md` — pass/fail rápido

## Código Lumiera

- `dashboard-qanat/backend/scriptQuality.js` — `VIRAL_SHORT_FORM_REINFORCEMENT`, `buildViralIdeasAddendum()`
- `buildNarrationOnlyPrompt()` — fase narração Shorts
- `videoProEnhancements.js` — gancho limpo, pattern interrupt

## Skills irmãs

- [[skills/viral-hooks|viral-hooks]] — só os primeiros 1–3s
- [[skills/viral-youtube-shorts|viral-youtube-shorts]] — VVSA, funil Short→Longo
- [[skills/ugc-scriptwriter|ugc-scriptwriter]] — voz falada PT-BR

## Fontes externas

- [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills) (MIT)
- [awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) — índice em [[skills-registry-external]]
- MCP Market: `viral-short-form-video-master` ≈ pacote Vyral short-form