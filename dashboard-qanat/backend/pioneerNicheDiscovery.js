/**
 * Descoberta de nichos pioneiros — macro-nichos reais (finanças, história…)
 * + ângulos e padrões de vídeo pouco cobertos no YouTube PT-BR.
 */

import fs from "fs";
import path from "path";
import { exaWebSearch } from "./agentReachService.js";
import { extractJsonCandidate, parseJsonLocally } from "./aiJsonParse.js";
import { getYoutubeAccessToken } from "./youtubeTitleAnalytics.js";

/** Nichos que o criador entende — categorias amplas do YouTube */
const MACRO_NICHES = [
  { id: "financas", label: "Finanças", searchBaseline: "finanças educação financeira" },
  { id: "historia", label: "História", searchBaseline: "história documentário" },
  { id: "documentario", label: "Documentário", searchBaseline: "documentário investigativo" },
  { id: "curiosidades", label: "Curiosidades", searchBaseline: "curiosidades fatos" },
  { id: "ciencia", label: "Ciência", searchBaseline: "ciência explicada" },
  { id: "tecnologia", label: "Tecnologia", searchBaseline: "tecnologia história" },
  { id: "geografia", label: "Geografia", searchBaseline: "geografia lugares" },
  { id: "true_crime", label: "True Crime", searchBaseline: "casos reais investigação" },
  { id: "engenharia", label: "Engenharia", searchBaseline: "engenharia curiosidades" },
  { id: "psicologia", label: "Psicologia", searchBaseline: "psicologia comportamento" },
];

/** Padrões de vídeo — estruturas que poucos canais usam */
const FORMAT_PATTERNS = [
  { id: "timeline-objeto", label: "Timeline de um objeto", template: "Um objeto comum → virou símbolo histórico (linha do tempo visual)" },
  { id: "mapa-misterio", label: "Mapa + mistério", template: "Lugar real no mapa que a história oficial ignorou" },
  { id: "antes-depois-dados", label: "Antes/depois com dados", template: "Como era vs como é — só com fontes e números públicos" },
  { id: "um-dia-extinto", label: "Um dia na vida extinta", template: "Recriar um dia de profissão/tradição que não existe mais" },
  { id: "debunk-3-atos", label: "Debunk em 3 atos", template: "Mito popular → evidências → verdade surpreendente" },
  { id: "comparativo-paises", label: "Comparativo países", template: "Mesmo fenômeno em 2 países — contraste cultural com dados" },
  { id: "arquivo-secreto", label: "Arquivo público esquecido", template: "Documento/registro público que ninguém leu em PT-BR" },
  { id: "record-humano", label: "Recorde humano bizarro", template: "Feito humano real verificável que parece ficção" },
];

const META_GARBAGE_RE = [
  /nichos?\s+(do|para|em|no)\s+youtube/i,
  /canais?\s+dark/i,
  /tier\s*list|tierlist/i,
  /\bRPM\b|monetiza/i,
  /openclips|blog\b|agnecia|rogue/i,
  /melhores\s+nichos/i,
  /sem\s+aparecer|em\s+aberto\s+em\s+20\d\d/i,
  /\d+[\.,]?\d*\s*K?\s*views/i,
  /youtube\s+sem\s+/i,
  /%\s+de\s+v[ií]deo/i,
  /alta\s+rentabilidade/i,
  /—\s*Tierlist/i,
];

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

