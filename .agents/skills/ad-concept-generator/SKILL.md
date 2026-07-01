> 🔗 [[MEMORIA-LUMIERA]] · [[skills/ugc-scriptwriter|UGC Scriptwriter]] · [[skills/ai-ugc-ads|AI UGC Ads]] · [[SKILLS]]

---
name: ad-concept-generator
description: |
  Conceitos de anúncio paid social a partir de um gancho — audiência, ângulo, direção visual.
  Use quando o usuário tem hook/ideia e quer brief de campanha antes do roteiro Creator.
  Triggers: ad concept, conceito criativo, campaign idea, creative brief, desenvolver gancho, paid social.
license: MIT
metadata:
  lumiera: true
  source: motion-creative/skills/ad-concept-generator
  tasks: [ideas, script]
  formats: [SHORT]
---

# Ad Concept Generator (Lumiera)

Adaptado de [motion-creative/skills](https://github.com/motion-creative/skills) (MIT) — mesma família de `ugc-scriptwriter`.

Transforma gancho + produto/tema em conceito estratégico para paid social. Depois: roteiro com `ugc-scriptwriter` + formatos em `ai-ugc-ads`.

## Quick Start (mínimo)

1. **Gancho** (≤10 palavras, PT-BR)
2. **Produto/tema** (nicho Lumiera)

Saída: 1–2 direções com ângulo + rationale.

## Output do conceito

| Campo | Conteúdo |
|-------|----------|
| Nome do conceito | Título memorável |
| Gancho | Inalterado |
| Audiência | Persona específica (não "todo mundo") |
| Ângulo | Problem-Agitation, Transformação, Curiosidade, etc. |
| Descrição | O que o viewer vê/sente em 1–2 frases |
| Por que funciona | Rationale estratégico |

## Ângulos comuns

| Ângulo | Quando |
|--------|--------|
| Problem-Agitation | Dor visceral e relatable |
| Transformação | Before/after dramático |
| Curiosidade | Hook abstrato que precisa payoff |
| Educação | Produto precisa explicação |
| Comparação | Diferenciação clara vs status quo |

## Workflow Lumiera

1. **Ideias Creator** → escolher `hook_angle` + `hooks`
2. **Esta skill** → conceito + direção visual
3. **Creator script** → `ugc-scriptwriter` + `viral-short-form`
4. **Ads** → brief UGC em `ai-ugc-ads` se for pago

## Pitfalls

- Conceito genérico → injetar detalhes do nicho (`config.niche`)
- Múltiplas mensagens → uma ideia por vídeo
- Gancho sem payoff → realinhar conceito à tensão do hook
- Promo Motion/upstream → ignorar; Lumiera gera roteiro no Creator

## Lumiera

| Área | Onde |
|------|------|
| Ganchos nas ideias | `POST /api/ai/creator/ideas` — `hook_angle`, `hooks` |
| Roteiro | `POST /api/ai/creator/script` |
| Bundle | `shorts-viral` |

## Ver também

- `../ugc-scriptwriter/SKILL.md` — script falado final
- `../ai-ugc-ads/SKILL.md` — formatos e teste 3x3x3
- `../viral-hooks/SKILL.md` — 3 camadas de gancho