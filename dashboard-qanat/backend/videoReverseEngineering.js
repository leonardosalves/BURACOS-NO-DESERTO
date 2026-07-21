import {
  analyzeVideoUnderstanding,
  fetchVideoContextViaYtDlp,
} from "./videoUnderstandingService.js";
import {
  DEFAULT_VISUAL_ASSET_STYLE,
  buildVisualAssetStyleDirective,
  isMapOnlyPromptsEnabled,
  normalizeVisualAssetStyleId,
} from "../shared/visualAssetStyles.js";
import { SHORTS_MAX_SCENE_SECONDS } from "./shortsSceneChunker.js";
import {
  isCacheEnabled,
  getCacheKey,
  readCache,
  writeCache,
} from "./reverseEngineeringCache.js";

function cleanText(value, max = 20_000) {
  return String(value || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, max);
}

function asList(value, max = 100) {
  return Array.isArray(value)
    ? value
        .map((item) => cleanText(item, 2_000))
        .filter(Boolean)
        .slice(0, max)
    : [];
}

function normalizeSpeechSegments(scene, narration) {
  const raw = Array.isArray(scene?.speech_segments)
    ? scene.speech_segments
    : Array.isArray(scene?.dialogue_turns)
      ? scene.dialogue_turns
      : [];
  const segments = raw
    .map((segment, index) => ({
      id:
        cleanText(segment?.id, 80) ||
        `speech-${String(index + 1).padStart(2, "0")}`,
      speaker:
        cleanText(segment?.speaker || segment?.character, 160) ||
        `Personagem ${index + 1}`,
      role: cleanText(segment?.role, 80) || "character",
      text: cleanText(segment?.text || segment?.speech, 3_000),
    }))
    .filter((segment) => segment.text);
  if (!segments.length) return [];

  const normalizedNarration = cleanText(narration, 6_000).replace(/\s+/g, " ");
  const normalizedSegments = segments
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizedSegments === normalizedNarration ? segments : [];
}

