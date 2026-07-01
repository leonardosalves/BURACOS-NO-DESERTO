> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form|Viral Short Form]] · [[skills/youtube-seo|YouTube SEO]] · [[SKILLS]]

---
name: video-marketing
description: |
  Estratégia e roteiro de vídeo marketing — short-form e long-form, ganchos, estrutura PAS/AIDA, UGC.
  Use no Creator (ideias/roteiro), planejamento de campanha ou revisão de script antes do render.
  Triggers: video marketing, estratégia de vídeo, roteiro TikTok, Reels, YouTube script, gancho de vídeo, funil short→longo.
license: MIT
metadata:
  lumiera: true
  source: kostja94/marketing-skills
  tasks: [ideas, script, metadata]
  formats: [SHORT, LONG]
---

# Video Marketing (Lumiera)

Adaptado de [kostja94/marketing-skills](https://github.com/kostja94/marketing-skills) (MIT), via [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills).

Guia de estratégia e estrutura de roteiro para short-form e long-form. Complementa (não substitui) `viral-short-form`, `ugc-scriptwriter` e `youtube-seo`.

## Quando usar

| Pedido | Skill preferida |
|--------|-----------------|
| 10 ideias virais Creator | `viral-short-form-ideas` + esta skill (ângulos de campanha) |
| Roteiro Short completo | `viral-short-form` + `ugc-scriptwriter` |
| Metadados / SEO upload | `youtube-seo` |
| Estratégia de funil ou mix short+longo | **esta skill** |

## Avaliação inicial

1. **Formato**: Short (15–60s) vs Longo (3–15+ min)
2. **Objetivo**: awareness, consideração, conversão, educação
3. **Plataforma**: TikTok, Reels, YouTube Shorts, YouTube longo

## Short vs Long

| Formato | Duração | Uso | Plataformas |
|---------|---------|-----|-------------|
| Short-form | 15–60s | Ganchos, tips, UGC | TikTok, Reels, Shorts |
| Long-form | 3–15+ min | Deep dive, tutoriais | YouTube |

**Sweet spot short**: 31–60s para maior completion.

## Primeiros 3 segundos

71% decidem em 3s. Tipos de gancho:

| Tipo | Exemplo |
|------|---------|
| Story-driven | "Três meses atrás eu tinha zero inscritos..." |
| Contrarian | "Todo mundo diz X. Eis por que estão errados." |
| Question | "Por que 90% falham nisso?" |
| Result-focused | "De 0 a 10K em 30 dias. Foi assim." |

Para ganchos em 3 camadas (visual + verbal + tela): use `viral-hooks`.

## Estrutura Short

**Hook (0–3s)** → **Problema (3–15s)** → **Solução (15–45s)** → **CTA (5s final)**

Frameworks: Hook-Value-CTA, AIDA, PAS, BAB. CTA declarativo — ver regra Lumiera em `viral-captions-and-ctas`.

## Hooks por plataforma

| Plataforma | Hook | Notas |
|------------|------|-------|
| TikTok | ~2s | Alta energia; caption longa para SEO |
| Reels | ~3s | Estética polida; evita watermark TikTok |
| YouTube Shorts | 3–5s | Título pesquisável; descrição com keyword |

## UGC

- Autenticidade > polish (50%+ do engajamento em UGC-style)
- Tom falado: `ugc-scriptwriter` — PT-BR natural, sem robô

## Estrutura Longo

- **Hook** (0–30s): promessa
- **Intro** (30–60s): contexto
- **Corpo**: seções com transições claras
- **CTA** + **Outro**: recap

## Output esperado

- Recomendação de formato
- 2–3 variantes de hook
- Roteiro (com timestamps se longo)
- Placement de CTA
- Notas por plataforma

## Lumiera

| Área | Onde |
|------|------|
| Ideias Creator | `POST /api/ai/creator/ideas` — bundle `shorts-viral` |
| Roteiro Creator | `POST /api/ai/creator/script`, `scriptQuality.js` |
| Metadados | `youtubeMetadataOptimizer.js`, aba **IA·Metadados** |
| Funil Short→Longo | `viral-youtube-shorts` — link no comentário fixo |
| Qualidade CTA | `scriptQuality.js` — fechamento declarativo |

## Ver também

- `../viral-short-form/SKILL.md` — framework viral Vyral
- `../viral-short-form-ideas/SKILL.md` — volume de ideias
- `../youtube-seo/SKILL.md` — títulos, tags, descrição
- `../viral-captions-and-ctas/SKILL.md` — legendas e CTAs multi-plataforma