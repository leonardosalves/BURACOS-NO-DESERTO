> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form|Viral Short Form]] · [[skills/viral-hooks|Viral Hooks]] · [[SKILLS]]

---
name: viral-short-form-ideas
description: |
  Ideação Short em volume — pilares, matriz de conteúdo, mineração e repurposing. Elimina página em branco no Creator.
  Use ao gerar ranking_ideas, brainstorm de nicho, "20 ideias", pilares ou re-ângulo de uma ideia vencedora.
  Triggers: ideias, brainstorm, sem ideias, content pillars, matriz de conteúdo, o que postar, mineração, repurposing.
license: MIT
metadata:
  lumiera: true
  source: vyralcontent/content-skills/viral-short-form-ideas
---

# Viral Short-Form Ideas (Lumiera)

Adaptado de [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills/tree/main/skills/viral-short-form-ideas) (MIT).

Sistema de ideação — não inspiração aleatória. Produz candidatos fortes em volume; não promete qual ideia viraliza.

Para ganchos: `viral-hooks`. Para legendas/CTA: `viral-captions-and-ctas`. Para roteiro: `viral-short-form` + `ugc-scriptwriter`.

## Princípios

1. **Ideação = processo** — entrada (nicho, comentários, outliers) → saída (lista ranqueada).
2. **Restrição gera ideias** — pilar, formato ou problema > "pensa num vídeo".
3. **Tópico ≠ ângulo** — um tópico tem centenas de ângulos; blank page = falta de ângulo.
4. **Teste barato, escala o vencedor** — tweet/linha antes de roteiro completo no Lumiera.
5. **Captura ≠ criação** — notas rápidas na semana; sessão profunda no Creator.
6. **Backlog sem status apodrece** — triagem, script ou descarte em 90 dias.
7. **Padrões, não previsão** — volume e consistência > adivinhação.

## Workflow

1. **Brief** (inferir se possível): nicho, plataforma, SHORTS ou LONGO, one-shot ou sistema.
2. **Pilares** — 3–5 → `references/pillars.md`
3. **Motor** — matriz (volume), repurposing (1→N), mineração (pesquisa) → `references/frameworks.md`
4. **Gerar** — saída agrupada por pilar/formato/ângulo
5. **Filtrar** → `references/idea-evaluation.md`
6. **Agendar** — top picks no Creator; resto no swipe file com expiry

## Modos

| Pedido | Ação |
|--------|------|
| "20 ideias" / "sem ideias" | Inferir pilares + matriz; retornar agrupado e ranqueado |
| "Sistema / pilares" | `assets/pillar-worksheet.md` + cadência semanal |
| "1 ideia → 5 ângulos" | `references/repurposing.md` |
| "O que postar esta semana" | 5–7 ideias: 1 trend + 4 evergreen |
| "Ideias da audiência" | `references/mining.md` + `assets/mining-checklist.md` |
| "Critica minha lista" | `references/idea-evaluation.md` — reescrever fracas |

## Entrega boa (exemplo)

Nicho "espresso em casa" → 3 pilares (equipamento, técnica, compra) × 7 estilos = ~20 ideias **específicas**:

- **Equipamento / contrarian:** "Seu moedor de R$4 mil é o que deixa o espresso sem corpo."
- **Técnica / how-to:** "O teste de 3 segundos na compactação que parou o channeling."

Agrupar, rotular, destacar 2 com melhor gancho potencial. Oferecer repurposing dos tops.

**Ruim:** lista de 20 títulos vagos sem pilar nem ângulo.

## Lumiera — Creator

O backend já injeta framework viral em ideias (`scriptQuality.js`):

| Campo | Uso |
|-------|-----|
| `ranking_ideas` | 10 ideias ranqueadas no wizard |
| `viral_category` | impactful \| practical \| provocative \| astonishing |
| `hook_angle` | id de `VIRAL_HOOK_TYPES` — variar entre ideias |
| `hook_candidates` | 3 ganchos ≤10 palavras (SHORTS) |
| `hooks` | gancho principal do roteiro |
| `wow_facts_preview` | 3–5 fatos verificáveis (SHORTS) |
| `why_it_works` | legibilidade para leigos (`buildIdeasQualityAddendum`) |

Funções-chave:

- `buildViralIdeasAddendum(format)` — categorias + hook angles
- `buildNicheIsolationAddendum(niche)` — não vazar outros nichos do usuário
- `buildNicheVarietyInstruction(niche)` — ângulos diversos dentro do nicho
- `normalizeListicleIdeasResponse()` — modo listicle / TOP N

Ao usar esta skill **fora** do Creator (chat manual), alinhar saída aos mesmos campos para colar no projeto.

## Checklist rápido

- [ ] Cada ideia tem ângulo distinto (não só sinônimo de título)?
- [ ] Gancho concebível em ≤10 palavras?
- [ ] Fatos verificáveis no nicho (sem clickbait falso)?
- [ ] Variou `viral_category` e `hook_angle`?
- [ ] Payoff cabe em 40s (Short) ou duração do formato?

## Referências

- `references/pillars.md`
- `references/frameworks.md` — matriz, GAP, APAG, funnel MrBeast, etc.
- `references/mining.md` — comentários, Reddit, autocomplete, outliers
- `references/repurposing.md` — árvore de conteúdo, test-cheap-then-scale
- `references/evergreen-vs-trend.md` — 80/20, janela 48h TikTok
- `references/idea-evaluation.md` — CCN, gut check, backup idea
- `references/anti-patterns.md` — copy sem re-ângulo, hook depois

## Assets

- `assets/pillar-worksheet.md`
- `assets/content-matrix.md`
- `assets/mining-checklist.md`
- `assets/repurposing-plan.md`
- `assets/idea-tracker.md`

## Ver também

- `../viral-short-form/SKILL.md` — workflow n8n + wow-facts
- `../viral-hooks/SKILL.md` — após escolher ideia, gerar 6–10 ganchos
- `../viral-short-form/references/hooks.md` — 10 arquétipos detalhados