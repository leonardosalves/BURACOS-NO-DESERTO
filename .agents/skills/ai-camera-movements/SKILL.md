> 🔗 [[MEMORIA-LUMIERA]] · [[skills/ai-camera-movements|ai camera movements]] · [[SKILLS]]

---

name: ai-camera-movements
description: |
Biblioteca de movimentos de câmera para prompts de vídeo IA (T2V / Seedance / LTX / Engenharia Visual).
Referência canônica: https://aicameramovements.com/ — 46 moves em 7 categorias, 1 prompt cada.
Use ao escrever camera_intent, visual_prompt de cenas vídeo, directing_brief, ou prompts Seedance/LTX.
Triggers: camera movement, movimento de câmera, dolly, orbit, pan, tilt, drone, tracking, whip pan,
camera prompt, aicameramovements, shot language, framing, push-in, crane, handheld.
metadata:
lumiera: true
source: custom
tasks: [creator, production]
category: creator
reference_url: https://aicameramovements.com/
---

# AI Camera Movements (Lumiera)

**Fonte de referência (canônica):** [aicameramovements.com](https://aicameramovements.com/)

Catálogo curado de **46 movimentos de câmera** com previews e **um prompt-base cada**. No Lumiera, esta skill é a **biblioteca oficial** para linguagem de câmera em:

- `directing_brief.camera_intent` ([[skills/lumiera-seedance-directing]])
- `visual_prompts[].prompt` de cenas **vídeo** ([[skills/visual-prompt-engineer]])
- Prompts T2V Seedance / LTX / Comfy
- `ai_video_prompt` geo / motion ([[skills/geo-video-prompts]])

> **Still / IMAGE:** não use estes moves no prompt de imagem estática — a Engenharia Visual PRO proíbe dolly/orbit/tracking em stills. Use só em cenas `video` / T2V.

---

## Quando usar

| Situação                                       | Ação                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Escrever `camera_intent` no Seedance Directing | Escolher 1 move do catálogo + intenção narrativa                 |
| Engenharia Visual PRO em cena **vídeo**        | Injetar o bloco **Movement / Speed / Framing / End** no prompt   |
| Prompt T2V genérico “cinematic camera”         | Substituir por move nomeado + texto do catálogo                  |
| Variar ritmo entre cenas                       | Alternar categorias (ex.: Static → Dolly in → Orbit → Static)    |
| Geo / drone                                    | Preferir **Drone/Crane** + **Specials** (earth zoom, helicopter) |

---

## Como compor o prompt (fórmula do site)

Cada move do site segue a mesma estrutura. **Copie e adapte** ao sujeito da narração:

```
[nome do move]. Movement: [o que a câmera faz]. Speed: [ritmo]. Framing: [composição durante o move]. End: [enquadramento final estável].
```

**No Lumiera**, anexe **antes** o sujeito da cena e **depois** o DNA visual:

```
[SUBJECT + PLACE + ERA from narration].
[camera move block from catalog].
Lighting: […]. Style: [visual_identity]. Clean media: no on-screen text, no logos.
```

### Exemplo (documentário PT → prompt EN)

Narração: _“A cúpula da basílica ainda esconde o segredo da construção.”_

```
Wide exterior of St. Peter's dome at late afternoon, documentary realism.
dolly in. Movement: move the camera physically forward in a straight line toward the main subject.
Speed: smooth controlled push. Framing: keep camera height, lens direction and subject position
consistent while distance closes. End: finish in a tighter composition on the dome ribs and stone texture.
Soft golden-hour side light, clean media, no text overlays.
```

---

## Categorias (7) — mapa rápido

| Categoria          | #   | Uso narrativo típico                                                 |
| ------------------ | --- | -------------------------------------------------------------------- |
| **Pan/Tilt**       | 7   | Revelar espaço, ler arquitetura, virada de ideia (whip)              |
| **Zoom/Lens**      | 6   | Ênfase sem deslocar corpo da câmera; punch (crash)                   |
| **Dolly/Track**    | 9   | Aproximação física, acompanhamento, perseguição                      |
| **Physical Moves** | 11  | Lateral, pedestal, arc, orbit, pass-by                               |
| **Human Camera**   | 2   | Documentário íntimo, POV corporal                                    |
| **Drone/Crane**    | 5   | Escala, estabelecer local, epílogo aéreo                             |
| **Specials**       | 6   | FPV, tilt-shift, infinite zoom, earth zoom, time-lapse, pass-through |

Catálogo completo (IDs + prompts): [[skills/ai-camera-movements/references/catalog|catalog]]

---

## Escolha por intenção narrativa (atalho)

| Intenção (`narrative_job` / beat) | Moves preferidos                                              |
| --------------------------------- | ------------------------------------------------------------- |
| **Estabelecer local**             | Static, Crane up, Drone pull back, Helicopter, Earth zoom out |
| **Revelação / punch**             | Dolly in, Slow/Fast zoom in, Crash zoom in, Push past         |
| **Investigar / explorar**         | Tracking, Side tracking, Orbit, Arc, Slider                   |
| **Tensão / virada**               | Whip pan, Chase, Handheld, Crash zoom                         |
| **Ícone / objeto sagrado**        | Orbit clockwise/ccw, Arc, Slow zoom in                        |
| **Acompanhar personagem**         | Follow/OTS, Reverse tracking, Side tracking, Low tracking     |
| **Escala / geo**                  | Drone push/pull, Crane, Earth zoom out, Helicopter            |
| **POV / imersão**                 | First-person view, Body-mounted / Snorricam, Handheld         |
| **Passagem de tempo**             | Time-lapse (static), Slow zoom out                            |

**Regra:** 1 move dominante por cena de vídeo curta (≤10s). Evite empilhar “dolly + orbit + whip” no mesmo prompt.

---

## Integração no pipeline Lumiera

### Ordem recomendada (Creator)

1. Roteiro + `visual_prompts` base
2. **Seedance Directing** — preencher `camera_intent` com **nome do move** desta skill
3. **Engenharia Visual PRO** — expandir para inglês no `prompt` (só se `type`/broll for vídeo)
4. T2V (LTX / Seedance / externo) com o bloco Movement/Speed/Framing/End

### Campos

| Campo                             | O que colocar                                           |
| --------------------------------- | ------------------------------------------------------- |
| `directing_brief.camera_intent`   | Nome curto + ritmo: `"dolly in, smooth, reveal detail"` |
| `seedance_refs.camera`            | Opcional: `@Video_cam — orbit clockwise reference`      |
| `visual_prompts[].prompt` (vídeo) | Prompt completo com bloco do catálogo                   |
| `editor_notes`                    | ID do shot: `Shot 08 Dolly in` (rastreio)               |

### Proibido em stills

Não copiar moves para prompts de **imagem**. Ver limpeza em `visualPromptPipeline.js` / `visualPromptEngineer.js`.

---

## Como o agente deve trabalhar

1. Ler a narração da cena e o `narrative_job` (prove / reveal / contrast / explain / feel).
2. Escolher **uma** categoria e **um** shot do [[skills/ai-camera-movements/references/catalog|catalog]].
3. Colar o prompt-base do catálogo e **substituir “main subject / target”** pelo sujeito real da fala.
4. Manter Movement / Speed / Framing / End intactos (é o DNA do site).
5. Se o usuário pedir “tipo aicameramovements.com”, **não inventar** moves fora do catálogo — ou marcar como variação.
6. Em dúvida de direção L/R, preferir a variante que revela informação nova no lado de entrada do frame.

### Checklist de qualidade

- [ ] Move nomeado (não só “cinematic camera”)
- [ ] Speed coerente com o beat (reveal = slow; punch = fast/crash)
- [ ] Framing mantém sujeito legível
- [ ] End com composição estável (T2V gosta de pouso claro)
- [ ] Sem texto na mídia
- [ ] Ainda alinhado 100% com a narração

---

## Atalhos de UI / humano

1. Abrir [aicameramovements.com](https://aicameramovements.com/)
2. Filtrar categoria ou buscar nome do move
3. **Copy prompt**
4. Colar em `camera_intent` ou no final do `visual_prompt` de cena vídeo
5. Trocar o sujeito genérico pelo da cena

---

## Arquivos

| Path                                                       | Papel                |
| ---------------------------------------------------------- | -------------------- |
| `.agents/skills/ai-camera-movements/SKILL.md`              | Esta skill           |
| `.agents/skills/ai-camera-movements/references/catalog.md` | 46 prompts canônicos |
| `.agents/skills/ai-camera-movements.md`                    | Atalho Obsidian      |

## Relacionadas

- [[skills/lumiera-seedance-directing]] — `camera_intent` + refs
- [[skills/visual-prompt-engineer]] — prompt final de cena
- [[skills/geo-video-prompts]] — zoom Terra / drone geográfico
- [[skills/remotion-best-practices]] — motion no Remotion (não T2V)

---

## Crédito da referência

Movimentos e textos-base adaptados da biblioteca pública de [AI Camera Movements](https://aicameramovements.com/) (46 clips · 7 categories · 1 prompt each). Use o site para **previews visuais**; use esta skill para **reuso determinístico no pipeline Lumiera**.
