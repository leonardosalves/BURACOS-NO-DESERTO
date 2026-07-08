> 🔗 [[MEMORIA-LUMIERA]] · [[skills/geo-video-prompts|geo video prompts]] · [[SKILLS]]

---

name: geo-video-prompts
description: |
Vídeos geográficos via prompts T2V (substitui Blender/Cesium). Zoom contínuo Terra→região→país→local,
destaque territorial, órbita 360° em POIs, clima e época histórica da narração.
Triggers: geo video, mapa IA, location-intro prompt, zoom terra, voo satélite IA, prompt geográfico.
metadata:
lumiera: true
source: custom
tasks: [creator, production]
category: creator
---

# Lumiera Geo Video Prompts (IA T2V)

**Substitui:** Blender headless + Cesium 3D + download de tiles Mapbox/Esri.

**Motor:** `dashboard-qanat/shared/geoVideoPromptEngine.js`  
**Serviço:** `dashboard-qanat/backend/geoVideoPromptService.js`

## Escopo global

Funciona em **qualquer projeto** (história, engenharia, natureza, true crime, etc.).
O local vem **sempre** da narração e dos campos `location` / `region` / `country` da cena —
nunca de cidade fixa no código.

## Quando criar cena geo (não é obrigatório)

Só planeja `location-intro` / `geo-map` quando o trecho do roteiro cita **explicitamente**:

- País, estado, região, cidade, bairro, distrito
- POI: ponte, prédio, barragem, fortaleza, monumento, etc. **com nome ou âncora** (`em Roma`, `ponte de X`)

**Não** dispara por palavras soltas (`mapa`, `google maps`, `cidade` genérica, `fortaleza` sem lugar).

**Teto (máximo, não mínimo):**

| Formato    | Máx. cenas geo |
| ---------- | -------------- |
| Short 9:16 | 1              |
| Longo 16:9 | 3              |

Módulo: `shared/geoSceneEligibility.js`

## Quando usar

- Cenas `location-intro` ou `geo-map` no planejamento Remotion
- Narração menciona cidade, país, ponte, fortaleza, região histórica
- Usuário quer gerar vídeo no Seedance, LTX/Comfy ou outro T2V — não render local

## Fluxo automático

1. Orquestrar templates (`POST /api/ai/creator/orchestrate-production` com `fetch_satellite: true`)
2. Backend geocodifica o local e monta `ai_video_prompt` rico em `motion_scenes[].props`
3. Copiar prompt no Timeline Studio inspector ou Editor → Templates Remotion
4. Gerar vídeo na ferramenta T2V e colocar MP4 em `ASSETS/` da cena

## O que o prompt inclui

| Elemento            | Comportamento                                                      |
| ------------------- | ------------------------------------------------------------------ |
| Zoom Terra          | Espaço → continente → região → país → cidade → POI, **sem cortes** |
| Território          | Contorno luminoso + fill no país/cidade/bairro inteiro             |
| POI (ponte, prédio) | Mesmo zoom + **órbita 360°** ao chegar no objeto                   |
| Histórico           | Época inferida da narração; ruínas se estrutura não existe         |
| Clima               | Chuva, neblina, neve, seca, entardecer — da narração               |

## API

- `POST /api/ai/creator/motion-scenes/satellite` — enriquece motion scenes (agora gera prompts, não tiles)
- Campo salvo: `props.ai_video_prompt`, `map_provider: "ai_t2v"`

## Ordem recomendada no Creator

1. Roteiro com local explícito na narração
2. Planejar templates Remotion
3. Revisar/copiar `ai_video_prompt`
4. Seedance Directing ou Engenharia Visual PRO (cenas B-roll)
5. Gerar vídeo geo na IA externa
