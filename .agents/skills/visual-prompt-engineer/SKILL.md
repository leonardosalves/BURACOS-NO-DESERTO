> 🔗 [[MEMORIA-LUMIERA]] · [[skills/visual-prompt-engineer|visual prompt engineer]] · [[SKILLS]]

---
name: visual-prompt-engineer
description: |
  Engenheiro de Prompts Visuais Sênior — reprocessa visual_prompts do storyboard com qualidade cinematográfica máxima.
  Detecção automática de nicho, regra inquebrável de texto PT-BR, otimização 9:16 + 16:9, chain of thought, scoring.
  Use ao revisar cenas do Creator, otimizar prompts fracos, adaptar estilo visual ao nicho ou gerar prompts profissionais.
  Triggers: engenharia visual, visual prompt, melhorar prompts, otimizar cenas, prompts visuais, prompt engineer, enhance visual, visual PRO, reprocessar cenas.
metadata:
  lumiera: true
  source: custom
  tasks: [creator, production]
  category: creator
---

# Lumiera

**Endpoint no dashboard:** `POST /api/ai/creator/enhance-visual-prompts`
**Botão no Wizard:** "✨ Engenharia Visual PRO" (passo de revisão de roteiro)

Complementa [[skills/remotion-best-practices]], [[skills/hyperframes]], [[skills/viral-short-form]].

---

# Visual Prompt Engineer

Engenheiro de Prompts Visuais Sênior para transformar visual_prompts genéricos em prompts cinematográficos de altíssima qualidade, adaptados ao nicho do vídeo.

## Quando usar

- Após gerar roteiro no Creator e os `visual_prompts` saírem fracos/genéricos
- Para reprocessar um storyboard existente com qualidade superior
- Quando o nicho muda e o estilo visual precisa se adaptar
- Para garantir regra de texto PT-BR em todos os prompts
- Para otimizar composição para 9:16 (Shorts) e 16:9 (Long form)

## Como usar (via agente)

1. Ler o storyboard.json do projeto ativo
2. Chamar o endpoint `POST /api/ai/creator/enhance-visual-prompts` com `{ project: "nome_projeto" }`
3. O backend monta o JSON completo e envia ao Gemini com o system prompt do Engenheiro
4. Recebe o array `visual_prompts` corrigido + `checklist` com quality_score
5. O storyboard é atualizado automaticamente

## Regras Fundamentais

### 1. Alinhamento Total com Narração
Cada prompt deve ilustrar EXATAMENTE o que o `narration_text` diz. O visual reforça a fala.

### 1b. Fidelidade ao Real (não inventar o sujeito)
Se a narração cita algo que **existe** (monumento, veículo, animal, pessoa histórica, máquina, lugar, artefato), o prompt deve pedir **a coisa real** — foto/filmagem documental, aparência verificável. **Proibido** substituir por versão genérica ou fictícia (“mysterious spacecraft”, “ancient ruins”) quando o objeto é identificável. Metáforas abstratas podem ser simbólicas; fatos concretos não.

### 2. Texto PT-BR Inquebrável
Todo prompt deve terminar com a instrução de que qualquer texto visível na imagem/vídeo deve estar em português do Brasil.

### 3. Detecção de Nicho → Estilo Adaptado
| Nicho | Estilo Visual |
|-------|--------------|
| Mistério / True Crime / História | Dark cinematic, sombras profundas, volumetric lighting |
| Pets / Animais | Cores vibrantes, iluminação suave, close-ups expressivos |
| Luxo / Imóveis / Carros | Premium, iluminação dourada, texturas ricas, ângulos heroicos |
| Ciência / Educacional | Limpo, moderno, iluminação clara, visual didático |
| Motivação / Sucesso | Épico, inspirador, luz dourada, composições poderosas |
| Horror / Creepypasta | Sombrio, perturbador, alto contraste, cores frias |
| Finanças / Dinheiro | Luxuoso, limpo, elementos de riqueza visual |

### 4. Prompts de Vídeo
- Duração 7-10 segundos
- Movimento de câmera claro (tracking, push-in, slow motion, orbit, pan, tilt)
- Ação forte nos primeiros 2-3 segundos

### 5. Otimização Aspect Ratio
- 9:16: "Composição vertical, framing apertado, sujeito centralizado, movimentos verticais"
- 16:9: "Composição widescreen cinematográfica, shots amplos, maior profundidade"

### 6. Chain of Thought (interno)
Antes de cada prompt, avaliar:
1. Nicho do vídeo
2. Tipo de conteúdo (countdown, storytelling, educativo, etc.)
3. Objetivo emocional da cena
4. Estilo visual mais adequado
5. Melhor movimento de câmera
6. Regra PT-BR aplicada
7. Framing otimizado

## Formato de Saída

```json
{
  "visual_prompts": [ /* array completo corrigido */ ],
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
