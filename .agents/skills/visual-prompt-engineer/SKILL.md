> 🔗 [[MEMORIA-LUMIERA]] · [[skills/visual-prompt-engineer|visual prompt engineer]] · [[SKILLS]]

---

name: visual-prompt-engineer
description: |
Engenheiro de Prompts Visuais Sênior — reprocessa visual_prompts do storyboard como UM FILME coeso.
DNA visual (identidade), unidade roteiro↔imagem, gancho de interesse por frame, continuidade entre cenas,
detecção de nicho, mídia limpa (texto no Remotion), 9:16/16:9, scoring.
Use ao revisar cenas do Creator, otimizar prompts fracos, ou quando assets genéricos não “vivem” o roteiro.
Triggers: engenharia visual, visual prompt, melhorar prompts, otimizar cenas, prompts visuais, prompt engineer, enhance visual, visual PRO, reprocessar cenas, identidade visual.
metadata:
lumiera: true
source: custom
tasks: [creator, production]
category: creator
---

# Lumiera

**Endpoint no dashboard:** `POST /api/ai/creator/enhance-visual-prompts`  
**Botão no Wizard:** "✨ Engenharia Visual PRO" (passo de revisão de roteiro)

Implementação: `dashboard-qanat/backend/scriptQuality/visualPromptEngineer.js`

Complementa [[skills/remotion-best-practices]], [[skills/hyperframes]], [[skills/viral-short-form]], [[skills/ai-camera-movements]] (moves de câmera para cenas **vídeo** — ref. aicameramovements.com).

---

# Visual Prompt Engineer PRO

Transforma `visual_prompts` genéricos em **peças inseparáveis do roteiro**: cada imagem/vídeo tem identidade, significado e motivo para o espectador olhar — e o conjunto parece **um só filme**, não um álbum de stock.

## Quando usar

- Após gerar roteiro no Creator e os prompts saírem fracos/genéricos
- Quando imagens “bonitas” não explicam nem reforçam a fala
- Para unificar o look do vídeo (DNA visual)
- Para garantir mídia limpa (texto editorial só no Remotion)
- Para otimizar 9:16 (Shorts) e 16:9 (longo)

## Como usar

1. Storyboard com `narrative_script` + `visual_prompts` no projeto
2. `POST /api/ai/creator/enhance-visual-prompts` (ou botão no Wizard)
3. Backend monta **DNA visual** + system prompt de direção e envia ao LLM
4. Retorna `visual_prompts` + `visual_identity` + `checklist`
5. Storyboard é salvo automaticamente

## Missão (3 pilares)

| Pilar                        | O que exige                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Unidade roteiro ↔ visual** | Frame completa a fala (prova, revelação, contraste, mecanismo, emoção) — se mutar o áudio, ainda se entende a ideia |
| **Identidade do filme**      | Mesma paleta/luz/realismo/sujeitos recorrentes; `identity_tags` estáveis                                            |
| **Interesse por frame**      | Cada asset tem `visual_hook` — detalhe que faz scroll parar                                                         |

## Campos novos por cena

- `narrative_job`: `prove` \| `reveal` \| `contrast` \| `explain` \| `feel`
- `visual_hook`: gancho de interesse em 1 frase
- `identity_tags`: tags de continuidade do sujeito/look
- Storyboard: `visual_identity` (look unificado, paleta, motifs, do_not)

## Regras fundamentais

### 1. Peça única

Proibido stock genérico (“dramatic landscape”, “thinking man”) quando a fala tem sujeito concreto.  
A imagem **completa** o que a voz não cabe em palavras.

### 1b. Fidelidade ao real

Objeto/lugar/pessoa nomeados → pedir a **coisa real**, não fantasia genérica.

### 2. Mídia limpa

Sem títulos/legendas/parágrafos na mídia gerada. Texto editorial = Remotion overlay.

### 3. Nicho → estilo

Mystery, history, science, luxury, horror, finance, etc. (mapa em `NICHE_STYLE_MAP`).

### 4. Vídeo

Movimento de câmera com **intenção narrativa** (push-in = revelação, orbit = ícone, tracking = investigação).  
Respeitar `temporal_plan` quando existir (TTS+Whisper).

### 5. Continuidade

Payload envia `prev_narration` / `next_narration` e `visual_identity_brief` para o LLM “passar o bastão” entre cenas.

### 6. Estrutura do prompt (inglês)

SUBJECT+IDENTITY → NARRATIVE BEAT → VISUAL HOOK → SHOT/CAMERA → LIGHT/TEXTURE/ERA → CONTINUITY → ASPECT + clean media policy.

## Formato de saída

```json
{
  "visual_identity": {
    "title": "...",
    "look": "...",
    "palette": "...",
    "recurring_motifs": ["..."],
    "do_not": ["..."]
  },
  "visual_prompts": [
    /* cenas com prompt + narrative_job + visual_hook + identity_tags */
  ],
  "checklist": {
    "nicho_detectado": "...",
    "tipo_conteudo": "...",
    "principais_correcoes": ["..."],
    "quality_score": 9.7,
    "notes": "..."
  },
  "style_adaptation_notes": "..."
}
```
