---
name: openmontage-reviewer
description: |
  Quality gates por estágio — padrão OpenMontage reviewer adaptado ao Lumiera.
  Critiques CHAI: accurate, complete, constructive. Use após roteiro, storyboard, overlays, pré-render.
  Triggers: reviewer, quality gate, revisar estágio, slideshow risk, pré-render, critique.
license: MIT
metadata:
  lumiera: true
  source: calesthio/OpenMontage/skills/meta/reviewer.md (padrões)
tasks: [script, overlay, metadata]
formats: [SHORT, LONG]
---

# OpenMontage Reviewer (Lumiera)

## Quando usar

Após cada estágio significativo — **antes** de avançar:

| Estágio Lumiera | Foco |
|-----------------|------|
| Ideias / referência | Diferenciação, não cópia carbono |
| Roteiro (Creator) | Timing, WPM, gancho, open loops |
| Storyboard / cenas | Cobertura, variedade visual, slideshow risk |
| Overlays (Studio Agents) | Orçamento formato, gancho poluído |
| Pré-render | `preRenderAdvice` + ffprobe mental |
| Metadados | SEO, thumbnail-first, sem engagement bait |

## Regras CHAI

1. **Accurate** — cite campo/linha/cena concreta
2. **Complete** — se achou um erro, busque da mesma classe
3. **Constructive** — critical **sempre** com `proposed_fix`

## Severidades

- **critical** — bloqueia (corrigir antes de render/publicar)
- **suggestion** — melhora qualidade significativa
- **nitpick** — polish opcional

Máximo **2 rodadas** de revise → depois pass with warnings.

## Slideshow risk (Lumiera)

Sinais no Short:

- Mesmo layout em >3 cenas seguidas
- Só text cards sem B-roll
- Cena >12s sem estímulo (ver `pattern_interrupt` em preRenderAdvice)
- Legendas >8 palavras em chunk (shorts-viral)

Ações: HyperFrames counter, cortar cena, buscar stock Workflow.

## Reference alignment

Se houve `analyze-reference`:

- Proposta deve honrar pacing/hook **declarados** no brief
- Twist criativo deve aparecer no título/roteiro — não cópia do referência
- Elementos que o usuário disse amar devem persistir

## Integração Lumiera

- UI: aba Render → Qualidade Pré-Render
- Backend: `preRenderAdvice.js`
- Skill: [[skills/viral-youtube-shorts]] para Shorts