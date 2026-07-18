> 🔗 [[MEMORIA-LUMIERA]] · [[skills/gbro-collage-broll|gbro collage broll]] · [[SKILLS]]

---

name: gbro-collage-broll
description: |
B-roll editorial em paper-collage halftone (assemble-from-empty) a partir de linhas ~5s de narração.
Três gates: metáfora → still → vídeo Omni Flash. UI no dashboard: aba Collage B-roll.
Upstream: https://github.com/pyang5166/gbro-collage-broll
Triggers: collage b-roll, paper collage, halfone, gbro-collage, 纸拼贴, 半调拼贴, B-roll colagem.
metadata:
lumiera: true
source: https://github.com/pyang5166/gbro-collage-broll
tasks: [creator, production]
category: creator
---

# Gbro Collage B-roll (Lumiera)

**Upstream:** [pyang5166/gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll) (MIT)

**UI:** Dashboard → **Collage B-roll** (`CollageBrollLab.tsx`)  
**API:**

| Endpoint                            | Gate                              |
| ----------------------------------- | --------------------------------- |
| `POST /api/collage-broll/metaphors` | 1 — metáforas via LLM             |
| `POST /api/collage-broll/specs`     | 2 — visual-spec + imagegen prompt |
| `POST /api/collage-broll/omni-jobs` | 3 — jobs first/last frame         |
| `GET /api/collage-broll/meta`       | metadados / paleta                |

**Backend:** `dashboard-qanat/backend/collageBroll.js`

## Princípio

Não gastar API de vídeo com metáfora errada:

1. **Gate 1** — só metáfora (LLM, barato)
2. **Gate 2** — still + contact sheet (imagegen)
3. **Gate 3** — `gemini-omni-flash-preview` first/last frame

## Estética

- Color field plano + halftone P&B + cartolina colorida
- Assemble-from-empty (slide/snap), não fade/zoom
- Entrega: **9:16 · 5s · 720×1280 · 24fps · sem áudio**

## Modos

| Mode        | Uso                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editorial` | Metáforas abstratas (espelho, relógio, arquivo…) — padrão gbro                                                                                      |
| `geo`       | **Mapas e dados geográficos em colagem**: silhueta de país/cidade, rotas pontilhadas, pinos de papel, bússola, satélite halftone, pergaminho/oceano |

### Modo geo (mapas)

Body Gate 1:

```json
{
  "text": "No Reno, a fronteira…",
  "mode": "geo",
  "place": "Reno",
  "country": "Germânia romana",
  "era": "séc. I"
}
```

Campos extras por item: `place_name`, `region`, `country`, `map_type`, `era`.  
`map_type`: `territory_outline` · `route_map` · `city_block` · `nautical` · `political_border` · `satellite_cutout` · `expedition` · `river_basin`

**Não** imitar UI de Google Maps — só cartografia de papel.  
Complementa [[skills/geo-video-prompts]] (T2V satélite contínuo) com estética collage stop-motion.

## Fluxo no Lumiera

1. Abrir aba **Collage B-roll**
2. Escolher **Editorial** ou **Geo / Mapas**
3. Colar linhas de narração (~5s); no geo, opcional local/país/época
4. **Gerar metáforas** → aprovar cards
5. **Specs still** → copiar imagegen prompts
6. **Jobs vídeo** → exportar JSON / rodar `scripts/generate_video.py` do repo

## Agent

Se o usuário disser “collage b-roll: …” sem abrir a UI:

1. Extrair linhas
2. Chamar Gate 1 API ou seguir o protocolo do README upstream
3. Parar para confirmação humana entre gates

## Não usar quando

- Precisa de camadas editáveis / timeline HTML (HyperFrames)
- Precisa de ator real / UGC falando
- Só quer prompt de vídeo sem pipeline de aprovação

## Crédito

Skill e prompts derivados de [gbro-collage-broll](https://github.com/pyang5166/gbro-collage-broll) — adaptado ao dashboard e APIs Lumiera.
