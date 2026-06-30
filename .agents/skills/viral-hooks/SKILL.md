> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form|Viral Short Form]] · [[SKILLS]]

---
name: viral-hooks
description: |
  Ganchos virais para Shorts — 3 camadas (visual, verbal, texto na tela), 6–10 opções por arquétipo.
  Use ao gerar hook_candidates no Creator, revisar bloco 1 do roteiro ou melhorar retenção nos primeiros 3s.
  Triggers: gancho, hook, abertura, primeiros 3 segundos, VVSA, retenção inicial.
license: MIT
metadata:
  lumiera: true
  source: vyralcontent/content-skills/viral-hooks
---

# Viral Hooks (Lumiera)

Adaptado de [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills/tree/main/skills/viral-hooks) (MIT).

## Regra de ouro

O gancho decide em **1,5–3s** se o resto existe. No Lumiera:

- Shorts: **gancho limpo até 1,5s** — sem overlay informativo (`hook_polluted`)
- Bloco 1 da narração = payoff anunciado em ≤10 palavras
- Cena 1 visual = mais forte do projeto (não logo/placeholder)

## Três camadas (obrigatório)

| Camada | O quê |
|--------|--------|
| Visual | Primeiro frame: ação, contraste, rosto, dado |
| Verbal | Primeira linha falada — concreta, ≤2s em voz alta |
| Texto | 3–7 palavras na tela (overlay kinetic-text ou legenda) |

## Entrega: 6–10 ganchos

Rotule cada um por arquétipo. Exemplos PT-BR:

- **Contrarian:** "Sua barragem favorita pode estar mentindo sobre a idade."
- **Choque:** "Em 1975, essa estrutura quase derrubou uma cidade inteira."
- **Custo:** "Gastei três meses pesquisando isso. Você leva em 40 segundos."
- **Número:** "Três falhas. Uma delas ainda está ativa."

## Anti-patterns (rejeitar)

- "Neste vídeo vamos…", logo, "hey pessoal"
- Marca no início antes do payoff
- Gancho que o corpo não paga
- Pergunta vazia ao espectador (regra UGC Lumiera)

## Checklist rápido

- [ ] Substantivo/número concreto?
- [ ] Payoff visível ou implícito em 3s?
- [ ] Funciona sem som (visual + texto)?
- [ ] Alinha com `narrative_script` bloco 1?

## Lumiera

- Creator ideias: campos `hooks`, `hook_candidates`, `hook_angle`
- `scriptQuality.js`: `VIRAL_HOOK_TYPES`
- Após gerar: validar com qualidade pré-render (`weak_hook_visual`)

## Ver também

- `../viral-short-form/references/hooks.md` — 10 arquétipos detalhados
- `../viral-short-form/assets/hook-checklist.md`