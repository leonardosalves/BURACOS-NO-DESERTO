> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-youtube-shorts|YouTube Shorts]] · [[skills/youtube-seo|YouTube SEO]] · [[SKILLS]]

---
name: viral-captions-and-ctas
description: |
  Legendas, texto na tela, hashtags, CTAs e comentário fixo para Shorts — saves e envios sem engagement bait.
  Use na aba IA·Metadados, revisão de overlays/legendas shorts-viral, CTA do último bloco ou diagnóstico de copy fraca.
  Triggers: legenda, caption, CTA, call to action, hashtag, comentário fixo, texto na tela, engagement bait, pinned comment.
license: MIT
metadata:
  lumiera: true
  source: vyralcontent/content-skills/viral-captions-and-ctas
---

# Viral Captions & CTAs (Lumiera)

Adaptado de [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills/tree/main/skills/viral-captions-and-ctas) (MIT).

Camada de copy ao redor do vídeo: legendas queimadas, descrições multi-plataforma, hashtags, CTA narrado e comentário fixo. Não prevê viralidade — elimina padrões que suprimem alcance.

Para ganchos: `viral-hooks`. Para ideias: `viral-short-form-ideas`. Para roteiro completo: `viral-short-form`.

## Princípios (aplicar sempre)

1. **Caption = SEO** — YouTube indexa título + primeiras 125 chars da descrição; IG/TikTok indexam caption. Palavras > hashtag wall.
2. **85% assiste no mudo** — texto na tela carrega a história; legendas queimadas (`shorts-viral`), não só auto-caption.
3. **Save e envio > like e follow** — CTA alinhado à ação pesada do algoritmo, não "comenta aí".
4. **Engagement bait = taxa** — "comenta SIM", "marca um amigo", "like pra parte 2" penalizam alcance.
5. **Um pedido por vídeo** — não empilhar like + save + follow + DM.
6. **Nativo por plataforma** — reescrever caption para Shorts, Reels e TikTok (cutoffs diferentes).
7. **Honestidade** — padrões tendem a performar; nada garante resultado.

## Workflow

1. **Brief** (só o que falta): plataforma, formato, nicho, objetivo (busca / save / envio / funil longo).
2. **Ação primária** — uma por vídeo: tutorial/lista → save; recomendação → envio; opinião → comentário com posição; cliffhanger → vídeo longo.
3. **Caption** → `references/caption-craft.md` — primeira linha antes do cutoff; keyword cedo; corpo não repete o gancho na tela.
4. **Texto na tela** → `references/on-screen-text.md` — headline + corpo, safe zone 9:16.
5. **Hashtags** → `references/hashtag-reality.md` — 3–5 nicho; YouTube: #Shorts na descrição.
6. **CTA** → `references/ctas-that-work.md` + `assets/bait-check.md` — ~70% do vídeo ou antes do drop-off conhecido.
7. **Comentário fixo** → `references/pinned-comments.md` — objeção, link ou segundo gancho.

## Modos

| Pedido | Ação |
|--------|------|
| "Escreve a legenda/caption" | Caption + 3–5 hashtags + comentário fixo sugerido |
| "Corrige meu CTA" | Diagnóstico bait + 2–3 versões (save / envio / funil) |
| "Quantas hashtags?" | `references/hashtag-reality.md` por plataforma |
| "Comentário fixo" | Objeção-killer ou segundo gancho |
| "É engagement bait?" | `assets/bait-check.md` — reescrever mantendo intenção |
| "Texto na tela" | `assets/on-screen-text-spec.md` |
| "Adapta pra outra plataforma" | Novo cutoff + vocabulário SEO |

## Regra Lumiera — CTA no roteiro

`scriptQuality.js` prioriza fechamento **declarativo** (mic drop factual):

- **Preferido:** consequência, ironia factual ou número final
- **Permitido:** pergunta com stakes reais ligadas ao tema
- **Proibido:** "Você prefere…?", "Comenta aí", "O que achou?", perguntas binárias vazias

Sobrescreve CTAs genéricos desta skill quando houver conflito.

## Lumiera

| Área | Onde |
|------|------|
| Legendas render | `caption_style: "shorts-viral"` — chunks ≤8 palavras (`formatResolver.js`, `LumieraTimeline.tsx`) |
| Overlays gancho | kinetic-text no bloco 1 — não poluir gancho (`preRenderAdvice.js`) |
| Metadados | `youtubeMetadataOptimizer.js`, aba **IA·Metadados** |
| Comentário fixo | `storyboard.strategy.pinned_comment` → `postUploadService.js` |
| Multi-plataforma | `config.upload_metadata` (YouTube, Instagram, TikTok, Kwai) |
| Qualidade roteiro | `scriptQuality.js` — regra FINAL CTA |

## Checklist rápido

- [ ] Primeira linha da descrição/caption funciona sozinha?
- [ ] Legenda na tela ≤8 palavras por chunk (Shorts)?
- [ ] CTA narrado passa `bait-check` e regra Lumiera?
- [ ] Comentário fixo agrega (não repete descrição)?
- [ ] Hashtags 3–5, nicho, sem #fyp filler?

## Referências (carregar sob demanda)

- `references/caption-craft.md` — cutoffs, primeira linha, SEO
- `references/on-screen-text.md` — burned-in, safe zone, karaoke
- `references/hashtag-reality.md` — IG/TikTok/YouTube
- `references/ctas-that-work.md` — save / send / cliffhanger
- `references/pinned-comments.md` — pin por plataforma
- `references/anti-patterns.md` — bait, keyword stuffing, multi-CTA

## Assets

- `assets/caption-template.md`
- `assets/on-screen-text-spec.md`
- `assets/cta-picker.md`
- `assets/bait-check.md`
- `assets/pinned-comment-template.md`

## Ver também

- `../youtube-seo/SKILL.md` — títulos, descrição, tags
- `../viral-hooks/SKILL.md` — gancho verbal ≠ caption
- `../ugc-scriptwriter/SKILL.md` — tom da narração final