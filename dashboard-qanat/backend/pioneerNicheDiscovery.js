/**
 * Descoberta de nichos pioneiros — pouca ou nenhuma presença no YouTube.
 * Combina Exa (interesse emergente) + YouTube Data API (saturação).
 */

import fs from "fs";
import path from "path";
import { exaWebSearch } from "./agentReachService.js";
import { extractJsonCandidate, parseJsonLocally } from "./aiJsonParse.js";
import { getYoutubeAccessToken } from "./youtubeTitleAnalytics.js";

const COMPETITOR_MEMORY = ".agents/memory/competitor-intelligence.md";

function readJsonSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
  } catch {
    return {};
  }
}

function formatCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

async function youtubeDataGet(accessToken, apiPath, params = {}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${apiPath}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `YouTube API (${apiPath})`);
  }
  return data;
}

function saturationFromCounts({ channelCount = 0, videoCount = 0 }) {
  const ch = Number(channelCount) || 0;
  const vi = Number(videoCount) || 0;
  let channelSat = 0;
  if (ch <= 2) channelSat = 5;
  else if (ch <= 8) channelSat = 20;
  else if (ch <= 25) channelSat = 45;
  else if (ch <= 80) channelSat = 70;
  else channelSat = 92;

  let videoSat = 0;
  if (vi <= 15) videoSat = 8;
  else if (vi <= 50) videoSat = 25;
  else if (vi <= 200) videoSat = 50;
  else if (vi <= 1000) videoSat = 75;
  else videoSat = 90;

  return Math.round((channelSat + videoSat) / 2);
}

function pioneerLabel(saturation, pioneerScore) {
  if (pioneerScore >= 72 && saturation <= 25) return "virgem";
  if (pioneerScore >= 55 && saturation <= 45) return "pioneiro";
  if (saturation <= 60) return "emergente";
  return "saturado";
}

function buildExpansionQueries(baseNiche, format) {
  const base = String(baseNiche || "").trim();
  const fmt = String(format || "SHORTS").toUpperCase();
  const shortHint = fmt === "LONG" || fmt === "LONGO" ? "documentário" : "shorts";
  const seeds = [];

  if (base) {
    seeds.push(base);
    seeds.push(`${base} ${shortHint}`);
    seeds.push(`micro nicho ${base}`);
    seeds.push(`subnicho ${base} pouco explorado`);
  }

  seeds.push(
    "nichos YouTube pouco explorados Brasil 2026",
    "temas virais sem canal dedicado YouTube",
    "curiosidades obscuras sem concorrência YouTube",
    "blue ocean content ideas YouTube português",
    "interesses emergentes Gen Z YouTube Brasil",
    "hobbies underground pouco cobertos YouTube",
  );

  return [...new Set(seeds.filter(Boolean))].slice(0, 8);
}

function extractCandidatesFromExa(exaResult, baseNiche) {
  const text = String(exaResult?.summary || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = new Set();

  for (const line of lines) {
    const bullet = line
      .replace(/^[-*•\d.)\]]+\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (bullet.length < 8 || bullet.length > 120) continue;
    if (/^(http|www\.|fonte:|source:)/i.test(bullet)) continue;
    candidates.add(bullet.slice(0, 100));
  }

  const quoted = text.match(/"([^"]{8,90})"/g) || [];
  quoted.forEach((q) => {
    const clean = q.replace(/"/g, "").trim();
    if (clean) candidates.add(clean);
  });

  if (baseNiche) {
    candidates.add(`${baseNiche} — ângulo inédito`);
    candidates.add(`histórias obscuras de ${baseNiche}`);
  }

  return [...candidates].slice(0, 24);
}

function heuristicCandidates(baseNiche, risingNiches = []) {
  const base = String(baseNiche || "").trim();
  const out = new Set();

  for (const row of risingNiches || []) {
    const label = String(row.niche || "").trim();
    if (label) {
      out.add(`micro-nicho: ${label} (profundidade inédita)`);
      out.add(`${label} — fatos que ninguém contou`);
    }
  }

  const templates = [
    "objetos cotidianos com história proibida",
    "profissões extintas que voltaram em segredo",
    "lendas urbanas brasileiras sem canal dedicado",
    "engenharia impossível do século XIX",
    "recordes humanos bizarros pouco documentados",
    "ciência fringe com pouca cobertura em PT-BR",
    "mapas e lugares que o Google esconde",
    "rituais e tradições regionais quase esquecidas",
  ];

  templates.forEach((t) => out.add(t));
  if (base) {
    out.add(`${base} — subtemas que nenhum canal cobre`);
    out.add(`primeiro canal de ${base} em português`);
  }

  return [...out].slice(0, 18);
}

