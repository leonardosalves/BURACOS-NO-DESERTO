# Motion Director + video-shotcraft

Biblioteca oficial de motion design (106 shot cards) integrada ao pipeline Lumiera.

## Clone do vendor (uma vez)

```powershell
cd dashboard-qanat
git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft.git vendor/video-shotcraft
```

Alias webpack: `@shotcraft` → `vendor/video-shotcraft/demos`.

## Fluxo

1. Criadores geram `visual_prompts` → `finalizeGeneratedVisualPromptMedia` preenche `scene_function` + `extracted_data`.
2. **Engenharia Visual PRO** ou **orquestração de produção** chama `ensureShotcraftOnStoryboard` → `motion_shot` por cena.
3. Wizard: botão **🎬 Motion Plan** → `POST /api/motion/plan` com `apply: true`.
4. Render: `prepareRemotionRender` passa `motion_shot` → `ShotcraftLayer` no `LumieraTimeline`.

## API

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/motion/plan` | Body: `{ project?, storyboard?, niche, format, apply? }` |
| GET | `/api/motion/catalog` | Lista 106 cards |
| GET | `/api/motion/catalog/:category` | Filtra por categoria |
| GET | `/api/motion/card/:templateId` | Card + propsSchema |
| POST | `/api/motion/detect` | Detecta functions + dados de uma narração |
| GET | `/api/motion/niches` | Presets de nicho |
| GET | `/api/motion/niche/:niche` | Palette + preferidos |

## Arquivos-chave

- `shotcraftCatalog.js` — catálogo
- `nicheMotionPreferences.js` — multi-nicho
- `shotcraftPropsMap.js` — props dos 20 cards principais
- `motionDirector.js` — cérebro
- `motionRoutes.js` — HTTP
- `remotion-renderer/src/overlays/ShotcraftLayer.tsx` — render data-driven

## Testes

```powershell
cd dashboard-qanat/backend
node --test motionDirector.test.js
```
