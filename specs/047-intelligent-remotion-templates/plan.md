# Plano: Templates Remotion inteligentes + NARRADORPRO + controles de Render

**Feature**: `047-intelligent-remotion-templates`  
**Criado**: 2026-07-13  
**Status**: Planejado (aguardando implementação por fases)  
**Branch base**: trabalho atual em templates Studio / motion planner

---

## 1. Problema (diagnóstico do código atual)

Hoje o pipeline já tem peças boas, mas elas não se encaixam:

| Peça                                               | Estado atual                                                                                            | Sintoma                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catálogo Studio (`remotion-template-catalog.json`) | ~166 templates (Default + Engenharia + …) com `sourceCode` short/long                                   | Visual “sujo”: gradientes, “Jane Smith”, “Mountain/Ocean”, “After/Before” hardcoded no TSX         |
| `mapStudioTemplateToMotionId`                      | Mapeia mal: `transition`/`background` → `counter`; cinematic (Film Burn, Parallax) → `null` ou genérico | Picker “parece aleatório” — score cai e fallback cicla                                             |
| `boostStudioMotionScenesForLongForm`               | Força `longTargetMin: 5` com `BOOST_TRIGGERS[index % n]`                                                | Enche o vídeo com templates sem semântica real                                                     |
| `studioTemplatePropsBinder`                        | Preenche `dataSlots` a partir da narração/pesquisa                                                      | Não injeta **asset da cena** nos slots de imagem/vídeo do source                                   |
| `studioTemplateRoles`                              | Só `overlay \| transition \| background_frame \| logo_bug`                                              | Falta: intro, end_card, chapter, effect, frame, subscribe_mid                                      |
| Renderer (`LumieraTimeline`)                       | Tem vignette/zoom; logo outro por path `logo_final_`                                                    | **Não** aplica Film Burn / Parallax / Vignette Pulse do catálogo Studio como camada de efeito      |
| Render UI                                          | Pack de templates por nicho on/off                                                                      | Sem toggles: intro, end card, chapter title, frame, efeitos                                        |
| Timing editor                                      | `TimelineStudioClipInspector` edita `dataSlots`                                                         | Ainda incompleto vs. “editar tudo do template” (mídia, componentes, timing fino)                   |
| NARRADORPRO                                        | 12 passos de narração/fatos                                                                             | Não emite contrato estruturado de **orquestração visual** (quote, lower third, chart, background…) |

A instrução de orquestração em `.agents/remotiontemplatesinstruction.md` (Script 3) descreve o comportamento desejado; o código ainda não executa esse contrato de ponta a ponta.

---

## 2. Princípio de arquitetura

```
NARRADORPRO (texto + fatos + intenções)
        ↓
Revisão de narração / nicho (palette de templates do nicho)
        ↓
Orquestrador de templates (semântico, NÃO aleatório)
        ↓
Props limpas (dados reais + asset da cena)
        ↓
Render policy (toggles do usuário na área de Render)
        ↓
Timeline Studio + Remotion renderer
        ↓
Inspector de timing (override humano total dos props)
```

**Regra de ouro**: template só entra se cumprir função semântica (número, comparação, capítulo, CTA, efeito cinematográfico, etc.). Se não melhorar a compreensão ou a identidade, não entra.

---

## 3. Modelo de papéis (roles) por categoria

Cada template do catálogo ganha um **`orchestration_role`** estável (não só `category` livre):

