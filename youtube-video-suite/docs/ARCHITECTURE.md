# Arquitetura inicial

## Princípio central

Todo motor de geração e renderização deve consumir ou produzir o mesmo contrato:
`ProjectManifest -> SceneManifest -> RenderManifest`.

## Roteamento recomendado

- `vox-director`: explainer completo, beat map, direção visual e montagem.
- `vox-explainer-skill`: VO-first, style anchor e re-render parcial.
- `gbro-collage-broll`: inserts editoriais curtos, especialmente Shorts.
- `HyperFrames`: motion design HTML, gráficos, mapas, títulos, overlays e editor embutido.
- `Remotion`: master timeline React, versões multi-formato, composição final e export.
- `FFmpeg`: normalização, concatenação, loudness, thumbnails e QA técnico.

## Serviços

- `studio-web`: briefing, gates, timeline, presets, preview e QA.
- `api`: autenticação, projetos, assets, jobs, manifests e webhooks.
- `worker-python`: geração de keyframes, B-roll, análise visual e integração com skills.
- `hyperframes-renderer`: cenas HTML/CSS/GSAP.
- `remotion-renderer`: timeline final e variantes.
- PostgreSQL: estado transacional.
- Redis/BullMQ: filas e progresso.
- MinIO/S3: mídia e artefatos.
