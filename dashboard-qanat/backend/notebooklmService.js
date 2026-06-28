import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const NLM_BIN = process.env.NLM_BIN || "nlm";
const QUERY_TIMEOUT_MS = Number(process.env.NOTEBOOKLM_QUERY_TIMEOUT_MS || 120000);

function resolveNotebooklmDataDir(backendDir) {
  if (process.env.NOTEBOOKLM_MCP_CLI_PATH) {
    return process.env.NOTEBOOKLM_MCP_CLI_PATH;
  }
  if (backendDir) {
    return path.resolve(backendDir, "..", "..", ".notebooklm-data");
  }
  return path.join(process.cwd(), ".notebooklm-data");
}

function runNlm(args, { timeoutMs = 60000, backendDir } = {}) {
  const dataDir = resolveNotebooklmDataDir(backendDir);
  fs.mkdirSync(dataDir, { recursive: true });

  const result = spawnSync(NLM_BIN, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    env: {
      ...process.env,
      NOTEBOOKLM_MCP_CLI_PATH: dataDir,
    },
  });

  if (result.error) throw result.error;

  const stderr = (result.stderr || "").trim();
  const stdout = (result.stdout || "").trim();

  if (result.status !== 0) {
    const msg = stderr || stdout || `nlm exit ${result.status}`;
    const err = new Error(msg);
    err.code = result.status;
    throw err;
  }

  return stdout;
}

