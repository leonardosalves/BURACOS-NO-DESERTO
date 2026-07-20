> 🔗 [[MEMORIA-LUMIERA]] · [[skills/visual-prompt-engineer|visual prompt engineer]] · [[SKILLS]]

---

name: visual-prompt-engineer
description: |
Engenheiro de Prompts Visuais Sênior — reprocessa visual_prompts do storyboard
como UM FILME coeso. DNA visual (identidade), unidade roteiro↔imagem, gancho de
interesse por frame, continuidade entre cenas, detecção de nicho, mídia limpa
(texto no Remotion), áudio diegético, gate cinematográfico com reparo automático,
modo mapas, 9:16/16:9, scoring.
Use ao revisar cenas do Creator, otimizar prompts fracos, ou quando assets
genéricos não "vivem" o roteiro.
Triggers: engenharia visual, visual prompt, melhorar prompts, otimizar cenas,
prompts visuais, prompt engineer, enhance visual, visual PRO, reprocessar cenas,
identidade visual, DNA visual, gate cinematográfico, reparar prompts.
metadata:
lumiera: true
source: custom
tasks: [creator, production]
category: creator
pipeline_stage: post-narration / pre-render
depends_on: [narracaopro, script-2-pesquisa, remotion-best-practices, hyperframes]
complements: [viral-short-form, ai-camera-movements]
---

# Lumiera — Visual Prompt Engineer PRO

**Endpoint:** `POST /api/ai/creator/enhance-visual-prompts`
**Botão no Wizard:** "✨ Engenharia Visual PRO" (passo de revisão de roteiro)
**Implementação:** `dashboard-qanat/backend/scriptQuality/visualPromptEngineer.js`

Complementa: [[skills/remotion-best-practices]], [[skills/hyperframes]],
[[skills/viral-short-form]], [[skills/ai-camera-movements]] (moves de câmera
para cenas **vídeo** — ref. aicameramovements.com).

---

## 1. POSIÇÃO NO PIPELINE

```
┌─────────────────────────────────────────────────────────────────┐
│  SCRIPT 2 (Pesquisa)                                            │
│  → PACOTE_DE_PESQUISA aprovado                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  NARRACAOPRO (Narração)                                         │
│  → narrative_script + visual_prompts iniciais (do Creator)      │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ★ VISUAL PROMPT ENGINEER PRO (este skill)                      │
│  Recebe: storyboard (narrative_script + visual_prompts)         │
│  Produz: visual_prompts reprocessados + visual_identity         │
│  Gate: assessCinematicVideoPromptDetail (vídeo ≥ 110 palavras)  │
│  Reparo: buildCinematicVideoPromptRepairPrompt (se gate falha)  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  REMOTION (Render)                                              │
│  → text_overlay, editor_notes, SFX, trilha                      │
└─────────────────────────────────────────────────────────────────┘
```

**O que este skill RECEBE:**

- `narrative_script` (roteiro final do NARRACAOPRO)
- `visual_prompts[]` (prompts iniciais do Creator, frequentemente genéricos)
- `strategy` (título, hook, tom, público)
- `hyperframe_prompt` (estilo unificado do canal, se existir)
- `format` (SHORTS | LONGO)
- `visual_asset_style` (ID do estilo visual do projeto)
- `visual_map_only_prompts` (boolean — modo mapas)

**O que este skill PRODUZ:**

- `visual_prompts[]` reprocessados (prompts densos, cinematográficos, alinhados)
- `visual_identity` (DNA do filme: look, paleta, motifs, do_not)
- `checklist` (nicho, correções, quality_score)
- `style_adaptation_notes`

**O que este skill NÃO controla:**

- Narração, roteiro, tese, fatos (pertence ao NARRACAOPRO)
- Pesquisa, fontes, curadoria (pertence ao SCRIPT 2)
- Render, overlay, timeline (pertence ao Remotion)

---

## 2. QUANDO USAR