| Categoria catálogo                                              | Role                | Quem decide                                                  | Onde entra no vídeo                                                                       |
| --------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `cinematic` (Parallax, Film Burn, Vignette Pulse, Ken Burns, …) | `scene_effect`      | **Render toggle** + IA de efeitos (opt-in)                   | Camada full-frame sobre a cena / asset, sem substituir o B-roll por placeholder           |
| `image-media`                                                   | `media_layout`      | Mesma lógica do cinematic: render on + IA decide cena a cena | Substitui/compõe o layout da mídia da cena com o **asset real**                           |
| `transition`                                                    | `transition`        | Render on + IA nas junções de cena/bloco                     | Entre clips (duração curta)                                                               |
| `intro-outro` → Cinematic Title Intro / Countdown / Title Split | `intro`             | **Render toggle**                                            | Início do vídeo (antes do bloco 1)                                                        |
| `intro-outro` → End Card                                        | `end_card`          | **Render toggle**                                            | Final; **substitui** o vídeo logo/`logo_final_` + botão inscreva padrão                   |
| `intro-outro` → Chapter Title                                   | `chapter_title`     | **Render toggle**                                            | Entre blocos; título do capítulo do projeto                                               |
| `intro-outro` → Quote Card                                      | `quote`             | **NARRADORPRO** (opt-in por trecho)                          | Sobre trecho citável                                                                      |
| `intro-outro` / `text` → Lower Third                            | `lower_third`       | **NARRADORPRO**                                              | Nome/local/papel                                                                          |
| `intro-outro` → Subscribe Reminder                              | `subscribe_mid`     | **Render toggle** (especialmente Shorts)                     | **Meio** do vídeo em 9:16                                                                 |
| `background`                                                    | `background`        | **NARRADORPRO**                                              | Underlay técnico quando faz sentido                                                       |
| `content-animation`                                             | `content_animation` | **NARRADORPRO**                                              | Lista, steps, highlight                                                                   |
| `text`                                                          | `text_overlay`      | **NARRADORPRO**                                              | Só se houver informação na tela                                                           |
| `chart-data`                                                    | `chart`             | **NARRADORPRO** + fatos verificados                          | Stats, barras, progress                                                                   |
| `logo-branding`                                                 | `logo_bug`          | Render / canal                                               | Bug discreto                                                                              |
| **`frame` (nova / futura por nicho)**                           | `identity_frame`    | **Render toggle**                                            | Frame fixo o vídeo inteiro (identidade do canal/nicho). Lógica já; assets de nicho depois |

### Contrato de decisão (3 camadas)

1. **Policy de render (usuário)** — liga/desliga famílias: efeitos, intro, end card, chapter, subscribe mid, frame, “legado atual”.
2. **NARRADORPRO** — decide conteúdo semântico: quote, lower third, chart, text, background, content-animation, e quais dados.
3. **IA de efeitos / orquestrador visual** — com policy on, escolhe _qual_ template da família e _em qual cena_, nunca aleatório: score semântico + nicho + formato + anti-repetição.

---

## 4. Integração NARRADORPRO

### 4.1 Saída estruturada adicional (sem quebrar os 12 passos)

Ao final da revisão de narração (ou passo dedicado pós-aprovação), o NARRADORPRO emite um bloco JSON (ex.: `visual_orchestration`):

```json
{
  "niche": "Engenharia",
  "format": "long|shorts",
  "chapters": [
    {
      "block": 1,
      "title": "O concreto que o tempo não venceu",
      "start_hint_sec": 0
    }
  ],
  "placements": [
    {
      "kind": "chart",
      "anchor": { "type": "narration_span", "text": "..." },
      "reason": "número central da tese",
      "data": { "value": 42, "unit": "%", "label": "..." },
      "preferred_subcategories": ["Stat Counter", "Bar Chart"]
    },
    {
      "kind": "quote",
      "anchor": { "type": "block", "block": 2 },
      "data": { "quote": "...", "attribution": "..." }
    },
    {
      "kind": "lower_third",
      "anchor": { "type": "time", "start": 12.4, "duration": 4 },
      "data": { "title": "Palmanova", "subtitle": "Itália · século XVI" }
    }
  ],
  "avoid": ["credits_roll_generic", "fake_stats"]
}
```

### 4.2 O que o NARRADORPRO **não** escolhe sozinho

- Intro / End card / Chapter on-off global → **Render UI**
- Efeito cinematográfico global on-off → **Render UI** (IA só escolhe o qual e onde se on)
- Frame de identidade → **Render UI**

### 4.3 Nicho na revisão da narração