function isMetaGarbage(text = "") {
  const t = String(text || "").trim();
  if (t.length < 6) return true;
  if (t.length > 95) return true;
  if (/^https?:\/\//i.test(t)) return true;
  return META_GARBAGE_RE.some((re) => re.test(t));
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

function saturationFromCounts({ channelCount = 0, videoCount = 0, dedicatedChannels = 0 }) {
  const ch = Math.min(Number(channelCount) || 0, 500);
  const vi = Math.min(Number(videoCount) || 0, 5000);
  const ded = Number(dedicatedChannels) || 0;

  let channelSat = 0;
  if (ded <= 1) channelSat = 8;
  else if (ded <= 3) channelSat = 18;
  else if (ded <= 8) channelSat = 35;
  else if (ch <= 30) channelSat = 50;
  else if (ch <= 120) channelSat = 72;
  else channelSat = 90;

  let videoSat = 0;
  if (vi <= 20) videoSat = 10;
  else if (vi <= 80) videoSat = 28;
  else if (vi <= 300) videoSat = 52;
  else if (vi <= 1200) videoSat = 74;
  else videoSat = 88;

  return Math.round((channelSat * 0.6 + videoSat * 0.4));
}

function pioneerLabel(angleSaturation, pioneerScore, gapScore) {
  if (pioneerScore >= 70 && angleSaturation <= 22 && gapScore >= 25) return "virgem";
  if (pioneerScore >= 55 && angleSaturation <= 40) return "pioneiro";
  if (angleSaturation <= 55) return "emergente";
  return "saturado";
}

function buildMatrixCandidates(baseNiche, format) {
  const fmt = String(format || "SHORTS").toUpperCase();
  const isLong = fmt === "LONG" || fmt === "LONGO";
  const base = String(baseNiche || "").trim().toLowerCase();

  const macros = base
    ? MACRO_NICHES.filter((m) =>
        m.label.toLowerCase().includes(base)
        || base.includes(m.id.replace("_", ""))
        || m.searchBaseline.toLowerCase().includes(base),
      )
    : MACRO_NICHES;

  const selectedMacros = macros.length ? macros : MACRO_NICHES;
  const prioritized = base
    ? [selectedMacros[0], ...MACRO_NICHES.filter((m) => m.id !== selectedMacros[0]?.id).slice(0, 4)]
    : MACRO_NICHES;

  const uniqueMacros = [...new Map(prioritized.map((m) => [m.id, m])).values()].slice(0, 6);
  const candidates = [];

  for (const macro of uniqueMacros) {
    for (const pattern of FORMAT_PATTERNS.slice(0, 5)) {
      const angle = `${macro.label} — ${pattern.template}`;
      const searchQuery = buildSearchQuery(macro, pattern, isLong);
      candidates.push({
        macroNiche: macro.label,
        macroId: macro.id,
        angle,
        formatPattern: pattern.label,
        formatPatternId: pattern.id,
        youtubeSearchQuery: searchQuery,
        label: `${macro.label}: ${pattern.label}`,
      });
    }
  }

  return candidates;
}

function buildSearchQuery(macro, pattern, isLong) {
  const hints = {
    "timeline-objeto": "objeto história timeline",
    "mapa-misterio": "lugar misterioso mapa",
    "antes-depois-dados": "antes depois dados",
    "um-dia-extinto": "profissão extinta dia",
    "debunk-3-atos": "mito verdade história",
    "comparativo-paises": "comparação países",
    "arquivo-secreto": "documento histórico raro",
    "record-humano": "recorde humano",
  };
  const tail = hints[pattern.id] || pattern.label.toLowerCase();
  const macroWord = macro.label.toLowerCase().split("/")[0].trim();
  const formatWord = isLong ? "documentário" : "shorts";
  return `${macroWord} ${tail} ${formatWord}`.replace(/\s+/g, " ").trim().slice(0, 72);
}

function extractTopicCandidatesFromExa(exaResult) {
  const text = String(exaResult?.summary || "").trim();
  if (!text) return [];

  const out = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const bullet = line
      .replace(/^[-*•\d.)\]]+\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    if (isMetaGarbage(bullet)) continue;
    if (bullet.length < 12 || bullet.length > 80) continue;

    const macro = guessMacroFromText(bullet);
    out.push({
      macroNiche: macro?.label || "Curiosidades",
      macroId: macro?.id || "curiosidades",
      angle: bullet,
      formatPattern: "Ângulo emergente (web)",
      formatPatternId: "exa-topic",
      youtubeSearchQuery: bullet.split(/[—–:-]/)[0].trim().slice(0, 60),
      label: bullet.slice(0, 72),
    });
  }

  return out.slice(0, 8);
}

