/**
 * Análise multimodal de vídeo de referência (CocoLoop video-understanding → Lumiera).
 * YouTube: Gemini fileUri. Outras plataformas: yt-dlp metadados/legendas + Gemini texto.
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  parseReferenceUrl,
  fetchYoutubeMetadata,
  analyzeReferenceVideo,
} from "./openmontageReference.js";

const VIDEO_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const MEMORY_FILE = "video-reference-analyses.md";

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

function runCommand(cmd, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: false,
      windowsHide: true,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${cmd} timeout ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else {
        reject(
          new Error(
            (stderr || stdout || `${cmd} exit ${code}`).trim().split(/\r?\n/)[0]
          )
        );
      }
    });
  });
}

function ytDlpCandidates() {
  if (process.platform === "win32") {
    return ["yt-dlp", "yt-dlp.exe"];
  }
  return ["yt-dlp"];
}

async function runYtDlp(args) {
  let lastErr = null;
  for (const bin of ytDlpCandidates()) {
    try {
      return await runCommand(bin, args, { timeoutMs: 90_000 });
    } catch (err) {
      lastErr = err;
      if (err.code === "ENOENT" || /ENOENT/i.test(err.message)) continue;
      throw err;
    }
  }
  throw lastErr || new Error("yt-dlp não encontrado no PATH");
}

export async function fetchVideoContextViaYtDlp(url) {
  try {
    const { stdout } = await runYtDlp([
      "-j",
      "--no-playlist",
      "--no-warnings",
      url,
    ]);
    const meta = JSON.parse(stdout.trim().split(/\r?\n/).pop() || "{}");
    const title = meta.title || "";
    const description = String(meta.description || "").slice(0, 4000);
    const duration = Number(meta.duration) || null;
    const uploader = meta.uploader || meta.channel || "";

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
            .slice(0, 12_000);
        }
      } catch {
        /* optional */
      }
    }

    return {
      ok: true,
      source: "yt-dlp",
      title,
      description,
      duration_sec: duration,
      uploader,
      transcript,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
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
  const extra = ytContext?.transcript
    ? `\nTRANSCRIÇÃO (legendas automáticas):\n${ytContext.transcript.slice(0, 8000)}`
    : "";

  const q = question?.trim() ? `\nPERGUNTA DO USUÁRIO: ${question.trim()}` : "";

  return `Você analisa vídeos para o estúdio Lumiera (documental / Shorts PT-BR).

VÍDEO:
- URL: ${parsed.canonicalUrl}
- Plataforma: ${parsed.platform}
- Título: ${metadata.title || ytContext?.title || "(desconhecido)"}
- Canal: ${metadata.author || ytContext?.uploader || "(desconhecido)"}
- Formato alvo Lumiera: ${fmt}
${extra}
${q}

Responda APENAS JSON válido:
{
  "summary": "2-4 frases sobre o conteúdo",
  "visual_description": "cenas, estilo visual, overlays, cortes",
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
  { multimodal = false, ytContext = null } = {}
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
    analysis_source: multimodal ? "gemini_video" : "gemini_text",
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

  let ytContext =
    parsed.platform.startsWith("youtube") && parsed.videoId
      ? null
      : await fetchVideoContextViaYtDlp(parsed.canonicalUrl);

  const useYoutubeFileUri =
    parsed.platform.startsWith("youtube") && Boolean(parsed.videoId);

  async function runTextAnalysis(ctx) {
    const p = buildVideoUnderstandingPrompt({
      parsed,
      metadata,
      ytContext: ctx?.ok ? ctx : null,
      question,
      format,
    });
    return callGeminiWithRetry(apiKey, p, {
      models: VIDEO_GEMINI_MODELS,
      projectDir: workspaceDir,
      forceProvider: "gemini",
      maxRetries: 2,
      temperature: 0.35,
    });
  }

  let text = "";
  let multimodalUsed = false;

  if (useYoutubeFileUri) {
    const prompt = buildVideoUnderstandingPrompt({
      parsed,
      metadata,
      ytContext: null,
      question,
      format,
    });
    const bodyOverride = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              fileData: {
                mimeType: "video/*",
                fileUri: parsed.canonicalUrl,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    };
    try {
      text = await callGeminiWithRetry(apiKey, prompt, {
        bodyOverride,
        models: VIDEO_GEMINI_MODELS,
        projectDir: workspaceDir,
        forceProvider: "gemini",
        maxRetries: 2,
        temperature: 0.35,
      });
      multimodalUsed = true;
    } catch (err) {
      console.warn(
        "[VideoUnderstanding] Multimodal YouTube falhou:",
        err.message
      );
      if (!ytContext?.ok) {
        ytContext = await fetchVideoContextViaYtDlp(parsed.canonicalUrl);
      }
      try {
        text = await runTextAnalysis(ytContext);
      } catch (inner) {
        return { ok: false, error: inner.message, parsed, metadata };
      }
    }
  } else {
    try {
      text = await runTextAnalysis(ytContext);
    } catch (err) {
      return { ok: false, error: err.message, parsed, metadata };
    }
  }

  const raw = extractJsonFromText(text);
  const understanding = normalizeUnderstanding(raw, {
    multimodal: multimodalUsed,
    ytContext: ytContext?.ok ? ytContext : null,
  });

  if (!understanding?.summary) {
    return {
      ok: false,
      error: "Não foi possível estruturar a análise do vídeo.",
      parsed,
      metadata,
      rawText: text?.slice(0, 500),
    };
  }

  return {
    ok: true,
    parsed,
    metadata,
    understanding,
    ytContext: ytContext?.ok
      ? { title: ytContext.title, source: "yt-dlp" }
      : null,
  };
}

function buildEnrichedReferencePrompt(basePrompt, understanding) {
  if (!understanding) return basePrompt;
  return `${basePrompt}

CONTEXTO MULTIMODAL (vídeo assistido / legendas):
${JSON.stringify(understanding, null, 2).slice(0, 6000)}

Use esse contexto para enriquecer five_aspects, hook_technique e concepts — não invente fatos ausentes no vídeo.`;
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

  if (!existing.includes(payload.parsed?.canonicalUrl || "___none___")) {
    fs.writeFileSync(filePath, existing + block, "utf8");
  } else {
    fs.writeFileSync(filePath, existing + block, "utf8");
  }

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

  if (!video.ok) {
    return video;
  }

  const llmFn = async (basePrompt) => {
    const prompt = buildEnrichedReferencePrompt(
      basePrompt,
      video.understanding
    );
    return callGeminiWithRetry(apiKey, prompt, {
      models: getGeminiModel
        ? [getGeminiModel(workspaceDir), ...VIDEO_GEMINI_MODELS]
        : VIDEO_GEMINI_MODELS,
      projectDir: workspaceDir,
      forceProvider: "gemini",
      maxRetries: 2,
      temperature: 0.45,
    });
  };

  const reference = await analyzeReferenceVideo({
    url,
    format,
    niche,
    topic,
    llmFn,
  });

  const result = {
    ok: true,
    source: "Lumiera video-understanding + OpenMontage reference",
    parsed: video.parsed,
    metadata: video.metadata,
    videoUnderstanding: video.understanding,
    ytContext: video.ytContext,
    brief: reference.brief,
    aiEnhanced: reference.aiEnhanced,
    promptHint: reference.promptHint,
  };

  if (persist) {
    result.obsidian = appendVideoReferenceAnalysis(workspaceDir, {
      parsed: video.parsed,
      metadata: video.metadata,
      understanding: video.understanding,
      brief: reference.brief,
    });
  }

  return result;
}