| Situação                                                                  | Ação                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| Prompts do Creator saíram genéricos ("dramatic landscape", "city aerial") | Reprocessar com Visual PRO                        |
| Imagens "bonitas" não explicam nem reforçam a fala                        | Reprocessar com foco em narrative_job             |
| Cenas parecem de vídeos diferentes (sem unidade)                          | Aplicar DNA visual + identity_tags                |
| Texto/legendas aparecem na mídia gerada                                   | Enforçar mídia limpa + Remotion overlay           |
| Formato errado (9:16 vs 16:9)                                             | Enforçar aspect ratio                             |
| Prompts de vídeo com < 110 palavras (gate falha)                          | Reparar com buildCinematicVideoPromptRepairPrompt |
| Vídeo precisa de som ambiente mas não tem                                 | Injetar política de áudio diegético               |
| Narração explica estrutura interna mas prompt mostra só fachada           | enforceNarrativeMaterialFidelity                  |
| Projeto é 100% mapas históricos                                           | Ativar modo mapOnly                               |

---

## 3. MISSÃO — 3 PILARES

| Pilar                        | Exigência                                                              | Teste                                      |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| **Unidade roteiro ↔ visual** | Frame completa a fala (prova, revelação, contraste, mecanismo, emoção) | "Se mutar o áudio, ainda entendo a ideia?" |
| **Identidade do filme**      | Mesma paleta/luz/realismo/sujeitos; `identity_tags` estáveis           | "Todas as cenas parecem do mesmo filme?"   |
| **Interesse por frame**      | Cada asset tem `visual_hook` — detalhe que faz scroll parar            | "Por que olho para ESTE frame agora?"      |

---

## 4. DNA VISUAL (Identity Brief)

Construído por `buildVisualIdentityBrief()` a partir de strategy + narração + nicho + estilo.

```json
{
  "title": "Título do vídeo",
  "hook": "Gancho / promessa visual",
  "tone": "Tom detectado ou do nicho",
  "audience": "mobile / retenção | YouTube longo",
  "niche": "history",
  "visual_asset_style": "amber-documentary",
  "visual_asset_style_label": "Âmbar Documental",
  "map_only_prompts": false,
  "look": "Film grain, warm amber, classic lenses...",
  "style_clause": "Prompt clause em inglês para embedding",
  "palette_and_light": "Look + niche mood combinados",
  "hyperframe": "Estilo do canal (se existir)",
  "continuity_rules": [
    "Look único do projeto: ...",
    "Mesma temperatura de cor em todas as cenas",
    "Mesmo nível de realismo — nunca misturar estilos",
    "Sujeitos recorrentes mantêm aparência consistente",
    "Cada cena avança a história; proibido establishing shot genérico repetido"
  ]
}
```

**Regra:** O identity brief é injetado no system prompt e no payload.
Todas as cenas DEVEM respeitar o DNA. Se uma cena "quebra o look" → reescrever.

---

## 5. DETECÇÃO DE NICHO

`detectNicheFromContent()` analisa: title_main, hook, tone, target_audience,
primeiras 2000 chars da narração, hyperframe.

| Nicho        | Estilo visual                                                       |
| ------------ | ------------------------------------------------------------------- |
| `true_crime` | Dark moody, cold blue shadows, forensic detail, noir                |
| `horror`     | High contrast, cold blue/red, unsettling angles, grain              |
| `mystery`    | Deep shadows, volumetric lighting, warm gold, oxidized textures     |
| `history`    | Period-accurate, film grain, amber (antigo) / steel (moderno)       |
| `science`    | Clean modern, bright precise lighting, volumetric beams             |
| `pets`       | Vibrant warm, soft cheerful, expressive close-ups, shallow DOF      |
| `luxury`     | Golden hour, rich textures (leather, marble, chrome), heroic angles |
| `motivation` | Epic golden light, silhouettes, dramatic sky, warm tones            |
| `finance`    | Elegant, wealth elements (gold, graphs, offices), premium           |
| `geography`  | Epic landscape, aerial, green/earth tones, natural lighting         |
| `tech`       | Dark backgrounds, neon glows, code mockups, sharp modern            |
| `food`       | Warm appetizing, macro close-ups, steam, vibrant saturated          |
| `sports`     | Dynamic action, fast motion, dramatic lighting, freeze-frame        |
| `default`    | Cinematic documentary, dramatic lighting, photorealistic            |

