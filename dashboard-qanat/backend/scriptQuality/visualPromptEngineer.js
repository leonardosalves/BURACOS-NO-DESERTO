import {
  DEFAULT_VISUAL_ASSET_STYLE,
  MAP_GEO_ACCURACY_CLAUSE,
  MAP_LABEL_LANGUAGE_CLAUSE,
  buildVisualAssetStyleDirective,
  enforceVisualAssetStyleInPrompt,
  getVisualAssetStyle,
  isMapOnlyPromptsEnabled,
  normalizeVisualAssetStyleId,
} from "../../shared/visualAssetStyles.js";

const LEGACY_LOCALIZED_TEXT_RULE =
  "Texto diegético e ambiental deve respeitar o local real da cena: placas de trânsito, fachadas, avisos, letreiros, documentos, uniformes, sinalização e inscrições devem aparecer primeiro no idioma oficial ou historicamente correto daquele país/região. Logo abaixo, inclua tradução legível em português do Brasil, menor e visualmente secundária. Não use placas, símbolos viários, nomes de estados, órgãos públicos, moedas, domínios, telefones ou padrões brasileiros em cenas ambientadas fora do Brasil. Textos editoriais sobrepostos pelo vídeo, como títulos, contadores, legendas e explicações, permanecem em português do Brasil. Se o local for o Brasil, use somente português do Brasil e não duplique tradução.";

export const VISUAL_MINIMAL_TEXT_RULE =
  "Clean source media: no baked-in titles, subtitles, captions, paragraphs, labels, logos, watermarks, letters or readable editorial text. All editorial text is added later as a separate Remotion overlay.";

export const VISUAL_DIEGETIC_TEXT_RULE =
  "If a real sign, document or interface is indispensable to the fact, preserve at most four essential words in its authentic local language; never duplicate a translation inside the generated media. Put the Brazilian Portuguese translation only in editor_notes or text_overlay metadata.";

// Compatibilidade com integrações antigas que importam este nome.
export const VISUAL_LOCALIZED_TEXT_RULE = VISUAL_MINIMAL_TEXT_RULE;

export const VIDEO_DIEGETIC_AUDIO_POLICY =
  "Diegetic sound only: rich realistic ambient and action SFX matching the scene materials and motion, continuous natural room tone; absolutely no speech, no narration, no dialogue, no talking, no singing, no music, no soundtrack, no score, no beat, no jingle.";

export function isVideoPromptType(type = "") {
  const t = String(type || "").toLowerCase();
  return t.includes("vídeo") || t.includes("video");
}

