> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form|Viral Short Form]] · [[skills/youtube-seo|YouTube SEO]] · [[SKILLS]]

---
name: viral-youtube-shorts
description: |
  YouTube Shorts: VVSA, curva de retenção, loop, funil Short→Longo, anti-patterns (marca d'água, 16:9).
  Use para projetos format=SHORTS no Lumiera, metadados Shorts e diagnóstico pós-upload.
  Triggers: YouTube Shorts, VVSA, shorts feed, funil longo, 9:16, retenção Shorts.
license: MIT
metadata:
  lumiera: true
  source: vyralcontent/content-skills/viral-youtube-shorts
---

# Viral YouTube Shorts (Lumiera)

Adaptado de [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills/tree/main/skills/viral-youtube-shorts) (MIT).

## Lumiera ↔ YouTube

| Lumiera | YouTube Shorts |
|---------|----------------|
| `format: SHORTS` | Feed Shorts (9:16) |
| Gancho limpo 1.5s | VVSA — primeiros 3s |
| 5 blocos / ~45s | Sweet spot 30–45s |
| `caption_style: shorts-viral` | ≤8 palavras/chunk |
| Listicle Top 3/5 | HUD rank-progress |

## Princípios

1. **Feed Shorts ≠ recomendação longa** — cada Short é julgado sozinho.
2. **VVSA** — meta prática: >70% viewed vs swiped away; abertura decide.
3. **Loop** — último beat conecta ao primeiro (re-watch >100%).
4. **CTA Short→Longo** — "versão completa no canal" + comentário fixo com link (não só "inscreva-se").
5. **Engaged Views** — métrica real de monetização, não view bruta.

## Estrutura roteiro (30–45s)

```
Frame 1: hook visual + verbal (sem intro)
5–8s: escalation / virada
Meio: wow-facts
Final: payoff + opcional ponte long-form
Loop: última frase ecoa gancho
```

## Anti-patterns

- Marca d'água TikTok
- 16:9 com barras (classificado como longo)
- Legendas fora da safe zone (topo ~20%, base ~25%)
- "Inscreva-se!" antes do valor
- Intro "bem-vindo de volta"
- Música licenciada quando RPM importa (metade do slice para parceiros)

## Diagnóstico "Short flopou"

Perguntar: VVSA? Queda nos 3s? % viewed >100% (loop)? Existe long-form para linkar?

## Lumiera

- `formatResolver.js` — SHORT vs LONG
- `preRenderAdvice.js` — checklist Shorts
- `youtubeMetadataOptimizer.js` — título/descrição Shorts
- Upload: metadados por plataforma em `upload_metadata`

## Modos

- **Escrever Short** → combinar com `viral-short-form` + `ugc-scriptwriter`
- **Funil** → planejar long-form que recebe o Short viral
- **Critique** → comparar bloco 1 com `weak_hook_visual` e `hook_polluted`