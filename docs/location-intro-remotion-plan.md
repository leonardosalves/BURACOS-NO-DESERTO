# Plano: location-intro Blender + Remotion

## Objetivo

Transformar mencoes de cidade, monumento, ponte, predio ou outro ponto geografico em uma cena Remotion automatica:

- cidade/regiao: zoom continuo do globo ate a cidade, mantendo a cidade inteira visivel e destacando a fronteira administrativa;
- POI/monumento/ponte/predio: zoom continuo do globo ate o ponto e orbit 360 no final;
- Remotion: usar o MP4 gerado pelo Blender como asset principal e combinar com templates de dados, graficos, contadores, timelines e lower-thirds por nicho.

## Estado atual

- `backend/satelliteMapService.js` detecta `city`, `poi` e `historic_site`, baixa imagens de satelite, busca boundary OSM e chama Blender quando disponivel.
- `backend/blenderMapService.js` cria o job JSON para `scripts/blender/location_intro_flyover.py`.
- `remotion-renderer/src/overlays/LocationIntro.tsx` ja consome `flyover_video` quando `map_provider=blender`.
- O editor de timing e o wizard ja chamam `/api/timeline-studio/auto-orchestrate-motion` ou `/api/ai/creator/orchestrate-production`.

## Correcao aplicada agora

- O Blender nao deve parecer uma troca de frames. A camera agora usa descida continua em escala logaritmica, com varios keyframes suaves.
- O inicio inclui curvatura de Terra para vender o movimento "globo -> local".
- Cidade termina mais alta para caber o contorno completo.
- POI termina mais baixo e faz orbit 360.
- A camera mira um alvo fixo com `TRACK_TO`, evitando drift ou cortes estranhos.

## Contrato de dados

`location-intro` deve receber:

```json
{
  "template_id": "location-intro",
  "media_mode": "remotion",
  "layout": "fullscreen",
  "props": {
    "location": "Palmanova",
    "region": "Veneto",
    "country": "Italia",
    "place_type": "city|poi|historic_site",
    "fly_mode": "earth_descent",
    "presentation": "fullscreen",
    "map_provider": "blender",
    "flyover_video": "ASSETS/satellite/<scene>-flyover.mp4",
    "boundaryGeoJson": "ASSETS/satellite/<scene>-boundary.json"
  }
}
```

## Fase 1: estabilizar Blender

- Render de teste para uma cidade: Bangkok ou Roma, validando contorno completo.
- Render de teste para POI: Ponte de Laufenburg ou Palmanova, validando orbit 360.
- Ajustar altura final por `place_type` e aspect ratio `16:9`/`9:16`.
- Validar logs e erro quando Blender nao estiver instalado.

## Fase 2: deteccao automatica no roteiro

- Reforcar `motionScenePlanner` para criar `location-intro` quando houver:
  - cidades, paises, regioes, capitais;
  - ponte, monumento, predio, torre, templo, forte, fortaleza, estadio, aeroporto, ruina;
  - frases de localizacao como "em", "na cidade de", "perto de", "as margens de".
- Manter visual prompts de imagem/video atuais; o mapa entra como motion scene complementar, nao substitui todo B-roll.
- Se a confianca geografica for baixa, criar `geo-map` ou deixar para revisao no editor.

## Fase 3: editor de timing

- Botao "Cenas Remotion" continua sendo o ponto de orquestracao.
- Inspector de `location-intro` deve mostrar tipo: cidade, POI ou sitio historico.
- Permitir trocar manualmente entre cidade/POI e regenerar asset.
- Mostrar status do MP4 Blender: pendente, gerando, pronto, erro.

## Fase 4: wizard/criador

- Ao gerar o roteiro, salvar `motion_scenes` junto com `visual_prompts`.
- Quando o wizard compilar Remotion, executar enriquecimento de assets antes do render final.
- Quando detectar mapas, nao pedir prompt de imagem para aquele trecho como unica opcao; oferecer: "B-roll/IA" + "Mapa Blender automatico".

## Fase 5: templates Remotion por nicho

- Usar `nicheDesignPack.js` como fonte de tokens.
- Expandir packs por formato:
  - `16:9`: lower-thirds mais discretos, graficos largos, mapas fullscreen cinematograficos.
  - `9:16`: textos curtos, graficos verticais, mapa fullscreen com label em area segura.
- Templates prioritarios:
  - `counter`: numeros isolados;
  - `bar-chart`/`pictogram-chart`: comparacoes;
  - `timeline`: datas;
  - `lower-third`: fatos e contexto;
  - `location-intro`: lugares.

## Fase 6: QA

- Testes unitarios para classificacao city/poi/historic_site.
- Render curto Blender com job minimo quando Blender existir.
- Render Remotion still/frame check para `LocationIntro` consumindo `flyover_video`.
- Garantir que fallback sem Blender nao finja ser zoom real: deve avisar e usar mapa estatico apenas como fallback.