Na revisão (Creator / Editor):

- Carregar `getCatalogForNiche(nicho)` (já existe).
- UI mostra **palette do nicho** (já há `NicheTemplatePalette`) com status: aprovado / sujo / sem asset-slot.
- Preferências do projeto: `motion_template_pack.template_ids` + novo `render_template_policy` (ver §6).

---

## 5. Limpeza de templates (“sujos” → production-ready)

### 5.1 Causa

O `sourceCode` dos drafts usa **constantes literais** (gradientes, “Main Content”, “Jane Smith”) em vez de **props**:

```tsx
// RUIM (atual)
const photos = [{ label: "Photo 1", gradient: "..." }];

// BOM (alvo)
const photos = props.images?.length
  ? props.images
  : props.sceneAsset
    ? [{ src: props.sceneAsset, label: props.title }]
    : [];
```

### 5.2 Pipeline de sanitização (automático + gate)

1. **`propsSchema` / `dataSlots` reais** por subcategory (não genérico `title, subtitle, progress, label` para tudo).
2. **Rewrite do source** (`remotionTemplateSourceRepair` + novo `injectStudioPropsContract`):
   - Trocar literais de mídia por `props.imageUrl | props.videoUrl | props.sceneAsset | props.images[]`
   - Trocar textos demo por `props.title | props.subtitle | props.quote | …`
3. **Bind no planner** (`enrichStudioTemplateScene`):
   - `sceneAsset` = asset do `visual_prompt` / clip de mídia sincronizado
   - Nunca deixar placeholder passar se `isTemplatePlaceholderValue` = true (já existe detector)
4. **Gate de aprovação**: `status: approved` só se:
   - source compila
   - não há placeholder residual no render de smoke
   - `propsSchema` cobre slots usados no JSX
5. **Fallback visual**: se faltar asset, usar solid/blur do frame anterior — **nunca** “Mountain gradient”.

### 5.3 Mapeamento motion_id correto

Reescrever `mapStudioTemplateToMotionId` (ou abandonar a dependência para Studio):

- Templates Studio **não** precisam mapear para `counter`/`bar-chart` legado se tiverem `sourceCode` runnable.
- Introduzir `motion_template_id: "studio-runtime"` (ou o id do template) para overlays Studio.
- Manter IDs legados só para overlays nativos (`location-intro`, `geo-map`, charts nativos).

Isso elimina a maior fonte de “aleatoriedade”: score −50 por `motion_template_id` errado + boost por trigger genérico.

---

## 6. Área de Render — `render_template_policy`

Persistir em `config` do projeto (e defaults de canal):

```ts
type RenderTemplatePolicy = {
  mode: "legacy" | "smart"; // legacy = comportamento atual do renderer sem novas camadas
  effects: {
    enabled: boolean; // usa categoria cinematic como scene_effect
    selection: "auto" | "manual";
    template_id?: string; // se manual: um efeito preferido do nicho
    intensity?: "subtle" | "normal" | "strong";
  };
  intro: { enabled: boolean; template_id?: string | "auto" };
  end_card: {
    enabled: boolean;
    template_id?: string | "auto";
    // se enabled: NÃO anexar logo_final_ / endscreen padrão
    replace_brand_outro: true;
  };
  chapter_title: {
    enabled: boolean;
    template_id?: string | "auto";
    source: "youtube_chapters" | "narrador_blocks" | "auto";
  };
  subscribe_mid: {
    enabled: boolean; // default true em shorts se policy smart
    position: "mid" | "percent";
    percent?: number; // default 0.5
  };
  frame: {
    enabled: boolean;
    template_id?: string | "auto"; // identity frame full duration
  };
  media_layouts: { enabled: boolean; selection: "auto" | "off" };
  transitions: { enabled: boolean; selection: "auto" | "off" };
};
```

### UI (área Render)

Seção **“Templates & camadas”**:

