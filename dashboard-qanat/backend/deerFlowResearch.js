/**
 * Pesquisa profunda estilo DeerFlow — planner → pesquisadores paralelos → relatório.
 * Adaptado ao stack Lumiera (sem LangGraph): web, Exa, concorrentes, NotebookLM.
 */

import fs from "fs";
import path from "path";

import { fetchWebResearchForTopic } from "./webResearchService.js";
import { exaWebSearch } from "./agentReachService.js";
import { runCompetitorResearch } from "./competitorResearch.js";
import { fetchNotebooklmResearch } from "./notebooklmService.js";
import { enqueueEditorialIdeas } from "./youtubeEditorialQueue.js";
import {
  appendDailyRunLog,
  ensureAgentDirs,
  getAgentPaths,
} from "./agentMemory.js";
import { repairVaultGraphLinks } from "./obsidianVault.js";
import { compressTranscriptForPrompt } from "./lumieraContextCompress.js";

const MEMORY_FILE = "deep-research-reports.md";
const MAX_REPORT_CHARS = 24000;

export function planDeepResearch(
  topic = "",
  { niche = "Geral", format = "SHORTS" } = {}
) {
  const t = String(topic || niche).trim();
  const fmt =
    String(format).toUpperCase() === "LONG" || format === "LONGO"
      ? "LONGO"
      : "SHORTS";
  const subQuestions = [
    `Contexto essencial: o que o público de ${niche} precisa entender sobre "${t}"?`,
    `Fatos surpreendentes, números e datas verificáveis sobre "${t}"`,
    `Mecânicas virais: o que canais de ${niche} fazem bem (e mal) ao cobrir "${t}"?`,
    fmt === "SHORTS"
      ? `Ângulos para YouTube Shorts (gancho 3s, listicle, revelação) sobre "${t}"`
      : `Estrutura documental longa (atos, open loops, capítulos) sobre "${t}"`,
    `Lacunas e mitos comuns que vídeos superficiais ignoram sobre "${t}"`,
  ];

  return {
    topic: t,
    niche: String(niche || "Geral").trim(),
    format: fmt,
    subQuestions,
    legs: ["web", "exa", "competitors", "notebooklm"],
    version: 1,
    source: "deer-flow-lumiera",
  };
}

async function runWebLeg(
  workspaceDir,
  {
    topic,
    niche,
    format,
    getApiKeys,
    apiKey,
    diversityHint = "",
    excludeTopics = [],
  }
) {
  const fmt = format === "LONGO" ? "LONG" : "SHORT";
  return {
    leg: "web",
    ...(await fetchWebResearchForTopic({
      topic,
      niche,
      format: fmt,
      apiKey,
      getApiKeys: () => getApiKeys(workspaceDir),
      workspaceDir,
      diversityHint,
      excludeTopics,
    })),
  };
}

async function runNotebooklmLeg(
  workspaceDir,
  backendDir,
  { topic, niche, format, deep = false, projDir }
) {
  const fmtApi = format === "LONGO" ? "LONG" : "SHORT";
  const result = await fetchNotebooklmResearch(niche || topic, fmtApi, {
    backendDir,
    purpose: "ideas",
    idea: { title: topic, promise: topic },
    runResearch: true,
    researchMode: deep ? "deep" : "fast",
    projDir,
  });
  return { leg: "notebooklm", ...result };
}

function buildExecutiveSummary(artifacts = {}) {
  const parts = [];
  if (artifacts.web?.summary) parts.push(artifacts.web.summary.slice(0, 1200));
  if (artifacts.exa?.summary) parts.push(artifacts.exa.summary.slice(0, 800));
  if (artifacts.notebooklm?.summary)
    parts.push(artifacts.notebooklm.summary.slice(0, 800));
  const merged = parts.join("\n\n").trim();
  return (
    merged.slice(0, 2500) ||
    "Pesquisa concluída — veja seções detalhadas abaixo."
  );
}
function extractCompetitorOutliers(competitorsArtifact = {}) {
  return (
    competitorsArtifact?.outliers ||
    competitorsArtifact?.analysis?.outliers ||
    []
  );
}