**Prioridade:** A primeira regex que匹配 vence. Ordem: true_crime → horror →
mystery → history → science → pets → luxury → motivation → finance →
geography → tech → food → sports → default.

---

## 6. REGRAS FUNDAMENTAIS (resumo operacional)

### 6.1 Peça única — Roteiro + Imagem = um significado

- PROIBIDO: stock genérico quando a fala tem sujeito concreto.
- A imagem COMPLETA o que a voz não cabe em palavras.
- `narrative_job` obrigatório: `prove` | `reveal` | `contrast` | `explain` | `feel`.

### 6.2 Fidelidade ao real

- Objeto/lugar/pessoa nomeados → pedir a COISA REAL com aparência verificável.
- PROIBIDO: genéricos inventados no lugar de nomes reais.
- Metáforas abstratas só quando NÃO há objeto real nomeado.

### 6.3 Mídia limpa (INQUEBRÁVEL)

- Sem títulos, legendas, parágrafos, logos, watermarks na mídia gerada.
- `text_overlay` e `impact_text` são metadados Remotion — NUNCA no prompt.
- Política padrão: `VISUAL_MINIMAL_TEXT_RULE`.
- Texto diegético: só se `diegetic_text_required=true`, máx. 4 palavras no idioma autêntico.

### 6.4 Áudio diegético (VÍDEO — OBRIGATÓRIO)

- SÓ som diegético rico: ambiente, ação, materiais, movimento.
- Reações humanas NÃO VERBAIS permitidas (gasps, cries, grunts).
- PROIBIDO: fala inteligível, diálogo, narração, voice-over, música, soundtrack, beat, jingle.
- Política: `VIDEO_DIEGETIC_AUDIO_POLICY` anexada a todo prompt de vídeo.

### 6.5 Aspect ratio (INQUEBRÁVEL)

- SHORTS → **9:16** portrait. LONGO → **16:9** landscape.
- Cláusula de formato no final de TODO prompt (imagem e vídeo).
- Campo `aspect_ratio` no JSON deve ser exato.
- `enforceAspectRatioInPrompt()` remove ratios conflitantes e anexa o correto.

### 6.6 Vídeo — estrutura e gate

- **120–220 palavras em inglês** por prompt de vídeo.
- Máximo **3 beats**: estado inicial/tensão → ação central → reação/consequência.
- Câmera com trajetória contínua e intenção narrativa.
- Respeitar `temporal_plan` quando existir (TTS+Whisper).
- POV só quando `source_is_pov=true`.
- **Gate:** `assessCinematicVideoPromptDetail()` verifica: opening, progression, ending, camera, audio, wordCount ≥ 110.
- **Se gate falha:** `buildCinematicVideoPromptRepairPrompt()` gera prompt de reparo.

### 6.7 Imagem — frame único com história

- Composição que conta o beat em frame estático.
- PROIBIDO: "max N seconds", "cinematic motion", drone shot, tracking, dolly, orbit, push-in.
- Usar linguagem de FOTO: "high-angle aerial still", "wide establishing photograph".
- `stripVideoTerminologyFromImagePrompt()` remove automaticamente termos de vídeo.

### 6.8 Fidelidade de material (enforceNarrativeMaterialFidelity)

- Quando a narração explica material estrutural (aço, ferro, esqueleto metálico)
  mas o prompt mostra só fachada → injeta cláusula de corte arquitetônico /
  fase de construção / estrutura exposta.
- Diferencia estrutura portante de revestimento.
- Só ativa para cenas de edifício + aço central + aço não visível no prompt.