1. Modo: **Legado** | **Inteligente**
2. Efeitos cinematográficos: off / auto / escolher template (Film Burn, Parallax, …)
3. Intro: off / auto / escolher
4. End card: off / auto / escolher — aviso: “substitui logo + inscreva-se final”
5. Chapter title entre blocos: off / on
6. Subscribe no meio (Shorts): off / on
7. Frame de identidade: off / on (lista vazia até existirem frames de nicho)
8. Layouts de mídia (image-media): off / auto
9. Transições: off / auto

Defaults recomendados longos: effects auto subtle, intro off, end_card off (mantém brand), chapter on se houver capítulos, media auto, transitions auto.  
Defaults Shorts: subscribe_mid on, intro curto opcional, chapter off, effects subtler.

---

## 7. Renderer — aplicar efeitos e papéis

### 7.1 `scene_effect` (cinematic)

Hoje o template Film Burn é um fullscreen com fundo cinza. Alvo:

- Compilar Studio template com props `{ sceneAsset, intensity, accentColor }`
- Renderizar como **camada superior semi-transparente** sobre o clip de mídia da cena (não no lugar do asset)
- Alternativa A (recomendada p/ performance): extrair presets nativos no renderer (`FilmBurnLayer`, `VignettePulseLayer`, `ParallaxPan`) parametrizados, e o catálogo Studio vira preview + config — o runtime usa o preset nativo com o asset real.

### 7.2 End card vs logo final

Em `LumieraTimeline` (e pipeline de concat se houver):

- Se `end_card.enabled`:
  - omitir cenas cujo asset match `logo_final_` / logo outro / endscreen fixo
  - inserir clip Studio `end_card` nos últimos N segundos
- Senão: comportamento atual (logo final)

### 7.3 Chapter title

- Fonte: capítulos YouTube (`blockProgressBarConfig` já resolve títulos) ou `visual_orchestration.chapters`
- Inserir clip 2–4s na junção de cada bloco (exceto bloco 1 se intro já cobre)

### 7.4 Subscribe mid (Shorts)

- Em `aspect_ratio === "9:16"` e policy on: overlay 3–5s em `duration/2`
- Não cobrir CTA de fala crítico (evitar sobrepor se narração for pergunta no meio — opcional)

### 7.5 Identity frame

- Track `under` ou `over` com z-index fixo, `from=0` `to=duration`
- Se catálogo do nicho não tiver `frame`, toggle desabilitado com tooltip

---

## 8. Timing editor — edição completa do template

Hoje: slots genéricos no inspector.

Alvo do painel ao selecionar clip Studio:

| Grupo          | Campos                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| **Identidade** | template_id, role, subcategory (trocar template mantendo timing)                |
| **Conteúdo**   | todos `dataSlots` + props extras do schema (quote, attribution, items[])        |
| **Mídia**      | sceneAsset, images[], videoUrl, poster — picker do projeto                      |
| **Layout**     | presentation, pip rect, opacity, z-index, under/over                            |
| **Timing**     | start, duration, in/out ease (já parcial)                                       |
| **Efeito**     | intensity, blend, color grade                                                   |
| **Lock**       | `studio_user_locked` / slots locked (já existe) para o re-plan não sobrescrever |

**Limite pedido**: “somente a parte visual poderei editar no editor timing” — interpretar como:

- No Timing Studio: **props, mídia, timing, layout, efeito** (tudo do instance).
- **Não** editar o `sourceCode` do template global ali (isso fica no Remotion Template Studio).  
  Se quiser “editar visual do template” no sentido de tipografia/cor/posição de camadas internas, expor no schema como props (`titlePosition`, `fontSize`, …) em vez de editar TSX no timing.

---

## 9. Orquestrador inteligente (anti-aleatório)

Substituir o boost cego por pipeline:

