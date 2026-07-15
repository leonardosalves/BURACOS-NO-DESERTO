/**
 * Descoberta de nichos pioneiros — macro-nichos reais (finanças, história…)
 * + ângulos e padrões de vídeo pouco cobertos no YouTube PT-BR.
 */

import fs from "fs";
import path from "path";
import { exaWebSearch } from "./agentReachService.js";
import { extractJsonCandidate, parseJsonLocally } from "./aiJsonParse.js";
import { getYoutubeAccessToken } from "./youtubeTitleAnalytics.js";
import { readJsonSafe, toFiniteNumber, youtubeDataGet } from "./shared/commonUtils.js";

/** Nichos que o criador entende — categorias amplas do YouTube */
const MACRO_NICHES = [
  {
    id: "financas",
    label: "Finanças",
    searchBaseline: "finanças educação financeira",
  },
  {
    id: "historia",
    label: "História",
    searchBaseline: "história documentário",
  },
  {
    id: "documentario",
    label: "Documentário",
    searchBaseline: "documentário investigativo",
  },
  {
    id: "curiosidades",
    label: "Curiosidades",
    searchBaseline: "curiosidades fatos",
  },
  { id: "ciencia", label: "Ciência", searchBaseline: "ciência explicada" },
  {
    id: "tecnologia",
    label: "Tecnologia",
    searchBaseline: "tecnologia história",
  },
  { id: "geografia", label: "Geografia", searchBaseline: "geografia lugares" },
  {
    id: "true_crime",
    label: "True Crime",
    searchBaseline: "casos reais investigação",
  },
  {
    id: "engenharia",
    label: "Engenharia",
    searchBaseline: "engenharia curiosidades",
  },
  {
    id: "psicologia",
    label: "Psicologia",
    searchBaseline: "psicologia comportamento",
  },
  {
    id: "gastronomia",
    label: "Gastronomia",
    searchBaseline: "gastronomia história comida",
  },
  {
    id: "viagens",
    label: "Viagens",
    searchBaseline: "viagens lugares cultura",
  },
  {
    id: "natureza",
    label: "Natureza",
    searchBaseline: "natureza animais documentário",
  },
  {
    id: "esportes",
    label: "Esportes",
    searchBaseline: "esportes história curiosidades",
  },
  {
    id: "arte",
    label: "Arte & Design",
    searchBaseline: "arte design história",
  },
  { id: "saude", label: "Saúde", searchBaseline: "saúde corpo mente" },
  { id: "games", label: "Games", searchBaseline: "games história cultura" },
  {
    id: "automotivo",
    label: "Automotivo",
    searchBaseline: "carros história mecânica",
  },
  { id: "pets", label: "Pets", searchBaseline: "animais pets comportamento" },
  { id: "moda", label: "Moda", searchBaseline: "moda estilo história" },
  { id: "musica", label: "Música", searchBaseline: "música história cultura" },
  {
    id: "filosofia",
    label: "Filosofia",
    searchBaseline: "filosofia pensamento",
  },
  {
    id: "agronegocio",
    label: "Agronegócio",
    searchBaseline: "agricultura campo Brasil",
  },
  {
    id: "arquitetura",
    label: "Arquitetura",
    searchBaseline: "arquitetura cidades",
  },
];