### 6.9 Mapas e geografia (crítico)

- PROIBIDO inventar posição de cidades, rios, fronteiras.
- Silhueta/contorno da região deve ser reconhecível e correto.
- Se citar cidades: posição relativa REAL. Senão: omitir nomes, mostrar só contorno.
- Rótulos no mapa = idioma oficial/histórico do PAÍS MOSTRADO (não fixo em PT/EN).
- `MAP_GEO_ACCURACY_CLAUSE` e `MAP_LABEL_LANGUAGE_CLAUSE` embutidas em todo prompt de mapa.

### 6.10 Modo mapas (mapOnly)

- Quando `visual_map_only_prompts=true`: CADA cena é um mapa informativo da época.
- Proibido: retratos, b-roll genérico, objetos sem geografia cartográfica.
- Mapas preferem still (imagem); vídeo só se já for motion cartográfico.

### 6.11 Continuidade entre cenas

- Payload envia `prev_narration` e `next_narration` (220 chars cada).
- O final de uma cena "passa o bastão" visual para a próxima.
- `identity_tags` estáveis para sujeitos recorrentes.
- Proibido repetir a mesma composição/ideia visual em cenas diferentes.

---

## 7. ESTRUTURA DO PROMPT (inglês, prosa fluida)

```
1) SUBJECT + IDENTITY     — quem/o quê + identity_tags do DNA
2) NARRATIVE BEAT         — momento exato da fala (não tema genérico)
3) VISUAL HOOK            — detalhe que prende o olhar em 1s
4) SHOT + CAMERA          — enquadramento + movimento com intenção
5) LIGHT + TEXTURE + ERA  — coerente com DNA e nicho
6) CONTINUITY             — âncora com cena anterior
7) [VÍDEO] 3 BEATS + FRAME FINAL — tensão, ação, consequência (120-220 palavras)
8) [VÍDEO] DIEGETIC AUDIO — SFX rico; sem fala/música
9) ASPECT + CLEAN MEDIA   — cláusula de formato + mídia sem texto
```

---

## 8. GATE CINEMATOGRÁFICO E REPARO

### Gate (`assessCinematicVideoPromptDetail`)

Aplicado a prompts de VÍDEO. Verifica presença de:

| Check         | Regex busca                                                        |
| ------------- | ------------------------------------------------------------------ |
| `opening`     | begin, opens, start, initially, at first                           |
| `progression` | then, suddenly, as the, midway, next                               |
| `ending`      | end, finally, final shot, aftermath, settles                       |
| `camera`      | camera, shot, tracking, push-in, dolly, close-up, pan, tilt, orbit |
| `audio`       | audio, sound, diegetic, ambient, buzz, rumble, crack, wind, water  |
| `detail`      | wordCount ≥ 110                                                    |

**Resultado:** `{ ok: boolean, missing: string[] }`

### Reparo (`buildCinematicVideoPromptRepairPrompt`)

Quando `ok=false`:

1. Coleta as cenas que falharam
2. Constrói prompt de reparo com contrato explícito (120-220 palavras, 3 beats, câmera, áudio)
3. Envia ao LLM para reescrita
4. Re-aplica gate

**Máximo de ciclos de reparo:** 2 (evitar loop infinito).

---

## 9. TRUNCAMENTO DE PAYLOAD

Para não estourar o contexto do LLM:

| Campo                       | Limite       |
| --------------------------- | ------------ |
| `narrative_script`          | 12.000 chars |
| `narration_text` (por cena) | 600 chars    |
| `prev/next_narration`       | 220 chars    |
| `prompt` (por cena)         | 700 chars    |
| `editor_notes`              | 240 chars    |
| `stock_query`               | 80 chars     |
| `hyperframe_prompt`         | 500 chars    |
| `editing_map`               | 500 chars    |
| `identity_tags`             | 6 tags       |

---

## 10. FORMATO DE SAÍDA