function extractDerivedIdeas(competitorsArtifact = {}) {
  return (
    competitorsArtifact?.analysis?.derivedIdeas ||
    competitorsArtifact?.derivedIdeas ||
    []
  );
}

export function buildDeepResearchReport(plan, artifacts = {}) {
  const facts = [...(artifacts.web?.facts || [])].slice(0, 12);

  const sources = [
    ...(artifacts.web?.sources || []).map((s) => ({
      ...s,
      via: "web-grounding",
    })),
  ];

  const derivedIdeas = extractDerivedIdeas(artifacts.competitors);
  const outliers = extractCompetitorOutliers(artifacts.competitors);

  const lines = [
    `# Relatório de pesquisa — ${plan.topic}`,
    "",
    `> Nicho: ${plan.niche} · Formato: ${plan.format} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "",
    "## Resumo executivo",
    buildExecutiveSummary(artifacts),
    "",
    "## Sub-perguntas investigadas",
    ...plan.subQuestions.map((q, i) => `${i + 1}. ${q}`),
    "",
  ];

  if (facts.length) {
    lines.push("## Fatos verificáveis", ...facts.map((f) => `- ${f}`), "");
  }

  if (artifacts.exa?.available && artifacts.exa.summary) {
    lines.push(
      "## Busca semântica (Exa)",
      compressTranscriptForPrompt(artifacts.exa.summary, {
        format: plan.format,
        maxChars: 6000,
      }),
      ""
    );
  }

  if (artifacts.web?.available && artifacts.web.summary) {
    lines.push(
      "## Pesquisa web (Gemini grounding)",
      compressTranscriptForPrompt(artifacts.web.summary, {
        format: plan.format,
        maxChars: 5000,
      }),
      ""
    );
  }

  if (artifacts.notebooklm?.available && artifacts.notebooklm.summary) {
    lines.push(
      "## NotebookLM",
      compressTranscriptForPrompt(artifacts.notebooklm.summary, {
        format: plan.format,
        maxChars: 6000,
      }),
      ""
    );
  }

  if (outliers.length) {
    lines.push(
      "## Outliers YouTube (concorrentes)",
      ...outliers
        .slice(0, 6)
        .map(
          (o) =>
            `- **${o.title || "Vídeo"}** — ${(o.views || 0).toLocaleString("pt-BR")} views · ${o.channelTitle || ""}`
        ),
      ""
    );
  }

  if (derivedIdeas.length) {
    lines.push(
      "## Ideias derivadas (Lumiera)",
      ...derivedIdeas
        .slice(0, 8)
        .map(
          (idea, i) =>
            `${i + 1}. **${idea.title}** — _${idea.hookPt || idea.angle || ""}_ (${idea.mechanic || "mecânica"})`
        ),
      ""
    );
  }

  if (sources.length) {
    lines.push(
      "## Fontes",
      ...sources.slice(0, 10).map((s, i) => `${i + 1}. [${s.title}](${s.url})`),
      ""
    );
  }

  lines.push(
    "## Próximos passos",
    "- Revisar ideias na fila editorial (YouTube Studio)",
    "- Abrir Creator com gancho validado",
    "- Opcional: enriquecer roteiro com NotebookLM (modo script)",
    ""
  );

  let markdown = lines.join("\n");
  if (markdown.length > MAX_REPORT_CHARS) {
    markdown = `${markdown.slice(0, MAX_REPORT_CHARS - 80)}\n\n[… relatório truncado — ver API artifacts …]\n`;
  }
  return {
    markdown,
    derivedIdeas,
    outlierCount: outliers.length,
    factCount: facts.length,
  };
}

/** Bloco compacto para o Script Master (geração de 10 ideias). */
export function formatDeepResearchForIdeasPrompt(
  report = {},
  plan = {},
  artifacts = {}
) {
  const markdown = String(report?.markdown || "").trim();
  const derived = report?.derivedIdeas?.length
    ? report.derivedIdeas
    : extractDerivedIdeas(artifacts?.competitors);
  const outliers = extractCompetitorOutliers(artifacts?.competitors);

  if (!markdown && !derived.length && !(report?.factCount > 0)) return "";

  const lines = [
    "",
    "## PESQUISA PROFUNDA (DeerFlow → Lumiera)",
    "Esta varredura rodou ANTES das 10 ideias: web (Gemini grounding), Exa, outliers YouTube e NotebookLM quando disponível.",
    "Use os fatos e ângulos abaixo como base primária — as ideias devem ser originais, não cópias de títulos de concorrentes.",
    "",
    compressTranscriptForPrompt(markdown, {
      format: plan?.format || "SHORTS",
      maxChars: 11000,
    }),
  ];

  if (outliers.length) {
    lines.push(
      "",
      "### Outliers YouTube (referência de mecânica — não copiar título)",
      ...outliers
        .slice(0, 5)
        .map(
          (o) =>
            `- ${o.title || "Vídeo"} · ${(o.views || 0).toLocaleString("pt-BR")} views · ${o.channelTitle || ""}`
        )
    );
  }

  if (derived.length) {
    lines.push(
      "",
      "### Sementes derivadas da pesquisa",
      ...derived
        .slice(0, 6)
        .map(
          (idea, i) =>
            `${i + 1}. **${idea.title || "Ideia"}** — ${idea.hookPt || idea.angle || idea.promise || ""}`
        )
    );
  }

  lines.push(
    "",
    "INSTRUÇÃO: Transforme fatos verificáveis em 10 ideias DISTINTAS dentro do nicho. Não repita apenas os exemplos do relatório — combine subáreas novas.",
    ""
  );

  return lines.join("\n");
}

export function appendDeepResearchReport(workspaceDir, plan, report) {
  ensureAgentDirs(workspaceDir);
  const memoryPath = path.join(
    getAgentPaths(workspaceDir).memoryDir,
    MEMORY_FILE
  );
  const marker = "## Relatórios gerados";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const block = [
    `### ${stamp} — ${plan.topic.slice(0, 80)}${plan.topic.length > 80 ? "…" : ""}`,
    report.markdown,
    "",
  ].join("\n");

  let content = fs.existsSync(memoryPath)
    ? fs.readFileSync(memoryPath, "utf8")
    : `# Deep Research (DeerFlow → Lumiera)\n\n> 🔗 [[MEMORIA-LUMIERA]]\n\n`;

  if (!content.includes(marker)) {
    content = `${content.trimEnd()}\n\n${marker}\n\n${block}`;
  } else {
    const parts = content.split(marker);
    const head = parts[0] + marker;
    const tail = parts.slice(1).join(marker);
    const blocks = tail
      .split(/\n(?=### \d{4}-\d{2}-\d{2})/)
      .map((b) => b.trim())
      .filter(Boolean);
    const kept = [block.trim(), ...blocks].slice(0, 8);
    content = `${head}\n\n${kept.join("\n\n")}\n`;
  }

  fs.writeFileSync(memoryPath, content, "utf8");
  repairVaultGraphLinks(workspaceDir);
  appendDailyRunLog(
    workspaceDir,
    `- ${new Date().toISOString()} **deep-research** topic=${plan.topic.slice(0, 60)} ideas=${report.derivedIdeas?.length || 0}`
  );
  return { memoryPath, memoryFile: MEMORY_FILE };
}

function withLegTimeout(promise, ms, legName) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[${legName}] Timeout (${ms}ms)`)), ms)
    ),
  ]);
}

export async function runDeepResearch(workspaceDir, opts = {}) {
  const topic = String(opts.topic || opts.requirement || "").trim();
  if (!topic) {
    return { ok: false, error: "Informe o tema da pesquisa (topic)." };
  }

  const niche = String(opts.niche || "Geral").trim();
  const format =
    opts.format === "LONG" || opts.format === "LONGO" ? "LONGO" : "SHORTS";
  const plan = planDeepResearch(topic, { niche, format });

  const legs = Array.isArray(opts.legs) ? opts.legs : plan.legs;
  const tasks = [];
  const diversityHint = String(opts.diversityHint || "").trim();
  const excludeTopics = Array.isArray(opts.excludeTopics)
    ? opts.excludeTopics
    : [];
  const legTimeoutMs = Number(opts.legTimeoutMs) || 12000;

  if (legs.includes("web") && opts.getApiKeys) {
    tasks.push(
      withLegTimeout(
        runWebLeg(workspaceDir, {
          topic,
          niche,
          format,
          getApiKeys: opts.getApiKeys,
          apiKey: opts.apiKey,
          diversityHint,
          excludeTopics,
        }),
        legTimeoutMs,
        "web"
      ).catch((err) => {
        throw new Error(`[web] ${err.message}`);
      })
    );
  }

  if (legs.includes("exa")) {
    tasks.push(
      withLegTimeout(
        exaWebSearch(`${topic} — ${niche} YouTube`, workspaceDir, {
          numResults: 6,
        }).then((r) => ({ leg: "exa", ...r })),
        legTimeoutMs,
        "exa"
      ).catch((err) => {
        throw new Error(`[exa] ${err.message}`);
      })
    );
  }

  if (legs.includes("competitors") && opts.llmFn !== undefined) {
    tasks.push(
      withLegTimeout(
        runCompetitorResearch(workspaceDir, {
          niche,
          format: format === "LONGO" ? "LONG" : "SHORT",
          maxCompetitors: opts.maxCompetitors ?? 5,
          llmFn: opts.llmFn,
          repairJsonFn: opts.repairJsonFn,
        }).then((r) => ({ leg: "competitors", ...r })),
        legTimeoutMs,
        "competitors"
      ).catch((err) => {
        throw new Error(`[competitors] ${err.message}`);
      })
    );
  }

  if (legs.includes("notebooklm") && opts.backendDir) {
    tasks.push(
      withLegTimeout(
        runNotebooklmLeg(workspaceDir, opts.backendDir, {
          topic,
          niche,
          format,
          deep: opts.notebooklmDeep === true,
          projDir: opts.projDir,
        }),
        legTimeoutMs,
        "notebooklm"
      ).catch((err) => {
        throw new Error(`[notebooklm] ${err.message}`);
      })
    );
  }

  const settled = await Promise.allSettled(tasks);
  const artifacts = {};
  const legErrors = [];

  for (const item of settled) {
    if (item.status === "rejected") {
      const errMsg = item.reason?.message || String(item.reason);
      const match = errMsg.match(/^\[(.*?)\] (.*)/);
      if (match) {
        legErrors.push({ leg: match[1], error: match[2] });
      } else {
        legErrors.push({ leg: "unknown", error: errMsg });
      }
      continue;
    }
    const val = item.value || {};
    const key = val.leg || "unknown";
    if (key === "competitors") {
      artifacts.competitors = val;
    } else {
      artifacts[key] = val;
    }
  }

  const report = buildDeepResearchReport(plan, artifacts);
  const obsidian = appendDeepResearchReport(workspaceDir, plan, report);

  let editorialQueue = null;
  if (opts.enqueueIdeas !== false && report.derivedIdeas?.length) {
    const enqueued = enqueueEditorialIdeas(workspaceDir, report.derivedIdeas, {
      source: "deep-research",
      format,
    });
    editorialQueue = {
      enqueued: report.derivedIdeas.length,
      total: enqueued.items.length,
    };
  }

  return {
    ok: true,
    plan,
    artifacts: {
      web: artifacts.web || null,
      exa: artifacts.exa || null,
      notebooklm: artifacts.notebooklm || null,
      competitors: artifacts.competitors
        ? {
            outlierCount: extractCompetitorOutliers(artifacts.competitors)
              .length,
            derivedIdeas: report.derivedIdeas,
            memoryFile: artifacts.competitors.memory?.memoryFile,
          }
        : null,
    },
    report,
    obsidian,
    editorialQueue,
    legErrors,
  };
}