```
1. Segmentar narração (já: classifyNarrationSegment + geo)
2. Cruzar com visual_orchestration do NARRADORPRO
3. Candidatos = catálogo do nicho filtrado por role + format + approved + clean
4. Score =
     + match semântico (trigger ↔ subcategory)
     + dados disponíveis (chart precisa de número real)
     + asset disponível (image-media / cinematic precisa de sceneAsset)
     + diversidade (penaliza mesma subcategory recente)
     + preferência do pack (template_ids)
     − placeholder residual
     − role desabilitado na policy
5. Se score < limiar → NÃO colocar template (silêncio é correto)
6. Bind props + sceneAsset
7. Aplicar policy de render (intro/end/chapter/effect layers)
8. Sync Timeline Studio
```

Remover ou restringir fortemente:

- `BOOST_TRIGGERS[index % n]`
- `longTargetMin` forçando lixo visual  
  Substituir por `max` por minuto + `min` só se houver oportunidades reais.

---

## 10. Fases de implementação (commits pequenos)

Cada fase termina com testes + **commit** (regra do projeto).

### Fase 0 — Contrato e policy (foundation)

- Schema `RenderTemplatePolicy` + defaults em `productionConfig`
- Tipos compartilhados `orchestration_role`
- UI read-only na Render (ainda sem efeito no renderer)
- Commit: `feat(templates): render policy schema + roles contract`

### Fase 1 — Mapeamento e scoring honestos

- Corrigir `mapStudioTemplateToMotionId` / runtime Studio-first
- Parar boost aleatório; limites por qualidade
- Logs de decisão (`studio_template_decision`) visíveis na UI de revisão
- Commit: `fix(templates): semantic pick, kill random boost`

### Fase 2 — Props limpos + asset da cena

- Expandir `propsSchema` por subcategory
- Binder injeta `sceneAsset` / `images`
- Source repair para props de mídia nos templates priorizados (chart + cinematic + intro-outro)
- Commit: `feat(templates): bind scene assets, kill demo placeholders`

### Fase 3 — Renderer policy

- Intro / end_card (replace logo) / chapter / subscribe_mid / frame
- Efeitos cinematic como layer (preset nativo ou Studio over asset)
- Commit: `feat(render): template layers policy (intro, end, chapter, effects)`

### Fase 4 — NARRADORPRO visual_orchestration

- Prompt + parse + validação + testes
- Planner consome placements
- Commit: `feat(narradorpro): visual orchestration contract`

### Fase 5 — Timing inspector completo

- Mídia picker, troca de template, locks, effect intensity
- Commit: `feat(timeline): full studio template inspector`

### Fase 6 — Frames de nicho (quando assets existirem)

- Categoria `frame` no catálogo
- Seed por nicho
- Commit: `feat(templates): niche identity frames`

---

## 11. Sugestões extras (além do pedido)

1. **Preset de canal** (“Documental Engenharia”, “Shorts curiosidade”): grava uma `RenderTemplatePolicy` completa + pack de templates favoritos — um clique na Render.
2. **Heatmap de templates** na revisão: linha do tempo com marcas “chart @ 0:42”, “quote @ 1:10” — auditoria antes do render.
3. **Budget de overlay**: no máximo X% do tempo com overlay denso (evita vídeo “PowerPoint”).
4. **A/B de end card vs logo**: flag experimental.
5. **Efeitos como post-process nativo** (Film Burn etc.) em vez de full TSX Studio: mais estável no Remotion, templates Studio viram _design reference_ + parâmetros.
6. **Validação pre-render**: se end_card on e ainda existir clip `logo_final_`, bloquear render com mensagem clara.
7. **Shorts vs Long policy profiles** automáticos ao mudar aspect ratio.
8. **Capítulos a partir do NARRADORPRO** (títulos fortes) com fallback YouTube chapters.
9. **Não usar Credits Roll genérico** em documentários de nicho (bloquear role até props reais de equipe).
10. **Modo “só limpos”**: orquestrador ignora templates com `cleanliness: dirty` mesmo se approved.

---

## 12. Abordagem alternativa (mesma lógica, outro desenho)

### Alternativa A — **Camadas fixas + instâncias** (recomendada)

- 8 tracks fixas: Frame | Media | Effect | Content | Text | Chart | Transition | Brand
- Policy liga tracks; orquestrador só cria _instâncias_
- Mais previsível no Timeline Studio e no renderer

