> 🔗 [[MEMORIA-LUMIERA]] · [[skills/youtube-thumbnail|Thumbnail]] · [[skills/viral-youtube-shorts|Shorts]] · [[SKILLS]]

---
name: youtube-seo
description: |
  SEO YouTube — títulos pesquisáveis, descrições, tags, comentário fixo e metadados multi-plataforma.
  Use na aba IA·Metadados do Lumiera, upload e otimização pós-roteiro.
  Triggers: SEO, título YouTube, descrição, tags, metadados, CTR, RPM, discoverability.
license: MIT
metadata:
  lumiera: true
  sources: [kostja94/marketing-skills, lumiera/youtubeMetadataOptimizer]
---

# YouTube SEO (Lumiera)

Combina práticas de marketing ([kostja94/marketing-skills](https://github.com/kostja94/marketing-skills)) com o otimizador interno.

## Código Lumiera

- `dashboard-qanat/backend/youtubeMetadataOptimizer.js`
- `dashboard-qanat/backend/titleGenerator.js` — `buildTitleCraftRules()`
- `storyboard.strategy` — title_main, title_variations, pinned_comment
- `config.upload_metadata` — YouTube, Instagram, TikTok, Kwai

## Título (longo)

- Linha 1: palavra-chave + gancho específico (número, nome, paradoxo)
- 5 variações com ângulos **diferentes** (pergunta, número, lacuna, nome próprio)
- Evitar clickbait genérico; promessa = payoff do vídeo
- 60–70 caracteres ideal para mobile

## Título (Shorts)

- Primeiras palavras indexadas no feed Shorts
- Complementa o gancho do vídeo (não repete frase por frase)
- Hashtags mínimas (#Shorts só se relevante)

## Descrição

- **2 primeiras linhas** = gancho + palavra-chave (aparecem antes do "ver mais")
- Timestamps/capítulos se LONGO com blocos
- Fontes e links só se verificáveis
- CTA suave: próximo vídeo ou playlist — não spam

## Comentário fixo

- Pergunta com **stakes reais** ou dado extra — não "deixa o like"
- Listicle: "Qual item você colocaria em #1?"

## Tags / categorização

- 5–10 tags: tema principal + long-tail + nome próprio do assunto
- Alinhar com `highlight_keywords` do storyboard

## Multi-plataforma

| Plataforma | Campo Lumiera |
|------------|----------------|
| YouTube | upload_metadata.youtube |
| Instagram | upload_metadata.instagram (Reels) |
| TikTok | upload_metadata.tiktok |
| Kwai | upload_metadata.kwai |

## Workflow

1. Roteiro aprovado → Gerar Metadados (IA)
2. Revisar `title_variations` → escolher 1
3. Thumbnail (skill `youtube-thumbnail`)
4. Pré-render score ≥80 → render → upload

## RPM / nicho (Lumiera)

Documental história/tecnologia: títulos com **especificidade** (data, lugar, nome) performam melhor que adjetivos vazios. Ver skill `hyperframes` para RPM visual.