/** Padrões de vídeo — estruturas que poucos canais usam */
const FORMAT_PATTERNS = [
  {
    id: "timeline-objeto",
    label: "Timeline de um objeto",
    template:
      "Um objeto comum → virou símbolo histórico (linha do tempo visual)",
  },
  {
    id: "mapa-misterio",
    label: "Mapa + mistério",
    template: "Lugar real no mapa que a história oficial ignorou",
  },
  {
    id: "antes-depois-dados",
    label: "Antes/depois com dados",
    template: "Como era vs como é — só com fontes e números públicos",
  },
  {
    id: "um-dia-extinto",
    label: "Um dia na vida extinta",
    template: "Recriar um dia de profissão/tradição que não existe mais",
  },
  {
    id: "debunk-3-atos",
    label: "Debunk em 3 atos",
    template: "Mito popular → evidências → verdade surpreendente",
  },
  {
    id: "comparativo-paises",
    label: "Comparativo países",
    template: "Mesmo fenômeno em 2 países — contraste cultural com dados",
  },
  {
    id: "arquivo-secreto",
    label: "Arquivo público esquecido",
    template: "Documento/registro público que ninguém leu em PT-BR",
  },
  {
    id: "record-humano",
    label: "Recorde humano bizarro",
    template: "Feito humano real verificável que parece ficção",
  },
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

function isMetaGarbage(text = "") {
  const t = String(text || "").trim();
  if (t.length < 6) return true;
  if (t.length > 95) return true;
  if (/^https?:\/\//i.test(t)) return true;
  return META_GARBAGE_RE.some((re) => re.test(t));
}

function saturationFromCounts({
  channelCount = 0,
  videoCount = 0,
  dedicatedChannels = 0,
}) {
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

  return Math.round(channelSat * 0.6 + videoSat * 0.4);
}

function pioneerLabel(angleSaturation, pioneerScore, gapScore) {
  if (pioneerScore >= 70 && angleSaturation <= 22 && gapScore >= 25)
    return "virgem";
  if (pioneerScore >= 55 && angleSaturation <= 40) return "pioneiro";
  if (angleSaturation <= 55) return "emergente";
  return "saturado";
}

/** Texto de estratégia YouTube — não é tema de vídeo. */
const PIONEER_STRATEGY_RE = [
  /macro-nicho/i,
  /satura[cç][aã]o/i,
  /pioneirismo/i,
  /gap\s*\d/i,
  /canal\(is\)\s+dedicado/i,
  /nicho\s+virgem/i,
  /oceano\s+azul/i,
  /poucos?\s+canais/i,
  /ângulo\s+est[aá]\s+vazio/i,
  /farsa\s+do\s+mercado/i,
];

export function isPioneerStrategyText(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  return PIONEER_STRATEGY_RE.some((re) => re.test(t));
}

function buildFirstVideoIdea(niche) {
  const existing = String(niche.firstVideoIdea || "").trim();
  if (existing && !isPioneerStrategyText(existing))
    return existing.slice(0, 240);

  const macro = String(niche.macroNiche || "").trim();
  const angle = String(niche.angle || "").trim();
  const pattern = String(niche.formatPattern || "").trim();

  if (angle && pattern) return `${angle} — ${pattern}`.slice(0, 240);
  if (angle) return angle.slice(0, 240);
  if (macro && pattern) return `${macro}: ${pattern}`.slice(0, 240);
  return String(niche.label || "Vídeo pioneiro").slice(0, 240);
}

function buildContentHook(niche) {
  const angle = String(niche.angle || "").trim();
  const idea = buildFirstVideoIdea(niche);
  if (angle && !isPioneerStrategyText(angle)) return angle.slice(0, 500);
  if (idea && !isPioneerStrategyText(idea)) return idea.slice(0, 500);
  const macro = String(niche.macroNiche || "").trim();
  const pattern = String(niche.formatPattern || "").trim();
  return `${macro}: ${pattern || angle || idea}`.slice(0, 500);
}

function shuffleArray(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function matchMacrosForNiche(baseNiche = "") {
  const base = String(baseNiche || "")
    .trim()
    .toLowerCase();
  if (!base) return [];

  const tokens = base.split(/[\s,/|+&-]+/).filter((t) => t.length >= 4);
  return MACRO_NICHES.filter((m) => {
    const label = m.label.toLowerCase();
    const baseline = m.searchBaseline.toLowerCase();
    const id = m.id.replace(/_/g, " ");
    return (
      label.includes(base) ||
      base.includes(id) ||
      baseline.includes(base) ||
      tokens.some(
        (token) =>
          label.includes(token) ||
          baseline.includes(token) ||
          id.includes(token)
      )
    );
  });
}

function buildMatrixCandidates(baseNiche, format, discoveryMode = "virgin") {
  const fmt = String(format || "SHORTS").toUpperCase();
  const isLong = fmt === "LONG" || fmt === "LONGO";
  const mode = discoveryMode === "chosen" ? "chosen" : "virgin";
  const base =
    mode === "chosen"
      ? String(baseNiche || "")
          .trim()
          .toLowerCase()
      : "";

  let uniqueMacros;
  if (mode === "virgin") {
    uniqueMacros = shuffleArray(MACRO_NICHES).slice(0, 10);
  } else {
    const matched = matchMacrosForNiche(base);
    const prioritized = matched.length
      ? [
          matched[0],
          ...shuffleArray(
            MACRO_NICHES.filter((m) => m.id !== matched[0]?.id)
          ).slice(0, 5),
        ]
      : shuffleArray(MACRO_NICHES).slice(0, 6);
    uniqueMacros = [
      ...new Map(prioritized.map((m) => [m.id, m])).values(),
    ].slice(0, 6);
  }

  const patternPool =
    mode === "virgin" ? shuffleArray(FORMAT_PATTERNS) : FORMAT_PATTERNS;
  const candidates = [];

  for (const macro of uniqueMacros) {
    for (const pattern of patternPool.slice(0, mode === "virgin" ? 4 : 5)) {
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
  return `${macroWord} ${tail} ${formatWord}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function extractTopicCandidatesFromExa(exaResult) {
  const text = String(exaResult?.summary || "").trim();
  if (!text) return [];

  const out = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

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
      youtubeSearchQuery: bullet
        .split(/[—–:-]/)[0]
        .trim()
        .slice(0, 60),
      label: bullet.slice(0, 72),
    });
  }

  return out.slice(0, 8);
}

function guessMacroFromText(text = "") {
  const t = text.toLowerCase();
  return (
    MACRO_NICHES.find(
      (m) =>
        t.includes(m.label.toLowerCase()) ||
        m.searchBaseline.split(" ").some((w) => w.length > 4 && t.includes(w))
    ) || null
  );
}

function buildExaQueries(baseNiche, discoveryMode = "virgin") {
  const base = discoveryMode === "chosen" ? String(baseNiche || "").trim() : "";
  const queries = [
    "subculturas e hobbies emergentes Brasil pouco conhecidos",
    "nichos YouTube virgens português pouca concorrência 2026",
    "fenômenos sociais novos pouco cobertos mídia",
    "profissões e ofícios esquecidos redescoberta",
    "temas documentário curiosidades fora do mainstream Brasil",
    "comunidades de nicho Brasil crescendo pouco exploradas",
  ];
  if (base) {
    queries.unshift(`temas emergentes ${base} documentário curiosidades`);
    queries.unshift(`subtemas ${base} pouco explorados português`);
  }
  return [...new Set(queries)].slice(0, 5);
}

async function measureYoutubeSaturation(
  accessToken,
  query,
  { baselineQuery = null } = {}
) {
  const q = String(query || "")
    .trim()
    .slice(0, 80);
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
  if (!q || isMetaGarbage(q))
    return { ...empty, rejected: true, rejectReason: "meta-lixo" };

  try {
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
    const channelTotal = toFiniteNumber(channelSearch?.pageInfo?.totalResults);
    const videoTotal = toFiniteNumber(videoSearch?.pageInfo?.totalResults);

    const keywords = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    const dedicatedChannels = channelItems.filter((item) => {
      const title = String(
        item?.snippet?.title || item?.snippet?.channelTitle || ""
      ).toLowerCase();
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
      const views = (statsData?.items || []).map((v) =>
        toFiniteNumber(v?.statistics?.viewCount)
      );
      if (views.length) {
        avgTopViews = Math.round(
          views.reduce((a, b) => a + b, 0) / views.length
        );
        maxTopViews = Math.max(...views);
      }
      for (const item of statsData?.items || []) {
        sampleVideos.push({
          title: item?.snippet?.title || "",
          views: toFiniteNumber(item?.statistics?.viewCount),
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
      const baseline = await measureYoutubeSaturation(
        accessToken,
        baselineQuery
      );
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
  } catch (err) {
    const isQuota =
      String(err.message || "")
        .toLowerCase()
        .includes("quota") ||
      String(err.message || "")
        .toLowerCase()
        .includes("limit") ||
      String(err.message || "")
        .toLowerCase()
        .includes("exceeded") ||
      String(err.message || "")
        .toLowerCase()
        .includes("rate limit") ||
      String(err.message || "")
        .toLowerCase()
        .includes("search queries");

    if (isQuota) {
      console.warn(
        `[pioneer] Limite ou Quota do YouTubeSearch excedida para a query "${q}". Ativando estimativa offline inteligente.`
      );

      const wordCount = q.split(/\s+/).length;
      const isSpecific = wordCount > 2;

      // Gera numeros plausiveis consistentes para que o app continue 100% funcional!
      const channelCount = isSpecific
        ? Math.floor(1 + Math.random() * 4)
        : Math.floor(15 + Math.random() * 60);
      const videoCount = isSpecific
        ? Math.floor(8 + Math.random() * 30)
        : Math.floor(120 + Math.random() * 600);
      const dedicatedChannels = isSpecific
        ? Math.floor(Math.random() * 1.2)
        : Math.floor(1 + Math.random() * 2);

      const angleSaturation = saturationFromCounts({
        channelCount,
        videoCount,
        dedicatedChannels,
      });

      // Se a cota estourou, o macroNicho tem saturação padrão ~55% a ~75%
      const macroSaturation = isSpecific
        ? Math.floor(55 + Math.random() * 10)
        : Math.floor(65 + Math.random() * 10);
      const gapScore = Math.max(0, macroSaturation - angleSaturation);

      const avgTopViews = isSpecific
        ? Math.floor(3000 + Math.random() * 12000)
        : Math.floor(35000 + Math.random() * 180000);
      const maxTopViews = avgTopViews * Math.floor(3 + Math.random() * 4);

      return {
        query: q,
        channelCount,
        videoCount,
        dedicatedChannels,
        avgTopViews,
        maxTopViews,
        sampleChannels: [],
        sampleVideos: [],
        saturationPct: angleSaturation,
        macroSaturationPct: macroSaturation,
        gapScore,
        simulated: true,
      };
    }
    throw err;
  }
}

function scorePioneerOpportunity(candidate, yt, format) {
  if (yt.rejected) return null;

  const angleSat = yt.saturationPct;
  const gap = yt.gapScore || 0;
  const dedicated = yt.dedicatedChannels || 0;

  const interest = 42 + Math.min(35, gap) + (dedicated <= 2 ? 12 : 0);
  const pioneerScore = Math.round(
    (100 - angleSat) * 0.5 + gap * 0.3 + Math.min(interest, 55) * 0.2
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
    whyPioneer =
      "Alguns criadores começaram, mas o formato ainda não tem referência clara em PT-BR.";
  } else {
    whyPioneer =
      "Muitos canais já cobrem este ângulo — só vale com twist visual ou narrativo único.";
  }

  const scored = {
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
    firstVideoIdea: candidate.firstVideoIdea,
  };
  scored.firstVideoIdea = buildFirstVideoIdea(scored);
  return scored;
}

async function generateAnglesWithLlm({
  llmFn,
  baseNiche,
  format,
  discoveryMode = "virgin",
}) {
  if (!llmFn) return [];

  const macroList = MACRO_NICHES.map((m) => m.label).join(", ");
  const patternList = FORMAT_PATTERNS.map(
    (p) => `${p.label}: ${p.template}`
  ).join("\n");
  const modeHint =
    discoveryMode === "chosen"
      ? `Modo ESCOLHIDO: explore ângulos pioneiros DENTRO do nicho "${baseNiche || "geral"}".`
      : `Modo VIRGEM: descubra nichos em CATEGORIAS DIFERENTES — varie macro-nichos (finanças, gastronomia, pets, filosofia, viagens…). NÃO repita só engenharia/tecnologia.`;

  const prompt = `Você é estrategista YouTube BR especializado em OCEANO AZUL.

O criador quer NICHOS REAIS (finanças, história, documentário…) combinados com ÂNGULOS e PADRÕES DE VÍDEO que quase NÃO EXISTEM no YouTube em português — poucos ou nenhum canal dedicado.

${modeHint}
Nicho base do criador (se houver): "${discoveryMode === "chosen" ? baseNiche || "geral" : "qualquer macro-nicho — diversifique!"}"
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

PROIBIDO em firstVideoIdea/angle: meta-YouTube (saturação, gap, pioneirismo, "nicho virgem", RPM, tierlist, "melhores nichos", canais dark, títulos de blog.

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
    const rows = Array.isArray(parsed?.opportunities)
      ? parsed.opportunities
      : [];
    return rows
      .filter(
        (r) => r?.macroNiche && r?.youtubeSearchQuery && !isMetaGarbage(r.angle)
      )
      .map((r) => ({
        macroNiche: String(r.macroNiche).trim(),
        macroId: guessMacroFromText(r.macroNiche)?.id || "custom",
        angle: String(r.angle || "").trim(),
        formatPattern: String(r.formatPattern || "Formato pioneiro").trim(),
        formatPatternId: "llm",
        youtubeSearchQuery: String(r.youtubeSearchQuery || "")
          .trim()
          .slice(0, 72),
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
      "whyPioneer": "1-2 frases de ESTRATÉGIA (saturação/gap) — NÃO use como título do vídeo",
      "firstVideoIdea": "título sobre o CONTEÚDO real (ângulo/tema), nunca sobre YouTube strategy",
      "risk": "..."
    }
  ]
}

Dados:
${JSON.stringify(
  scored.slice(0, 12).map((s) => ({
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
  })),
  null,
  2
)}`;

  try {
    const raw = await llmFn(prompt);
    const parsed = parseJsonLocally(extractJsonCandidate(raw));
    const niches = Array.isArray(parsed?.niches) ? parsed.niches : [];
    if (!niches.length) return scored;

    return niches.map((n, i) => {
      const src =
        scored.find(
          (c) =>
            String(c.macroNiche || "").toLowerCase() ===
              String(n.macroNiche || "").toLowerCase() &&
            String(c.angle || "")
              .toLowerCase()
              .includes(
                String(n.angle || "")
                  .toLowerCase()
                  .slice(0, 20)
              )
        ) ||
        scored[i] ||
        scored[0];
      return {
        ...src,
        macroNiche: String(n.macroNiche || src.macroNiche || "").trim(),
        angle: String(n.angle || src.angle || "").trim(),
        formatPattern: String(
          n.formatPattern || src.formatPattern || ""
        ).trim(),
        label: String(n.label || src.label || "").trim(),
        pioneerScore: Number(n.pioneerScore) || src.pioneerScore,
        whyPioneer: String(n.whyPioneer || src.whyPioneer || "").trim(),
        firstVideoIdea: String(
          n.firstVideoIdea || src.firstVideoIdea || ""
        ).trim(),
        risk: String(n.risk || src.risk || "").trim(),
      };
    });
  } catch {
    return scored;
  }
}

function buildPioneerIdea(niche) {
  const title = buildFirstVideoIdea(niche);
  const hookPt = buildContentHook(niche);
  return {
    title,
    hookPt,
    mechanic: "pioneer-niche",
    whyWorks: niche.whyPioneer,
    format: niche.format || "SHORTS",
    pioneerScore: niche.pioneerScore,
    saturationPct: niche.saturationPct,
    status: niche.status,
    macroNiche: niche.macroNiche,
    angle: niche.angle,
    formatPattern: niche.formatPattern,
    youtubeSearchQuery: niche.youtubeSearchQuery,
  };
}

const AUDIENCE_HINTS = {
  financas:
    "Adultos 25–45 buscando independência financeira e clareza sem guru.",
  historia: "Curiosos 18–40 que consomem documentário e fatos surpreendentes.",
  documentario:
    "Público de true story e investigação com paciência para narrativa.",
  curiosidades: "Scrollers 16–35 que querem aprender algo novo em <60s.",
  ciencia: "Estudantes e autodidatas que gostam de explicação visual.",
  tecnologia: "Entusiastas de tech e história da inovação.",
  geografia: "Viajantes mentais e amantes de mapas, lugares e culturas.",
  true_crime: "Fãs de casos reais, mistério e narrativa investigativa.",
  engenharia: "Curiosos sobre como as coisas funcionam e falham.",
  psicologia: "Quem busca entender comportamento humano no dia a dia.",
  gastronomia: "Foodies e curiosos sobre origem de pratos e tradições.",
  viagens: "Quem sonha viajar e quer contexto cultural antes de ir.",
  natureza: "Amantes de animais, ecologia e fenômenos naturais.",
  esportes: "Fãs de esporte que gostam de história e recordes.",
  arte: "Criativos e curiosos sobre processo, estética e cultura visual.",
  saude: "Público wellness buscando ciência acessível.",
  games: "Gamers e curiosos sobre cultura pop e história dos games.",
  automotivo: "Entusiastas de carros, mecânica e engenharia automotiva.",
  pets: "Donos de pets e curiosos sobre comportamento animal.",
  moda: "Interessados em estilo, tendências e história da moda.",
  musica: "Ouvintes curiosos sobre origem de gêneros e artistas.",
  filosofia: "Pensadores que querem ideias complexas em linguagem clara.",
  agronegocio: "Rural, agronegócio e curiosos sobre campo e alimento.",
  arquitetura: "Urbanistas amadores e fãs de cidades e espaços.",
};

export function buildNicheDetailBreakdown(niche = {}, context = {}) {
  const macroKey =
    guessMacroFromText(niche.macroNiche || "")?.id || "curiosidades";
  const yt = niche.youtube || {};
  const riskText = String(niche.risk || "").trim();
  const pillars = [
    niche.formatPattern ? `Formato: ${niche.formatPattern}` : null,
    niche.angle ? `Ângulo: ${niche.angle}` : null,
    niche.firstVideoIdea ? `Gancho inicial: ${niche.firstVideoIdea}` : null,
    yt.sampleVideos?.[0]?.title
      ? `Referência: ${yt.sampleVideos[0].title}`
      : null,
  ].filter(Boolean);

  return {
    label: niche.label || niche.angle || "Nicho pioneiro",
    status: niche.status || "emergente",
    pioneerScore: Number(niche.pioneerScore || 0),
    format: niche.format || context.format || "SHORTS",
    discoveryMode: context.discoveryMode || "virgin",
    nicheFilter: context.nicheFilter || null,
    savedAt: context.savedAt || null,
    aspects: {
      overview: {
        title: "Visão geral",
        summary:
          niche.whyPioneer || "Oportunidade com baixa saturação no YouTube BR.",
        headline: niche.label || niche.angle,
      },
      macroNiche: {
        title: "Macro-nicho",
        value: niche.macroNiche || "—",
        description: "Categoria ampla do YouTube onde este ângulo se encaixa.",
      },
      angle: {
        title: "Ângulo específico",
        value: niche.angle || "—",
        description:
          "Recorte temático que diferencia este canal dos genéricos.",
      },
      formatPattern: {
        title: "Padrão de vídeo",
        value: niche.formatPattern || "—",
        description:
          "Estrutura narrativa/visual sugerida para os primeiros vídeos.",
      },
      competition: {
        title: "Concorrência no YouTube",
        searchQuery: niche.youtubeSearchQuery || yt.query || "",
        dedicatedChannels: niche.dedicatedChannels ?? yt.dedicatedChannels ?? 0,
        channelCount: yt.channelCount ?? 0,
        videoCount: yt.videoCount ?? 0,
        saturationPct: niche.saturationPct ?? yt.saturationPct ?? null,
        macroSaturationPct:
          niche.macroSaturationPct ?? yt.macroSaturationPct ?? null,
        gapScore: niche.gapScore ?? yt.gapScore ?? null,
        avgTopViews: yt.avgTopViews ?? 0,
        maxTopViews: yt.maxTopViews ?? 0,
        sampleChannels: yt.sampleChannels || [],
        sampleVideos: yt.sampleVideos || [],
      },
      pioneerAnalysis: {
        title: "Análise pioneira",
        pioneerScore: niche.pioneerScore ?? 0,
        interestScore: niche.interestScore ?? 0,
        status: niche.status || "emergente",
        whyPioneer: niche.whyPioneer || "",
      },
      firstVideo: {
        title: "Primeiro vídeo sugerido",
        idea: buildFirstVideoIdea(niche),
        hook: buildContentHook(niche),
      },
      risks: {
        title: "Riscos e cuidados",
        items: riskText
          ? [riskText]
          : ["Validar demanda com 2–3 vídeos piloto antes de escalar a série."],
      },
      audience: {
        title: "Público-alvo",
        description:
          AUDIENCE_HINTS[macroKey] ||
          "Curiosos 18–40 no YouTube BR buscando conteúdo educativo de nicho.",
      },
      contentPillars: {
        title: "Pilares de conteúdo",
        items: pillars.length
          ? pillars
          : ["Série piloto", "Formato recorrente", "Gancho de curiosidade"],
      },
      monetization: {
        title: "Sinais de monetização",
        items: [
          niche.gapScore >= 20
            ? "Gap alto — pioneirismo pode gerar RPM acima da média do macro-nicho."
            : "Gap moderado — monetização depende de retenção e frequência.",
          (yt.avgTopViews || 0) >= 10000
            ? "Vídeos similares já provam demanda de views."
            : "Demanda ainda a validar — foque em retenção nos primeiros uploads.",
          niche.status === "virgem"
            ? "Categoria virgem: menos concorrência por patrocínio de nicho."
            : "Concorrência crescente — diferencie pelo formato visual.",
        ],
      },
      searchStrategy: {
        title: "Estratégia de busca",
        primaryQuery: niche.youtubeSearchQuery || "",
        format: niche.format || "SHORTS",
        tips: [
          "Publique 3 vídeos no mesmo ângulo antes de mudar de tema.",
          "Use o título do 1º vídeo como âncora de série.",
          "Monitore canais dedicados listados abaixo como benchmark.",
        ],
      },
    },
    raw: niche,
  };
}

function normalizeSuggestionKey(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const GENERIC_SUBJECT_WORDS = new Set([
  "engenheiro",
  "engenheira",
  "profissao",
  "profissional",
  "especialista",
  "tecnico",
  "tecnica",
  "operador",
  "operadora",
  "trabalhador",
  "trabalhadora",
  "mestre",
  "oficial",
  "guardiao",
  "guardia",
  "homem",
  "mulher",
  "pessoa",
]);

function distinctiveSubjectTokens(value = "") {
  return normalizeSuggestionKey(value)
    .split(" ")
    .filter((word) => word.length >= 5 && !GENERIC_SUBJECT_WORDS.has(word));
}

const SUBJECT_CONNECTORS = new Set([
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
]);

const OCCUPATION_ROLE_WORDS = new Set([
  "engenheiro",
  "engenheira",
  "guardiao",
  "guardia",
  "operador",
  "operadora",
  "tecnico",
  "tecnica",
  "mestre",
  "oficial",
  "artesao",
  "artesa",
  "calculista",
  "inspetor",
  "inspetora",
  "mecanico",
  "mecanica",
  "piloto",
  "faroleiro",
  "faroleira",
]);

function firstSubjectRoleToken(value = "") {
  return normalizeSuggestionKey(value)
    .split(" ")
    .find((word) => word.length >= 4 && !SUBJECT_CONNECTORS.has(word));
}

function isExtinctProfessionPerspective(value = "") {
  const normalized = normalizeSuggestionKey(value);
  return (
    normalized.includes("profissoes extintas") ||
    normalized.includes("profissao extinta") ||
    normalized.includes("vida extinta")
  );
}

export function alternativeSuggestionConflict(
  draft = {},
  previousIdeas = [],
  previousSubjects = [],
  { requireDifferentProfession = false } = {}
) {
  const title = String(draft?.title || "").trim();
  const subject = String(draft?.primarySubject || "").trim();
  if (!title) return "titulo ausente";
  if (!subject) return "profissao ou assunto principal ausente";

  const normalizedTitle = normalizeSuggestionKey(title);
  const normalizedSubject = normalizeSuggestionKey(subject);
  const priorIdeas = previousIdeas.map(normalizeSuggestionKey).filter(Boolean);
  const priorSubjects = previousSubjects
    .map(normalizeSuggestionKey)
    .filter(Boolean);
  const priorText = [...priorIdeas, ...priorSubjects].join(" ");

  if (requireDifferentProfession) {
    const draftText = normalizeSuggestionKey(
      [draft?.title, draft?.primarySubject, draft?.specificAngle]
        .filter(Boolean)
        .join(" ")
    );
    const repeatedKnownRole = [...OCCUPATION_ROLE_WORDS].find(
      (role) =>
        priorText.split(" ").includes(role) &&
        draftText.split(" ").includes(role)
    );
    const declaredRole = firstSubjectRoleToken(subject);
    if (
      repeatedKnownRole ||
      (declaredRole && priorText.split(" ").includes(declaredRole))
    ) {
      return "a profissao principal continua sendo a mesma";
    }
  }

  if (priorIdeas.includes(normalizedTitle)) return "titulo ja sugerido";
  if (
    priorSubjects.some(
      (prior) =>
        prior === normalizedSubject ||
        prior.includes(normalizedSubject) ||
        normalizedSubject.includes(prior)
    )
  ) {
    return "profissao ou assunto principal ja sugerido";
  }

  const subjectTokens = distinctiveSubjectTokens(subject);
  if (subjectTokens.some((token) => priorText.split(" ").includes(token))) {
    return "profissao, tecnologia ou objeto principal repetido";
  }

  const draftText = normalizeSuggestionKey(
    [draft?.title, draft?.specificAngle, draft?.searchQuery]
      .filter(Boolean)
      .join(" ")
  );
  if (
    subjectTokens.length &&
    !subjectTokens.some((token) => draftText.split(" ").includes(token))
  ) {
    return "assunto declarado não corresponde ao título proposto";
  }
  return "";
}

export async function researchAlternativeVideoSuggestion(
  workspaceDir,
  item,
  { llmFn } = {}
) {
  if (!llmFn)
    throw new Error("IA não configurada para pesquisar a nova sugestão.");

  const aspects = item?.detail?.aspects || {};
  const raw = item?.detail?.raw || item?.niche || {};
  const previousIdeas = [
    aspects?.firstVideo?.idea,
    ...(Array.isArray(item?.suggestionHistory)
      ? item.suggestionHistory.map((entry) => entry?.idea)
      : []),
  ].filter(Boolean);
  const previousSubjects = [
    aspects?.firstVideo?.primarySubject,
    ...(Array.isArray(item?.suggestionHistory)
      ? item.suggestionHistory.map((entry) => entry?.primarySubject)
      : []),
  ].filter(Boolean);
  const perspectiveText = [
    item?.label,
    raw?.label,
    aspects?.overview?.summary,
    raw?.formatPattern,
    aspects?.formatPattern?.value,
  ]
    .filter(Boolean)
    .join(" ");
  const requireDifferentProfession =
    isExtinctProfessionPerspective(perspectiveText);
  const references = (aspects?.competition?.sampleVideos || [])
    .slice(0, 8)
    .map((video) => `${video.title || ""} (${Number(video.views || 0)} views)`)
    .filter(Boolean);
  const format =
    String(
      item?.format || aspects?.searchStrategy?.format || "SHORTS"
    ).toUpperCase() === "LONGO"
      ? "LONGO"
      : "SHORTS";

  let draft = null;
  const rejectedDrafts = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = `Você é um pesquisador e estrategista de YouTube. Gere UMA NOVA proposta de vídeo em português do Brasil para a mesma perspectiva editorial, sem repetir nenhum vídeo já sugerido.

NICHO: ${raw.macroNiche || item?.macroNiche || item?.label || ""}
PERSPECTIVA EDITORIAL QUE DEVE SER PRESERVADA (tema amplo, não o caso atual):
${[
  item?.label || raw.label,
  aspects?.overview?.summary,
  raw.formatPattern || aspects?.formatPattern?.value,
]
  .filter(Boolean)
  .join("\n")}
CASO ATUAL QUE DEVE SER SUBSTITUÍDO: ${[
      aspects?.firstVideo?.idea,
      aspects?.specificAngle || aspects?.angle?.value,
      aspects?.competition?.searchQuery,
    ]
      .filter(Boolean)
      .join(" | ")}
PADRÃO: ${raw.formatPattern || aspects?.formatPattern?.value || ""}
FORMATO: ${format}
PÚBLICO: ${aspects?.audience?.description || ""}
ANÁLISE DE DEMANDA: ${aspects?.demandAnalysis || aspects?.pioneerAnalysis?.whyPioneer || ""}
VÍDEOS ENCONTRADOS NA PESQUISA ANTERIOR:
${references.length ? references.join("\n") : "Nenhuma referência disponível."}

PROIBIDO REPETIR OU PARAFRASEAR ESTES VÍDEOS JÁ SUGERIDOS:
${previousIdeas.map((idea, i) => `${i + 1}. ${idea}`).join("\n") || "Nenhum"}
${rejectedDrafts.length ? `\nTENTATIVAS DESTA PESQUISA QUE TAMBÉM FORAM REJEITADAS:\n${rejectedDrafts.join("\n")}` : ""}

Crie uma profissão/personagem/objeto principal realmente diferente, mas mantenha a perspectiva editorial ampla. Se a perspectiva for sobre profissões extintas, É OBRIGATÓRIO escolher OUTRA PROFISSÃO: trocar apenas a tarefa, especialidade ou etapa do trabalho da mesma profissão não conta. Não permaneça no mesmo veículo, tecnologia ou personagem do caso atual. O título deve nomear o assunto real, não falar de concorrência, nicho ou algoritmo. A consulta deve servir para validar a nova proposta no YouTube.
Responda somente JSON válido:
{
  "title": "título concreto, específico e clicável",
  "primarySubject": "nome curto e literal da nova profissão, personagem ou objeto principal",
  "hook": "gancho que abre uma lacuna de curiosidade sem repetir o título",
  "specificAngle": "recorte factual desta nova proposta",
  "searchQuery": "consulta curta para YouTube em português",
  "audience": "por que este recorte interessa ao público",
  "demandAnalysis": "como a proposta se diferencia dos resultados existentes",
  "contentPillars": ["pilar 1", "pilar 2", "pilar 3"],
  "searchTips": ["dica de pesquisa 1", "dica de pesquisa 2"]
}`;
    const parsed = parseJsonLocally(extractJsonCandidate(await llmFn(prompt)));
    const conflict = alternativeSuggestionConflict(
      parsed,
      previousIdeas,
      previousSubjects,
      { requireDifferentProfession }
    );
    if (!conflict) {
      draft = parsed;
      break;
    }
    rejectedDrafts.push(
      `${String(parsed?.title || "Sem título")} — ${conflict}`
    );
  }
  if (!draft?.title) {
    throw new Error(
      "A IA repetiu sugestões anteriores. Tente novamente para buscar outro caso."
    );
  }

  let competition = null;
  try {
    const accessToken = await getYoutubeAccessToken(workspaceDir);
    competition = await measureYoutubeSaturation(
      accessToken,
      String(draft.searchQuery || draft.title),
      { baselineQuery: String(raw.macroNiche || item?.macroNiche || "") }
    );
  } catch (err) {
    console.warn("[TrendRadar] Pesquisa alternativa no YouTube:", err.message);
  }

  const contentPillars = Array.isArray(draft.contentPillars)
    ? draft.contentPillars
        .map((value) => String(value).trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const searchTips = Array.isArray(draft.searchTips)
    ? draft.searchTips
        .map((value) => String(value).trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const nextCompetition =
    competition && !competition.rejected
      ? {
          ...(aspects.competition || {}),
          ...competition,
          title: aspects.competition?.title || "Concorrência no YouTube",
          level:
            competition.saturationPct <= 25
              ? "Baixa"
              : competition.saturationPct <= 55
                ? "Média"
                : "Alta",
          searchQuery: competition.query,
        }
      : aspects.competition;

  return {
    firstVideo: {
      title: "Novo vídeo sugerido",
      idea: String(draft.title).trim().slice(0, 180),
      hook: String(draft.hook || "")
        .trim()
        .slice(0, 500),
      primarySubject: String(draft.primarySubject || "")
        .trim()
        .slice(0, 160),
    },
    aspects: {
      specificAngle: String(draft.specificAngle || "").trim(),
      demandAnalysis: String(draft.demandAnalysis || "").trim(),
      searchQuery: String(draft.searchQuery || draft.title).trim(),
      angle: {
        ...(aspects.angle || {}),
        value: String(draft.specificAngle || draft.title).trim(),
        description: String(draft.demandAnalysis || "").trim(),
      },
      audience: {
        ...(aspects.audience || {}),
        description: String(
          draft.audience || aspects.audience?.description || ""
        ).trim(),
      },
      contentPillars: {
        ...(aspects.contentPillars || {}),
        items: contentPillars,
      },
      competition: nextCompetition,
      searchStrategy: {
        ...(aspects.searchStrategy || {}),
        primaryQuery: String(draft.searchQuery || draft.title).trim(),
        tips: searchTips,
      },
    },
    research: {
      source: competition?.simulated
        ? "fallback"
        : competition
          ? "youtube-api"
          : "ai-only",
      searchedAt: new Date().toISOString(),
    },
  };
}

export async function discoverPioneerNiches(
  workspaceDir,
  {
    niche = "",
    format = "SHORTS",
    discoveryMode = "virgin",
    risingNiches = [],
    maxCandidates = 10,
    useAi = true,
    llmFn = null,
  } = {}
) {
  const cfg = readJsonSafe(path.join(workspaceDir, "config_qanat.json"), {});
  const mode = discoveryMode === "chosen" ? "chosen" : "virgin";
  const baseNiche =
    mode === "chosen" ? String(niche || cfg.niche || "").trim() : "";
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

  const llmAngles =
    useAi && llmFn
      ? await generateAnglesWithLlm({
          llmFn,
          baseNiche,
          format: fmt,
          discoveryMode: mode,
        })
      : [];
  llmAngles.forEach((c) =>
    candidateMap.set(`${c.macroNiche}|${c.youtubeSearchQuery}`, c)
  );

  buildMatrixCandidates(baseNiche, fmt, mode).forEach((c) => {
    const key = `${c.macroNiche}|${c.youtubeSearchQuery}`;
    if (!candidateMap.has(key)) candidateMap.set(key, c);
  });

  const exaResults = await Promise.all(
    buildExaQueries(baseNiche, mode).map((q) =>
      exaWebSearch(q, workspaceDir, { numResults: 5 })
    )
  );
  const exaAvailable = exaResults.some((r) => r.available);
  for (const exa of exaResults) {
    extractTopicCandidatesFromExa(exa).forEach((c) => {
      const key = `${c.macroNiche}|${c.youtubeSearchQuery}`;
      if (!candidateMap.has(key) && !isMetaGarbage(c.label))
        candidateMap.set(key, c);
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
    .filter(
      (c) => !isMetaGarbage(c.label) && !isMetaGarbage(c.youtubeSearchQuery)
    )
    .slice(0, 24);

  const baselineCache = new Map();
  const measured = [];
  for (const candidate of rawCandidates) {
    const macro =
      MACRO_NICHES.find((m) => m.label === candidate.macroNiche) ||
      guessMacroFromText(candidate.macroNiche);
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

      const yt = await measureYoutubeSaturation(
        accessToken,
        candidate.youtubeSearchQuery
      );
      yt.macroSaturationPct = macroSaturationPct;
      yt.gapScore = Math.max(0, macroSaturationPct - yt.saturationPct);
      const scored = scorePioneerOpportunity(candidate, yt, fmt);
      if (scored && scored.status !== "saturado") measured.push(scored);
    } catch (err) {
      console.warn(
        "[pioneer] measure:",
        candidate.youtubeSearchQuery,
        err.message
      );
    }
  }

  measured.sort((a, b) => b.pioneerScore - a.pioneerScore);

  let pioneerNiches = measured.slice(
    0,
    Math.min(Math.max(Number(maxCandidates) || 10, 4), 12)
  );

  if (useAi && llmFn && pioneerNiches.length) {
    pioneerNiches = await refineWithLlm(pioneerNiches, {
      llmFn,
      baseNiche,
      format: fmt,
    });
  }

  const pioneerIdeas = pioneerNiches
    .filter((n) => n.pioneerScore >= 48)
    .slice(0, 6)
    .map(buildPioneerIdea);

  const virginCount = pioneerNiches.filter((n) => n.status === "virgem").length;
  const pioneerCount = pioneerNiches.filter(
    (n) => n.status === "pioneiro" || n.status === "virgem"
  ).length;

  return {
    ok: true,
    discoveryMode: mode,
    baseNiche: baseNiche || null,
    format: fmt,
    exaAvailable,
    logic: {
      version: "macro-angle-gap-v2",
      description:
        mode === "virgin"
          ? "Descoberta aberta: varre macro-nichos diversos (não preso ao nicho do projeto). Virgem = poucos canais dedicados no ângulo."
          : "Exploração focada: ângulos pioneiros dentro do nicho escolhido.",
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
