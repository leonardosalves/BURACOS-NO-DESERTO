> 🔗 [[MEMORIA-LUMIERA]] · [[skills/lumiera-seedance-directing|lumiera seedance directing]] · [[SKILLS]]

---
name: lumiera-seedance-directing
description: |
  Direção dramática por cena no estilo Seedance 2.0 — directing_brief + refs multimodais por papel ANTES do visual_prompt.
  Princípio: "direct the model, don't micro-manage the frame."
  Use ao preparar cenas de vídeo IA no Creator, antes da Engenharia Visual PRO ou geração LTX/Seedance.
  Triggers: seedance, directing, directing brief, refs por cena, direção de cena, compile directing, multimodal refs.
metadata:
  lumiera: true
  source: custom
  tasks: [creator, production]
  category: creator
---

# Lumiera Seedance Directing (Fase 1)

Adaptação do [Skill OS seedance-2.0](https://github.com/Emily2040/seedance-2.0) para o pipeline Lumiera.

**Endpoint:** `POST /api/ai/creator/compile-directing-briefs`
**UI Creator:** botão "🎬 Seedance Directing" + painel por cena no passo de revisão de roteiro

Complementa [[skills/visual-prompt-engineer]] — ordem recomendada:
1. Roteiro + visual_prompts base
2. **Seedance Directing** (esta skill)
3. Engenharia Visual PRO
4. (Fase 2) Geração T2V via LTX/Comfy ou API Seedance

---

## Princípio central

> Direct the model — don't micro-manage the frame.

O `directing_brief` captura **intenção** (drama, câmera, luz, performance, som). O `visual_prompt` traduz isso em pixels — não misture os dois papéis.

---

## Schema por cena (`visual_prompts[]`)

```json
{
  "scene": "1.1",
  "block": 1,
  "narration_text": "...",
  "directing_brief": {
    "dramatic_function": "turno, POV, poder, subtexto",
    "camera_intent": "push-in lento, orbit 45°",
    "lighting_intent": "golden hour, sombras longas",
    "performance_intent": "olhar fixo, mãos tremendo",
    "sound_intent": "silêncio tenso + vento distante"
  },
  "seedance_refs": {
    "identity": "@Image1 — rosto/personagem",
    "motion": "@Video1 — gesto de referência",
    "camera": "@Video2 — dolly-in",
    "audio": "@Audio1 — tom documental",
    "style": "@Image2 — grading teal-orange",
    "environment": "@Image3 — fábrica abandonada",
    "first_frame": "wide establishing",
    "last_frame": "close no detalhe"
  }
}
```

---

## Como usar (agente)

1. Ler `storyboard.json` do projeto
2. Chamar `POST /api/ai/creator/compile-directing-briefs`:
   - Todas as cenas: `{ "project": "nome_projeto" }`
   - Cena específica: `{ "project": "...", "scene_indices": [3] }`
3. Revisar `directing_brief` e `seedance_refs` no Creator (editáveis manualmente)
4. Só então rodar Engenharia Visual PRO ou gerar vídeo

---

## Workflow humano no Creator

1. Expandir bloco → cena
2. Preencher narração
3. Abrir painel **Directing · Cena N**
4. Editar brief/refs OU clicar **IA · esta cena**
5. Toolbar global **🎬 Seedance Directing** para todas as cenas

---

## Slots de referência

| Slot | Papel |
|------|-------|
| identity | Quem/o quê é o sujeito visual |
| motion | Movimento corporal ou ação |
| camera | Movimento de câmera desejado |
| audio | Tom/ritmo sonoro |
| style | Look, grading, paleta |
| environment | Cenário, época, clima |
| first_frame / last_frame | Composição de abertura/fechamento |

Use notação `@Image1`, `@Video1`, `@Audio1` quando o asset ainda não existir — o humano anexa depois.

---

## Regras

- Alinhar 100% com `narration_text`
- Cenas **vídeo IA** exigem `camera_intent` e `motion` mais explícitos
- Cenas **imagem** podem omitir motion
- Não sobrescrever `prompt` nesta fase — isso é trabalho do visual-prompt-engineer
- Faceless: identity pode ser objeto/ambiente, não rosto humano

---

## Arquivos

- Backend: `dashboard-qanat/backend/seedanceDirecting.js`
- Frontend: `SeedanceDirectingPanel.tsx`, `seedanceDirecting.ts`
- Rota: `server.js` → `/api/ai/creator/compile-directing-briefs`