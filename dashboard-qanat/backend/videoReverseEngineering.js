import {
  analyzeVideoUnderstanding,
  fetchVideoContextViaYtDlp,
} from "./videoUnderstandingService.js";

const REVERSE_ENGINEERING_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

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

function normalizeScene(scene, index) {
  const duration = Math.max(1, Math.min(Number(scene?.duration_sec) || 5, 120));
  const narration = cleanText(scene?.narration, 6_000);
  return {
    id:
      cleanText(scene?.id, 80) || `scene-${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    timecode: cleanText(scene?.timecode, 50),
    duration_sec: duration,
    narration,
    speech_segments: normalizeSpeechSegments(scene, narration),
    visual_description: cleanText(scene?.visual_description, 4_000),
    shot: cleanText(scene?.shot, 300) || "medium shot",
    camera:
      cleanText(scene?.camera, 500) || "movimento suave e cinematografico",
    image_prompt: cleanText(scene?.image_prompt, 6_000),
    video_prompt: cleanText(scene?.video_prompt, 6_000),
    on_screen_text: cleanText(scene?.on_screen_text, 800),
    transition: cleanText(scene?.transition, 300),
    audio_cue: cleanText(scene?.audio_cue, 500),
    confidence: ["alta", "media", "baixa"].includes(scene?.confidence)
      ? scene.confidence
      : "media",
  };
}

export function normalizeReverseEngineeringResult(raw = {}, context = {}) {
  const scenes = (Array.isArray(raw.scenes) ? raw.scenes : [])
    .map(normalizeScene)
    .filter(
      (scene) =>
        scene.narration ||
        scene.visual_description ||
        scene.image_prompt ||
        scene.video_prompt
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
} = {}) {
  const faithful = mode === "faithful";
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
    "image_prompt": "prompt autonomo detalhado para gerar o frame, sem citar a fonte",
    "video_prompt": "prompt autonomo detalhado com sujeito, acao, ambiente, camera, luz e continuidade",
    "on_screen_text": "texto na tela",
    "transition": "entrada/saida",
    "audio_cue": "SFX ou mudanca musical apenas quando necessario",
    "confidence": "alta|media|baixa"
  }],
  "warnings": ["lacunas, baixa confianca ou direitos a confirmar"]
}

REGRAS
- Cubra o video inteiro na ordem; nao devolva apenas um resumo.
- Cada cena deve ter prompts utilizaveis isoladamente e consistencia visual entre cenas.
- Se duas ou mais pessoas falarem DENTRO DA MESMA CENA, mantenha uma unica cena e crie um item em "speech_segments" para cada turno de fala, na ordem correta. Nao divida nem duplique a cena visual.
- A concatenacao de speech_segments[].text, separada apenas por espacos, deve ser IDENTICA a scenes[].narration. Nao inclua "Fulano:" ou rotulos de personagem no texto falado.
- Use "role":"narrator" para a voz externa e "role":"character" para falas diegeticas. Mesmo quando houver apenas uma voz, devolva um speech_segment para explicitar quem fala.
- A soma aproximada das duracoes deve acompanhar a fonte ou o formato solicitado.
- Nunca alegue ter visto um detalhe que nao aparece nas evidencias.
- No modo transformativo, nao copie frases distintivas literalmente; reescreva com a mesma informacao.
- No modo fiel, use somente a transcricao realmente recuperada e registre qualquer lacuna em warnings.
- O roteiro visual precisa ser concreto: sujeito, acao, ambiente, camera, luz, lente, movimento e transicao.`;
}

function fallbackScenes(understanding = {}, transcript = "") {
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
  return Array.from({ length: count }, (_, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    duration_sec: Math.max(2, Number((total / count).toFixed(1))),
    narration: grouped[index].join(" "),
    visual_description:
      beats[index] || understanding.visual_description || "Visual a confirmar",
    image_prompt: `${beats[index] || understanding.summary || "Cena documental"}, composicao cinematografica, luz natural, alta fidelidade visual`,
    video_prompt: `${beats[index] || understanding.summary || "Cena documental"}, movimento natural, camera cinematografica suave, continuidade visual`,
    confidence: "baixa",
  }));
}

export async function runVideoReverseEngineering({
  url,
  format = "SHORTS",
  mode = "transformative",
  niche = "Geral",
  instructions = "",
  callGeminiWithRetry,
  apiKey,
  workspaceDir,
  getGeminiModel,
} = {}) {
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
    metadata,
    understanding,
    transcript,
  });

  let parsed = null;
  try {
    const response = await callGeminiWithRetry(apiKey, prompt, {
      models: getGeminiModel
        ? [getGeminiModel(workspaceDir), ...REVERSE_ENGINEERING_MODELS]
        : REVERSE_ENGINEERING_MODELS,
      projectDir: workspaceDir,
      forceProvider: "gemini",
      maxRetries: 2,
      temperature: mode === "faithful" ? 0.15 : 0.35,
    });
    parsed = extractReverseEngineeringJson(response);
  } catch (error) {
    console.warn("[VideoReverseEngineering] LLM:", error.message);
  }

  if (!parsed) {
    parsed = {
      title: metadata.title,
      hook: understanding.hook_first_3s,
      content_summary: understanding.summary,
      source_transcript: transcript,
      reconstructed_narration: transcript,
      visual_language: understanding.visual_description,
      retention_mechanics: understanding.what_works_for_retention,
      scenes: fallbackScenes(understanding, transcript),
      warnings: [
        "Resultado de contingencia: revise os prompts e a divisao de cenas antes de produzir.",
      ],
    };
  }

  const result = normalizeReverseEngineeringResult(parsed, {
    url,
    format,
    mode,
    sourceTranscript: transcript,
    platform: video.parsed?.platform,
    title: metadata.title,
    author: metadata.author,
    thumbnail: metadata.thumbnail,
    durationSec: metadata.duration_sec,
    multimodal: understanding.multimodal,
    analysisSource: understanding.analysis_source,
  });

  return { ok: true, result };
}