function guessMacroFromText(text = "") {
  const t = text.toLowerCase();
  return MACRO_NICHES.find((m) =>
    t.includes(m.label.toLowerCase())
    || m.searchBaseline.split(" ").some((w) => w.length > 4 && t.includes(w)),
  ) || null;
}

function buildExaQueries(baseNiche) {
  const base = String(baseNiche || "").trim();
  const queries = [
    "subculturas e hobbies emergentes Brasil pouco conhecidos",
    "tendências de interesse documentário história 2026",
    "fenômenos sociais novos pouco cobertos mídia",
    "profissões e ofícios esquecidos redescoberta",
  ];
  if (base) {
    queries.unshift(`temas emergentes ${base} documentário curiosidades`);
    queries.unshift(`subtemas ${base} pouco explorados português`);
  }
  return [...new Set(queries)].slice(0, 4);
}

async function measureYoutubeSaturation(accessToken, query, { baselineQuery = null } = {}) {
  const q = String(query || "").trim().slice(0, 80);
  const empty = {
    query: q,
    channelCount: 0,
    videoCount: 0,
    dedicatedChannels: 0,
    avgTopViews: 0,
    maxTopViews: 0,
    sampleChannels: [],
    sampleVideos: [],
    saturationPct: 100,
  };
  if (!q || isMetaGarbage(q)) return { ...empty, rejected: true, rejectReason: "meta-lixo" };

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

  const channelItems = channelSearch?.items || [];
  const channelTotal = formatCount(channelSearch?.pageInfo?.totalResults);
  const videoTotal = formatCount(videoSearch?.pageInfo?.totalResults);

  const keywords = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  const dedicatedChannels = channelItems.filter((item) => {
    const title = String(item?.snippet?.title || item?.snippet?.channelTitle || "").toLowerCase();
    const desc = String(item?.snippet?.description || "").toLowerCase();
    const blob = `${title} ${desc}`;
    return keywords.some((kw) => blob.includes(kw));
  }).length;

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

  const angleSaturation = saturationFromCounts({
    channelCount: channelTotal,
    videoCount: videoTotal,
    dedicatedChannels,
  });

  let macroSaturation = angleSaturation;
  if (baselineQuery) {
    const baseline = await measureYoutubeSaturation(accessToken, baselineQuery);
    macroSaturation = baseline.saturationPct;
  }

  const gapScore = Math.max(0, macroSaturation - angleSaturation);

  return {
    query: q,
    channelCount: channelTotal,
    videoCount: videoTotal,
    dedicatedChannels,
    avgTopViews,
    maxTopViews,
    sampleChannels: channelItems.slice(0, 5).map((item) => ({
      title: item?.snippet?.channelTitle || item?.snippet?.title || "",
      channelId: item?.id?.channelId || item?.snippet?.channelId,
    })),
    sampleVideos,
    saturationPct: angleSaturation,
    macroSaturationPct: macroSaturation,
    gapScore,
  };
}

function scorePioneerOpportunity(candidate, yt, format) {
  if (yt.rejected) return null;

  const angleSat = yt.saturationPct;
  const gap = yt.gapScore || 0;
  const dedicated = yt.dedicatedChannels || 0;

  const interest = 42 + Math.min(35, gap) + (dedicated <= 2 ? 12 : 0);
  const pioneerScore = Math.round(
    (100 - angleSat) * 0.5
    + gap * 0.3
    + Math.min(interest, 55) * 0.2,
  );

  const status = pioneerLabel(angleSat, pioneerScore, gap);
  const fmt = String(format || "SHORTS").toUpperCase();
  const videoFormat = fmt === "LONG" || fmt === "LONGO" ? "LONGO" : "SHORTS";

  let whyPioneer = "";
  if (status === "virgem") {
    whyPioneer = `Nicho "${candidate.macroNiche}" existe, mas este ângulo/formato tem ~${dedicated} canal(is) dedicado(s) na busca — espaço para definir o padrão.`;
  } else if (status === "pioneiro") {
    whyPioneer = `Macro-nicho mais concorrido (saturação ~${yt.macroSaturationPct}%), mas este ângulo está vazio (gap ${gap} pts) — pioneirismo real.`;
  } else if (status === "emergente") {
    whyPioneer = "Alguns criadores começaram, mas o formato ainda não tem referência clara em PT-BR.";
  } else {
    whyPioneer = "Muitos canais já cobrem este ângulo — só vale com twist visual ou narrativo único.";
  }

  return {
    label: candidate.label,
    macroNiche: candidate.macroNiche,
    angle: candidate.angle,
    formatPattern: candidate.formatPattern,
    youtubeSearchQuery: candidate.youtubeSearchQuery,
    pioneerScore,
    saturationPct: angleSat,
    macroSaturationPct: yt.macroSaturationPct,
    gapScore: gap,
    dedicatedChannels: dedicated,
    interestScore: interest,
    status,
    whyPioneer,
    format: videoFormat,
    youtube: yt,
  };
}