```json
{
  "visual_identity": {
    "title": "Título do vídeo",
    "look": "1-2 frases do look unificado",
    "palette": "Cores/luz dominantes",
    "recurring_motifs": ["elemento visual recorrente"],
    "do_not": ["erros de identidade a evitar"]
  },
  "visual_prompts": [
    {
      "scene": "1.1",
      "block": 1,
      "narration_text": "trecho exato da narração",
      "type": "imagem IA 2k | vídeo IA (max 10s)",
      "aspect_ratio": "9:16 | 16:9",
      "narrative_job": "prove|reveal|contrast|explain|feel",
      "visual_hook": "gancho visual em 1 frase (PT-BR ok)",
      "identity_tags": ["tag-estavel-1", "tag-estavel-2"],
      "prompt": "prompt em inglês, 120-220 palavras (vídeo) ou denso (imagem), com cláusula de aspecto + clean media",
      "diegetic_text_required": false,
      "editor_notes": "transição/SFX/pattern interrupt",
      "stock_query": "3-6 palavras em INGLÊS = o que ESTA cena mostra"
    }
  ],
  "checklist": {
    "nicho_detectado": "history",
    "tipo_conteudo": "documental / listicle / narrativo",
    "principais_correcoes": ["correção aplicada 1", "correção 2"],
    "quality_score": 9.7,
    "notes": "como o filme virou peça única"
  },
  "style_adaptation_notes": "adaptações de estilo aplicadas"
}
```

---

## 11. EXEMPLO ANTES / DEPOIS

### ANTES (prompt genérico do Creator)

```
"Dramatic aerial view of an old city with ancient buildings, cinematic
lighting, golden hour, 4k quality"
```

**Problemas:**

- Stock genérico (qualquer cidade antiga)
- Não ilustra a fala específica
- Sem narrative_job
- Sem identity_tags
- Sem visual_hook
- Sem continuidade
- Sem política de mídia limpa
- Sem aspect ratio explícito

### DEPOIS (reprocessado pelo Visual PRO)

```
"Riveted iron skeletal frame of the 1889 Galerie des Machines, exposed
construction bay revealing load-bearing columns and cross-braces against
overcast Parisian sky. Camera begins at street level looking up through
the lattice of wrought-iron beams, slowly tilts upward to reveal the
420-meter vaulted ceiling where three hinged arches converge. Workers in
dark wool coats and flat caps walk the iron gantry, silhouetted against
diffuse grey light filtering through glass panels. Rust-orange rivets
punctuate every joint; condensation drips from cold metal surfaces.
Diegetic sound only: metallic creaking under wind load, distant hammer
rings, boots on iron grating, continuous low hum of the structure.
No intelligible speech, no music. Vertical 9:16 portrait composition,
full-frame mobile framing, generate strictly as 9:16 (portrait), not
landscape. Clean source media: no baked-in titles, subtitles, captions,
paragraphs, labels, logos, watermarks, letters or readable editorial text."
```

**O que mudou:**

- Sujeito real e verificável (Galerie des Machines, 1889)
- Narrative_job: EXPLAIN (mostra o mecanismo estrutural)
- Visual_hook: escala impossível do vão de 420m
- Câmera com trajetória (street level → tilt up → ceiling)
- 3 beats: (1) base da estrutura, (2) tilt revela escala, (3) trabalhadores + detalhe
- Áudio diegético específico
- Aspect ratio explícito
- Clean media policy
- Material fidelity: aço exposto, não fachada

---

## 12. TROUBLESHOOTING