export function extractReverseEngineeringJson(text) {
  const raw = cleanText(text, 200_000);
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function looksLikeMotionScene(scene = {}) {
  const text = [
    scene.visual_description,
    scene.video_prompt,
    scene.image_prompt,
    scene.shot,
    scene.camera,
    scene.media_reason,
  ]
    .map((part) => cleanText(part, 2_000).toLowerCase())
    .join(" ");
  return /\b(move|moving|motion|walk|run|spin|rotate|pan|tilt|dolly|tracking|orbit|zoom|fly|fall|crash|pour|flow|transform|explode|reveal|open|close|gesture|hand|mechanism|girar|girando|movimento|desloca|correndo|caminhando|abre|fecha|explode|derrama|transform)\b/i.test(
    text
  );
}

function looksLikeStaticScene(scene = {}) {
  const text = [
    scene.visual_description,
    scene.image_prompt,
    scene.video_prompt,
    scene.shot,
    scene.media_reason,
  ]
    .map((part) => cleanText(part, 2_000).toLowerCase())
    .join(" ");
  if (looksLikeMotionScene(scene)) return false;
  return /\b(document|documento|mapa|map|portrait|retrato|foto|still|estatic|estát|frozen|close-up of|facade|fachada|artefato|artifact|coin|moeda|medal|blueprint|diagram|diagrama|placa|sign|inscription|inscrição|archival|arquivo|estampa|selo)\b/i.test(
    text
  );
}

/**
 * Resolve media_type prioritizing LLM confidence; falls back to keyword heuristics.
 */
function resolveSceneMediaType(scene) {
  const llmType = String(
    scene?.media_type || scene?.mediaType || ""
  ).toLowerCase();
  const llmConfidence = String(scene?.confidence || "").toLowerCase();
  const llmReason = cleanText(scene?.media_reason || scene?.mediaReason, 1_000);

  // 1) LLM with high confidence and valid type → trust LLM
  if (
    (llmType === "video" || llmType === "image") &&
    llmConfidence === "alta"
  ) {
    return {
      media_type: llmType,
      confidence: "alta",
      reason: llmReason || `Decisão do LLM (${llmType})`,
      source: "llm",
    };
  }

  // 2) Fallback: keyword heuristics
  const motion = looksLikeMotionScene(scene);
  const static_ = looksLikeStaticScene(scene);
  let heuristicType;
  if (motion && !static_) heuristicType = "video";
  else if (static_ && !motion) heuristicType = "image";
  else heuristicType = llmType === "video" ? "video" : "image"; // tie-break by LLM

  return {
    media_type: heuristicType,
    confidence: "media",
    reason: llmReason || "Classificado por heurística de palavras-chave",
    source: "heuristic",
  };
}

function normalizeScene(
  scene,
  index,
  mediaStrategy = "adaptive",
  format = "SHORTS"
) {
  const maxSceneDuration = format === "SHORTS" ? SHORTS_MAX_SCENE_SECONDS : 120;
  const duration = Math.max(
    1,
    Math.min(Number(scene?.duration_sec) || 5, maxSceneDuration)
  );
  const narration = cleanText(scene?.narration, 6_000);
  const visualDescription = cleanText(scene?.visual_description, 4_000);
  let imagePrompt = cleanText(scene?.image_prompt, 6_000);
  const explicitVideoPrompt = cleanText(scene?.video_prompt, 6_000);
  const requestedMediaType = cleanText(
    scene?.media_type || scene?.mediaType,
    30
  ).toLowerCase();
  // Use resolveSceneMediaType for intelligent classification
  const mediaDecision = resolveSceneMediaType(scene);
  let mediaType =
    mediaStrategy === "video_only"
      ? "video"
      : requestedMediaType === "video" || requestedMediaType === "vídeo"
        ? "video"
        : requestedMediaType === "image" || requestedMediaType === "imagem"
          ? "image"
          : explicitVideoPrompt && !imagePrompt
            ? "video"
            : imagePrompt && !explicitVideoPrompt
              ? "image"
              : mediaDecision.media_type;

  // Adaptive: never invent video for clearly static beats
  if (
    mediaStrategy === "adaptive" &&
    mediaType === "video" &&
    looksLikeStaticScene(scene) &&
    !looksLikeMotionScene(scene)
  ) {
    mediaType = "image";
  }

  if (mediaType === "image" && !imagePrompt) {
    imagePrompt =
      visualDescription ||
      [
        cleanText(scene?.shot, 300),
        "photorealistic still, sharp detail, no text or watermark",
      ]
        .filter(Boolean)
        .join(". ");
  }

  const videoPrompt =
    mediaType === "video"
      ? explicitVideoPrompt ||
        [
          visualDescription || imagePrompt,
          cleanText(scene?.shot, 300),
          cleanText(scene?.camera, 500),
          "natural continuous action, cinematic movement, no text or watermark",
        ]
          .filter(Boolean)
          .join(". ")
      : "";

  let mediaReason = cleanText(scene?.media_reason || scene?.mediaReason, 1_000);
  if (!mediaReason) {
    mediaReason =
      mediaType === "video"
        ? "Movimento ou transformação indispensável para a cena."
        : "Composição estática precisa — imagem comunica melhor que vídeo genérico.";
  }

  return {
    id:
      cleanText(scene?.id, 80) || `scene-${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    timecode: cleanText(scene?.timecode, 50),
    duration_sec: duration,
    narration,
    speech_segments: normalizeSpeechSegments(scene, narration),
    visual_description: visualDescription,
    shot: cleanText(scene?.shot, 300) || "medium shot",
    camera:
      cleanText(scene?.camera, 500) ||
      (mediaType === "video"
        ? "movimento suave e cinematografico"
        : "enquadramento estavel, sem movimento de camera"),
    media_type: mediaType,
    media_reason: mediaReason,
    image_prompt: mediaType === "image" ? imagePrompt : "",
    video_prompt: videoPrompt,
    on_screen_text: cleanText(scene?.on_screen_text, 800),
    transition: cleanText(scene?.transition, 300),
    audio_cue: cleanText(scene?.audio_cue, 500),
    confidence: ["alta", "media", "baixa"].includes(scene?.confidence)
      ? scene.confidence
      : "media",
  };
}

/**
 * Se a IA devolveu 100% vídeo no modo adaptive, reclassifica batidas estáticas
 * (ou a cada 3ª cena) para imagem — mínimo ~1/3 com 3+ cenas.
 */
function rebalanceAdaptiveMediaMix(scenes = [], mediaStrategy = "adaptive") {
  if (mediaStrategy !== "adaptive" || scenes.length < 3) return scenes;
  const videoCount = scenes.filter((s) => s.media_type === "video").length;
  if (videoCount < scenes.length) return scenes;

  const minImages = Math.max(1, Math.ceil(scenes.length / 3));
  const ranked = scenes
    .map((scene, index) => ({
      index,
      score:
        (looksLikeStaticScene(scene) ? 100 : 0) +
        (!looksLikeMotionScene(scene) ? 40 : 0) +
        (index % 3 === 1 ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, minImages)
    .map((item) => item.index);
  const convertSet = new Set(ranked);

  return scenes.map((scene, index) => {
    if (!convertSet.has(index)) return scene;
    const imagePrompt =
      cleanText(scene.image_prompt, 6_000) ||
      cleanText(scene.visual_description, 4_000) ||
      cleanText(scene.video_prompt, 6_000);
    return {
      ...scene,
      media_type: "image",
      media_reason:
        scene.media_reason ||
        "Rebalanceamento adaptive: batida estática fica melhor como imagem.",
      image_prompt: imagePrompt,
      video_prompt: "",
      camera: "enquadramento estavel, sem movimento de camera",
    };
  });
}

export function normalizeReverseEngineeringResult(raw = {}, context = {}) {
  const mediaStrategy =
    context.mediaStrategy === "video_only" ? "video_only" : "adaptive";
  const scenes = rebalanceAdaptiveMediaMix(
    (Array.isArray(raw.scenes) ? raw.scenes : [])
      .map((scene, index) =>
        normalizeScene(scene, index, mediaStrategy, context.format)
      )
      .filter(
        (scene) =>
          scene.narration ||
          scene.visual_description ||
          scene.image_prompt ||
          scene.video_prompt
      ),
    mediaStrategy
  );
  const sourceTranscript = cleanText(
    raw.source_transcript || context.sourceTranscript,
    80_000
  );
  const reconstructedNarration = cleanText(
    raw.reconstructed_narration || sourceTranscript,
    80_000
  );

  return {
    version: 2,
    source: {
      url: cleanText(context.url, 2_000),
      platform: cleanText(context.platform, 80),
      title: cleanText(context.title || raw.source_title, 500),
      author: cleanText(context.author, 300),
      thumbnail: cleanText(context.thumbnail, 2_000),
      duration_sec:
        Number(context.durationSec) || Number(raw.duration_sec) || null,
    },
    mode: context.mode === "faithful" ? "faithful" : "transformative",
    media_strategy: mediaStrategy,
    format: context.format === "LONGO" ? "LONGO" : "SHORTS",
    title: cleanText(raw.title, 500) || cleanText(context.title, 500),
    hook: cleanText(raw.hook, 2_000),
    content_summary: cleanText(raw.content_summary, 6_000),
    source_transcript: sourceTranscript,
    reconstructed_narration: reconstructedNarration,
    narration_notes: asList(raw.narration_notes, 30),
    visual_language: cleanText(raw.visual_language, 4_000),
    editing_blueprint: cleanText(raw.editing_blueprint, 6_000),
    music_direction: cleanText(raw.music_direction, 2_000),
    sfx_direction: cleanText(raw.sfx_direction, 2_000),
    retention_mechanics: asList(raw.retention_mechanics, 30),
    scenes,
    warnings: asList(raw.warnings, 30),
    evidence: {
      transcript_available: Boolean(sourceTranscript),
      multimodal: Boolean(context.multimodal),
      analysis_source: cleanText(context.analysisSource, 120),
    },
  };
}

export function buildReverseEngineeringPrompt({
  url,
  format = "SHORTS",
  mode = "transformative",
  niche = "Geral",
  instructions = "",
  metadata = {},
  understanding = {},
  transcript = "",
  mediaStrategy = "adaptive",
  visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
  visualMapOnly = false,
} = {}) {
  const faithful = mode === "faithful";
  const videoOnly = mediaStrategy === "video_only";
  const mapOnly = isMapOnlyPromptsEnabled(visualMapOnly);
  const styleDirective = buildVisualAssetStyleDirective(
    normalizeVisualAssetStyleId(visualAssetStyle),
    { mapOnly }
  );
  return `Voce e o diretor de engenharia reversa audiovisual do Lumiera.

OBJETIVO
Reconstruir tecnicamente o video de referencia como um pacote de producao para o wizard Lumiera: roteiro/narracao, estrutura visual cena a cena e prompts completos de imagem e video.

FONTE
- URL: ${url}
- Titulo: ${metadata.title || "desconhecido"}
- Autor: ${metadata.author || metadata.uploader || "desconhecido"}
- Duracao: ${metadata.duration_sec || understanding.duration_estimate_sec || "desconhecida"}s
- Formato de saida: ${format === "LONGO" ? "video longo 16:9" : "Short vertical 9:16"}
- Nicho: ${niche || "Geral"}
- Modo: ${faithful ? "ADAPTACAO FIEL — preservar sequencia e informacao quando a fonte pertence ao usuario ou ha permissao" : "TRANSFORMACAO CRIATIVA — preservar mecanismo, fatos e ritmo, mas reescrever formulacoes e visuais"}
- Estrategia de midia: ${videoOnly ? "SOMENTE VIDEO — todas as cenas devem ter media_type=video" : "IA DECIDE — escolher image ou video cena por cena"}
- ${styleDirective.systemBlock}
- Instrucao do editor: ${instructions || "nenhuma"}

ENTENDIMENTO MULTIMODAL
${JSON.stringify(understanding || {}, null, 2).slice(0, 16_000)}

TRANSCRICAO/LEGENDAS RECUPERADAS
${cleanText(transcript, 60_000) || "Nao disponivel. Nao invente falas exatas; marque incerteza."}

Retorne APENAS JSON valido neste schema:
{
  "source_title": "titulo da fonte",
  "duration_sec": 0,
  "title": "titulo de producao",
  "hook": "gancho inicial",
  "content_summary": "resumo fiel do conteudo",
  "source_transcript": "transcricao recuperada limpa; nunca inventar trechos ausentes",
  "reconstructed_narration": "narracao completa pronta para TTS",
  "narration_notes": ["pronuncia, pausas ou incertezas"],
  "visual_language": "paleta, iluminacao, composicao, textura, proporcao",
  "editing_blueprint": "ritmo, cortes, pattern interrupts, overlays e captions",
  "music_direction": "genero, energia e arco musical",
  "sfx_direction": "efeitos pontuais sincronizados, sem poluicao",
  "retention_mechanics": ["mecanismos observados"],
  "scenes": [{
    "id": "scene-01",
    "timecode": "00:00-00:05",
    "duration_sec": 5,
    "narration": "todas as falas desta cena, em ordem, sem nomes/rotulos de personagem",
    "speech_segments": [{
      "id": "speech-01",
      "speaker": "Narrador ou nome do personagem",
      "role": "narrator|character",
      "text": "fala literal deste personagem"
    }],
    "visual_description": "o que aparece e como se move",
    "shot": "tipo de plano/enquadramento",
    "camera": "movimento de camera",
    "media_type": "image|video",
    "media_reason": "justificativa objetiva para a midia escolhida",
    "image_prompt": "preencher somente quando media_type=image",
    "video_prompt": "preencher somente quando media_type=video",
    "on_screen_text": "texto na tela",
    "transition": "entrada/saida",
    "audio_cue": "SFX ou mudanca musical apenas quando necessario",
    "confidence": "alta|media|baixa"
  }],
  "warnings": ["lacunas, baixa confianca ou direitos a confirmar"]
}

REGRAS
- Cubra o video inteiro na ordem; nao devolva apenas um resumo.
- ${videoOnly ? "MODO SOMENTE VIDEO: media_type deve ser video em TODAS as cenas; gere video_prompt completo e deixe image_prompt vazio." : "MODO IA DECIDE (OBRIGATORIO VARIAR): escolha image OU video cena a cena. PROIBIDO devolver todas as cenas como video se houver 3+ cenas."}
- ${videoOnly ? "Nao devolva nenhuma cena de imagem." : "Use image para retratos, documentos, mapas, arquitetura estatica, artefatos, placas, selos, comparacoes lado a lado e momentos congelados. Meta: ~1/3 a 2/3 das cenas em image quando o conteudo permitir."}
- ${videoOnly ? "Todo video_prompt deve conter acao concreta, sujeito, ambiente, camera, luz, continuidade e evolucao temporal; nao descreva apenas um frame parado." : "Use video SOMENTE quando movimento for indispensavel: acao, mecanismo em funcionamento, transformacao, deslocamento, reacao, demonstracao ou timing fisico."}
- ${videoOnly ? "Se o trecho original for estatico, planeje movimento editorial realista de camera, parallax, revelacao de detalhes ou animacao do objeto sem inventar fatos." : "Uma imagem forte e precisa e SEMPRE preferivel a um video generico de camera deslizando. Preencha SOMENTE o prompt da midia escolhida (o outro fica string vazia) e justifique em media_reason."}
- Cada cena deve ter o prompt escolhido utilizavel isoladamente e consistencia visual entre cenas.
- Se duas ou mais pessoas falarem DENTRO DA MESMA CENA, mantenha uma unica cena e crie um item em "speech_segments" para cada turno de fala, na ordem correta. Nao divida nem duplique a cena visual.
- A concatenacao de speech_segments[].text, separada apenas por espacos, deve ser IDENTICA a scenes[].narration. Nao inclua "Fulano:" ou rotulos de personagem no texto falado.
- Use "role":"narrator" para a voz externa e "role":"character" para falas diegeticas. Mesmo quando houver apenas uma voz, devolva um speech_segment para explicitar quem fala.
- A soma aproximada das duracoes deve acompanhar a fonte ou o formato solicitado.
- Nunca alegue ter visto um detalhe que nao aparece nas evidencias.
- No modo transformativo, nao copie frases distintivas literalmente; reescreva com a mesma informacao.
- No modo fiel, use somente a transcricao realmente recuperada e registre qualquer lacuna em warnings.
- O roteiro visual precisa ser concreto: sujeito, acao, ambiente, camera, luz, lente, movimento e transicao.`;
}

function fallbackScenes(
  understanding = {},
  transcript = "",
  mediaStrategy = "adaptive"
) {
  const beats = Array.isArray(understanding.structure_beats)
    ? understanding.structure_beats
    : [];
  const parts = cleanText(transcript, 80_000)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const count = Math.max(beats.length, Math.min(parts.length, 12), 1);
  const grouped = Array.from({ length: count }, () => []);
  parts.forEach((part, index) => grouped[index % count].push(part));
  const total = Number(understanding.duration_estimate_sec) || count * 5;
  return Array.from({ length: count }, (_, index) => {
    const mediaType = mediaStrategy === "video_only" ? "video" : "image";
    const description =
      beats[index] || understanding.summary || "Cena documental";
    return {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      duration_sec: Math.max(2, Number((total / count).toFixed(1))),
      narration: grouped[index].join(" "),
      visual_description:
        beats[index] ||
        understanding.visual_description ||
        "Visual a confirmar",
      media_type: mediaType,
      media_reason:
        mediaType === "video"
          ? "Modo configurado para somente videos."
          : "Contingencia conservadora: imagem permite revisao antes da producao.",
      image_prompt:
        mediaType === "image"
          ? `${description}, composicao cinematografica, luz natural, alta fidelidade visual`
          : "",
      video_prompt:
        mediaType === "video"
          ? `${description}, acao natural continua, camera cinematografica suave, continuidade visual`
          : "",
      confidence: "baixa",
    };
  });
}

export async function runVideoReverseEngineering({
  url,
  format = "SHORTS",
  mode = "transformative",
  niche = "Geral",
  instructions = "",
  mediaStrategy = "adaptive",
  visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
  visualMapOnly = false,
  callGeminiWithRetry,
  apiKey,
  workspaceDir,
  getGeminiModel: _getGeminiModel,
} = {}) {
  // Cache: return previous result if available (same video/format/mode/strategy)
  const cacheKey = getCacheKey({ url, format, mode, mediaStrategy });
  if (isCacheEnabled() && workspaceDir) {
    const cached = readCache(workspaceDir, cacheKey);
    if (cached) {
      return { ok: true, result: cached, fromCache: true };
    }
  }

  const [video, context] = await Promise.all([
    analyzeVideoUnderstanding({
      url,
      format,
      question:
        "Observe o video inteiro e detalhe cenas, falas, enquadramentos, movimentos, textos na tela, transicoes e ritmo.",
      callGeminiWithRetry,
      apiKey,
      workspaceDir,
    }),
    fetchVideoContextViaYtDlp(url),
  ]);

  if (!video.ok && !context.ok) {
    return {
      ok: false,
      error:
        video.error || context.error || "Nao foi possivel analisar o video.",
    };
  }

  const metadata = {
    ...(video.metadata || {}),
    title: video.metadata?.title || context.title || "",
    author: video.metadata?.author || context.uploader || "",
    thumbnail: video.metadata?.thumbnail || context.thumbnail || "",
    duration_sec: video.metadata?.duration_sec || context.duration_sec || null,
  };
  const understanding = video.understanding || {};
  const transcript = cleanText(
    context.transcript || understanding.transcript_excerpt,
    80_000
  );
  const prompt = buildReverseEngineeringPrompt({
    url,
    format,
    mode,
    niche,
    instructions,
    mediaStrategy,
    visualAssetStyle,
    visualMapOnly,
    metadata,
    understanding,
    transcript,
  });

  const junkNarrationRe =
    /^(uncertain|incerto|incerta|unknown|n\/a|none|null|undefined|sem dados|não sei|nao sei|lorem ipsum|texto de exemplo|exemplo|sample|placeholder|transcri[çc][ãa]o|transcript|sem narração|\[.*\]|\{.*\})\b/i;

  function isWeakReverseResult(obj, context = {}) {
    if (!obj || typeof obj !== "object") return true;
    const narration = cleanText(
      obj.reconstructed_narration || obj.source_transcript || "",
      80_000
    );
    const scenes = Array.isArray(obj.scenes) ? obj.scenes : [];
    if (narration.length < 80 || junkNarrationRe.test(narration.trim())) {
      return true;
    }
    if (scenes.length < 2) return true;

    // >50% scenes missing visual prompts
    const scenesSemPrompt = scenes.filter(
      (s) => !cleanText(s?.image_prompt || s?.video_prompt, 6_000)
    );
    if (scenesSemPrompt.length > scenes.length * 0.5) return true;

    // >50% scenes missing narration
    const scenesSemNarracao = scenes.filter(
      (s) =>
        !cleanText(
          s?.narration_text || s?.narration || s?.narration_excerpt,
          2_000
        )
    );
    if (scenesSemNarracao.length > scenes.length * 0.5) return true;

    // Total duration deviates >70% from source
    const sourceDuration = Number(context.durationSec || 0);
    if (sourceDuration > 0) {
      const totalDur = scenes.reduce(
        (sum, s) => sum + (Number(s?.duration_sec) || 0),
        0
      );
      if (
        totalDur > 0 &&
        Math.abs(totalDur - sourceDuration) > sourceDuration * 0.7
      ) {
        return true;
      }
    }

    return false;
  }

  // Dynamic maxTokens: longer videos generate more scenes, need more tokens to avoid JSON truncation
  const MAX_OUTPUT_TOKENS_CAP =
    Number(process.env.REVERSE_MAX_OUTPUT_TOKENS) || 16000;
  const estimatedScenes = Math.max(
    6,
    Math.ceil((Number(metadata?.duration_sec) || 300) / 8)
  );
  const dynamicMaxTokens = Math.min(
    MAX_OUTPUT_TOKENS_CAP,
    6000 + estimatedScenes * 450
  );

  let parsed = null;
  let llmWarnings = [];
  try {
    // 1) Active provider (OpenRouter / NVIDIA / xAI / Gemini / local)
    const response = await callGeminiWithRetry(apiKey, prompt, {
      projectDir: workspaceDir,
      maxRetries: 2,
      temperature: mode === "faithful" ? 0.15 : 0.35,
      activityLabel: "Engenharia reversa",
      activityDetail: String(url || "").slice(0, 120),
      maxTokens: dynamicMaxTokens,
    });
    parsed = extractReverseEngineeringJson(response);
    if (isWeakReverseResult(parsed, { durationSec: metadata?.duration_sec })) {
      llmWarnings.push(
        "Primeira passagem do provedor ativo devolveu narração/cenas fracas — tentando reforço."
      );
      parsed = null;
    }
  } catch (error) {
    console.warn("[VideoReverseEngineering] LLM:", error.message);
    llmWarnings.push(`Falha no provedor ativo: ${error.message}`);
  }

  // 2) Feedback-driven second pass on the SAME configured provider
  if (
    !parsed ||
    isWeakReverseResult(parsed, { durationSec: metadata?.duration_sec })
  ) {
    try {
      console.warn(
        "[VideoReverseEngineering] Segunda passagem no provedor ativo (JSON completo)."
      );

      // Build feedback-enriched repair prompt
      const problemas = [];
      if (parsed === null) {
        problemas.push(
          "A resposta anterior NÃO retornou JSON válido completo (possivelmente truncado)."
        );
      } else {
        const scenesPrev = Array.isArray(parsed.scenes) ? parsed.scenes : [];
        if (scenesPrev.length < 2) {
          problemas.push(
            `Retornou apenas ${scenesPrev.length} cena(s) — são necessárias várias cenas cobrindo TODO o vídeo.`
          );
        }
        const semPrompt = scenesPrev.filter(
          (s) => !cleanText(s?.image_prompt || s?.video_prompt, 6_000)
        );
        if (semPrompt.length) {
          problemas.push(
            `${semPrompt.length} cena(s) sem prompt visual válido.`
          );
        }
        const semNarr = scenesPrev.filter(
          (s) => !cleanText(s?.narration || s?.narration_text, 2_000)
        );
        if (semNarr.length) {
          problemas.push(`${semNarr.length} cena(s) sem narração.`);
        }
        const narrPrev = cleanText(
          parsed.reconstructed_narration || "",
          80_000
        );
        if (narrPrev.length < 80) {
          problemas.push("Narração reconstruída muito curta ou incompleta.");
        }
      }

      const repairPrompt =
        prompt +
        "\n\n---\n⚠️ A TENTATIVA ANTERIOR FALHOU. Problemas detectados:\n" +
        (problemas.length
          ? problemas.map((p) => `- ${p}`).join("\n")
          : "- Resultado abaixo da qualidade esperada.") +
        "\n\nCorrija TODOS os problemas acima. Retorne APENAS o JSON completo e válido, sem truncar, cobrindo o vídeo inteiro com cenas detalhadas e prompts visuais específicos.";

      const response = await callGeminiWithRetry(apiKey, repairPrompt, {
        projectDir: workspaceDir,
        maxRetries: 3,
        temperature: mode === "faithful" ? 0.1 : 0.25,
        activityLabel: "Engenharia reversa (2ª passagem)",
        activityDetail: String(url || "").slice(0, 120),
        maxTokens: dynamicMaxTokens,
      });
      const repaired = extractReverseEngineeringJson(response);
      if (
        repaired &&
        !isWeakReverseResult(repaired, { durationSec: metadata?.duration_sec })
      ) {
        parsed = repaired;
        llmWarnings.push(
          "Resultado obtido na 2ª passagem do provedor ativo (com feedback corretivo)."
        );
      }
    } catch (error) {
      console.warn(
        "[VideoReverseEngineering] 2ª passagem falhou:",
        error.message
      );
    }
  }

  if (!parsed) {
    // Contingência: preferir transcript real do yt-dlp, nunca "uncertain"
    const safeNarration =
      cleanText(transcript, 80_000) ||
      cleanText(understanding.summary, 6_000) ||
      cleanText(metadata.title, 500);
    parsed = {
      title: metadata.title,
      hook: understanding.hook_first_3s,
      content_summary: understanding.summary,
      source_transcript: transcript || safeNarration,
      reconstructed_narration: safeNarration,
      visual_language: understanding.visual_description,
      retention_mechanics: understanding.what_works_for_retention,
      scenes: fallbackScenes(
        understanding,
        transcript || safeNarration,
        mediaStrategy
      ),
      warnings: [
        "Resultado de contingencia: o LLM nao devolveu JSON completo. Revise narração e cenas antes de produzir.",
        ...llmWarnings,
      ],
    };
  } else if (llmWarnings.length) {
    parsed.warnings = [
      ...(Array.isArray(parsed.warnings) ? parsed.warnings : []),
      ...llmWarnings,
    ];
  }

  const result = normalizeReverseEngineeringResult(parsed, {
    url,
    format,
    mode,
    mediaStrategy,
    sourceTranscript: transcript,
    platform: video.parsed?.platform,
    title: metadata.title,
    author: metadata.author,
    thumbnail: metadata.thumbnail,
    durationSec: metadata.duration_sec,
    multimodal: understanding.multimodal,
    analysisSource: understanding.analysis_source,
  });

  // Save to cache for future reuse
  if (result && workspaceDir) writeCache(workspaceDir, cacheKey, result);

  return { ok: true, result, fromCache: false };
}