async function generateAnglesWithLlm({ llmFn, baseNiche, format }) {
  if (!llmFn) return [];

  const macroList = MACRO_NICHES.map((m) => m.label).join(", ");
  const patternList = FORMAT_PATTERNS.map((p) => `${p.label}: ${p.template}`).join("\n");

  const prompt = `Você é estrategista YouTube BR especializado em OCEANO AZUL.

O criador quer NICHOS REAIS (finanças, história, documentário…) combinados com ÂNGULOS e PADRÕES DE VÍDEO que quase NÃO EXISTEM no YouTube em português — poucos ou nenhum canal dedicado.

Nicho base do criador (se houver): "${baseNiche || "aberto a qualquer macro-nicho"}"
Formato alvo: ${format}

Macro-nichos válidos: ${macroList}

Padrões de vídeo de referência:
${patternList}

Gere 8 oportunidades pioneiras. Cada uma DEVE ter:
- macroNiche: um dos macro-nichos acima
- angle: sub-tema específico (tema real, não meta-YouTube)
- formatPattern: estrutura de vídeo inovadora ou rara no YouTube BR
- youtubeSearchQuery: 4-7 palavras para buscar concorrência no YouTube (sem aspas, sem título de blog)
- firstVideoIdea: título do 1º vídeo

PROIBIDO: "melhores nichos", "canais dark", tierlist, RPM, listas de nichos do YouTube, títulos de artigo/blog.

Retorne APENAS JSON:
{
  "opportunities": [
    {
      "macroNiche": "História",
      "angle": "...",
      "formatPattern": "...",
      "youtubeSearchQuery": "...",
      "firstVideoIdea": "...",
      "risk": "..."
    }
  ]
}`;

  try {
    const raw = await llmFn(prompt);
    const parsed = parseJsonLocally(extractJsonCandidate(raw));
    const rows = Array.isArray(parsed?.opportunities) ? parsed.opportunities : [];
    return rows
      .filter((r) => r?.macroNiche && r?.youtubeSearchQuery && !isMetaGarbage(r.angle))
      .map((r) => ({
        macroNiche: String(r.macroNiche).trim(),
        macroId: guessMacroFromText(r.macroNiche)?.id || "custom",
        angle: String(r.angle || "").trim(),
        formatPattern: String(r.formatPattern || "Formato pioneiro").trim(),
        formatPatternId: "llm",
        youtubeSearchQuery: String(r.youtubeSearchQuery || "").trim().slice(0, 72),
        label: `${r.macroNiche}: ${String(r.angle || "").slice(0, 48)}`,
        firstVideoIdea: String(r.firstVideoIdea || "").trim(),
        risk: String(r.risk || "").trim(),
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function refineWithLlm(scored, { llmFn, baseNiche, format }) {
  if (!llmFn || !scored.length) return scored;

  const prompt = `Estrategista YouTube BR — valide oportunidades PIONEIRAS.

Critério: macro-nicho conhecido (finanças, história…) + ângulo/formato com POUCOS canais dedicados no YouTube PT.

Nicho base: "${baseNiche || "geral"}" | Formato: ${format}

Reordene e refine os 6 melhores. Melhore textos em português claro.
Mantenha pioneerScore coerente com saturationPct e gapScore (menos saturação = maior score).

JSON apenas:
{
  "niches": [
    {
      "macroNiche": "...",
      "angle": "...",
      "formatPattern": "...",
      "label": "resumo curto",
      "pioneerScore": 0-100,
      "whyPioneer": "1-2 frases explicando POR QUE é pioneiro (não é lista de nichos do YouTube)",
      "firstVideoIdea": "...",
      "risk": "..."
    }
  ]
}

Dados:
${JSON.stringify(scored.slice(0, 12).map((s) => ({
  macroNiche: s.macroNiche,
  angle: s.angle,
  formatPattern: s.formatPattern,
  label: s.label,
  pioneerScore: s.pioneerScore,
  saturationPct: s.saturationPct,
  macroSaturationPct: s.macroSaturationPct,
  gapScore: s.gapScore,
  dedicatedChannels: s.dedicatedChannels,
  youtubeSearchQuery: s.youtubeSearchQuery,
})), null, 2)}`;

  try {
    const raw = await llmFn(prompt);
    const parsed = parseJsonLocally(extractJsonCandidate(raw));
    const niches = Array.isArray(parsed?.niches) ? parsed.niches : [];
    if (!niches.length) return scored;

    return niches.map((n, i) => {
      const src = scored.find((c) =>
        String(c.macroNiche || "").toLowerCase() === String(n.macroNiche || "").toLowerCase()
        && String(c.angle || "").toLowerCase().includes(String(n.angle || "").toLowerCase().slice(0, 20)),
      ) || scored[i] || scored[0];
      return {
        ...src,
        macroNiche: String(n.macroNiche || src.macroNiche || "").trim(),
        angle: String(n.angle || src.angle || "").trim(),
        formatPattern: String(n.formatPattern || src.formatPattern || "").trim(),
        label: String(n.label || src.label || "").trim(),
        pioneerScore: Number(n.pioneerScore) || src.pioneerScore,
        whyPioneer: String(n.whyPioneer || src.whyPioneer || "").trim(),
        firstVideoIdea: String(n.firstVideoIdea || src.firstVideoIdea || "").trim(),
        risk: String(n.risk || src.risk || "").trim(),
      };
    });
  } catch {
    return scored;
  }
}

function buildPioneerIdea(niche) {
  const title = niche.firstVideoIdea || `Pioneiro: ${niche.label}`.slice(0, 80);
  const hook = niche.status === "virgem" || niche.status === "pioneiro"
    ? `${niche.formatPattern} em "${niche.macroNiche}" — ângulo com ~${niche.dedicatedChannels ?? "?"} canal(is) dedicado(s) na busca.`
    : `Testar formato "${niche.formatPattern}" no nicho ${niche.macroNiche}.`;
  return {
    title,
    hookPt: hook,
    mechanic: "pioneer-niche",
    whyWorks: niche.whyPioneer,
    format: niche.format || "SHORTS",
    pioneerScore: niche.pioneerScore,
    saturationPct: niche.saturationPct,
    status: niche.status,
    macroNiche: niche.macroNiche,
  };
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

  let accessToken;
  try {
    accessToken = await getYoutubeAccessToken(workspaceDir);
  } catch (err) {
    return {
      ok: false,
      error: `YouTube não conectado: ${err.message}. Vincule o canal em Integrações.`,
    };
  }

  const candidateMap = new Map();

  const llmAngles = useAi && llmFn
    ? await generateAnglesWithLlm({ llmFn, baseNiche, format: fmt })
    : [];
  llmAngles.forEach((c) => candidateMap.set(`${c.macroNiche}|${c.youtubeSearchQuery}`, c));

  buildMatrixCandidates(baseNiche, fmt).forEach((c) => {
    const key = `${c.macroNiche}|${c.youtubeSearchQuery}`;
    if (!candidateMap.has(key)) candidateMap.set(key, c);
  });

  const exaResults = await Promise.all(
    buildExaQueries(baseNiche).map((q) => exaWebSearch(q, workspaceDir, { numResults: 5 })),
  );
  const exaAvailable = exaResults.some((r) => r.available);
  for (const exa of exaResults) {
    extractTopicCandidatesFromExa(exa).forEach((c) => {
      const key = `${c.macroNiche}|${c.youtubeSearchQuery}`;
      if (!candidateMap.has(key) && !isMetaGarbage(c.label)) candidateMap.set(key, c);
    });
  }

  if (risingNiches?.length) {
    for (const row of risingNiches.slice(0, 3)) {
      const macro = guessMacroFromText(row.niche) || MACRO_NICHES[2];
      const c = {
        macroNiche: macro.label,
        macroId: macro.id,
        angle: `Profundidade inédita em "${row.niche}" com formato narrativo novo`,
        formatPattern: "Série investigativa curta",
        formatPatternId: "channel-signal",
        youtubeSearchQuery: `${row.niche} documentário`.slice(0, 72),
        label: `${macro.label}: ${row.niche}`,
      };
      candidateMap.set(`${c.macroNiche}|${c.youtubeSearchQuery}`, c);
    }
  }

  const rawCandidates = [...candidateMap.values()]
    .filter((c) => !isMetaGarbage(c.label) && !isMetaGarbage(c.youtubeSearchQuery))
    .slice(0, 24);

  const baselineCache = new Map();
  const measured = [];
  for (const candidate of rawCandidates) {
    const macro = MACRO_NICHES.find((m) => m.label === candidate.macroNiche)
      || guessMacroFromText(candidate.macroNiche);
    const baseline = macro?.searchBaseline || null;

    try {
      let macroSaturationPct = 55;
      if (baseline) {
        if (!baselineCache.has(baseline)) {
          const b = await measureYoutubeSaturation(accessToken, baseline);
          baselineCache.set(baseline, b.saturationPct);
        }
        macroSaturationPct = baselineCache.get(baseline);
      }

      const yt = await measureYoutubeSaturation(accessToken, candidate.youtubeSearchQuery);
      yt.macroSaturationPct = macroSaturationPct;
      yt.gapScore = Math.max(0, macroSaturationPct - yt.saturationPct);
      const scored = scorePioneerOpportunity(candidate, yt, fmt);
      if (scored && scored.status !== "saturado") measured.push(scored);
    } catch (err) {
      console.warn("[pioneer] measure:", candidate.youtubeSearchQuery, err.message);
    }
  }

  measured.sort((a, b) => b.pioneerScore - a.pioneerScore);

  let pioneerNiches = measured.slice(0, Math.min(Math.max(Number(maxCandidates) || 10, 4), 12));

  if (useAi && llmFn && pioneerNiches.length) {
    pioneerNiches = await refineWithLlm(pioneerNiches, { llmFn, baseNiche, format: fmt });
  }

  const pioneerIdeas = pioneerNiches
    .filter((n) => n.pioneerScore >= 48)
    .slice(0, 6)
    .map(buildPioneerIdea);

  const virginCount = pioneerNiches.filter((n) => n.status === "virgem").length;
  const pioneerCount = pioneerNiches.filter((n) => n.status === "pioneiro" || n.status === "virgem").length;

  return {
    ok: true,
    baseNiche: baseNiche || null,
    format: fmt,
    exaAvailable,
    logic: {
      version: "macro-angle-gap",
      description: "Macro-nicho real + ângulo/formato medido no YouTube. Virgem = poucos canais dedicados neste ângulo, mesmo que finanças/história existam como categorias.",
    },
    pioneerNiches,
    pioneerIdeas,
    summary: {
      scanned: rawCandidates.length,
      validated: measured.length,
      virginCount,
      pioneerCount,
      topPick: pioneerNiches[0]?.label || null,
      topMacro: pioneerNiches[0]?.macroNiche || null,
    },
    fetchedAt: new Date().toISOString(),
  };
}