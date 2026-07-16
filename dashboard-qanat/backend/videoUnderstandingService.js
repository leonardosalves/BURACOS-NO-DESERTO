/**
 * Análise multimodal de vídeo de referência (CocoLoop video-understanding → Lumiera).
 * YouTube: Gemini fileUri. TikTok/Reels: yt-dlp metadados (título+descrição) + opcional download multimodal.
 * Nunca inventar tema sem evidência de metadados/legendas/frames.
 */

import fs from "fs";
import path from "path";
import os from "os";
import {
  parseReferenceUrl,
  fetchYoutubeMetadata,
  analyzeReferenceVideo,
} from "./openmontageReference.js";
import { runCommand, BROWSER_UA } from "./shared/commonUtils.js";

const VIDEO_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const VIDEO_MIME_BY_EXT = {
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const MEMORY_FILE = "video-reference-analyses.md";
const MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024;

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

/** Candidatos a yt-dlp — serviço Windows (SYSTEM) NÃO vê o PATH do usuário Leo. */
export function ytDlpCandidates() {
  const home = os.homedir();
  const extras = [
    process.env.YT_DLP_PATH,
    process.env.YTDLP_PATH,
    // Instalação do serviço / junction C:\Lumiera
    "C:\\Lumiera\\tools\\yt-dlp.exe",
    "C:\\Lumiera\\tools\\yt-dlp\\yt-dlp.exe",
    path.join(process.cwd(), "tools", "yt-dlp.exe"),
    path.join(process.cwd(), "..", "tools", "yt-dlp.exe"),
    path.join(process.cwd(), "..", "..", "tools", "yt-dlp.exe"),
    // Perfil do Leo (só funciona se o serviço rodar como o usuário Leo)
    "C:\\Users\\Leo\\.agent-reach-venv\\Scripts\\yt-dlp.exe",
    path.join(home, ".agent-reach-venv", "Scripts", "yt-dlp.exe"),
    path.join(home, ".agent-reach-venv", "bin", "yt-dlp"),
    path.join(
      home,
      "AppData",
      "Local",
      "Programs",
      "Python",
      "Python312",
      "Scripts",
      "yt-dlp.exe"
    ),
    path.join(
      home,
      "AppData",
      "Local",
      "Programs",
      "Python",
      "Python311",
      "Scripts",
      "yt-dlp.exe"
    ),
    path.join(
      home,
      "AppData",
      "Roaming",
      "Python",
      "Python312",
      "Scripts",
      "yt-dlp.exe"
    ),
    path.join(
      home,
      "AppData",
      "Local",
      "Microsoft",
      "WinGet",
      "Links",
      "yt-dlp.exe"
    ),
    "C:\\yt-dlp\\yt-dlp.exe",
    "yt-dlp",
    "yt-dlp.exe",
  ].filter(Boolean);

  if (process.platform === "win32") {
    return [...new Set(extras)];
  }
  return [...new Set(["yt-dlp", ...extras])];
}

/**
 * TikTok oEmbed — funciona no serviço Windows SEM yt-dlp.
 * O campo `title` do oEmbed do TikTok costuma vir com a legenda completa.
 */
export async function fetchTikTokOembed(url) {
  const raw = String(url || "").trim();
  if (!raw || !/tiktok\.com/i.test(raw)) {
    return { ok: false, error: "URL não é TikTok" };
  }
  try {
    const resolved = await resolveShortMediaUrl(raw);
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolved)}`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `oEmbed HTTP ${res.status}` };
    }
    const data = await res.json();
    // TikTok joga a legenda inteira em title; separamos título curto + descrição
    const full = String(data.title || data.author_name || "").trim();
    const shortTitle =
      full
        .split(/[.!?\n]/)[0]
        ?.trim()
        .slice(0, 120) || full.slice(0, 120);
    return {
      ok: Boolean(full),
      source: "tiktok_oembed",
      title: shortTitle || full,
      description: full,
      uploader: String(data.author_name || "").trim(),
      author_url: String(data.author_url || "").trim(),
      thumbnail: String(data.thumbnail_url || "").trim(),
      webpage_url: resolved,
      provider: String(data.provider_name || "TikTok"),
      duration_sec: null,
      transcript: "",
      tags: [],
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Une contextos de evidência (yt-dlp + oEmbed). */
export function mergeVideoContexts(...contexts) {
  const okOnes = contexts.filter((c) => c && c.ok);
  if (!okOnes.length) {
    const last = contexts.filter(Boolean).pop();
    return last || { ok: false, error: "sem contexto" };
  }
  const base = { ...okOnes[0] };
  for (const c of okOnes.slice(1)) {
    if (!base.title && c.title) base.title = c.title;
    if ((!base.description || base.description.length < 40) && c.description) {
      base.description = c.description;
    }
    if (!base.uploader && c.uploader) base.uploader = c.uploader;
    if (!base.thumbnail && c.thumbnail) base.thumbnail = c.thumbnail;
    if (!base.webpage_url && c.webpage_url) base.webpage_url = c.webpage_url;
    if (!base.transcript && c.transcript) base.transcript = c.transcript;
    if (!base.duration_sec && c.duration_sec)
      base.duration_sec = c.duration_sec;
    if ((!base.tags || !base.tags.length) && c.tags?.length) base.tags = c.tags;
  }
  base.ok = Boolean(base.title || base.description || base.transcript);
  base.sources = okOnes.map((c) => c.source).filter(Boolean);
  return base;
}

async function runYtDlp(args, { timeoutMs = 120_000 } = {}) {
  let lastErr = null;
  for (const bin of ytDlpCandidates()) {
    try {
      if (bin.includes("\\") || bin.includes("/")) {
        if (!fs.existsSync(bin)) continue;
      }
      return await runCommand(bin, args, { timeoutMs });
    } catch (err) {
      lastErr = err;
      if (
        err.code === "ENOENT" ||
        /ENOENT|not found|não é reconhecido/i.test(err.message)
      ) {
        continue;
      }
      // Outros erros (rede, extractor) — tenta próximo bin só se for ENOENT
      if (/spawn/i.test(err.message) && /ENOENT/i.test(err.message)) continue;
      throw err;
    }
  }
  throw (
    lastErr ||
    new Error(
      "yt-dlp não encontrado no PATH (serviço Windows sem venv do usuário)"
    )
  );
}

/** Resolve vt.tiktok.com → URL canônica quando possível. */
export async function resolveShortMediaUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  if (!/vt\.tiktok\.com|vm\.tiktok\.com|tiktok\.com\/t\//i.test(raw)) {
    return raw;
  }
  try {
    const res = await fetch(raw, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": BROWSER_UA,
      },
    });
    const finalUrl = String(res.url || raw).trim();
    if (/tiktok\.com\/@[^/]+\/video\/\d+/i.test(finalUrl)) return finalUrl;
    // yt-dlp resolve short links so better than raw if redirect failed partially
    return finalUrl || raw;
  } catch {
    return raw;
  }
}

export async function fetchVideoContextViaYtDlp(url) {
  try {
    const resolved = await resolveShortMediaUrl(url);
    const { stdout } = await runYtDlp(
      ["-j", "--no-playlist", "--no-warnings", resolved],
      { timeoutMs: 90_000 }
    );
    const meta = JSON.parse(stdout.trim().split(/\r?\n/).pop() || "{}");
    const title = String(meta.title || meta.fulltitle || "").trim();
    const description = String(meta.description || "")
      .trim()
      .slice(0, 4000);
    const duration = Number(meta.duration) || null;
    const uploader = String(
      meta.uploader || meta.channel || meta.creator || ""
    ).trim();
    const webpageUrl = String(
      meta.webpage_url || meta.original_url || resolved || url
    ).trim();
    const thumbnail = String(
      meta.thumbnail || meta.thumbnails?.[0]?.url || ""
    ).trim();
    const tags = Array.isArray(meta.tags)
      ? meta.tags
          .map((t) => String(t))
          .filter(Boolean)
          .slice(0, 20)
      : [];

    let transcript = "";
    const subs = meta.automatic_captions || meta.subtitles || {};
    const langOrder = ["pt", "pt-BR", "en", "en-US"];
    let subUrl = null;
    for (const lang of langOrder) {
      const tracks = subs[lang];
      if (!Array.isArray(tracks)) continue;
      const vtt =
        tracks.find((t) => /vtt/i.test(t.ext || "")) ||
        tracks.find((t) => /srv3|vtt|json3/i.test(t.ext || ""));
      if (vtt?.url) {
        subUrl = vtt.url;
        break;
      }
    }

    if (subUrl) {
      try {
        const res = await fetch(subUrl, {
          signal: AbortSignal.timeout(20_000),
        });
        if (res.ok) {
          const vtt = await res.text();
          transcript = vtt
            .split(/\r?\n/)
            .filter(
              (line) =>
                line.trim() &&
                !line.startsWith("WEBVTT") &&
                !/^\d+$/.test(line.trim()) &&
                !line.includes("-->")
            )
            .map((line) => line.replace(/<[^>]+>/g, "").trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            // Engenharia reversa precisa do roteiro inteiro, não só de um
            // resumo curto. O limite ainda protege o contexto contra VTTs
            // anormalmente grandes.
            .slice(0, 80_000);
        }
      } catch {
        /* optional */
      }
    }

    const ok = Boolean(title || description || transcript);
    return {
      ok,
      source: "yt-dlp",
      title,
      description,
      duration_sec: duration,
      uploader,
      transcript,
      webpage_url: webpageUrl,
      thumbnail,
      tags,
      error: ok ? undefined : "yt-dlp sem título/descrição/transcrição",
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Baixa amostra leve do vídeo para Gemini multimodal (TikTok/Reels).
 * @returns {{ ok: boolean, filePath?: string, mimeType?: string, error?: string }}
 */
export async function downloadVideoSampleViaYtDlp(url, workDir) {
  const dir = workDir || fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-ref-"));
  fs.mkdirSync(dir, { recursive: true });
  const outTpl = path.join(dir, "sample.%(ext)s");
  try {
    const resolved = await resolveShortMediaUrl(url);
    await runYtDlp(
      [
        "-f",
        "bv*[height<=540]+ba/b[height<=540]/worst",
        "--no-playlist",
        "--no-warnings",
        "--max-filesize",
        "22M",
        "-o",
        outTpl,
        resolved,
      ],
      { timeoutMs: 180_000 }
    );
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^sample\./i.test(f))
      .map((f) => path.join(dir, f));
    if (!files.length) {
      return { ok: false, error: "Download yt-dlp sem arquivo", dir };
    }
    const filePath = files[0];
    const size = fs.statSync(filePath).size;
    if (size <= 0) return { ok: false, error: "Arquivo vazio", dir };
    if (size > MAX_INLINE_VIDEO_BYTES) {
      return {
        ok: false,
        error: `Vídeo ${(size / 1e6).toFixed(1)}MB acima do limite inline Gemini`,
        dir,
        filePath,
      };
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = VIDEO_MIME_BY_EXT[ext] || "video/mp4";
    return { ok: true, filePath, mimeType, size, dir };
  } catch (err) {
    return { ok: false, error: err.message, dir };
  }
}

const STOPWORDS = new Set(
  `a o e de da do das dos um uma em no na nos nas que se por para com sem sobre
   the a an of to and in on for with your you this that is are was were it
   video vídeo sobre como mais maior maiores ja já pela pelo pelas pelos
   descubra conheça conheca neste nessa`
    .split(/\s+/)
    .filter(Boolean)
);

export function tokenizeEvidence(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

/**
 * Score 0–1: quanto o resumo se ancora no título/descrição reais.
 */
export function scoreSummaryGrounding(summary = "", evidence = "") {
  const ev = tokenizeEvidence(evidence);
  if (!ev.length) return 1;
  const sumTokens = new Set(tokenizeEvidence(summary));
  if (!sumTokens.size) return 0;
  const uniqueEv = [...new Set(ev)].slice(0, 24);
  let hits = 0;
  for (const t of uniqueEv) {
    if (sumTokens.has(t)) {
      hits += 1;
      continue;
    }
    for (const s of sumTokens) {
      if (s.includes(t) || t.includes(s)) {
        hits += 1;
        break;
      }
    }
  }
  return Math.min(1, hits / Math.max(1, Math.min(uniqueEv.length, 12)));
}

export function buildMetadataGroundedUnderstanding(
  ytContext = {},
  metadata = {}
) {
  const title = String(ytContext.title || metadata.title || "").trim();
  const description = String(
    ytContext.description || metadata.description || ""
  ).trim();
  const body = description || title;
  const summary = body
    ? body.slice(0, 480)
    : "Metadados do vídeo indisponíveis.";
  return {
    summary,
    visual_description:
      "Análise ancorada em título/descrição do yt-dlp (Gemini inventou tema alheio ou não viu o vídeo).",
    hook_first_3s: title
      ? `Abertura alinhada ao tema: ${title.slice(0, 120)}`
      : "Gancho a confirmar no vídeo",
    structure_beats: description
      ? description
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 20)
          .slice(0, 5)
      : [title].filter(Boolean),
    pacing: Number(ytContext.duration_sec) > 90 ? "medium" : "fast",
    transcript_excerpt: String(ytContext.transcript || "").slice(0, 6000),
    speakers: ytContext.uploader ? [String(ytContext.uploader)] : [],
    duration_estimate_sec:
      Number(ytContext.duration_sec) || Number(metadata.duration_sec) || null,
    what_works_for_retention: [
      "Tema claro no título/descrição",
      "Lista/curiosidade com nomes concretos (máquinas, obras, fatos)",
      "CTA e curiosidade no final da descrição",
    ],
    lumiera_takeaways: [
      "Replicar o tema real do vídeo — não o estilo emocional inventado",
      "Usar nomes e fatos da descrição como âncora do roteiro",
    ],
    multimodal: false,
    analysis_source: "metadata_grounded",
    grounded_on_metadata: true,
  };
}

export function buildVideoUnderstandingPrompt({
  parsed,
  metadata = {},
  ytContext = null,
  question = "",
  format = "SHORTS",
} = {}) {
  const fmt =
    format === "LONGO" ? "vídeo longo YouTube (16:9)" : "Short vertical (≤60s)";
  const title =
    metadata.title || ytContext?.title || "(desconhecido — NÃO invente tema)";
  const description = String(
    metadata.description || ytContext?.description || ""
  ).trim();
  const uploader = metadata.author || ytContext?.uploader || "(desconhecido)";
  const tags = Array.isArray(ytContext?.tags) ? ytContext.tags.join(", ") : "";

  const evidenceBlocks = [];
  if (description) {
    evidenceBlocks.push(
      `DESCRIÇÃO REAL DO VÍDEO (fonte de verdade — NÃO ignore):\n${description.slice(0, 3500)}`
    );
  }
  if (ytContext?.transcript) {
    evidenceBlocks.push(
      `TRANSCRIÇÃO (legendas):\n${ytContext.transcript.slice(0, 8000)}`
    );
  }
  if (tags) evidenceBlocks.push(`TAGS: ${tags}`);
  if (ytContext?.duration_sec) {
    evidenceBlocks.push(`DURAÇÃO: ${ytContext.duration_sec}s`);
  }

  const q = question?.trim() ? `\nPERGUNTA DO USUÁRIO: ${question.trim()}` : "";

  return `Você analisa vídeos para o estúdio Lumiera (documental / Shorts PT-BR).

VÍDEO:
- URL: ${parsed.canonicalUrl}
- Plataforma: ${parsed.platform}
- Título REAL: ${title}
- Canal/uploader: ${uploader}
- Formato alvo Lumiera: ${fmt}

${evidenceBlocks.join("\n\n")}
${q}

REGRAS OBRIGATÓRIAS:
1. O tema do resumo DEVE ser o mesmo do TÍTULO e da DESCRIÇÃO acima.
2. PROIBIDO inventar temas alheios (ex.: parto, romance, drama pessoal) se o título/descrição falam de engenharia, máquinas, obras, etc.
3. Se só houver metadados (sem frames), diga isso em visual_description e baseie-se 100% no título/descrição.
4. Se não houver evidência suficiente, diga "incerto" — nunca fabrique um vídeo diferente.

Responda APENAS JSON válido:
{
  "summary": "2-4 frases sobre o conteúdo REAL do vídeo",
  "visual_description": "cenas, estilo visual, overlays, cortes (ou o que se infere com honestidade)",
  "hook_first_3s": "o que acontece no gancho inicial",
  "structure_beats": ["batida 1", "batida 2", "..."],
  "pacing": "fast|medium|slow",
  "transcript_excerpt": "trechos falados mais importantes (até 500 palavras)",
  "speakers": ["quem fala, se identificável"],
  "duration_estimate_sec": number,
  "what_works_for_retention": ["2-4 pontos"],
  "lumiera_takeaways": ["o que replicar no nosso pipeline sem copiar"]
}`;
}

function normalizeUnderstanding(
  raw,
  { multimodal = false, ytContext = null, analysisSource = null } = {}
) {
  if (!raw || typeof raw !== "object") return null;
  return {
    summary: String(raw.summary || "").trim(),
    visual_description: String(raw.visual_description || "").trim(),
    hook_first_3s: String(raw.hook_first_3s || "").trim(),
    structure_beats: Array.isArray(raw.structure_beats)
      ? raw.structure_beats.map((s) => String(s).trim()).filter(Boolean)
      : [],
    pacing: ["fast", "medium", "slow"].includes(raw.pacing)
      ? raw.pacing
      : "medium",
    transcript_excerpt: String(
      raw.transcript_excerpt || ytContext?.transcript || ""
    )
      .trim()
      .slice(0, 6000),
    speakers: Array.isArray(raw.speakers)
      ? raw.speakers.map((s) => String(s).trim()).filter(Boolean)
      : [],
    duration_estimate_sec:
      Number(raw.duration_estimate_sec) ||
      Number(ytContext?.duration_sec) ||
      null,
    what_works_for_retention: Array.isArray(raw.what_works_for_retention)
      ? raw.what_works_for_retention
          .map((s) => String(s).trim())
          .filter(Boolean)
      : [],
    lumiera_takeaways: Array.isArray(raw.lumiera_takeaways)
      ? raw.lumiera_takeaways.map((s) => String(s).trim()).filter(Boolean)
      : [],
    multimodal,
    analysis_source:
      analysisSource || (multimodal ? "gemini_video" : "gemini_text"),
  };
}

function mergeMetadataFromYt(metadata, ytContext) {
  if (!ytContext?.ok) return metadata;
  return {
    ...metadata,
    title: metadata.title || ytContext.title || "",
    author: metadata.author || ytContext.uploader || "",
    description: ytContext.description || metadata.description || "",
    thumbnail: metadata.thumbnail || ytContext.thumbnail || "",
    watchUrl: ytContext.webpage_url || metadata.watchUrl,
    duration_sec: ytContext.duration_sec || metadata.duration_sec || null,
    provider: metadata.provider || "yt-dlp",
  };
}

const GEMINI_VIDEO_OPTS = {
  models: VIDEO_GEMINI_MODELS,
  forceProvider: "gemini",
  maxRetries: 2,
  temperature: 0.25,
};

function geminiVideoOpts(workspaceDir, extra = {}) {
  return { ...GEMINI_VIDEO_OPTS, projectDir: workspaceDir, ...extra };
}

/** bodyOverride para análise multimodal — unifica fileData (YouTube) e inlineData (TikTok). */
function buildMultimodalBody(prompt, mediaPart) {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }, mediaPart] }],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  };
}

/** Fase 1: resolve URL canônica + metadados + evidência (yt-dlp/oEmbed). */
async function resolveVideoEvidence(url, format, workspaceDir) {
  const parsed = parseReferenceUrl(url);
  if (!parsed.valid) {
    return { ok: false, error: parsed.error };
  }

  // Short links TikTok → canônica
  if (parsed.platform === "tiktok" || /vt\.tiktok|vm\.tiktok/i.test(url)) {
    const resolved = await resolveShortMediaUrl(parsed.canonicalUrl || url);
    parsed.canonicalUrl = resolved;
    const m = resolved.match(/\/video\/(\d+)/);
    if (m?.[1]) parsed.videoId = m[1];
  }

  let metadata = {
    title: "",
    author: "",
    description: "",
    thumbnail: "",
    provider: parsed.platform,
    watchUrl: parsed.canonicalUrl,
  };

  if (parsed.videoId && parsed.platform.startsWith("youtube")) {
    metadata = { ...metadata, ...(await fetchYoutubeMetadata(parsed.videoId)) };
  }

  // Evidência real: yt-dlp (se existir no serviço) + oEmbed TikTok (sempre no SYSTEM)
  let ytContext = await fetchVideoContextViaYtDlp(parsed.canonicalUrl);
  if (
    parsed.platform === "tiktok" ||
    /tiktok\.com/i.test(parsed.canonicalUrl)
  ) {
    const oembed = await fetchTikTokOembed(parsed.canonicalUrl || url);
    ytContext = mergeVideoContexts(ytContext, oembed);
    if (oembed.ok) {
      console.log(
        `[VideoUnderstanding] TikTok oEmbed OK: "${String(oembed.title).slice(0, 80)}…"`
      );
    } else if (!ytContext?.ok) {
      console.warn(
        `[VideoUnderstanding] TikTok sem yt-dlp e sem oEmbed: ${oembed.error || ytContext?.error}`
      );
    }
  }
  metadata = mergeMetadataFromYt(metadata, ytContext);

  // Sem evidência em TikTok → NÃO inventar tema (falha clara)
  if (
    (parsed.platform === "tiktok" || /tiktok\.com/i.test(url)) &&
    !String(metadata.title || metadata.description || "").trim()
  ) {
    return {
      ok: false,
      error:
        "Não foi possível ler título/descrição do TikTok (yt-dlp e oEmbed falharam). Verifique rede do serviço ou cole a URL completa www.tiktok.com/@…/video/…",
      parsed,
      metadata,
      ytContext,
    };
  }

  return { ok: true, parsed, metadata, ytContext };
}

/** Fase 2: executa a análise Gemini adequada (fileUri / inline / texto). */
async function runVideoAnalysis({
  parsed,
  metadata,
  ytContext,
  question,
  format,
  callGeminiWithRetry,
  apiKey,
  workspaceDir,
}) {
  const useYoutubeFileUri =
    parsed.platform.startsWith("youtube") && Boolean(parsed.videoId);

  const prompt = buildVideoUnderstandingPrompt({
    parsed,
    metadata,
    ytContext: ytContext?.ok ? ytContext : null,
    question,
    format,
  });

  async function runTextAnalysis(ctx) {
    return callGeminiWithRetry(apiKey, prompt, geminiVideoOpts(workspaceDir));
  }

  async function runInlineVideoAnalysis(sample) {
    const b64 = fs.readFileSync(sample.filePath).toString("base64");
    const mediaPart = {
      inlineData: {
        mimeType: sample.mimeType || "video/mp4",
        data: b64,
      },
    };
    const bodyOverride = buildMultimodalBody(prompt, mediaPart);
    return callGeminiWithRetry(
      apiKey,
      prompt,
      geminiVideoOpts(workspaceDir, { bodyOverride })
    );
  }

  let text = "";
  let multimodalUsed = false;
  let analysisSource = "gemini_text";
  let sampleDir = null;

  try {
    if (useYoutubeFileUri) {
      const mediaPart = {
        fileData: {
          mimeType: "video/mp4",
          fileUri: parsed.canonicalUrl,
        },
      };
      const bodyOverride = buildMultimodalBody(prompt, mediaPart);
      try {
        text = await callGeminiWithRetry(
          apiKey,
          prompt,
          geminiVideoOpts(workspaceDir, { bodyOverride })
        );
        multimodalUsed = true;
        analysisSource = "gemini_video";
      } catch (err) {
        console.warn(
          "[VideoUnderstanding] Multimodal YouTube falhou:",
          err.message
        );
        text = await runTextAnalysis(ytContext);
        analysisSource = "gemini_text";
      }
    } else if (
      parsed.platform === "tiktok" ||
      parsed.platform === "instagram"
    ) {
      // TikTok/IG: tenta download leve + multimodal; senão texto com descrição forte
      const tmpRoot = path.join(
        workspaceDir || os.tmpdir(),
        ".cache",
        "ref-video"
      );
      const sample = await downloadVideoSampleViaYtDlp(
        parsed.canonicalUrl,
        tmpRoot
      );
      sampleDir = sample.dir || null;
      if (sample.ok) {
        try {
          text = await runInlineVideoAnalysis(sample);
          multimodalUsed = true;
          analysisSource = "gemini_inline_video";
        } catch (err) {
          console.warn(
            "[VideoUnderstanding] Multimodal TikTok/IG falhou:",
            err.message
          );
          text = await runTextAnalysis(ytContext);
        }
      } else {
        console.warn(
          "[VideoUnderstanding] Download amostra falhou:",
          sample.error
        );
        if (!ytContext?.ok) {
          throw new Error(
            sample.error ||
              ytContext?.error ||
              "Não foi possível baixar nem ler metadados do TikTok/Instagram. Verifique yt-dlp no serviço Windows."
          );
        }
        text = await runTextAnalysis(ytContext);
      }
    } else {
      text = await runTextAnalysis(ytContext);
    }
    return { text, multimodalUsed, analysisSource, sampleDir };
  } finally {
    if (sampleDir) {
      try {
        for (const f of fs.readdirSync(sampleDir)) {
          fs.unlinkSync(path.join(sampleDir, f));
        }
      } catch {
        /* ignore cleanup */
      }
    }
  }
}

/** Fase 3: normaliza + guarda anti-alucinação (grounding). */
function finalizeUnderstanding({
  text,
  multimodalUsed,
  analysisSource,
  ytContext,
  metadata,
  evidenceText,
  parsed,
}) {
  const raw = extractJsonFromText(text);
  let understanding = normalizeUnderstanding(raw, {
    multimodal: multimodalUsed,
    ytContext: ytContext?.ok ? ytContext : null,
    analysisSource,
  });

  if (!understanding?.summary) {
    if (ytContext?.ok && (ytContext.title || ytContext.description)) {
      understanding = buildMetadataGroundedUnderstanding(ytContext, metadata);
    } else {
      return {
        ok: false,
        error: "Não foi possível estruturar a análise do vídeo.",
        parsed,
        metadata,
        rawText: text?.slice(0, 500),
        ytContext: ytContext?.ok
          ? { title: ytContext.title, source: "yt-dlp" }
          : ytContext,
      };
    }
  }

  // Anti-alucinação: se temos título/descrição reais e o resumo não ancora, força metadados
  let grounding = { score: 1, forced: false };
  if (evidenceText.trim().length > 24) {
    const score = scoreSummaryGrounding(understanding.summary, evidenceText);
    grounding = { score, forced: false };
    if (score < 0.12) {
      console.warn(
        `[VideoUnderstanding] Resumo desancorado (score=${score.toFixed(2)}) — forçando metadados. Título: ${metadata.title?.slice(0, 80)}`
      );
      understanding = {
        ...buildMetadataGroundedUnderstanding(ytContext || {}, metadata),
        // Mantém multimodal flag se frames foram vistos, mas o texto vem dos metadados
        multimodal: multimodalUsed,
        analysis_source: multimodalUsed
          ? "gemini_video_rejected_ungrounded"
          : "metadata_grounded",
      };
      grounding = {
        score,
        forced: true,
        reason: "summary_not_grounded_in_title_description",
      };
    }
  }

  return {
    ok: true,
    parsed,
    metadata,
    understanding,
    grounding,
    ytContext: ytContext?.ok
      ? {
          title: ytContext.title,
          source: "yt-dlp",
          has_description: Boolean(ytContext.description),
          duration_sec: ytContext.duration_sec,
        }
      : ytContext?.error
        ? { ok: false, error: ytContext.error }
        : null,
  };
}

export async function analyzeVideoUnderstanding({
  url,
  format = "SHORTS",
  question = "",
  callGeminiWithRetry,
  apiKey,
  workspaceDir,
} = {}) {
  // Fase 1: resolve URL canônica + metadados + evidência (yt-dlp/oEmbed)
  const evidenceRes = await resolveVideoEvidence(url, format, workspaceDir);
  if (!evidenceRes.ok) {
    return evidenceRes;
  }
  const { parsed, metadata, ytContext } = evidenceRes;

  const evidenceText = [
    metadata.title,
    metadata.description,
    ytContext?.transcript,
  ]
    .filter(Boolean)
    .join(" ");

  // Fase 2: executa a análise Gemini adequada (fileUri / inline / texto)
  try {
    const analysisRes = await runVideoAnalysis({
      parsed,
      metadata,
      ytContext,
      question,
      format,
      callGeminiWithRetry,
      apiKey,
      workspaceDir,
    });

    // Fase 3: normaliza + guarda anti-alucinação (grounding)
    return finalizeUnderstanding({
      text: analysisRes.text,
      multimodalUsed: analysisRes.multimodalUsed,
      analysisSource: analysisRes.analysisSource,
      ytContext,
      metadata,
      evidenceText,
      parsed,
    });
  } catch (err) {
    // Último recurso: se temos metadados fortes, não inventar — devolver grounded
    if (ytContext?.ok && (ytContext.title || ytContext.description)) {
      const understanding = buildMetadataGroundedUnderstanding(
        ytContext,
        metadata
      );
      return {
        ok: true,
        parsed,
        metadata,
        understanding,
        ytContext: {
          title: ytContext.title,
          source: "yt-dlp",
          has_description: Boolean(ytContext.description),
          duration_sec: ytContext.duration_sec,
        },
        grounding: { score: 1, forced: true, reason: err.message },
      };
    }
    return { ok: false, error: err.message, parsed, metadata, ytContext };
  }
}

function buildEnrichedReferencePrompt(
  basePrompt,
  understanding,
  metadata = {}
) {
  if (!understanding) return basePrompt;
  const metaBlock =
    metadata.title || metadata.description
      ? `\nMETADADOS REAIS DO VÍDEO:\n- Título: ${metadata.title || ""}\n- Descrição: ${String(metadata.description || "").slice(0, 2000)}\n`
      : "";
  return `${basePrompt}
${metaBlock}
CONTEXTO DE ENTENDIMENTO DO VÍDEO:
${JSON.stringify(understanding, null, 2).slice(0, 6000)}

Use esse contexto para enriquecer five_aspects, hook_technique e concepts.
PROIBIDO inventar tema diferente do título/descrição/understanding.summary.
Se o nicho do usuário for outro, faça TWIST criativo a partir do tema REAL — não troque o tema por completo sem avisar.`;
}

export function appendVideoReferenceAnalysis(workspaceDir, payload = {}) {
  const memDir = path.join(workspaceDir, ".agents", "memory");
  fs.mkdirSync(memDir, { recursive: true });
  const filePath = path.join(memDir, MEMORY_FILE);
  const now = new Date().toISOString();
  const title =
    payload.metadata?.title || payload.parsed?.canonicalUrl || "Vídeo";
  const block = [
    "",
    `## ${title}`,
    "",
    `- **Data:** ${now}`,
    `- **URL:** ${payload.parsed?.canonicalUrl || ""}`,
    `- **Plataforma:** ${payload.parsed?.platform || ""}`,
    `- **Multimodal:** ${payload.understanding?.multimodal ? "sim" : "não"}`,
    `- **Fonte análise:** ${payload.understanding?.analysis_source || ""}`,
    "",
    "### Resumo",
    payload.understanding?.summary || "",
    "",
    "### Gancho (3s)",
    payload.understanding?.hook_first_3s || "",
    "",
    "### O que funciona",
    ...(payload.understanding?.what_works_for_retention || []).map(
      (line) => `- ${line}`
    ),
    "",
    "### Takeaways Lumiera",
    ...(payload.understanding?.lumiera_takeaways || []).map(
      (line) => `- ${line}`
    ),
    "",
    payload.brief?.lumiera_requirement
      ? `### lumiera_requirement\n${payload.brief.lumiera_requirement}\n`
      : "",
    "---",
  ].join("\n");

  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : `# Análises de vídeo referência\n\n> 🔗 [[MEMORIA-LUMIERA]] · [[memory/competitor-intelligence]]\n`;

  fs.writeFileSync(filePath, existing + block, "utf8");

  return { file: MEMORY_FILE, path: filePath };
}