async function measureYoutubeSaturation(accessToken, query) {
  const q = String(query || "").trim().slice(0, 80);
  if (!q) {
    return {
      query: q,
      channelCount: 0,
      videoCount: 0,
      avgTopViews: 0,
      maxTopViews: 0,
      sampleChannels: [],
      sampleVideos: [],
    };
  }

  const [channelSearch, videoSearch] = await Promise.all([
    youtubeDataGet(accessToken, "search", {
      part: "snippet",
      type: "channel",
      q,
      maxResults: 10,
      relevanceLanguage: "pt",
      safeSearch: "none",
    }),
    youtubeDataGet(accessToken, "search", {
      part: "snippet",
      type: "video",
      q,
      maxResults: 15,
      relevanceLanguage: "pt",
      order: "relevance",
      safeSearch: "none",
    }),
  ]);

  const channelTotal = formatCount(channelSearch?.pageInfo?.totalResults);
  const videoTotal = formatCount(videoSearch?.pageInfo?.totalResults);

  const videoIds = (videoSearch?.items || [])
    .map((item) => item?.id?.videoId)
    .filter(Boolean);

  let avgTopViews = 0;
  let maxTopViews = 0;
  const sampleVideos = [];

  if (videoIds.length) {
    const statsData = await youtubeDataGet(accessToken, "videos", {
      part: "statistics,snippet",
      id: videoIds.slice(0, 10).join(","),
    });
    const views = (statsData?.items || []).map((v) => formatCount(v?.statistics?.viewCount));
    if (views.length) {
      avgTopViews = Math.round(views.reduce((a, b) => a + b, 0) / views.length);
      maxTopViews = Math.max(...views);
    }
    for (const item of statsData?.items || []) {
      sampleVideos.push({
        title: item?.snippet?.title || "",
        views: formatCount(item?.statistics?.viewCount),
        videoId: item?.id,
      });
    }
  }

  const sampleChannels = (channelSearch?.items || []).slice(0, 5).map((item) => ({
    title: item?.snippet?.channelTitle || item?.snippet?.title || "",
    channelId: item?.id?.channelId || item?.snippet?.channelId,
  }));

  return {
    query: q,
    channelCount: channelTotal,
    videoCount: videoTotal,
    avgTopViews,
    maxTopViews,
    sampleChannels,
    sampleVideos,
    saturationPct: saturationFromCounts({ channelCount: channelTotal, videoCount: videoTotal }),
  };
}

function scorePioneerNiche({ label, saturationPct, webSignal = 50, format }) {
  const interest = Math.min(100, Math.max(20, Number(webSignal) || 50));
  const pioneerScore = Math.round((100 - saturationPct) * 0.65 + interest * 0.35);
  const status = pioneerLabel(saturationPct, pioneerScore);
  const fmt = String(format || "SHORTS").toUpperCase();

  let whyPioneer = "";
  if (status === "virgem") {
    whyPioneer = `Quase nenhum canal dedicado — espaço para ser referência em ${fmt === "LONGO" ? "longos" : "Shorts"}.`;
  } else if (status === "pioneiro") {
    whyPioneer = "Concorrência baixa com sinais de interesse crescente fora do YouTube.";
  } else if (status === "emergente") {
    whyPioneer = "Nicho em formação — quem entrar cedo define o formato vencedor.";
  } else {
    whyPioneer = "Saturação alta — só vale com ângulo ultra específico ou formato novo.";
  }

  return {
    label,
    pioneerScore,
    saturationPct,
    interestScore: interest,
    status,
    whyPioneer,
    format: fmt === "LONG" || fmt === "LONGO" ? "LONGO" : "SHORTS",
  };
}

function buildPioneerIdea(niche) {
  const label = String(niche.label || "").trim();
  const hook = niche.status === "virgem" || niche.status === "pioneiro"
    ? `Primeiro canal a dominar "${label}" — gancho de descoberta + prova de que quase ninguém cobre.`
    : `Teste pioneiro em "${label}" com lista de fatos inéditos e CTA para série.`;
  return {
    title: `Pioneiro: ${label.slice(0, 72)}`,
    hookPt: hook,
    mechanic: "pioneer-niche",
    whyWorks: niche.whyPioneer,
    format: niche.format || "SHORTS",
    pioneerScore: niche.pioneerScore,
    saturationPct: niche.saturationPct,
    status: niche.status,
  };
}

