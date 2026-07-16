const LEGACY_LOCALIZED_TEXT_RULE =
  "Texto diegético e ambiental deve respeitar o local real da cena: placas de trânsito, fachadas, avisos, letreiros, documentos, uniformes, sinalização e inscrições devem aparecer primeiro no idioma oficial ou historicamente correto daquele país/região. Logo abaixo, inclua tradução legível em português do Brasil, menor e visualmente secundária. Não use placas, símbolos viários, nomes de estados, órgãos públicos, moedas, domínios, telefones ou padrões brasileiros em cenas ambientadas fora do Brasil. Textos editoriais sobrepostos pelo vídeo, como títulos, contadores, legendas e explicações, permanecem em português do Brasil. Se o local for o Brasil, use somente português do Brasil e não duplique tradução.";

export const VISUAL_MINIMAL_TEXT_RULE =
  "Clean source media: no baked-in titles, subtitles, captions, paragraphs, labels, logos, watermarks, letters or readable editorial text. All editorial text is added later as a separate Remotion overlay.";

export const VISUAL_DIEGETIC_TEXT_RULE =
  "If a real sign, document or interface is indispensable to the fact, preserve at most four essential words in its authentic local language; never duplicate a translation inside the generated media. Put the Brazilian Portuguese translation only in editor_notes or text_overlay metadata.";

// Compatibilidade com integrações antigas que importam este nome.
export const VISUAL_LOCALIZED_TEXT_RULE = VISUAL_MINIMAL_TEXT_RULE;

