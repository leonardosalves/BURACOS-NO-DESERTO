/**
 * Análise de vídeo de referência — padrão OpenMontage video-reference-analyst (skill markdown).
 * URL → brief estruturado para Creator / VideoAgent.
 */

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

export function parseReferenceUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return { valid: false, error: "URL vazia" };

  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m?.[1]) {
      return {
        valid: true,
        platform: url.includes("/shorts/") ? "youtube_shorts" : "youtube",
        videoId: m[1],
        canonicalUrl: `https://www.youtube.com/watch?v=${m[1]}`,
      };
    }
  }

  if (/tiktok\.com/i.test(url)) {
    const videoId = url.match(/\/video\/(\d+)/i)?.[1] || null;
    return { valid: true, platform: "tiktok", videoId, canonicalUrl: url };
  }
  if (/instagram\.com\/(reel|p)\//i.test(url)) {
    return {
      valid: true,
      platform: "instagram",
      videoId: null,
      canonicalUrl: url,
    };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return {
        valid: true,
        platform: "generic",
        videoId: null,
        canonicalUrl: url,
      };
    }
  } catch {
    /* fallthrough */
  }

  return {
    valid: false,
    error: "URL não reconhecida — use YouTube, Shorts, TikTok ou Instagram",
  };
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Lumiera-OpenMontage/1.0",
      ...(opts.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchYoutubeMetadata(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  try {
    const data = await fetchJson(oembedUrl);
    return {
      title: data.title || "",
      author: data.author_name || "",
      thumbnail:
        data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      provider: data.provider_name || "YouTube",
      watchUrl,
    };
  } catch (err) {
    return {
      title: "",
      author: "",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      provider: "YouTube",
      watchUrl,
      oembedError: err.message,
    };
  }
}

export function buildReferenceAnalysisPrompt({
  parsed,
  metadata,
  format,
  niche,
  topic,
}) {
  const fmt = format === "LONGO" ? "vídeo longo (16:9)" : "Short (9:16, ≤60s)";
  return `Você é o analista de vídeo de referência do Lumiera (padrão OpenMontage).

Analise o vídeo de referência abaixo e produza um brief JSON para inspirar um NOVO vídeo no Lumiera — não é cópia, é diferenciação criativa.

REFERÊNCIA:
- URL: ${parsed.canonicalUrl}
- Plataforma: ${parsed.platform}
- Título: ${metadata.title || "(desconhecido)"}
- Canal: ${metadata.author || "(desconhecido)"}

PRODUÇÃO DESEJADA:
- Formato Lumiera: ${fmt}
- Nicho: ${niche || "Geral"}
- Tópico do usuário (se houver): ${topic || "(derivar do referência com twist)"}

Responda APENAS com JSON válido (sem markdown), neste schema:
{
  "content_summary": "2 frases sobre o que o vídeo trata",
  "style_profile": "1 frase — pacing, energia, tratamento visual",
  "structure": { "estimated_duration_sec": number, "scene_count_estimate": number, "pacing": "fast|medium|slow" },
  "motion_profile": { "dominant": "stock_broll|motion_graphics|mixed|talking_head", "slideshow_risk": "low|medium|high" },
  "hook_technique": "técnica do gancho nos primeiros 3s",
  "what_works": ["2-3 pontos específicos"],
  "five_aspects": {
    "subject": "string ou N/A",
    "subject_motion": "string ou N/A",
    "scene": "overlays + POV + setting",
    "spatial_framing": "shot sizes e posição",
    "camera": "movimento, velocidade, estabilidade"
  },
  "concepts": [
    {
      "id": "A",
      "title": "título do conceito",
      "inspired_by": "o que mantém do referência",
      "creative_twist": "o que muda — obrigatório ser diferente",
      "visual_plan": "stock Remotion / HyperFrames / ComfyUI",
      "audio_plan": "narração Kokoro/Fish + trilha",
      "duration_sec": number
    }
  ],
  "recommended_concept": "A|B|C",
  "lumiera_requirement": "1 parágrafo em PT-BR para colar no VideoAgent/Creator",
  "creator_title": "título sugerido ≤60 chars",
  "creator_hook": "gancho verbal ≤12 palavras"
}

Regras:
- Sempre 2 ou 3 concepts com twists distintos — nunca cópia carbono.
- lumiera_requirement deve ser acionável no Lumiera (Creator + stock + overlays + metadados).
- Para Shorts: gancho forte, pattern interrupts, CTA final.
- Se não puder ver o vídeo, infira pelo título/canal/plataforma e marque incerteza em content_summary.`;
}

function extractJsonFromText(text) {
  const raw = String(text || "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function buildFallbackBrief({ parsed, metadata, format, niche, topic }) {
  const isShort = format !== "LONGO";
  const title = metadata.title || "Vídeo de referência";
  const twist =
    topic || `versão ${niche || "curiosidades"} com ângulo surpreendente`;
  const creatorTitle = isShort
    ? `${title.slice(0, 40)} — reimaginado`
    : title.slice(0, 60);

  return {
    content_summary: `Referência: "${title}" (${metadata.author || parsed.platform}). Análise heurística — configure Gemini para brief completo.`,
    style_profile: isShort
      ? "Ritmo rápido, cortes curtos, gancho nos 3s"
      : "Narrativa documental, blocos temáticos",
    structure: {
      estimated_duration_sec: isShort ? 45 : 480,
      scene_count_estimate: isShort ? 6 : 12,
      pacing: isShort ? "fast" : "medium",
    },
    motion_profile: {
      dominant: "stock_broll",
      slideshow_risk: "medium",
    },
    hook_technique: "Pergunta ou fato chocante nos primeiros 3 segundos",
    what_works: [
      "Gancho claro no título",
      "Estrutura em blocos",
      "Visual de apoio à narração",
    ],
    five_aspects: {
      subject: "Derivar do tema do título",
      subject_motion: "N/A — inferir com IA",
      scene: "B-roll stock + lower-thirds Lumiera",
      spatial_framing: isShort ? "CU/MS alternados" : "MS/WS documental",
      camera: "Stock com leve Ken Burns no Remotion",
    },
    concepts: [
      {
        id: "A",
        title: creatorTitle,
        inspired_by: `Pacing e estrutura de "${title}"`,
        creative_twist: twist,
        visual_plan: "Pexels/Pixabay + overlays HyperFrames",
        audio_plan: "Kokoro PT-BR + Epidemic BGM",
        duration_sec: isShort ? 45 : 480,
      },
      {
        id: "B",
        title: `O que ninguém te contou sobre ${title.slice(0, 30)}`,
        inspired_by: "Tom de revelação do referência",
        creative_twist: "Contra-narrativa ou fato contraintuitivo",
        visual_plan: "Remotion counters + lower-thirds",
        audio_plan: "Fish Speech com tags de ênfase",
        duration_sec: isShort ? 50 : 420,
      },
    ],
    recommended_concept: "A",
    lumiera_requirement: `Criar ${isShort ? "Short viral" : "vídeo longo"} inspirado em "${title}" (${parsed.canonicalUrl}) com twist: ${twist}. Manter gancho forte e pacing ${isShort ? "rápido" : "documental"}, usar stock + overlays Lumiera, metadados SEO.`,
    creator_title: creatorTitle,
    creator_hook: isShort
      ? "Você viu isso — mas não dessa forma."
      : "A história que o vídeo original não contou.",
    _fallback: true,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.format] SHORTS|LONGO
 * @param {string} [opts.niche]
 * @param {string} [opts.topic]
 * @param {Function} [opts.llmFn] async (prompt) => string
 */
export async function analyzeReferenceVideo(opts) {
  const { url, format = "SHORTS", niche = "", topic = "", llmFn } = opts;

  const parsed = parseReferenceUrl(url);
  if (!parsed.valid) {
    return { ok: false, error: parsed.error };
  }

  let metadata = {
    title: "",
    author: "",
    thumbnail: "",
    provider: parsed.platform,
    watchUrl: parsed.canonicalUrl,
  };

  if (parsed.videoId && parsed.platform.startsWith("youtube")) {
    metadata = { ...metadata, ...(await fetchYoutubeMetadata(parsed.videoId)) };
  }

  const prompt = buildReferenceAnalysisPrompt({
    parsed,
    metadata,
    format,
    niche,
    topic,
  });
  let brief = null;
  let aiEnhanced = false;

  if (llmFn) {
    try {
      const text = await llmFn(prompt);
      brief = extractJsonFromText(text);
      if (brief?.concepts?.length) aiEnhanced = true;
    } catch (err) {
      console.warn("[OpenMontage] LLM análise referência:", err.message);
    }
  }

  if (!brief?.concepts?.length) {
    brief = buildFallbackBrief({ parsed, metadata, format, niche, topic });
  }

  return {
    ok: true,
    source: "OpenMontage video-reference-analyst (adaptado Lumiera)",
    parsed,
    metadata,
    brief,
    aiEnhanced,
    promptHint:
      "Use lumiera_requirement no VideoAgent ou creator_title/hook no Creator",
  };
}
