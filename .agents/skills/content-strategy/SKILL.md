> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form-ideas|Ideias Short]] · [[skills/video-marketing|Video Marketing]] · [[SKILLS]]

---
name: content-strategy
description: |
  Estratégia de conteúdo YouTube — pilares, clusters, calendário editorial, searchable vs shareable.
  Use no Creator (ideias), planejamento de canal ou matriz de vídeos por nicho.
  Triggers: estratégia de conteúdo, pilares, topic clusters, calendário editorial, o que postar, roadmap de vídeos, content pillars.
license: MIT
metadata:
  lumiera: true
  source: coreyhaines31/marketingskills/content-strategy
  tasks: [ideas, script, metadata]
  formats: [SHORT, LONG]
---

# Content Strategy (Lumiera)

Adaptado de [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT).

Planeja **o que produzir** no canal — pilares, clusters e priorização. Para 10 ideias virais pontuais: `viral-short-form-ideas`. Para roteiro: `viral-short-form` + `ugc-scriptwriter`. Para SEO de upload: `youtube-seo`.

## Contexto Lumiera (coletar se faltar)

1. **Nicho** (`config.niche`) — ex.: engenharia, história
2. **Formato** — SHORT (funil/alcance) vs LONG (autoridade/RPM)
3. **Objetivo** — views, retenção, funil Short→Longo, série documental
4. **Estado** — vídeos anteriores no nicho, aprendizados em `.agents/memory/<nicho>.md`

## Searchable vs Shareable (vídeo)

| Tipo | YouTube | Quando priorizar |
|------|---------|------------------|
| **Searchable** | Título pesquisável, tutorial, "como", listas | Nichos com busca (engenharia, how-to) |
| **Shareable** | Gancho forte, wow-fact, polêmica | Shorts, história, mistério |
| **Ambos** | Longo com SEO + thumbnail CTR | Documentários com keyword no título |

No Lumiera: searchable → `youtube-seo` + títulos com termos do roteiro; shareable → `viral-hooks` + `viral-short-form`.

## Pilares de conteúdo (3–5 por canal)

Identifique pilares por:

1. **Produto/nicho** — dores que o público busca no YouTube
2. **Audiência** — o que o ICP assiste até o fim
3. **Busca** — autocomplete, competidores, NotebookLM research no Creator
4. **Formato** — cada pilar pode ter ramo SHORT (gancho) + LONG (deep dive)

### Estrutura cluster (funil Lumiera)

```
Pilar (ex: "Engenharia antiga")
├── SHORT — gancho + curiosidade (30–50s)
├── SHORT — listicle / ranking
└── LONG — documentário 10–20 min (mesmo tema, SEO)
```

**Regra funil:** Short viral aponta para Longo relacionado no comentário fixo (`viral-youtube-shorts`).

## Ideação por estágio do viewer

| Estágio | Modificadores de título | Formato Lumiera |
|---------|-------------------------|-----------------|
| Awareness | "o que é", "por que", "como funciona" | Short hook → Long explicativo |
| Consideration | "melhor", "top N", "vs", "mito" | Listicle (`content_mode: LISTICLE`) |
| Decision | "vale a pena", "prova", "número" | Long com dados + infográficos |
| Replay | "resumo", "3 fatos", "ninguém fala" | Shorts de repurposing |

## Fontes de ideias (Lumiera)

| Fonte | Como |
|-------|------|
| Creator + NotebookLM | `POST /api/ai/creator/ideas` |
| Mining Vyral | `viral-short-form-ideas/references/mining.md` |
| Memória do estúdio | `.agents/memory/<nicho>.md` promovidos |
| Competidores | pesquisa web no endpoint de ideias |
| Quality patterns | issues recorrentes → conteúdo que "corrige" a dor |

## Priorização (score rápido)

| Fator | Peso | Pergunta |
|-------|------|----------|
| Retenção potencial | 40% | Gancho + payoff claros? |
| Fit nicho | 30% | Alinha com memória promovida? |
| SEO/discoverability | 20% | Keyword no título factível? |
| Custo produção | 10% | Listicle vs documental pesado? |

## Output esperado

1. **3–5 pilares** com rationale
2. **10+ tópicos** priorizados (searchable/shareable/both)
3. **Mapa Short↔Long** — qual Short alimenta qual Long
4. **Calendário sugerido** — 2 Shorts + 1 Longo / semana (ajustável)

## Lumiera

| Área | Onde |
|------|------|
| Ideias 10x | Creator → bundle `shorts-viral` |
| Listicle | `content_mode: LISTICLE` no Creator |
| Metadados | `publish-seo` após render |
| Memória | Studio Agents → consolidar aprendizados |

## Referências (sob demanda)

- `references/headless-cms.md` — CMS (raro no fluxo vídeo; ignorar salvo pedido)

## Ver também

- `../viral-short-form-ideas/SKILL.md` — matriz, mining, repurposing
- `../video-marketing/SKILL.md` — short vs long, hooks por plataforma
- `../youtube-seo/SKILL.md` — títulos pesquisáveis
- `../viral-youtube-shorts/SKILL.md` — funil Short→Longo

## Referências

- [[skills/content-strategy/REFERENCES|Índice de references/assets]]
