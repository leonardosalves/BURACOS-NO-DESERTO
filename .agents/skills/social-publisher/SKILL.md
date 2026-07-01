> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-captions-and-ctas|Captions & CTAs]] · [[skills/youtube-seo|YouTube SEO]] · [[SKILLS]]

---
name: social-publisher
description: |
  Publicação multi-plataforma — adaptar caption/título por rede (YouTube, TikTok, Instagram, Kwai) a partir do mesmo vídeo.
  Use na aba Upload após metadados IA ou ao preparar `upload_metadata` cross-post.
  Triggers: publicar, multi-plataforma, cross-post, TikTok caption, Instagram Reels, agendar post, distribuição social.
license: MIT
metadata:
  lumiera: true
  source: claude-office-skills/skills/social-publisher
  tasks: [metadata, upload]
  formats: [SHORT, LONG]
---

# Social Publisher (Lumiera)

Adaptado de [claude-office-skills/skills](https://github.com/claude-office-skills/skills) (MIT). No Lumiera **não** depende de MCP social-media nem n8n — o fluxo nativo usa `config.upload_metadata` + metadados gerados na aba **IA·Metadados**.

Para SEO YouTube profundo: `youtube-seo`. Para legendas/CTAs nativos: `viral-captions-and-ctas`.

## Plataformas Lumiera

| Plataforma | Campo em `upload_metadata` | Notas |
|------------|---------------------------|-------|
| YouTube | `youtube` | Título, descrição, tags, comentário fixo |
| Instagram | `instagram` | Reels — caption curta, hashtags no corpo |
| TikTok | `tiktok` | Casual, 3–5 hashtags, sem watermark de outra rede |
| Kwai | `kwai` | Adaptar tom regional |

## Workflow Lumiera

1. Gerar metadados base em **IA·Metadados** (`youtubeMetadataOptimizer.js`)
2. Derivar variantes por plataforma (cutoffs e tom diferentes)
3. Salvar em `config.upload_metadata` via dashboard (`App.tsx` → publish prep)
4. Pós-upload YouTube: `postUploadService.js` (comentário fixo, teste de título)

## Adaptação de caption por plataforma

| Rede | Estilo | Primeira linha | Hashtags |
|------|--------|----------------|----------|
| TikTok | Casual, trending | ≤100 chars visíveis | 3–5 nicho |
| Instagram Reels | Story + save CTA | Hook antes do "mais" | 5–10 nicho |
| YouTube Shorts | SEO + keyword | Título 60 chars | #Shorts na descrição |
| Kwai | Direto, regional | Igual Shorts adaptado | 3–5 |

**Regra:** reescrever por plataforma — não colar a mesma descrição do YouTube no TikTok.

## Anti-patterns

- Engagement bait ("comenta SIM", "marca um amigo") — ver `viral-captions-and-ctas`
- Watermark TikTok em Reels (penaliza alcance)
- Hashtag wall (#fyp filler sem nicho)
- LinkedIn/Twitter: Lumiera foca YouTube+Shorts; use só se o usuário pedir expansão

## Lumiera

| Área | Onde |
|------|------|
| Metadados IA | `youtubeMetadataOptimizer.js`, `workflowRoutes.js` |
| Upload prep | `workflowTools.js` → `runPublishPrep` |
| UI Upload | `App.tsx` — `upload_metadata` multi-plataforma |
| Pós-upload | `postUploadService.js` — pin + title A/B |
| Skill bundle | `publish-seo` (com `youtube-seo`, `viral-captions-and-ctas`) |

## Ver também

- `../youtube-seo/SKILL.md` — títulos pesquisáveis YouTube
- `../viral-captions-and-ctas/SKILL.md` — cutoffs, CTA, comentário fixo
- `../social-publisher` upstream — referência n8n/Airtable se automação externa for necessária