### Alternativa B — **Um único “Composition Plan” JSON**

- Arquivo `composition_plan.json` versionado no projeto, gerado pós-narração
- Render e Timeline só _materializam_ o plano
- Melhor para debug e re-render determinístico
- Custo: mais um artefato a migrar

### Alternativa C — **HyperFrames-first**

- Portar templates sujos para blocos HyperFrames do catálogo HeyGen
- Orquestração por registry id
- Só vale se a direção for migrar de Studio TSX → HyperFrames

**Recomendação**: Alternativa A + artefato leve da B (`composition_plan` embutido no storyboard / timeline studio), sem migrar para HyperFrames agora.

---

## 13. Testes (seams)

| Seam                                            | Teste                                                         |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `scoreStudioTemplateForTrigger` / pick por role | chart só se há número; effect só se policy.effects.on         |
| `enrichStudioTemplateScene`                     | sceneAsset preenchido; zero placeholder em props obrigatórios |
| `applyRenderTemplatePolicy`                     | end_card remove logo_final_; chapter insere N-1 clips         |
| Subscribe mid                                   | 9:16 em duration/2 ± tolerancia                               |
| NARRADORPRO parse                               | JSON placements válido; quote opcional                        |
| Inspector                                       | lock de slot sobrevive a re-plan                              |
| Regression                                      | `motionScenePlanner.test.js` sem depender de boost aleatório  |

---

## 14. Fora de escopo (por enquanto)

- Desenhar os frames de nicho (só lógica + toggle disabled)
- Reescrever manualmente todos os 166 sources de uma vez (priorizar: cinematic, intro-outro, chart-data, image-media)
- Migrar tudo para HyperFrames
- Editar TSX fonte dentro do Timing editor

---

## 15. Ordem de trabalho imediata (quando sair do plano)

1. Commit deste plano ✅
2. Fase 0 schema + UI policy
3. Fase 1 anti-aleatório (maior impacto percebido)
4. Fase 2 limpeza props/asset
5. Fase 3 renderer
6. Fase 4 NARRADORPRO
7. Fase 5 inspector

---

## 16. Mapa de arquivos (orientação, não engessar)

| Área             | Arquivos principais                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Policy / config  | `shared/productionConfig.js`, `frontend` aba Render / SettingsProduction                                               |
| Pick inteligente | `backend/remotionTemplateCatalogService.js`, `backend/motionScenePlanner.js`, `shared/studioTemplateRoleInjector.js`   |
| Roles            | `shared/studioTemplateRoles.js` (expandir)                                                                             |
| Props / limpeza  | `shared/studioTemplatePropsBinder.js`, `shared/remotionTemplateSourceRepair.js`, `shared/studioTemplatePlaceholder.js` |
| NARRADORPRO      | `backend/scriptQuality.js`, prompts NARRACAOPRO                                                                        |
| Renderer         | `remotion-renderer/src/LumieraTimeline.tsx`, `StudioTemplateOverlay.tsx`                                               |
| Timing UI        | `TimelineStudioClipInspector.tsx`, `studioClipInspectorSlots.ts`                                                       |
| Catálogo         | `backend/data/remotion-template-catalog.json`, Template Studio                                                         |
| Spec legado      | `specs/044-motion-scenes/*`, `.agents/remotiontemplatesinstruction.md`                                                 |

---

## 17. Critérios de sucesso

- Em projeto Engenharia longo, re-plan **não** preenche 5 overlays genéricos sem dado.
- Film Burn / Parallax, se policy on, aparecem **sobre** o asset da cena, não no lugar de um placeholder cinza.
- End card on → sem logo_final_ no final.
- Chapter on → um Chapter Title por bloco com título real.
- Shorts + subscribe_mid → reminder no meio.
- Quote / lower third / chart só quando NARRADORPRO (ou dado verificado) autoriza.
- Timing editor permite corrigir qualquer prop + asset sem reabrir Template Studio.
- Cada fase implementada termina commitada.
