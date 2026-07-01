> 🔗 [[MEMORIA-LUMIERA]] · [[skills/ugc-scriptwriter|UGC Scriptwriter]] · [[skills/ad-concept-generator|Ad Concept]] · [[SKILLS]]

---
name: ai-ugc-ads
description: |
  Campanhas UGC — brief de criador, formatos Problem-Solution/Testimonial, teste 3x3x3, Spark Ads.
  Use ao adaptar roteiro Lumiera para ads pagos, brief de criador ou funil orgânico→pago Shorts.
  Triggers: UGC, creator ads, Spark Ads, whitelisting, brief criador, AI UGC, anúncio TikTok, teste criativo.
license: MIT
metadata:
  lumiera: true
  source: chadboyda/agent-gtm-skills/ai-ugc-ads
  tasks: [script, ideas]
  formats: [SHORT]
---

# AI UGC Ads (Lumiera)

Adaptado de [chadboyda/agent-gtm-skills](https://github.com/chadboyda/agent-gtm-skills) (MIT).

Framework de crescimento UGC: validação orgânica → Spark Ads → escala. Complementa `ugc-scriptwriter` (narração) e `ad-concept-generator` (conceito a partir do gancho).

## Quando usar no Lumiera

| Cenário | Ação |
|---------|------|
| Roteiro Short já pronto | Extrair brief UGC + formatos (Sec. 5) |
| Testar ganchos | Matriz 3x3x3 (Sec. 8) antes de gastar em ads |
| Narração autêntica | Delegar texto final a `ugc-scriptwriter` |
| Conceito de campanha | `ad-concept-generator` primeiro |

## Brief UGC (template PT-BR)

```
MARCA/NICHO: [do config.niche]
PRODUTO/TEMA: [título do vídeo]
PLATAFORMA: TikTok / Reels / YouTube Shorts
FORMATO: Problem-Solution | Testimonial | Tutorial (ver Sec. 5)
DURAÇÃO: 15–30s | 9:16

GANCHO (3s): [hook_candidates do Creator]
PONTOS (2–3): benefício, prova, diferencial
CTA: declarativo factual — sem engagement bait (regra Lumiera)

VISUAL: luz natural, produto em uso, 1 close-up
NÃO: ler script robotizado, jargão, 16:9, perguntas vazias de comentário
```

## Formatos prioritários Shorts

1. **Problem-Solution** — cold traffic
2. **Testimonial** — confiança Reels/Shorts
3. **Tutorial** — SaaS, educação, how-to

Todos: gancho nos primeiros 3s; legendas queimadas (`shorts-viral`).

## Teste criativo (resumo)

- **Fase 1 (3 dias):** 3 ganchos, mesmo corpo — medir hook rate >30%
- **Fase 2:** 3 corpos com gancho vencedor — hold >15%
- **Fase 3:** 3 CTAs — CPA abaixo da meta
- **Kill 48h:** CPA >2x meta ou CTR <0.5% com 2K+ impressões

## Regra Lumiera — CTA

`scriptQuality.js` exige fechamento **declarativo**. CTAs tipo "comenta X para link" desta skill só se tiver stakes reais no tema — senão usar mic drop factual.

## Lumiera

| Área | Onde |
|------|------|
| Roteiro UGC | Creator → `ugc-scriptwriter` + `scriptQuality.js` |
| Ganchos | `viral-hooks`, `hook_candidates` no JSON de ideias |
| Metadados pós-orgânico | `publish-seo` bundle |
| Bundle | `shorts-viral` + esta skill |

## Conteúdo completo (upstream)

Seções detalhadas do framework original: recrutamento (Billo, Insense), ferramentas AI (Arcads, Creatify), Spark Ads, TikTok Shop, benchmarks CPM/CPA — consultar histórico upstream ou pedir expansão por seção.

## Ver também

- `../ugc-scriptwriter/SKILL.md` — tom falado PT-BR
- `../ad-concept-generator/SKILL.md` — conceito a partir do gancho
- `../viral-short-form/SKILL.md` — estrutura viral orgânica
- `../video-marketing/SKILL.md` — estratégia short vs long