async function refineWithLlm(candidates, { llmFn, baseNiche, format }) {
  if (!llmFn || !candidates.length) return candidates;

  const prompt = `Você é estrategista YouTube focado em NICHOS PIONEIROS (blue ocean).

Nicho base do criador: "${baseNiche || "geral"}"
Formato alvo: ${format}

Abaixo há candidatos com métricas de saturação no YouTube (canais/vídeos encontrados na busca).
Selecione e refine os 6 melhores para um criador BR que quer ser PIONEIRO — pouca concorrência, alto potencial.

Retorne APENAS JSON válido:
{
  "niches": [
    {
      "label": "nome curto do nicho",
      "pioneerScore": 0-100,
      "whyPioneer": "1 frase objetiva",
      "firstVideoIdea": "título do primeiro vídeo",
      "risk": "principal risco"
    }
  ]
}

Candidatos:
${JSON.stringify(candidates.slice(0, 12), null, 2)}`;

  try {
    const raw = await llmFn(prompt);
    const parsed = parseJsonLocally(extractJsonCandidate(raw));
    const niches = Array.isArray(parsed?.niches) ? parsed.niches : [];
    if (!niches.length) return candidates;

    return niches.map((n, i) => {
      const src = candidates[i] || candidates.find((c) =>
        String(c.label || "").toLowerCase().includes(String(n.label || "").toLowerCase().slice(0, 12)),
      ) || {};
      return {
        ...src,
        label: String(n.label || src.label || "").trim(),
        pioneerScore: Number(n.pioneerScore) || src.pioneerScore,
        whyPioneer: String(n.whyPioneer || src.whyPioneer || "").trim(),
        firstVideoIdea: String(n.firstVideoIdea || "").trim(),
        risk: String(n.risk || "").trim(),
      };
    });
  } catch {
    return candidates;
  }
}

export async function discoverPioneerNiches(workspaceDir, {
  niche = "",
  format = "SHORTS",
  risingNiches = [],
  maxCandidates = 10,
  useAi = true,
  llmFn = null,
} = {}) {
  const cfg = readJsonSafe(path.join(workspaceDir, "config_qanat.json"));
  const baseNiche = String(niche || cfg.niche || "").trim();
  const fmt = String(format || "SHORTS").toUpperCase();

  let accessToken = null;
  try {
    accessToken = await getYoutubeAccessToken(workspaceDir);
  } catch (err) {
    return {
      ok: false,
      error: `YouTube não conectado: ${err.message}. Vincule o canal em Integrações.`,
    };
  }

  const exaQueries = buildExpansionQueries(baseNiche, fmt).slice(0, 4);
  const exaResults = await Promise.all(
    exaQueries.map((q) => exaWebSearch(q, workspaceDir, { numResults: 5 })),
  );

  const exaAvailable = exaResults.some((r) => r.available);
  const candidateLabels = new Set();

  for (const exa of exaResults) {
    extractCandidatesFromExa(exa, baseNiche).forEach((c) => candidateLabels.add(c));
  }
  heuristicCandidates(baseNiche, risingNiches).forEach((c) => candidateLabels.add(c));

  const rawCandidates = [...candidateLabels].slice(0, 20);
  const measured = [];

  for (const label of rawCandidates) {
    try {
      const yt = await measureYoutubeSaturation(accessToken, label);
      const webSignal = exaAvailable ? 55 + Math.min(35, Math.round((100 - yt.saturationPct) / 3)) : 45;
      measured.push({
        ...scorePioneerNiche({ label, saturationPct: yt.saturationPct, webSignal, format: fmt }),
        youtube: yt,
      });
    } catch (err) {
      measured.push({
        ...scorePioneerNiche({ label, saturationPct: 50, webSignal: 40, format: fmt }),
        youtube: { query: label, error: err.message },
        whyPioneer: "Não foi possível medir saturação — validar manualmente.",
      });
    }
  }

  measured.sort((a, b) => b.pioneerScore - a.pioneerScore);

  let pioneerNiches = measured
    .filter((n) => n.status !== "saturado" || n.pioneerScore >= 40)
    .slice(0, Math.min(Math.max(Number(maxCandidates) || 10, 4), 15));

  if (useAi && llmFn) {
    pioneerNiches = await refineWithLlm(pioneerNiches, { llmFn, baseNiche, format: fmt });
  }

  const pioneerIdeas = pioneerNiches
    .filter((n) => n.pioneerScore >= 45)
    .slice(0, 6)
    .map((n) => ({
      ...buildPioneerIdea(n),
      firstVideoIdea: n.firstVideoIdea || `Pioneiro: ${n.label}`,
      risk: n.risk || "",
    }));

  const virginCount = pioneerNiches.filter((n) => n.status === "virgem").length;
  const pioneerCount = pioneerNiches.filter((n) => n.status === "pioneiro" || n.status === "virgem").length;

  return {
    ok: true,
    baseNiche: baseNiche || null,
    format: fmt,
    exaAvailable,
    pioneerNiches,
    pioneerIdeas,
    summary: {
      scanned: rawCandidates.length,
      virginCount,
      pioneerCount,
      topPick: pioneerNiches[0]?.label || null,
    },
    fetchedAt: new Date().toISOString(),
  };
}