| Sintoma                                          | Causa provável                               | Solução                                           |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| Prompts ainda genéricos após reprocessamento     | System prompt não recebeu identity brief     | Verificar `buildVisualIdentityBrief()`            |
| Todas as cenas parecem iguais                    | Falta `identity_tags` + `visual_hook`        | Forçar no payload                                 |
| Texto aparece na imagem gerada                   | Prompt não tem `VISUAL_MINIMAL_TEXT_RULE`    | Rodar `enforceVisualLocalizedTextRule()`          |
| Vídeo sem som ambiente                           | Prompt não tem `VIDEO_DIEGETIC_AUDIO_POLICY` | Rodar `enforceVideoDiegeticAudioPolicy()`         |
| Formato errado (landscape em Shorts)             | Aspect ratio não enforced                    | Rodar `enforceAspectRatioInPrompt()`              |
| Prompt de vídeo com < 110 palavras               | Gate falha                                   | `buildCinematicVideoPromptRepairPrompt()`         |
| Prompt de imagem com "drone shot" / "10 seconds" | Terminologia de vídeo em imagem              | `stripVideoTerminologyFromImagePrompt()`          |
| Mapa com cidades em posição errada               | LLM inventou geografia                       | Reforçar `MAP_GEO_ACCURACY_CLAUSE` + omitir nomes |
| Fachada genérica quando narração explica aço     | `enforceNarrativeMaterialFidelity` não rodou | Aplicar função com narration context              |
| Payload estoura contexto                         | Truncamento não aplicado                     | Verificar limites da seção 9                      |
| Nicho detectado errado                           | Regex de outro nicho-regex matching primeiro | Ajustar ordem em `NICHE_DEFINITIONS`              |

---

## 13. INTEGRAÇÃO COM OUTROS SKILLS

| Skill                              | Relação                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| [[skills/remotion-best-practices]] | `text_overlay`, `editor_notes`, `impact_text` são consumidos pelo Remotion |
| [[skills/hyperframes]]             | `hyperframe_prompt` injetado no DNA visual e no system prompt              |
| [[skills/viral-short-form]]        | Pattern interrupts, retenção, ritmo visual (Shorts)                        |
| [[skills/ai-camera-movements]]     | Referência de moves para prompts de VÍDEO (aicameramovements.com)          |
| [[skills/narracaopro]]             | Fonte do `narrative_script`; define o que cada cena deve ilustrar          |
| [[skills/script-2-pesquisa]]       | Fonte dos fatos; `visual_prompts` não podem contradizer o pacote           |

---

## 14. LIMITAÇÕES CONHECIDAS

1. **LLM pode ignorar cláusulas longas** — por isso as políticas são anexadas no FINAL do prompt (recency bias).
2. **Mapas com cidades são arriscados** — mesmo com `MAP_GEO_ACCURACY_CLAUSE`, modelos de imagem frequentemente erram posições. Preferir mapas sem rótulos.
3. **Gate é heurístico** — regex não garante qualidade cinematográfica real, apenas presença de elementos estruturais.
4. **Truncamento pode cortar contexto** — se a narração for muito longa, cenas do meio podem perder contexto.
5. **Nicho detection é first-match** — temas híbridos (ex.: "história de true crime") pegam o primeiro da lista.
6. **Material fidelity é específico para aço/edifícios** — outros materiais (concreto, madeira, vidro) não têm enforcement automático.

---

## 15. CHECKLIST DE QUALIDADE (pós-reprocessamento)

Antes de salvar o storyboard:

- [ ] Toda cena tem `narrative_job` definido
- [ ] Toda cena tem `visual_hook` específico (não genérico)
- [ ] `identity_tags` consistentes para sujeitos recorrentes
- [ ] Nenhum prompt contém texto editorial na mídia
- [ ] Todo prompt de vídeo tem áudio diegético + proibições
- [ ] Todo prompt termina com cláusula de aspect ratio correto
- [ ] Prompts de vídeo têm 120–220 palavras
- [ ] Prompts de imagem NÃO têm terminologia de vídeo
- [ ] Mapas têm geografia correta ou omitem nomes de cidade
- [ ] `visual_identity` coerente com nicho e hyperframe
- [ ] `stock_query` é específico da cena (não tema global)
- [ ] Gate cinematográfico passou para todas as cenas de vídeo
- [ ] `quality_score` ≥ 8.5 no checklist