/**
 * Pipeline completo: multimodal + brief OpenMontage enriquecido.
 */
export async function runAnalyzeReferenceVideoDeep(opts = {}) {
  const {
    url,
    format = "SHORTS",
    niche = "",
    topic = "",
    question = "",
    persist = false,
    callGeminiWithRetry,
    apiKey,
    workspaceDir,
    getGeminiModel,
  } = opts;

  const video = await analyzeVideoUnderstanding({
    url,
    format,
    question,
    callGeminiWithRetry,
    apiKey,
    workspaceDir,
  });

  const understanding = video.ok ? video.understanding : null;
  if (!video.ok) {
    console.warn("[VideoUnderstanding] Multimodal falhou:", video.error);
    // TikTok sem metadados: NÃO seguir com brief inventado
    if (/tiktok\.com/i.test(url) || video.parsed?.platform === "tiktok") {
      return {
        ok: false,
        error:
          video.error ||
          "TikTok sem título/descrição — recuse brief inventado. Reinicie o serviço ou use URL completa.",
        parsed: video.parsed,
        metadata: video.metadata,
        ytContext: video.ytContext,
      };
    }
  }

  // Passa metadados reais (título/descrição TikTok) para o brief OpenMontage
  const llmFn = async (basePrompt) => {
    const prompt = understanding
      ? buildEnrichedReferencePrompt(
          basePrompt,
          understanding,
          video.metadata || {}
        )
      : basePrompt;
    return callGeminiWithRetry(apiKey, prompt, {
      models: getGeminiModel
        ? [getGeminiModel(workspaceDir), ...VIDEO_GEMINI_MODELS]
        : VIDEO_GEMINI_MODELS,
      projectDir: workspaceDir,
      forceProvider: "gemini",
      maxRetries: 2,
      temperature: 0.4,
    });
  };

  const reference = await analyzeReferenceVideo({
    url,
    format,
    niche,
    topic,
    llmFn: apiKey ? llmFn : null,
    // Metadados já resolvidos (yt-dlp) — evita brief vazio no TikTok
    metadataOverride: video.metadata || null,
    parsedOverride: video.parsed || null,
  });

  if (!reference.ok) {
    if (!video.ok) {
      return {
        ok: false,
        error:
          reference.error || video.error || "Falha na análise de referência",
        parsed: video.parsed,
        metadata: video.metadata,
      };
    }
    return {
      ok: false,
      error: reference.error || "Falha ao gerar brief OpenMontage",
      parsed: video.parsed,
      metadata: video.metadata,
      videoUnderstanding: understanding,
    };
  }

  // Se o brief inventar tema alheio, ancora content_summary no understanding
  if (understanding?.summary && reference.brief && video.metadata?.title) {
    const briefScore = scoreSummaryGrounding(
      String(reference.brief.content_summary || ""),
      `${video.metadata.title} ${video.metadata.description || ""} ${understanding.summary}`
    );
    if (briefScore < 0.1) {
      reference.brief = {
        ...reference.brief,
        content_summary: understanding.summary,
        _regrounded: true,
      };
    }
  }

  const result = {
    ok: true,
    source: understanding
      ? "Lumiera video-understanding + OpenMontage reference"
      : "OpenMontage reference (fallback sem multimodal)",
    parsed: video.parsed || reference.parsed,
    metadata: video.metadata || reference.metadata,
    videoUnderstanding: understanding,
    ytContext: video.ytContext || null,
    grounding: video.grounding || null,
    brief: reference.brief,
    aiEnhanced: reference.aiEnhanced,
    promptHint: reference.promptHint,
    videoUnderstandingSkipped: !understanding,
    videoUnderstandingError: video.ok ? undefined : video.error,
  };

  if (persist && understanding) {
    result.obsidian = appendVideoReferenceAnalysis(workspaceDir, {
      parsed: video.parsed,
      metadata: video.metadata,
      understanding,
      brief: reference.brief,
    });
  }

  return result;
}
