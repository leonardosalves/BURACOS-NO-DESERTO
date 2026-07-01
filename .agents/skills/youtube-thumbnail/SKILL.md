> 🔗 [[MEMORIA-LUMIERA]] · [[skills/youtube-seo|YouTube SEO]] · [[SKILLS]]

---
name: youtube-thumbnail
description: |
  Thumbnails YouTube alto CTR — rosto 30–50%, 3–5 palavras, contraste, brief para Gemini/Canva.
  Use no Lumiera ao gerar variantes de capa, briefing Canva ou antes do roteiro (thumbnail-first).
  Triggers: thumbnail, capa, CTR, Canva, 1280x720, hook visual na capa.
license: MIT
metadata:
  lumiera: true
  source: charlie947/social-media-skills/youtube-thumbnail
---

# YouTube Thumbnail (Lumiera)

Adaptado de [charlie947/social-media-skills](https://github.com/charlie947/social-media-skills) (MIT).

## Workflow Lumiera

1. **Metadados** — aba IA: `strategy.title_main` e variações
2. **Canva** — botão "Abrir no Canva" no dashboard (16:9 longo / 9:16 Shorts)
3. **Variantes** — `upload_metadata.youtube.thumbnail_variant`
4. **Brief** — gerar texto curto para colar no Canva ou prompt de imagem

## Regras CTR

- Rosto ocupa **30–50%** do frame
- **3–5 palavras** grandes (máx. 6) — frase-gancho, não título completo
- **2 cores dominantes** — gold/cyan do Lumiera + acento (amarelo, vermelho)
- **Um elemento focal** além do rosto: número, seta, objeto do tema
- **Alto contraste** — legível em 320px (mobile)
- **Sem texto** canto inferior direito (ícone de duração YouTube)

## Formato

| Vídeo | Thumbnail |
|-------|-----------|
| LONGO 16:9 | 1280×720 |
| SHORTS | Stories 9:16 no Canva (capa Shorts separada se publicar) |

## Template de brief

```
THUMBNAIL: [título do vídeo]
Texto na capa: "[3-5 palavras]"
Composição: rosto [esquerda/direita], olhar [câmera/texto]
Tom: [choque/curioso/confiante]
Elemento: [número/mapa/objeto do nicho]
Cores: #D4AF37 + [acento] · fundo escuro cinematográfico
```

## Integração

- `App.tsx` — `openCanvaForThumbnail`, briefing copiado ao clipboard
- Nicho documental: tipografia forte (Cinzel/Impact), sem clutter

## Não fazer

- Parágrafo de texto na capa
- Clickbait que o vídeo não cumpre
- Logo pequeno no centro (fraco para CTR)