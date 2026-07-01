> 🔗 [[MEMORIA-LUMIERA]] · [[skills/remotion_docs|Remotion Docs]] · [[skills/hyperframes|HyperFrames]] · [[SKILLS]]

---
name: remotion-render
description: |
  Render programático Remotion no Lumiera — LumieraTimeline, overlays React, spring/interpolate, Sequence.
  Use ao editar composições, debugar render local ou portar motion graphics para o pipeline PRO.
  Triggers: remotion, render vídeo, LumieraTimeline, programmatic video, motion graphics, react video, tsx composição.
license: MIT
metadata:
  lumiera: true
  source: inference-sh/skills (adaptado — render local Lumiera, não inference.sh)
  tasks: [overlay]
  formats: [SHORT, LONG]
---

# Remotion Render (Lumiera)

Referência upstream: [inference-sh/skills@remotion-render](https://github.com/inference-sh/skills). No Lumiera o render é **local** via `dashboard-qanat/remotion-renderer/` — não é obrigatório `belt` nem inference.sh.

Para catálogo de overlays e transições: `hyperframes`. Para APIs Remotion: `remotion_docs`.

## Pipeline Lumiera

| Etapa | Caminho |
|-------|---------|
| Composição principal | `remotion-renderer/src/LumieraTimeline.tsx` |
| Overlays React | `remotion-renderer/src/overlays/` |
| Render CLI | `npx remotion render` (via backend `server.js`) |
| Planejamento IA | `generateOverlaysWithAI()` — bundle `long-documentary` ou `studio-overlay-agent` |

## APIs Remotion (composições locais)

```tsx
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
  Audio,
  Video,
  Img,
} from "remotion";
```

Padrões comuns no Lumiera:

- **Fade-in texto**: `interpolate(frame, [0, 30], [0, 1])`
- **Spring pop**: `spring({ frame, fps, config: { damping: 10, stiffness: 100 } })`
- **Sequências**: `<Sequence from={30}>` para entradas escalonadas
- **Legendas**: `caption_style: "shorts-viral"` — chunks ≤8 palavras

## Render local (desenvolvimento)

```powershell
cd dashboard-qanat/remotion-renderer
npm install
npx remotion studio
# ou render:
npx remotion render src/index.ts LumieraTimeline out/video.mp4
```

O backend Lumiera orquestra render com assets do projeto em `OUTPUT/` e `ASSETS/`.

## Quando NÃO usar inference.sh

O upstream promove `belt app run infsh/remotion-render` para TSX→MP4 isolado. No Lumiera:

- Use o renderer integrado (timeline + overlays + narração + BGM)
- Use HyperFrames para HTML/CSS motion quando o overlay for HTML-based
- inference.sh só se precisar de protótipo **fora** do pipeline Lumiera

## Checklist overlay Remotion

- [ ] `start` referencia `scene_id`, não segundos absolutos (planejamento IA)
- [ ] Sem overlap com legendas (`AGENTS.md` regra 3)
- [ ] Infográficos (`counter`, `bar-chart`) > cards flutuantes no centro
- [ ] Catálogo HyperFrames para VFX/transições quando aplicável

## Lumiera

| Área | Onde |
|------|------|
| Timeline | `LumieraTimeline.tsx` |
| Overlays tipados | `remotion-renderer/src/overlays/*.tsx` |
| Listicle Lottie | `listicleLottieRules.json` |
| Pré-render QA | `preRenderAdvice.js`, `overlayTiming.js` |
| Studio Agents | bundle `long-documentary` inclui esta skill |

## Ver também

- `../remotion_docs/SKILL.md` — documentação oficial Remotion
- `../hyperframes/SKILL.md` — 134 recursos HeyGen→Remotion
- `../remotion-best-practices` (global) — padrões React/Remotion

## Referência upstream (opcional)

Para render TSX isolado via cloud (não integrado ao Lumiera):

```bash
# Opcional — não é o fluxo padrão do estúdio
belt app run infsh/remotion-render --input '{"code":"...", "duration_seconds":3, "fps":30}'
```