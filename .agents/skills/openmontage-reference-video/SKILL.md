---
name: openmontage-reference-video
description: |
  Análise de vídeo de referência (URL) → brief 5 aspectos + 2–3 conceitos diferenciados.
  Padrão OpenMontage video-reference-analyst adaptado ao Lumiera.
  Use quando o usuário cola YouTube/Shorts/TikTok/Reels e quer "algo assim", "inspirado em", "nesse estilo".
  Triggers: referência, inspirado em, algo como, URL vídeo, analisar concorrente, estilo de vídeo.
license: MIT
metadata:
  lumiera: true
  source: calesthio/OpenMontage/skills/meta/video-reference-analyst.md (padrões, não código)
tasks: [ideas, script]
formats: [SHORT, LONG]
---

# OpenMontage Reference Video (Lumiera)

## Quando usar

- URL de referência com intenção **inspirar**, não editar footage
- Sinais: "algo como isso", "inspirado em", "nesse estilo", "vi esse vídeo e quero um parecido"

**Não usar** quando o usuário quer editar footage próprio → workflow Editor/Timeline.

## Fluxo Lumiera

1. Chamar `POST /api/workflow/analyze-reference` ou painel **Inspirado em vídeo** (Studio Agents)
2. Apresentar resumo conversacional (não dump JSON):
   - **Conteúdo** · **Estilo** · **Estrutura** · **Motion** · **5 aspectos**
   - **O que funciona** (gancho, pacing, transições)
3. Rodar preflight: `GET /api/workflow/capability-menu`
4. Mapear gaps (ex.: sem Pexels → stock bloqueado)
5. Propor 2–3 conceitos com **twist obrigatório** — nunca cópia carbono
6. Recomendar uma opção; usuário escolhe → `lumiera_requirement` no VideoAgent ou Creator

## 5 aspectos (obrigatório no brief)

Por shot ou grupo:

- **Subject** — tipo, atributos, transições entre shots
- **Subject Motion** — ações em ordem temporal
- **Scene** — overlays separados + POV + setting + dinâmica
- **Spatial Framing** — shot size, posição, profundidade
- **Camera** — velocidade, movimento, estabilidade, DoF

Marcar **N/A** explicitamente quando não aplicável.

## Motion profile

- `stock_broll` → Pexels/Pixabay + Ken Burns Remotion
- `motion_graphics` → HyperFrames + counters/lower-thirds
- `mixed` → ComfyUI LTX para hero + stock no resto

**slideshow_risk** alto → mais cortes, overlays, pattern interrupts (Shorts).

## Diferenciação (padrões)

| Padrão | Exemplo |
|--------|---------|
| Mesma estrutura, assunto diferente | Referência: buracos negros → Nosso: estrelas de nêutrons |
| Mesmo assunto, ângulo diferente | Referência: tutorial → Nosso: POV do engenheiro |
| Mesmo tom, visual diferente | Referência: stock VO → Nosso: motion graphics |
| Mesmo conteúdo, plataforma | Referência: 10min YouTube → Nosso: Short 60s |
| Contra-take | Referência: "IA vai substituir" → Nosso: "por que não vai substituir você" |

## Sample-first (recomendado)

Antes do vídeo completo, sugerir amostra 10–15s (gancho + 1 cena) no Lumiera — render parcial ou preview Creator.

## Skills Layer 3 a ler antes de gerar assets

- [[skills/viral-hooks]] — gancho
- [[skills/ugc-scriptwriter]] — narração
- [[skills/hyperframes]] ou [[skills/remotion-best-practices]] — composição
- [[skills/youtube-seo]] — metadados