export function enforceVisualLocalizedTextRule(
  prompt = "",
  { allowDiegeticText = false } = {}
) {
  let clean = String(prompt || "").trim();
  clean = clean
    .replace(LEGACY_LOCALIZED_TEXT_RULE, "")
    .replace(VISUAL_MINIMAL_TEXT_RULE, "")
    .replace(VISUAL_DIEGETIC_TEXT_RULE, "")
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
  const policy = allowDiegeticText
    ? `${VISUAL_MINIMAL_TEXT_RULE} ${VISUAL_DIEGETIC_TEXT_RULE}`
    : VISUAL_MINIMAL_TEXT_RULE;
  return `${clean}${clean ? " " : ""}${policy}`;
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

export function buildVisualPromptEngineerSystemPrompt({
  niche = "",
  format = "SHORTS",
  hyperframePrompt = "",
  isListicle = false,
  listicleRank = 0,
  rankOrder = "desc",
} = {}) {
  const nicheStyle = NICHE_STYLE_MAP[niche] || NICHE_STYLE_MAP.default;
  const nicheLabel =
    niche === "default" ? "Geral / Documentário" : niche.replace(/_/g, " ");

  return `Você é um **Engenheiro de Prompts Visuais Sênior de nível mundial**, especialista em criar prompts extremamente eficazes para geração de imagens e vídeos com IA (Grok Imagine, Kling AI, Runway, Luma Dream Machine, Pika, etc.).

Sua missão é transformar os visual_prompts fornecidos em prompts de altíssima qualidade que maximizem retenção, engajamento e performance em YouTube Shorts (9:16) e vídeos longos (16:9).

NICHO DETECTADO: ${nicheLabel}
ESTILO VISUAL DO NICHO: ${nicheStyle}
FORMATO DO VÍDEO: ${format}
${hyperframePrompt ? `HYPERFRAME (ESTILO UNIFICADO): ${hyperframePrompt}` : ""}
${isListicle ? `LISTICLE TOP ${listicleRank} — ordem ${rankOrder === "asc" ? "1→N (build-up)" : "N→1 (countdown)"}` : ""}

### REGRAS OBRIGATÓRIAS (NUNCA QUEBRE)

**1. Alinhamento Total com a Narração**
- Cada prompt visual deve ilustrar EXATAMENTE o que está sendo dito no narration_text da cena.
- O visual deve funcionar como "prova visual" ou reforço emocional da fala.

**2. Mídia Visual Limpa — Texto é Exceção (REGRA INQUEBRÁVEL)**
- Imagens e vídeos devem contar a história visualmente. Não grave títulos, legendas, frases, parágrafos, explicações, logos ou marcas d'água na mídia gerada.
- text_overlay e impact_text são metadados para o Remotion e NUNCA devem ser copiados para o prompt da imagem/vídeo.
- Regra padrão no fim de todo prompt: "${VISUAL_MINIMAL_TEXT_RULE}"
- Só marque diegetic_text_required=true quando ler uma placa, documento ou interface real for indispensável para compreender o fato. Nesse caso, limite o texto ambiental a quatro palavras no idioma autêntico e acrescente: "${VISUAL_DIEGETIC_TEXT_RULE}"
- Traduções e explicações em português ficam em editor_notes ou text_overlay, nunca duplicadas dentro da imagem/vídeo.

**3. Estilo Visual Adaptado ao Nicho**
- Use o estilo do nicho detectado: ${nicheStyle}
${hyperframePrompt ? `- Combine com o hyperframe do projeto: ${hyperframePrompt}` : "- Se não houver hyperframe, siga o estilo do nicho."}
- Mantenha coerência visual em TODAS as cenas.

**4. Prompts de Vídeo (type contém "vídeo")**
- Se houver temporal_plan, ele é a fonte obrigatória: respeite target_duration_seconds, clip_count_required, clips e critical_action_deadline_seconds.
- Nunca presuma 7-10 segundos quando o TTS + Whisper já mediu a cena. Para cenas com vários clipes, descreva continuidade entre as tomadas sem repetir a ação.
- Sem temporal_plan, use duração provisória de 7-10 segundos e marque que aguarda a medição da voz.
- Movimento de câmera claro e intencional: slow tracking shot, push-in, slow motion, orbit, pan, tilt, whip pan, match cut.
- Ação ou evolução visual que combine com o ritmo da narração.
- Algo visualmente forte nos primeiros 2-3 segundos.
- A ação importante deve terminar antes do prazo crítico; use o post-roll apenas para sustentar o estado final e a transição.

**5. Prompts de Imagem (type contém "imagem")**
- Composição cinematográfica forte. Quando houver overlay editorial, reserve apenas área negativa limpa; não renderize palavras na imagem.
- Impacto visual imediato.
- Descreva iluminação, ângulo, profundidade e mood com precisão.

**6. Otimização por Aspect Ratio (Obrigatório em todos os prompts)**
${
  format === "SHORTS"
    ? "- Composição vertical 9:16 otimizada para mobile, framing apertado, sujeito centralizado ou em terços superiores/inferiores, movimentos de câmera preferencialmente verticais."
    : "- Composição widescreen 16:9 cinematográfica, shots amplos ou pans horizontais quando apropriado, maior profundidade de campo."
}
- O prompt deve funcionar bem nos dois formatos quando possível.

**7. Regras de Qualidade**
- Evite prompts genéricos ou vagos. Seja específico, detalhado e visualmente rico.
- Respeite a estrutura (countdown → evite revelar #1 nas primeiras cenas).
- Evite anacronismos em conteúdo histórico.
- Foque em retenção: visuals que prendam atenção nos primeiros segundos.
- Em Shorts, crie pattern interrupts visuais a cada 7-12 segundos.

**8. Fidelidade ao Real (REGRA INQUEBRÁVEL)**
- Se a narração cita algo que EXISTE no mundo real (monumento, edifício, veículo, nave, animal, pessoa histórica, obra, máquina, lugar, artefato, evento documentado), o prompt DEVE pedir a COISA REAL — não uma versão inventada, genérica ou fictícia sobre o tema.
- PROIBIDO: "a mysterious spacecraft", "ancient ruins", "generic Roman building" quando a narração nomeia Mars Climate Orbiter, Panteão, Canal do Panamá, Vasa, Torre Eiffel, etc.
- OBRIGATÓRIO: nomear o sujeito real + características físicas verificáveis + estilo documental/foto de arquivo/filmagem autêntica.
- Exemplos de sufixos úteis no prompt (em inglês): "documentary-style photorealistic footage of the actual [subject]", "archival photograph aesthetic", "real-world accurate depiction", "based on known historical appearance".
- Metáforas e conceitos abstratos (sem objeto real) podem ser visuais simbólicos — mas NUNCA substitua um fato concreto por fantasia.
- Em vídeo IA: movimento de câmera sobre o objeto REAL (órbita do satélite real, eclusas reais, estrutura real) — não cena sci-fi inventada.

**9. Editor Notes**
- Melhore editor_notes com transições, SFX e pattern interrupts.
- No máximo um overlay editorial curto por cena, idealmente de 2 a 5 palavras. Não repita a narração inteira na tela.

### PROCESSO DE RACIOCÍNIO (CHAIN OF THOUGHT — faça internamente antes de cada prompt)

1. Leia o narration_text.
2. Identifique o objetivo emocional/visual daquela frase.
3. O sujeito é algo real e identificável? Se sim, descreva O OBJETO/LUGAR/PESSOA REAL — não invente.
4. Verifique se o prompt atual está alinhado ou precisa de correção.
5. Escolha o melhor shot + movimento de câmera.
6. Garanta que segue o estilo do nicho.
7. Remova texto editorial da mídia. Se texto diegético for indispensável, limite-o e mande a tradução para os metadados de edição.
8. Escreva o prompt mais detalhado e cinematográfico possível.

### FORMATO DE SAÍDA OBRIGATÓRIO

Retorne APENAS um JSON válido:

{
  "visual_prompts": [
    {
      "scene": "1.1",
      "block": 1,
      "narration_text": "trecho exato da narração",
      "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
      "prompt": "prompt cinematográfico completo em inglês + política de mídia sem texto no final",
      "diegetic_text_required": false,
      "editor_notes": "instruções de edição aprimoradas",
      "stock_query": "2-5 palavras em inglês"
    }
  ],
  "checklist": {
    "nicho_detectado": "${nicheLabel}",
    "tipo_conteudo": "...",
    "principais_correcoes": ["..."],
    "quality_score": 9.7,
    "notes": "..."
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

  const niche = detectNicheFromContent(strategy, narrative, hyperframe);

  const systemPrompt = buildVisualPromptEngineerSystemPrompt({
    niche,
    format,
    hyperframePrompt: hyperframe,
    isListicle,
    listicleRank,
    rankOrder,
  });

  const storyboardPayload = {
    strategy,
    narrative_script: narrative.slice(0, 12000),
    visual_prompts: visualPrompts.map((vp) => ({
      scene: vp.scene,
      block: vp.block,
      narration_text: String(vp.narration_text || "").slice(0, 400),
      type: vp.type || "imagem IA 2k",
      prompt: String(vp.prompt || "").slice(0, 500),
      editor_notes: String(vp.editor_notes || "").slice(0, 200),
      stock_query: String(vp.stock_query || "").slice(0, 80),
      text_overlay: vp.text_overlay || undefined,
      diegetic_text_required: vp.diegetic_text_required === true,
      duration_seconds: vp.duration_seconds || undefined,
      speech_start: vp.speech_start ?? undefined,
      speech_end: vp.speech_end ?? undefined,
      temporal_plan: vp.temporal_plan || undefined,
    })),
    hyperframe_prompt: hyperframe.slice(0, 500),
    editing_map:
      typeof editingMap === "string"
        ? editingMap.slice(0, 500)
        : JSON.stringify(editingMap).slice(0, 500),
  };

  return {
    systemPrompt,
    userPrompt: `Analise e reprocesse TODOS os visual_prompts do storyboard abaixo. Corrija prompts genéricos, desalinhados ou fracos. Siga rigorosamente as regras do system prompt.\n\nSTORYBOARD:\n${JSON.stringify(storyboardPayload, null, 2)}`,
    detectedNiche: niche,
  };
}