export function enforceVideoDiegeticAudioPolicy(prompt = "", type = "") {
  if (!isVideoPromptType(type)) return String(prompt || "").trim();
  let clean = String(prompt || "")
    .replace(VIDEO_DIEGETIC_AUDIO_POLICY, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (
    /diegetic sound only|no speech|no narration|no music|no dialogue/i.test(
      clean
    )
  ) {
    // Garante a política canônica no final sem duplicar blocos longos
    if (!clean.includes("Diegetic sound only:")) {
      return `${clean} ${VIDEO_DIEGETIC_AUDIO_POLICY}`.trim();
    }
    return clean;
  }
  return `${clean}${clean ? " " : ""}${VIDEO_DIEGETIC_AUDIO_POLICY}`;
}

/** SHORTS / 9:16 → vertical; LONGO / 16:9 → horizontal. */
export function resolveProjectAspectRatio(format = "SHORTS") {
  const f = String(format || "")
    .toUpperCase()
    .trim();
  if (f === "SHORTS" || f === "SHORT" || f === "9:16" || f.includes("9:16")) {
    return "9:16";
  }
  if (f === "LONGO" || f === "LONG" || f === "16:9" || f.includes("16:9")) {
    return "16:9";
  }
  return f === "SHORTS" ? "9:16" : "16:9";
}

export function aspectRatioClause(format = "SHORTS") {
  const aspect = resolveProjectAspectRatio(format);
  if (aspect === "9:16") {
    return "Vertical 9:16 portrait composition, full-frame mobile framing, generate strictly as 9:16 (portrait), not landscape";
  }
  return "Horizontal 16:9 widescreen cinematic composition, generate strictly as 16:9 (landscape), not portrait";
}

/**
 * Garante o aspect ratio do projeto no prompt (IMAGE e VIDEO).
 * Remove menções ao ratio errado e anexa a cláusula canônica.
 */
export function enforceAspectRatioInPrompt(prompt = "", format = "SHORTS") {
  const aspect = resolveProjectAspectRatio(format);
  let clean = String(prompt || "").trim();
  if (!clean) {
    return aspectRatioClause(format);
  }

  // Remove ratios e frases de composição conflitantes
  clean = clean
    .replace(/\bvertical\s*9\s*[:/]\s*16(?:\s*composition)?\b/gi, "")
    .replace(/\bhorizontal\s*16\s*[:/]\s*9(?:\s*composition)?\b/gi, "")
    .replace(
      /\b9\s*[:/]\s*16(?:\s*(?:portrait|vertical|composition|framing|image|video))?\b/gi,
      ""
    )
    .replace(
      /\b16\s*[:/]\s*9(?:\s*(?:landscape|widescreen|horizontal|composition|framing|image|video))?\b/gi,
      ""
    )
    .replace(
      /\bgenerate\s+strictly\s+as\s+(?:9\s*[:/]\s*16|16\s*[:/]\s*9)[^.]*\.?/gi,
      ""
    )
    .replace(
      /\b(?:full-frame\s+mobile\s+framing|widescreen\s+cinematic\s+composition|portrait\s+framing|landscape\s+framing)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*,/g, ",")
    .trim()
    .replace(/^[,\s.]+|[,\s.]+$/g, "");

  const clause = aspectRatioClause(format);
  // Já tem o ratio correto de forma explícita?
  const hasCorrect =
    aspect === "9:16"
      ? /9\s*[:/]\s*16/.test(clean) && /vertical|portrait|mobile/i.test(clean)
      : /16\s*[:/]\s*9/.test(clean) &&
        /horizontal|widescreen|landscape|cinematic/i.test(clean);

  if (hasCorrect) {
    return /[.!?]$/.test(clean) ? clean : `${clean}.`;
  }

  const base = clean.replace(/\.\s*$/, "").trim();
  return `${base}${base ? ". " : ""}${clause}.`.replace(/\.\s*\./g, ".");
}

export function enforceVisualLocalizedTextRule(
  prompt = "",
  { allowDiegeticText = false, mediaType = "", format = "SHORTS" } = {}
) {
  let clean = String(prompt || "").trim();
  clean = clean
    .replace(LEGACY_LOCALIZED_TEXT_RULE, "")
    .replace(VISUAL_MINIMAL_TEXT_RULE, "")
    .replace(VISUAL_DIEGETIC_TEXT_RULE, "")
    .replace(VIDEO_DIEGETIC_AUDIO_POLICY, "")
    .replace(
      /Todo e qualquer texto,[\s\S]*?Nunca gere texto em ingl(?:ê|e)s\.?/gi,
      ""
    )
    .replace(
      /Qualquer texto visível na imagem deve estar em português do Brasil\.?/gi,
      ""
    )
    .replace(/Texto visível em português do Brasil\.?/gi, "")
    .replace(
      /Any visible text(?:\/words)?[^.]*Portuguese \(Brazilian\)\.?/gi,
      ""
    )
    .replace(/Any visible text must be in Portuguese \(Brazilian\)\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // IMAGE: limpar lixo de vídeo (max N seconds / cinematic motion / drone moves / diegetic audio)
  if (!isVideoPromptType(mediaType)) {
    // import local to avoid circular deps — same rewrites as pipeline
    clean = clean
      .replace(
        /\b(?:epic\s+)?wide\s+aerial\s+drone\s+shot\b/gi,
        "wide high-angle aerial still"
      )
      .replace(
        /\b(?:aerial\s+)?drone\s+shot\b/gi,
        "high-angle aerial still photograph"
      )
      .replace(/\bdrone\s+(?:view|footage|clip|video)\b/gi, "aerial still view")
      .replace(/\bdrone\b/gi, "aerial")
      .replace(
        /\bslightly\s+descending\s+to\s+reveal\b/gi,
        "high angle revealing"
      )
      .replace(
        /\b(?:slowly\s+)?(?:descending|ascending|rising|lowering)\s+to\s+reveal\b/gi,
        "high angle revealing"
      )
      .replace(
        /\b(?:slowly\s+)?(?:descending|ascending|rising|lowering)\b/gi,
        ""
      )
      .replace(/\btracking\s+shot\b/gi, "side-angle still")
      .replace(/\bhandheld\s+(?:shot|camera|footage)?\b/gi, "sharp still")
      .replace(/\bdolly(?:\s+in|\s+out|\s+shot)?\b/gi, "composed still")
      .replace(/\bpush[\s-]?in\b/gi, "close still of")
      .replace(/\bpull[\s-]?out\b/gi, "wide still of")
      .replace(
        /\s*[,.]?\s*Cinematic motion(?:\s*,\s*max\s*\d{1,2}\s*seconds?)?(?:\s*,\s*no text)?\.?/gi,
        ""
      )
      .replace(
        /\s*[,.]?\s*max\s*\d{1,2}\s*seconds?(?:\s*,\s*no text)?\.?/gi,
        ""
      )
      .replace(/\s*[,.]?\s*Diegetic sound only:[^.]*\.?/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*,\s*,/g, ",")
      .trim();
  }
  const policy = allowDiegeticText
    ? `${VISUAL_MINIMAL_TEXT_RULE} ${VISUAL_DIEGETIC_TEXT_RULE}`
    : VISUAL_MINIMAL_TEXT_RULE;
  const withTextPolicy = `${clean}${clean ? " " : ""}${policy}`;
  const withAudio = enforceVideoDiegeticAudioPolicy(withTextPolicy, mediaType);
  return enforceAspectRatioInPrompt(withAudio, format);
}

export const NICHE_STYLE_MAP = {
  mystery:
    "Dark cinematic mood, deep shadows, volumetric lighting, warm gold accents, mysterious atmosphere, heavy realistic textures (oxidized bronze, ancient clay, forged steel)",
  true_crime:
    "Dark moody cinematic, high contrast, cold blue shadows, tense atmosphere, forensic detail, noir lighting",
  history:
    "Period-accurate cinematic, film grain, classic lenses, warm amber lighting for ancient scenes, cool steel for modern, rich textures of the era",
  science:
    "Clean modern cinematic, bright precise lighting with color accents, sharp detail, scientific visualization, volumetric light beams",
  pets: "Vibrant warm colors, soft cheerful lighting, expressive close-ups, playful atmosphere, shallow depth of field on animal features",
  luxury:
    "Premium cinematic, golden hour lighting, rich textures (leather, marble, chrome), heroic camera angles, sophisticated composition",
  motivation:
    "Epic inspirational, golden light, powerful compositions, silhouette shots, dramatic sky backgrounds, warm tones",
  horror:
    "Dark disturbing, high contrast, cold blue/red tones, deep shadows, unsettling angles, grain and noise, tension-building lighting",
  finance:
    "Luxurious clean, elegant lighting, wealth visual elements (gold, graphs, modern offices), sophisticated compositions, premium feel",
  geography:
    "Epic landscape cinematography, aerial drone shots, green/earth tones, clean sans-serif layout spaces, natural lighting",
  tech: "Premium dark backgrounds, neon-accented glows, code mockups/terminals, precise numeric counters, sharp modern aesthetics",
  food: "Warm appetizing lighting, macro close-ups, steam/texture detail, vibrant saturated colors, shallow depth of field",
  sports:
    "Dynamic action cinematography, fast motion, dramatic lighting, stadium atmospheres, freeze-frame moments",
  default:
    "Cinematic documentary style, dramatic lighting, sharp detail, photorealistic textures, professional composition",
};

export function detectNicheFromContent(
  strategy = {},
  narrative = "",
  hyperframe = ""
) {
  const text = [
    strategy.title_main,
    strategy.hook,
    strategy.tone,
    strategy.target_audience,
    narrative.slice(0, 2000),
    hyperframe,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(true.?crime|assassin|serial.?killer|desaparec|murder|forensic|csi)\b/i.test(
      text
    )
  )
    return "true_crime";
  if (
    /\b(horror|creepy|assombr|fantasma|demon|ghost|terror|medo|noite.?escura)\b/i.test(
      text
    )
  )
    return "horror";
  if (
    /\b(mistério|mystery|enigma|antiq|históri|ancient|civiliza|arqueolog|ruína|artifact)\b/i.test(
      text
    )
  )
    return "mystery";
  if (
    /\b(histór|history|guerra|war|impér|empire|revolução|revolution|século|century)\b/i.test(
      text
    )
  )
    return "history";
  if (
    /\b(ciência|science|físic|physics|químic|chemistry|biolog|experiment|quantum)\b/i.test(
      text
    )
  )
    return "science";
  if (
    /\b(pet|cachorro|gato|dog|cat|animal|fofo|cute|filhote|puppy|kitten)\b/i.test(
      text
    )
  )
    return "pets";
  if (
    /\b(luxo|luxury|mansão|mansion|ferrari|lamborghini|supercar|imóvel|yacht|rolex)\b/i.test(
      text
    )
  )
    return "luxury";
  if (
    /\b(motivaç|motivation|sucesso|success|mentalidade|mindset|inspiração|empreend)\b/i.test(
      text
    )
  )
    return "motivation";
  if (
    /\b(finanç|finance|dinheiro|money|investimento|invest|bitcoin|cripto|renda|salário)\b/i.test(
      text
    )
  )
    return "finance";
  if (
    /\b(geografi|geography|país|country|mapa|map|continent|ocean|montanha|desert)\b/i.test(
      text
    )
  )
    return "geography";
  if (
    /\b(tech|tecnolog|ia |\bai\b|robot|comput|software|hardware|program|code|server)\b/i.test(
      text
    )
  )
    return "tech";
  if (
    /\b(comida|food|receita|recipe|cozinha|kitchen|chef|gastrono|sabor|ingrediente)\b/i.test(
      text
    )
  )
    return "food";
  if (
    /\b(esporte|sport|futebol|soccer|basketball|atleta|olimp|campeon)\b/i.test(
      text
    )
  )
    return "sports";
  return "default";
}

/**
 * Extrai um "DNA visual" estável do vídeo — identidade que todas as cenas
 * devem carregar para parecerem do mesmo filme (não um álbum genérico).
 */
export function buildVisualIdentityBrief({
  strategy = {},
  narrative = "",
  hyperframe = "",
  niche = "default",
  format = "SHORTS",
  visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
  mapOnly = false,
} = {}) {
  const title = String(strategy.title_main || strategy.title || "").trim();
  const hook = String(strategy.hook || "").trim();
  const tone = String(strategy.tone || "").trim();
  const audience = String(strategy.target_audience || "").trim();
  const nicheStyle = NICHE_STYLE_MAP[niche] || NICHE_STYLE_MAP.default;
  const assetStyle = getVisualAssetStyle(visualAssetStyle);
  const mapOnlyActive = isMapOnlyPromptsEnabled(mapOnly);
  const firstLines = String(narrative || "")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");

  return {
    title: title || "Vídeo sem título",
    hook: hook || firstLines.slice(0, 180),
    tone: tone || niche.replace(/_/g, " "),
    audience:
      audience || (format === "SHORTS" ? "mobile / retenção" : "YouTube longo"),
    niche,
    visual_asset_style: assetStyle.id,
    visual_asset_style_label: assetStyle.label,
    map_only_prompts: mapOnlyActive,
    look: mapOnlyActive
      ? `${assetStyle.look}; period-accurate cartographic maps only`
      : assetStyle.look,
    style_clause: assetStyle.promptClause,
    palette_and_light: `${assetStyle.look}. Niche mood: ${nicheStyle}${
      mapOnlyActive
        ? ". Map-only mode: every frame is a historical/geographic map matching the era of the narration."
        : ""
    }`,
    hyperframe: String(hyperframe || "").trim() || null,
    continuity_rules: [
      `Look único do projeto: ${assetStyle.label} — ${assetStyle.promptClause}`,
      ...(mapOnlyActive
        ? [
            "MODO MAPAS: cada cena é um mapa informativo da época do acontecimento na fala",
            "Proibido retratos, b-roll genérico ou objetos sem geografia cartográfica",
          ]
        : []),
      "Mesma temperatura de cor e qualidade de lentes em todas as cenas",
      "Mesmo nível de realismo / estilização em todas as cenas — nunca misturar estilos",
      "Sujeitos recorrentes mantêm aparência, roupa, material e escala consistentes",
      "Cada cena avança a história visual; proibido reutilizar o mesmo 'establishing shot' genérico",
    ],
  };
}

export function buildVisualPromptEngineerSystemPrompt({
  niche = "",
  format = "SHORTS",
  hyperframePrompt = "",
  isListicle = false,
  listicleRank = 0,
  rankOrder = "desc",
  identityBrief = null,
  visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
  mapOnly = false,
} = {}) {
  const nicheStyle = NICHE_STYLE_MAP[niche] || NICHE_STYLE_MAP.default;
  const nicheLabel =
    niche === "default" ? "Geral / Documentário" : niche.replace(/_/g, " ");
  const aspect = resolveProjectAspectRatio(format);
  const aspectClause = aspectRatioClause(format);
  const mapOnlyActive = isMapOnlyPromptsEnabled(mapOnly);
  const styleDirective = buildVisualAssetStyleDirective(visualAssetStyle, {
    mapOnly: mapOnlyActive,
  });
  const identity = identityBrief || {
    title: "(definir pelo storyboard)",
    hook: "",
    tone: nicheLabel,
    audience: format === "SHORTS" ? "mobile" : "YouTube",
    palette_and_light: nicheStyle,
    visual_asset_style: styleDirective.id,
    visual_asset_style_label: styleDirective.label,
    map_only_prompts: mapOnlyActive,
    look: styleDirective.look,
    style_clause: styleDirective.promptClause,
    hyperframe: hyperframePrompt || null,
    continuity_rules: [],
  };

  return `Você é um **Diretor de Fotografia + Engenheiro de Prompts Visuais de elite**, especialista em transformar roteiros falados em **um único filme coerente**: cada imagem e cada vídeo é uma **peça inseparável da narração** — não ilustração decorativa, não B-roll genérico.

Seu trabalho não é "deixar o prompt mais bonito". É fazer com que **quem assiste entenda e sinta o roteiro olhando**, e **fique preso a cada frame** porque cada asset tem identidade, significado e motivo para existir.

MISSÃO CENTRAL
1) UNIDADE ROTEIRO ↔ VISUAL: a fala e a imagem completam uma à outra (prova, revelação, contraste, escala, emoção, mecanismo).
2) IDENTIDADE DO FILME: todas as cenas parecem do mesmo universo visual (DNA do vídeo).
3) INTERESSE POR FRAME: cada asset tem um "por que olhar agora" (gancho visual) — se o áudio falhasse, o frame ainda contaria algo.

NICHO DETECTADO: ${nicheLabel}
ESTILO BASE DO NICHO: ${nicheStyle}
FORMATO DO VÍDEO: ${format}
ASPECT RATIO OBRIGATÓRIO DO PROJETO: ${aspect}
CLÁUSULA DE FORMATO (cole no final de CADA prompt): "${aspectClause}"
${styleDirective.systemBlock}
${hyperframePrompt ? `HYPERFRAME (ESTILO UNIFICADO DO CANAL/PROJETO): ${hyperframePrompt}` : ""}
${isListicle ? `LISTICLE TOP ${listicleRank} — ordem ${rankOrder === "asc" ? "1→N (build-up)" : "N→1 (countdown)"}` : ""}

### DNA VISUAL DESTE VÍDEO (OBRIGATÓRIO EM TODAS AS CENAS)
- Título: ${identity.title}
- Gancho / promessa: ${identity.hook || "(derivar da narração)"}
- Tom: ${identity.tone}
- Público: ${identity.audience}
- Estilo visual do projeto: ${identity.visual_asset_style_label || styleDirective.label} (${identity.visual_asset_style || styleDirective.id})
- Look: ${identity.look || styleDirective.look}
- Cláusula de estilo (inglês): ${identity.style_clause || styleDirective.promptClause}
- Modo somente mapas: ${identity.map_only_prompts || mapOnlyActive ? "SIM — cada cena = mapa da época da fala" : "não"}
- Paleta / luz / textura: ${identity.palette_and_light}
${identity.hyperframe ? `- Hyperframe: ${identity.hyperframe}` : ""}
- Regras de continuidade:
${(identity.continuity_rules || []).map((r) => `  • ${r}`).join("\n") || "  • Manter coerência de cor, lente e realismo"}

### REGRAS OBRIGATÓRIAS (NUNCA QUEBRE)

**0. Peça única — Roteiro + Imagem = um só significado**
- O prompt NÃO pode ser um "tema genérico da fala". Ele deve mostrar o **momento específico** daquela frase: o detalhe, a prova, o antes/depois, o mecanismo, o rosto, a escala, a consequência.
- Pergunte mentalmente: "Se eu mutar o áudio, este frame ainda faz a pessoa ENTENDER a ideia?" Se não, reescreva.
- A imagem **completa** o que a voz diz: mostra o que a voz não cabe em palavras (textura, escala, tensão, ironia visual, contraste, evidência).
- PROIBIDO: stock genérico ("dramatic landscape", "thinking man silhouette", "abstract particles") quando a fala tem um sujeito concreto.
- PROIBIDO: repetir a mesma composição/ideia visual em cenas diferentes só mudando o texto.

**1. Alinhamento Total com a Narração (prova + emoção)**
- Cada prompt ilustra EXATAMENTE o narration_text da cena — e ainda entrega um **narrative_job** claro:
  - PROVE: evidencia visual do fato
  - REVEAL: revela o detalhe surpresa
  - CONTRAST: mostra o antes/depois ou o absurdo da escala
  - EXPLAIN: torna um mecanismo compreensível visualmente
  - FEEL: carrega a emoção da linha (medo, maravilha, urgência, ironia)
- Use prev_narration / next_narration do payload para continuidade: o final de uma cena deve "passar o bastão" visual para a próxima.

**1c. Mapas e geografia — NUNCA MENTIR (crítico)**
- Modelos de imagem inventam posição de cidades. **É proibido** pedir pins com nomes de cidades em posições decorativas/aleatórias.
- Em mapas: silhueta/costa/contorno da região devem ser reconhecíveis e corretos.
- Se for citar cidades (ex. Blumenau, Brusque, Gaspar em Santa Catarina), a posição **relativa** entre elas e em relação ao litoral tem de ser real; senão **omita os nomes** e mostre só o contorno correto do estado/região.
- Prefira mapa honesto **sem rótulos de cidade** a mapa “bonito” com geografia falsa.
- Nunca invente rios, fronteiras ou topônimos que a narração não exige.

**1d. Idioma dos rótulos DENTRO do mapa (crítico — SEMPRE PELO PAÍS, sem engessar)**
- O prompt de geração pode estar em inglês; o TEXTO PINTADO no mapa = idioma oficial/histórico do **país ou região que o mapa mostra**.
- Detecte o país pela narração/cena. Não force português nem inglês de forma fixa.
- Exemplos só ilustrativos: mapa do Brasil → português; França → francês; EUA → inglês; Japão → japonês; Roma antiga → latim.
- Proibido copiar substantivos genéricos em inglês (River, Ocean, Mountain) num mapa de país que não usa inglês — e proibido forçar português em mapa que não é do Brasil.
- Embute em todo prompt de mapa: ${MAP_LABEL_LANGUAGE_CLAUSE}

**1b. Identidade por asset (por que a pessoa se interessa)**
- Todo prompt deve conter um **visual_hook** embutido na descrição (não como título na imagem): o detalhe que faz scroll parar.
  Exemplos de ganchos válidos: escala impossível, textura hiper-real, contraste brutal, revelação no push-in, micro-ação humana, objeto icônico em ângulo heroico, luz volumétrica contando drama.
- Cada sujeito recorrente ganha **identity_tags** estáveis (ex.: "titanic-deck-1912", "amber-documentary-grain", "hero-low-angle") reutilizados nas cenas em que o mesmo sujeito volta.
- A identidade não é logo/texto — é aparência, material, época, lente, clima.

**2. Mídia Visual Limpa — Texto é Exceção (REGRA INQUEBRÁVEL)**
- Imagens e vídeos devem contar a história visualmente. Não grave títulos, legendas, frases, parágrafos, explicações, logos ou marcas d'água na mídia gerada.
- text_overlay e impact_text são metadados para o Remotion e NUNCA devem ser copiados para o prompt da imagem/vídeo.
- Regra padrão no fim de todo prompt: "${VISUAL_MINIMAL_TEXT_RULE}"
- Só marque diegetic_text_required=true quando ler uma placa, documento ou interface real for indispensável para compreender o fato. Nesse caso, limite o texto ambiental a quatro palavras no idioma autêntico e acrescente: "${VISUAL_DIEGETIC_TEXT_RULE}"
- Traduções e explicações em português ficam em editor_notes ou text_overlay, nunca duplicadas dentro da imagem/vídeo.

**3. Estilo Visual Adaptado ao Nicho + DNA do vídeo**
- Use o estilo do nicho: ${nicheStyle}
${hyperframePrompt ? `- Combine com o hyperframe: ${hyperframePrompt}` : "- Se não houver hyperframe, use o DNA do vídeo + nicho."}
- Todas as cenas devem parecer do **mesmo filme**. Se uma cena "quebrar o look", reescreva-a.

**4. Prompts de Vídeo (type contém "vídeo")**
- Se houver temporal_plan, ele é a fonte obrigatória: respeite target_duration_seconds, clip_count_required, clips e critical_action_deadline_seconds.
- Nunca presuma 7-10 segundos quando o TTS + Whisper já mediu a cena. Para cenas com vários clipes, descreva continuidade entre as tomadas sem repetir a ação.
- Sem temporal_plan, use duração provisória de 7-10 segundos e marque que aguarda a medição da voz.
- Movimento de câmera com **intenção narrativa** (não só estética): slow tracking = investigação; push-in = revelação; orbit = objeto icônico; whip pan = virada de ideia.
- Ação forte nos primeiros 2-3 segundos (hook visual).
- Ação importante termina antes do prazo crítico; post-roll sustenta o estado final e a transição para a próxima ideia.

**4b. Áudio diegético do VÍDEO (SONOPLASTIA NO PROMPT — OBRIGATÓRIO)**
A trilha SFX do editor NÃO cobre cenas de vídeo. O próprio vídeo gerado deve trazer a sonoplastia ambiente.
Inclua SEMPRE no prompt de vídeo (em inglês, no corpo do prompt):
1) SILÊNCIO DE VOZ: no speech, no dialogue, no talking, no narration, no voice-over, no singing, no human talking.
2) SEM MÚSICA: no music, no soundtrack, no score, no melody, no song, no beat, no jingle.
3) SÓ SOM DIEGÉTICO RICO: describe realistic ambient and action sound design that matches the visual (material, movement, environment) — wind, machinery, water, fire crackle, metal stress, crowd murmur, structural creaks, etc. Make the diegetic audio full and continuous (not dry silence), with natural room tone.
4) Exemplo de sufixo útil: "Diegetic sound only: rich realistic ambient and action SFX matching the scene; absolutely no speech, no narration, no dialogue, no music, no soundtrack."

**5. Prompts de Imagem (type contém "imagem")**
- Uma imagem ainda precisa de **história estática**: composição que conta o beat da frase.
- Impacto imediato em mobile: hierarquia clara (sujeito → detalhe → ambiente).
- Iluminação, ângulo, profundidade e mood precisos; área negativa limpa se houver overlay editorial no Remotion.
- **PROIBIDO em IMAGE:** "max 10 seconds", "cinematic motion", duração em segundos, camera movement continuous, diegetic audio policy, no speech/music (isso é só para VÍDEO). Still = frame único, sem tempo.
- **PROIBIDO em IMAGE (movimento de câmera):** drone shot, descending, ascending, tracking, dolly, orbit, push-in, fly-through, handheld footage. Use linguagem de FOTO: "high-angle aerial still", "wide establishing photograph", "medium close-up still" — nunca cinema em movimento.

**6. Aspect Ratio OBRIGATÓRIO — GERAR NO FORMATO CORRETO (INQUEBRÁVEL)**
- Aspect ratio do projeto: **${aspect}**
- TODO prompt (IMAGE e VIDEO) DEVE terminar com: "${aspectClause}"
- O gerador de imagem/vídeo deve **forçar** ${aspect}. Nunca peça o formato oposto.
${
  aspect === "9:16"
    ? `- SHORTS: composição VERTICAL portrait 9:16 — sujeito cabe no frame mobile; PROIBIDO widescreen/landscape/16:9.
- Prefira framing apertado, terços superior/centro, sem barras laterais vazias de paisagem.`
    : `- LONGO: composição HORIZONTAL 16:9 widescreen — PROIBIDO portrait/9:16 vertical.
- Prefira escala, profundidade e enquadramento cinematográfico horizontal.`
}
- Campo "aspect_ratio" em cada visual_prompt do JSON DEVE ser exatamente "${aspect}".

**7. Qualidade e retenção**
- Zero vago. Específico > "cinematic beautiful".
- Respeite countdown/listicle (não queime o #1 cedo).
- Evite anacronismos históricos.
- Em Shorts: pattern interrupt visual a cada 7–12s (mudança de escala, ângulo, textura ou movimento).

**8. Fidelidade ao Real (REGRA INQUEBRÁVEL)**
- Se a narração cita algo que EXISTE (monumento, veículo, animal, pessoa histórica, máquina, lugar, artefato), peça a COISA REAL com aparência verificável.
- PROIBIDO: genéricos inventados no lugar de nomes reais.
- OBRIGATÓRIO: nome do sujeito + traços físicos reais + estética documental/arquivo quando couber.
- Metáforas abstratas só quando NÃO há objeto real nomeado.

**9. Editor Notes**
- Transições, SFX e pattern interrupts que reforcem o beat da cena.
- Overlay editorial: 2–5 palavras no máximo; nunca colar a narração inteira.

### ESTRUTURA OBRIGATÓRIA DE CADA PROMPT (escreva em inglês no campo "prompt")
Monte o prompt nesta ordem, em prosa fluida (não como lista seca):
1) SUBJECT + IDENTITY — quem/o quê, com tags de identidade estáveis do DNA
2) NARRATIVE BEAT — o momento exato da fala (não o tema genérico)
3) VISUAL HOOK — o detalhe que prende o olhar em 1 segundo
4) SHOT + CAMERA — enquadramento e movimento com intenção
5) LIGHT + TEXTURE + ERA — coerente com o DNA e o nicho
6) CONTINUITY — âncora sutil com a cena anterior quando existir
7) SE VÍDEO: DIEGETIC AUDIO ONLY — ambient/action SFX rico + proibição total de fala/música/narração
8) ASPECT OBRIGATÓRIO ${aspect} + CLEAN MEDIA POLICY — cláusula de formato + mídia sem texto

### PROCESSO (CHAIN OF THOUGHT — interno, por cena)
1. Leia narration_text + prev + next.
2. Defina narrative_job (prove/reveal/contrast/explain/feel).
3. Liste o que a imagem deve fazer o cérebro entender em 1s.
4. Sujeito real? Descreva o real. Senão, símbolo forte e específico.
5. Escolha hook visual + shot + movimento.
6. Aplique DNA (cor, lente, realismo, identity_tags).
7. Remova qualquer texto editorial da mídia.
8. Escreva o prompt final denso e cinematográfico.

### FORMATO DE SAÍDA OBRIGATÓRIO
Retorne APENAS um JSON válido:

{
  "visual_identity": {
    "title": "...",
    "look": "1-2 frases do look unificado do filme",
    "palette": "cores/luz dominantes",
    "recurring_motifs": ["..."],
    "do_not": ["erros de identidade a evitar"]
  },
  "visual_prompts": [
    {
      "scene": "1.1",
      "block": 1,
      "narration_text": "trecho exato da narração",
      "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
      "aspect_ratio": "${aspect}",
      "narrative_job": "prove|reveal|contrast|explain|feel",
      "visual_hook": "gancho visual em 1 frase curta (PT-BR ok)",
      "identity_tags": ["tag-estavel-1", "tag-estavel-2"],
      "prompt": "prompt em inglês + cláusula ${aspect} + política de mídia limpa (IMAGE sem motion/drone/seconds; VIDEO com diegetic audio)",
      "diegetic_text_required": false,
      "editor_notes": "transição/SFX/pattern interrupt alinhados ao beat",
      "stock_query": "3-6 palavras em INGLÊS = o que ESTA cena mostra no frame (ex: se o prompt é prédio residencial → 'multi-story apartment building Copenhagen'; se é caminhão de lixo → 'garbage truck emptying trash bins'). NUNCA repita o tema global do vídeo em cenas de detalhe. PROIBIDO genérico: building, nature, city, industrial, energy, architecture"
    }
  ],
  "checklist": {
    "nicho_detectado": "${nicheLabel}",
    "tipo_conteudo": "...",
    "principais_correcoes": ["..."],
    "quality_score": 9.7,
    "notes": "como o filme virou uma peça única roteiro+imagem"
  },
  "style_adaptation_notes": "..."
}

Não adicione texto fora do JSON.`;
}

export function buildVisualPromptEngineerRequest(storyboard = {}, opts = {}) {
  const strategy = storyboard.strategy || {};
  const narrative = String(storyboard.narrative_script || "").trim();
  const visualPrompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const hyperframe = String(storyboard.hyperframe_prompt || "").trim();
  const editingMap = storyboard.editing_map || "";
  const listicle = storyboard.listicle || {};
  const format = opts.format || "SHORTS";
  const isListicle =
    listicle.content_mode === "LISTICLE" || opts.isListicle || false;
  const listicleRank = Number(listicle.rank_count || opts.listicleRank || 0);
  const rankOrder = listicle.rank_order || opts.rankOrder || "desc";
  const visualAssetStyle = normalizeVisualAssetStyleId(
    opts.visualAssetStyle ||
      storyboard.visual_asset_style ||
      storyboard.technical_config?.visual_asset_style ||
      DEFAULT_VISUAL_ASSET_STYLE
  );
  const mapOnly = isMapOnlyPromptsEnabled(
    opts.mapOnly ??
      opts.visualMapOnly ??
      storyboard.visual_map_only_prompts ??
      storyboard.technical_config?.visual_map_only_prompts
  );

  const niche = detectNicheFromContent(strategy, narrative, hyperframe);
  const identityBrief = buildVisualIdentityBrief({
    strategy,
    narrative,
    hyperframe,
    niche,
    format,
    visualAssetStyle,
    mapOnly,
  });

  const systemPrompt = buildVisualPromptEngineerSystemPrompt({
    niche,
    format,
    hyperframePrompt: hyperframe,
    isListicle,
    listicleRank,
    rankOrder,
    identityBrief,
    visualAssetStyle,
    mapOnly,
  });

  const storyboardPayload = {
    strategy: {
      title_main: strategy.title_main || strategy.title || "",
      hook: strategy.hook || "",
      tone: strategy.tone || "",
      target_audience: strategy.target_audience || "",
      promise: strategy.promise || strategy.factual_premise || "",
    },
    narrative_script: narrative.slice(0, 12000),
    visual_identity_brief: identityBrief,
    visual_prompts: visualPrompts.map((vp, index) => {
      const prev = visualPrompts[index - 1];
      const next = visualPrompts[index + 1];
      return {
        scene: vp.scene,
        block: vp.block,
        narration_text: String(vp.narration_text || "").slice(0, 600),
        prev_narration: prev
          ? String(prev.narration_text || "").slice(0, 220)
          : "",
        next_narration: next
          ? String(next.narration_text || "").slice(0, 220)
          : "",
        type: vp.type || "imagem IA 2k",
        prompt: String(vp.prompt || "").slice(0, 700),
        editor_notes: String(vp.editor_notes || "").slice(0, 240),
        stock_query: String(vp.stock_query || "").slice(0, 80),
        text_overlay: vp.text_overlay || undefined,
        diegetic_text_required: vp.diegetic_text_required === true,
        duration_seconds: vp.duration_seconds || undefined,
        speech_start: vp.speech_start ?? undefined,
        speech_end: vp.speech_end ?? undefined,
        temporal_plan: vp.temporal_plan || undefined,
        narrative_job: vp.narrative_job || undefined,
        visual_hook: vp.visual_hook || undefined,
        identity_tags: Array.isArray(vp.identity_tags)
          ? vp.identity_tags.slice(0, 6)
          : undefined,
      };
    }),
    hyperframe_prompt: hyperframe.slice(0, 500),
    editing_map:
      typeof editingMap === "string"
        ? editingMap.slice(0, 500)
        : JSON.stringify(editingMap).slice(0, 500),
  };

  return {
    systemPrompt,
    userPrompt: `Reprocesse TODOS os visual_prompts como UM FILME COESO.

Prioridades absolutas:
1) Unidade roteiro↔imagem: cada frame completa e explica a fala (não decora).
2) Identidade visual estável do DNA em todas as cenas.
3) Cada asset com gancho de interesse (por que olhar este frame).
4) Continuidade entre prev_narration → cena → next_narration.
5) ESTILO VISUAL DO PROJETO obrigatório: ${identityBrief.visual_asset_style_label} — embutir a cláusula de estilo em cada prompt.
${mapOnly ? "6) MODO MAPAS: cada visual_prompt é um mapa informativo da época do trecho narrado — proibido b-roll que não seja cartografia." : "6) Se a cena for mapa/cartografia/território (mesmo fora do modo mapas): geografia REAL obrigatória — proibido inventar posição de cidades."}
7) MAPAS / GEOGRAFIA (OBRIGATÓRIO SEMPRE QUE HOUVER MAPA): ${MAP_GEO_ACCURACY_CLAUSE}
   - Se for citar cidades, posições relativas reais; senão omita nomes e mostre só o contorno correto da região.
   - Embute a cláusula GEO em inglês em CADA prompt de mapa.
8) RÓTULOS DO MAPA = IDIOMA DO PAÍS/TERRITÓRIO MOSTRADO (flexível): ${MAP_LABEL_LANGUAGE_CLAUSE}
   - Nunca engessar um idioma: detectar o país da cena e rotular na língua daquele país.

Corrija prompts genéricos, desalinhados, fracos ou "stock sem alma".
Siga rigorosamente o system prompt.

STORYBOARD:
${JSON.stringify(storyboardPayload, null, 2)}`,
    detectedNiche: niche,
    identityBrief,
    visualAssetStyle,
    mapOnly,
  };
}

/**
 * Aplica a cláusula de estilo do projeto a todos os prompts de cena.
 */
export function applyProjectVisualAssetStyleToPrompts(
  visualPrompts = [],
  styleId = DEFAULT_VISUAL_ASSET_STYLE,
  opts = {}
) {
  const style = normalizeVisualAssetStyleId(styleId);
  const mapOnly = isMapOnlyPromptsEnabled(opts.mapOnly);
  return (Array.isArray(visualPrompts) ? visualPrompts : []).map((vp) => {
    if (!vp || typeof vp !== "object") return vp;
    const next = {
      ...vp,
      visual_asset_style: style,
      ...(mapOnly ? { visual_map_only: true } : {}),
    };
    const enforceOpts = { mapOnly };
    if (vp.prompt)
      next.prompt = enforceVisualAssetStyleInPrompt(
        vp.prompt,
        style,
        enforceOpts
      );
    if (vp.image_prompt)
      next.image_prompt = enforceVisualAssetStyleInPrompt(
        vp.image_prompt,
        style,
        enforceOpts
      );
    if (vp.video_prompt)
      next.video_prompt = enforceVisualAssetStyleInPrompt(
        vp.video_prompt,
        style,
        enforceOpts
      );
    if (vp.ai_video_prompt)
      next.ai_video_prompt = enforceVisualAssetStyleInPrompt(
        vp.ai_video_prompt,
        style,
        enforceOpts
      );
    if (mapOnly) {
      // Mapas informativos preferem still; só vídeo se já for motion cartográfico
      const t = String(vp.type || "").toLowerCase();
      if (!t.includes("vídeo") && !t.includes("video")) {
        next.type = next.type || "imagem IA 2k";
        next.media_mode = next.media_mode || "image";
      }
    }
    return next;
  });
}

export {
  DEFAULT_VISUAL_ASSET_STYLE,
  enforceVisualAssetStyleInPrompt,
  normalizeVisualAssetStyleId,
  getVisualAssetStyle,
  buildVisualAssetStyleDirective,
  isMapOnlyPromptsEnabled,
};