function parseJsonOutput(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getCachePath(backendDir) {
  return path.join(backendDir, "notebooklm_cache.json");
}

function loadCache(backendDir) {
  const cachePath = getCachePath(backendDir);
  if (!fs.existsSync(cachePath)) return { notebooks: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    return { notebooks: raw.notebooks || {} };
  } catch {
    return { notebooks: {} };
  }
}

function saveCache(backendDir, cache) {
  fs.writeFileSync(getCachePath(backendDir), JSON.stringify(cache, null, 2), "utf8");
}

function nicheKey(niche) {
  return String(niche || "default")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "default";
}

function isAuthError(message = "") {
  const lower = message.toLowerCase();
  return (
    lower.includes("login")
    || lower.includes("auth")
    || lower.includes("profile")
    || lower.includes("cookie")
    || lower.includes("credential")
  );
}

export function getNotebooklmStatus(backendDir) {
  try {
    runNlm(["login", "--check"], { timeoutMs: 20000, backendDir });
    const listRaw = runNlm(["notebook", "list", "--json"], { timeoutMs: 25000, backendDir });
    const notebooks = parseJsonOutput(listRaw);
    const count = Array.isArray(notebooks) ? notebooks.length : 0;
    return {
      available: true,
      authenticated: true,
      notebookCount: count,
      message: count > 0
        ? `NotebookLM conectado (${count} notebook${count === 1 ? "" : "s"})`
        : "NotebookLM conectado — pronto para pesquisa",
    };
  } catch (err) {
    const auth = isAuthError(err.message);
    return {
      available: false,
      authenticated: false,
      notebookCount: 0,
      message: auth
        ? "Execute `nlm login` no terminal para ativar o NotebookLM"
        : `NotebookLM indisponível: ${err.message}`,
      needsLogin: auth,
    };
  }
}

function findOrCreateNotebook(niche, backendDir) {
  const cache = loadCache(backendDir);
  const key = nicheKey(niche);
  if (cache.notebooks[key]?.id) return cache.notebooks[key].id;

  const title = `Lumiera: ${String(niche).trim().slice(0, 72) || "Geral"}`;

  try {
    const listRaw = runNlm(["notebook", "list", "--json"], { timeoutMs: 25000, backendDir });
    const notebooks = parseJsonOutput(listRaw) || [];
    if (Array.isArray(notebooks)) {
      const existing = notebooks.find((n) => {
        const t = String(n.title || "").toLowerCase();
        return t.includes("lumiera") && t.includes(String(niche).trim().toLowerCase().slice(0, 24));
      });
      if (existing?.id) {
        cache.notebooks[key] = { id: existing.id, title: existing.title, reused: true };
        saveCache(backendDir, cache);
        return existing.id;
      }
    }
  } catch {
    /* continue to create */
  }

  const createRaw = runNlm(["notebook", "create", title, "--json"], { timeoutMs: 30000, backendDir });
  const created = parseJsonOutput(createRaw);
  const id = created?.id || created?.notebook_id || createRaw.trim();
  if (!id) throw new Error("Falha ao criar notebook no NotebookLM.");

  cache.notebooks[key] = { id, title, createdAt: new Date().toISOString() };
  saveCache(backendDir, cache);
  return id;
}

function addTextSource(notebookId, title, text, backendDir) {
  const tmpDir = path.join(backendDir, ".notebooklm_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const safeName = `brief_${Date.now()}.txt`;
  const tmpFile = path.join(tmpDir, safeName);
  fs.writeFileSync(tmpFile, text, "utf8");

  try {
    runNlm(
      ["source", "add", notebookId, "--file", tmpFile, "--title", title.slice(0, 80), "--wait"],
      { timeoutMs: 120000, backendDir },
    );
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function runOptionalFastResearch(notebookId, query, backendDir) {
  try {
    const startRaw = runNlm(
      ["research", "start", query, "--notebook-id", notebookId, "--mode", "fast"],
      { timeoutMs: 45000, backendDir },
    );
    const started = parseJsonOutput(startRaw);
    const taskId = started?.task_id || started?.id;
    if (!taskId) return false;

    const statusRaw = runNlm(
      ["research", "status", notebookId, "--task-id", taskId, "--max-wait", "45"],
      { timeoutMs: 50000, backendDir },
    );
    const status = parseJsonOutput(statusRaw);
    if (status?.status === "completed" || status?.state === "completed") {
      runNlm(["research", "import", notebookId, taskId], { timeoutMs: 120000, backendDir });
      return true;
    }
  } catch {
    /* research is optional */
  }
  return false;
}

function queryNotebook(notebookId, question, backendDir) {
  const raw = runNlm(
    ["notebook", "query", notebookId, question, "--json"],
    { timeoutMs: QUERY_TIMEOUT_MS, backendDir },
  );
  const parsed = parseJsonOutput(raw);
  if (parsed) {
    return (
      parsed.answer
      || parsed.response
      || parsed.text
      || parsed.message
      || JSON.stringify(parsed)
    );
  }
  return raw;
}

function buildBriefText({ niche, format, idea, contentMode, rankCount, listTopic, rankOrder }) {
  const lines = [
    `Nicho: ${niche}`,
    `Formato YouTube: ${format}`,
    `Data: ${new Date().toISOString()}`,
  ];

  if (idea) {
    lines.push(`Título: ${idea.title || ""}`);
    lines.push(`Promessa: ${idea.promise || ""}`);
    lines.push(`Emoção: ${idea.emotion || ""}`);
    if (idea.hook || idea.hooks) lines.push(`Gancho: ${idea.hook || idea.hooks}`);
    if (idea.listicle_angle) lines.push(`Ângulo listicle: ${idea.listicle_angle}`);
    if (Array.isArray(idea.sample_items)) lines.push(`Itens sugeridos: ${idea.sample_items.join(", ")}`);
  }

  if (contentMode === "LISTICLE") {
    lines.push(`Modo: LISTICLE Top ${rankCount}`);
    lines.push(`Tema da lista: ${listTopic || niche}`);
    lines.push(`Ordem: ${rankOrder === "asc" ? "crescente" : "decrescente"}`);
  }

  return lines.join("\n");
}

function buildIdeasQuery({ niche, format, contentMode, rankCount, listTopic }) {
  if (contentMode === "LISTICLE") {
    return `Com base nas fontes deste notebook, liste em português brasileiro:
1) Os ${rankCount || 10} ângulos de ranking mais virais sobre "${listTopic || niche}" para YouTube ${format}
2) Fatos surpreendentes verificáveis para cada ângulo
3) Perguntas que o público faz e que geram comentários
4) Mitos populares vs realidade histórica/científica
5) Ganchos de retenção para os primeiros 30 segundos
Seja específico, cite detalhes das fontes, evite generalidades.`;
  }

  return `Com base nas fontes deste notebook sobre o nicho "${niche}" (YouTube ${format}), forneça em português brasileiro:
1) Tendências e perguntas que o público busca agora
2) Dores, desejos e medos do público
3) Fatos surpreendentes pouco explorados em vídeos
4) Polêmicas ou curiosidades que geram comentários
5) 5 ângulos de vídeo virais com ganchos específicos
6) Erros comuns de vídeos concorrentes que podemos evitar
Use detalhes concretos das fontes.`;
}

function buildScriptQuery({ niche, format, idea, contentMode, rankCount, listTopic, rankOrder }) {
  const title = idea?.title || niche;
  const promise = idea?.promise || "";

  if (contentMode === "LISTICLE") {
    return `Você é consultor de roteiros virais para YouTube. Com base nas fontes deste notebook, ajude a escrever um LISTICLE Top ${rankCount} sobre "${listTopic || title}" (${format}).

Forneça em português brasileiro:
1) ${rankCount} ITENS DO RANKING com fatos específicos, datas, nomes e números das fontes
2) Gancho de abertura (3 segundos) que prende sem clickbait genérico
3) Para cada item: 1 curiosidade surpresa + 1 ligação com o mundo moderno
4) Open loops entre itens para retenção
5) Payoff final memorável
6) 5 frases de impacto para overlays (curtas, maiúsculas)
7) Mitos a desmentir e ângulos que concorrentes ignoram

Título: ${title}
Promessa: ${promise}
Ordem do ranking: ${rankOrder === "asc" ? "1 → N" : "N → 1"}

O roteirista usará isso para escrever narração humana em PT-BR. Seja denso em fatos verificáveis.`;
  }

  return `Você é consultor de roteiros documentais virais para YouTube. Com base nas fontes deste notebook, enriqueça o roteiro sobre:

Título: ${title}
Promessa: ${promise}
Nicho: ${niche}
Formato: ${format}

Forneça em português brasileiro:
1) 8-12 FATOS SURPREENDENTES verificáveis nas fontes (com números, datas, nomes)
2) 5 MITOS vs REALIDADE que geram comentários
3) 3 GANCHOS alternativos para os primeiros 30 segundos
4) 5 PERGUNTAS do público que o vídeo deve responder
5) 3 OPEN LOOPS narrativos para manter retenção até o final
6) Histórias humanas ou episódios específicos para dramatizar
7) Dados/números citáveis para narração
8) O que vídeos concorrentes erram ou superficializam

O roteirista transformará isso em narração fluida PT-BR. Priorize especificidade e fontes.`;
}

function buildImproveQuery({ niche, format, narrativeScript }) {
  const excerpt = String(narrativeScript || "").slice(0, 12000);
  return `Analise o rascunho de roteiro abaixo e, com base nas fontes deste notebook sobre "${niche}", sugira melhorias ACIONÁVEIS em português brasileiro:

1) Fatos surpreendentes para INSERIR (com localização no roteiro: início/meio/fim)
2) Correções de imprecisões ou generalizações
3) Ganchos mais fortes (substitua frases fracas por versões melhores)
4) Open loops faltando
5) Trechos que soam artificiais/robóticos e como humanizar
6) Dados/números específicos das fontes para enriquecer

Não reescreva o roteiro inteiro — dê direcionamento claro para o editor.

ROTEIRO ATUAL:
${excerpt}`;
}

function buildFallbackSummary({ niche, format, topic, purpose }) {
  return {
    available: false,
    topic: topic || niche,
    summary: purpose === "script"
      ? `Pesquisa sugerida para roteiro "${niche}" (${format}): explore fatos pouco conhecidos, perguntas frequentes do público, mitos vs realidade e dados numéricos específicos. Conecte cada bloco a uma curiosidade concreta e evite generalidades.`
      : `Pesquisa sugerida para "${niche}" (${format}): tendências recentes, dores do público, curiosidades virais e ângulos pouco explorados por concorrentes.`,
    sources: [],
    fallback: true,
    needsLogin: true,
  };
}

async function runNotebooklmPipeline({
  niche,
  format,
  idea,
  contentMode,
  rankCount,
  listTopic,
  rankOrder,
  purpose,
  narrativeScript,
  backendDir,
  runResearch = false,
}) {
  const status = getNotebooklmStatus(backendDir);
  if (!status.authenticated) {
    return buildFallbackSummary({ niche, format, purpose });
  }

  const notebookId = findOrCreateNotebook(niche, backendDir);
  const brief = buildBriefText({ niche, format, idea, contentMode, rankCount, listTopic, rankOrder });

  addTextSource(
    notebookId,
    `Brief Lumiera ${new Date().toISOString().slice(0, 16)}`,
    brief,
    backendDir,
  );

  if (runResearch) {
    const researchQuery = contentMode === "LISTICLE"
      ? `melhores fatos e curiosidades sobre ${listTopic || niche} para vídeo top ${rankCount}`
      : `fatos surpreendentes tendências e perguntas do público sobre ${niche}`;
    runOptionalFastResearch(notebookId, researchQuery, backendDir);
  }

  let question;
  if (purpose === "improve") {
    question = buildImproveQuery({ niche, format, narrativeScript });
  } else if (purpose === "script") {
    question = buildScriptQuery({ niche, format, idea, contentMode, rankCount, listTopic, rankOrder });
  } else {
    question = buildIdeasQuery({ niche, format, contentMode, rankCount, listTopic });
  }

  const answer = queryNotebook(notebookId, question, backendDir);

  return {
    available: true,
    topic: listTopic || idea?.title || niche,
    summary: String(answer || "").trim().slice(0, 12000),
    notebookId,
    sources: ["NotebookLM query"],
    fallback: false,
  };
}

export async function fetchNotebooklmResearch(niche, format, options = {}) {
  const backendDir = options.backendDir;
  if (!backendDir) return buildFallbackSummary({ niche, format, purpose: "ideas" });

  try {
    return await runNotebooklmPipeline({
      niche,
      format,
      contentMode: options.contentMode,
      rankCount: options.rankCount,
      listTopic: options.listTopic,
      rankOrder: options.rankOrder,
      purpose: "ideas",
      backendDir,
      runResearch: options.runResearch === true,
    });
  } catch (err) {
    console.warn("[NotebookLM] Ideas research failed:", err.message);
    return {
      ...buildFallbackSummary({ niche, format, purpose: "ideas" }),
      error: err.message,
    };
  }
}

export async function fetchNotebooklmScriptContext(params) {
  const { backendDir } = params;
  if (!backendDir) return buildFallbackSummary({ niche: params.niche, format: params.format, purpose: "script" });

  try {
    return await runNotebooklmPipeline({
      ...params,
      purpose: "script",
      runResearch: params.runResearch !== false,
    });
  } catch (err) {
    console.warn("[NotebookLM] Script context failed:", err.message);
    return {
      ...buildFallbackSummary({ niche: params.niche, format: params.format, purpose: "script" }),
      error: err.message,
    };
  }
}

export async function fetchNotebooklmScriptImprovements(params) {
  const { backendDir, niche, format, narrativeScript } = params;
  if (!backendDir) return buildFallbackSummary({ niche, format, purpose: "improve" });

  try {
    return await runNotebooklmPipeline({
      niche,
      format,
      narrativeScript,
      purpose: "improve",
      backendDir,
      runResearch: false,
    });
  } catch (err) {
    console.warn("[NotebookLM] Script improve failed:", err.message);
    return {
      ...buildFallbackSummary({ niche, format, purpose: "improve" }),
      error: err.message,
    };
  }
}

export function formatNotebooklmPromptBlock(research, label = "PESQUISA NOTEBOOKLM") {
  if (!research?.summary) return "";
  const source = research.available && !research.fallback ? "NotebookLM" : "fallback";
  return `\n${label} (${source}):\n${research.summary}\n\nINSTRUÇÃO: Use os fatos acima para enriquecer o roteiro com detalhes verificáveis, ganchos fortes e open loops. Não invente dados que contradigam a pesquisa.\n`;
}

export function buildNotebooklmImproveApplyPrompt({
  niche,
  format,
  rawScript,
  notebooklmBlock,
  blockCount,
}) {
  return `Você é roteirista brasileiro especialista em clareza e retenção para YouTube documental.

Com base na pesquisa NotebookLM abaixo, MELHORE o roteiro existente incorporando fatos verificáveis — sem reescrever do zero nem mudar a estrutura visual.

FORMATO: ${format}
NICHO: ${niche}
BLOCOS ESPERADOS: ${blockCount}

${notebooklmBlock}

ROTEIRO ATUAL (JSON parcial):
${JSON.stringify(rawScript, null, 2).slice(0, 12000)}

TAREFAS OBRIGATÓRIAS:
1. Insira fatos surpreendentes da pesquisa nos trechos indicados (início/meio/fim).
2. Corrija imprecisões, generalizações e clichês de IA.
3. Substitua ganchos fracos por versões mais fortes.
4. Adicione open loops faltantes para retenção.
5. Humanize trechos que soam robóticos — narração falada em PT-BR.
6. Mantenha a TESE do vídeo; não altere visual_prompts, bgm_mappings nem impact_texts.
7. Atualize "technical_config.block_phrases" se o início dos blocos mudar (4-8 palavras, início exato).

Responda APENAS JSON válido:
{
  "narrative_script": "...",
  "narrative_script_tagged": "...",
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}]
  },
  "strategy": { "hook": "..." }
}`;
}