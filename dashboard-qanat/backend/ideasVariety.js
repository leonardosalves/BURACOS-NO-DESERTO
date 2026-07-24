/**
 * Variedade na geração de ideias do Script Master — evita repetir os mesmos assuntos.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { slugifyNiche } from "./agentMemory.js";

// -----------------------------------------------------------------------------
// CONSTANTES
// -----------------------------------------------------------------------------
const MAX_HISTORY_TITLES = 80;
const MAX_EXCLUSION_IN_PROMPT = 40;

const LCG_MULTIPLIER = 1103515245;
const LCG_INCREMENT = 12345;
const LCG_MODULUS = 0x7fffffff;

const SKIP_DIRS = Object.freeze([
  "ASSETS",
  "OUTPUT",
  "node_modules",
  "temp_clips",
  "temp_clips_destacado",
  ".git",
]);

/** Assuntos que saturam canais de curiosidades — só bloquear quando já apareceram no histórico. */
export const OVERUSED_CURIOSITY_CANON = Object.freeze([
  "sonda de 327 milhões",
  "mars climate orbiter",
  "erro de unidades nas marte",
  "concreto romano",
  "pozzolana",
  "panteão de roma",
  "torre eiffel cresce",
  "expansão térmica da torre",
  "navio vasa",
  "vasa afundou",
  "canal do panamá",
  "eclusas do panamá",
  "nora stanton",
  "primeira engenheira",
  "rowan atkinson",
  "mr. bean engenheiro",
  "ferdinand cheval",
  "carteiro que ergueu um castelo",
  "palácio ideal",
]);

const EXPLORATION_LENSES = Object.freeze([
  "fenômenos naturais raros e clima extremo",
  "biologia e comportamento animal inusitado",
  "física e química do cotidiano (objetos comuns)",
  "mistérios não resolvidos com evidência documental",
  "invenções fracassadas ou abandonadas",
  "recordes mundiais obscuros e nichos esportivos",
  "psicologia social e vieses cognitivos",
  "astronomia e espaço fora do clichê NASA",
  "oceanografia e profundezas pouco cobertas",
  "meteorologia extrema e desastres pouco lembrados",
  "linguística, idioms e comunicação humana",
  "economia bizarra e decisões absurdas com números",
  "arquitetura e infraestrutura moderna pouco comentada",
  "acústica, som e percepção sensorial",
  "microbiologia e corpo humano surpreendente",
  "transportes: túneis, pontes, ferrovias, aviação obscura",
  "alimentos, agricultura e cadeias de produção estranhas",
  "sono, cérebro e neurociência acessível",
  "artes, música e cultura pop com bastidor técnico",
  "geologia, minerais e formação da Terra",
  "guerra e estratégia com detalhe técnico pouco óbvio",
  "direito, burocracia e regras que mudaram vidas",
  "tecnologia digital e falhas de software famosas (além do MCO)",
  "cidades fantasma e urbanismo inesperado",
]);

// -----------------------------------------------------------------------------
// HELPERS LOCAIS
// -----------------------------------------------------------------------------

/**
 * Normaliza um texto para comparação sem acentuação ou espaços extras.
 * @param {string} text
 * @returns {string}
 */
function normalizeTopic(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retorna o caminho do arquivo de histórico de ideias do nicho.
 * @param {string} workspaceDir
 * @param {string} niche
 * @returns {string}
 */
function ideasHistoryPath(workspaceDir, niche) {
  const dir = path.join(workspaceDir, ".agents", "ideas-history");
  return path.join(dir, `${slugifyNiche(niche)}.json`);
}

/**
 * Lê os tópicos e títulos de um projeto a partir dos seus arquivos de metadados.
 * @param {string} projectPath
 * @param {string} fallbackTitle
 * @returns {string[]}
 */
function readProjectTopics(projectPath, fallbackTitle) {
  const topics = [];
  const add = (val) => {
    const s = String(val || "").trim();
    if (s && !topics.includes(s)) topics.push(s);
  };

  const storyboardPath = path.join(projectPath, "storyboard.json");
  const summaryPath = path.join(projectPath, "run_summary.json");
  const voPath = path.join(projectPath, "script", "voiceover_segments.json");

  if (fs.existsSync(storyboardPath)) {
    try {
      const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      if (sb.strategy?.title_main) add(sb.strategy.title_main);
      if (Array.isArray(sb.strategy?.title_variations)) {
        sb.strategy.title_variations.forEach(add);
      }
      if (sb.strategy?.hook) add(sb.strategy.hook);
      if (sb.topic) add(sb.topic);
    } catch {
      /* ignore */
    }
  }

  if (fs.existsSync(summaryPath)) {
    try {
      const sum = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      if (sum.topic) add(sum.topic);
    } catch {
      /* ignore */
    }
  }

  if (fs.existsSync(voPath)) {
    try {
      const vo = JSON.parse(fs.readFileSync(voPath, "utf8"));
      if (vo.topic) add(vo.topic);
    } catch {
      /* ignore */
    }
  }

  if (fallbackTitle) {
    add(fallbackTitle.replace(/[-_]/g, " "));
  }

  return topics.length ? topics : [fallbackTitle];
}

/**
 * Embaralha uma lista utilizando um gerador congruente linear (LCG) determinístico.
 * @param {any[]} items
 * @param {number} seed
 * @returns {any[]}
 */
function seededShuffle(items, seed) {
  const arr = [...items];
  let s = Number(seed) || Date.now();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * LCG_MULTIPLIER + LCG_INCREMENT) & LCG_MODULUS;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -----------------------------------------------------------------------------
// FUNÇÕES EXPORTADAS
// -----------------------------------------------------------------------------

/**
 * Carrega a lista de ideias salvas no histórico do nicho.
 * @param {string} workspaceDir
 * @param {string} niche
 * @returns {string[]}
 */
export function loadIdeasHistory(workspaceDir, niche) {
  const file = ideasHistoryPath(workspaceDir, niche);
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data.titles) ? data.titles.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Adiciona novas ideias geradas ao histórico do nicho.
 * @param {string} workspaceDir
 * @param {string} niche
 * @param {object[]} ideas
 */
export function appendIdeasHistory(workspaceDir, niche, ideas = []) {
  const titles = (ideas || [])
    .map((i) => String(i?.title || "").trim())
    .filter(Boolean);
  if (!titles.length) return;

  const dir = path.join(workspaceDir, ".agents", "ideas-history");
  fs.mkdirSync(dir, { recursive: true });
  const file = ideasHistoryPath(workspaceDir, niche);
  const prev = loadIdeasHistory(workspaceDir, niche);
  const merged = [...titles, ...prev];
  const seen = new Set();
  const unique = [];

  for (const t of merged) {
    const key = normalizeTopic(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
    if (unique.length >= MAX_HISTORY_TITLES) break;
  }

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        niche: String(niche).trim(),
        updatedAt: new Date().toISOString(),
        titles: unique,
      },
      null,
      2
    ),
    "utf8"
  );
}

/**
 * Coleta os títulos e tópicos de todos os projetos ATIVOS/CRIADOS no workspace.
 * Escaneia 'videos longos', 'videos curtos shorts' e 'whiteboard-runs'.
 * @param {string} projectsRoot
 * @returns {string[]}
 */
export function collectProjectTopics(projectsRoot) {
  const projects = [];
  const dirsToScan = [
    { dir: path.join(projectsRoot, "videos longos"), format: "LONGO" },
    { dir: path.join(projectsRoot, "videos curtos shorts"), format: "SHORTS" },
    { dir: path.join(projectsRoot, "whiteboard-runs"), format: "WHITEBOARD" },
  ];

  for (const { dir, format } of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const item = dirent.name;
      if (SKIP_DIRS.includes(item)) continue;

      const fullPath = path.join(dir, item);
      const topics = readProjectTopics(fullPath, item);
      projects.push({ name: item, topics, format });
    }
  }

  return projects.flatMap((p) => p.topics).filter(Boolean);
}

/**
 * Une e deduz a lista de tópicos a serem excluídos do prompt da rodada.
 * Apenas PROJETOS REAIS criados e ideias ativas da sessão atual são bloqueados.
 * Histórico de meras sugestões NÃO bloqueia a geração de novas ideias.
 * @param {object} args
 * @param {string[]} [args.projectTopics]
 * @param {string[]} [args.historyTopics]
 * @param {string[]} [args.previousIdeas]
 * @param {string[]} [args.extraExclude]
 * @returns {string[]}
 */
export function mergeExclusionTopics({
  projectTopics = [],
  historyTopics = [], // Obsoleto para exclusão rígida: meras sugestões não bloqueiam
  previousIdeas = [],
  extraExclude = [],
} = {}) {
  const seen = new Set();
  const out = [];

  const push = (raw) => {
    const t = String(raw || "").trim();
    if (!t) return;
    const key = normalizeTopic(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  // Bloquear APENAS assuntos de projetos reais existentes no workspace + ideias ativas da sessão atual
  const pool = [...previousIdeas, ...projectTopics, ...extraExclude];
  for (const t of pool) {
    push(t);
  }

  // Se um assunto clássico já foi abordado em um projeto real, joga no blocklist
  const projectNorm = new Set(projectTopics.map(normalizeTopic));
  for (const canon of OVERUSED_CURIOSITY_CANON) {
    if (projectNorm.has(normalizeTopic(canon))) {
      push(canon);
    }
  }

  return out.slice(0, MAX_EXCLUSION_IN_PROMPT);
}

/**
 * Constrói o bloco de instruções e eixos de exploração com base em uma semente.
 * @param {number} [seed]
 * @returns {string}
 */
export function buildIdeasExplorationAxes(seed = Date.now()) {
  const picked = seededShuffle(EXPLORATION_LENSES, seed).slice(0, 5);
  return `
EIXOS DE EXPLORAÇÃO DESTA RODADA (obrigatório — sessão #${seed}):
Distribua as 10 ideias entre estes ângulos DIFERENTES (mínimo 1 ideia por eixo, nenhum eixo com mais de 3 ideias):
${picked.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Regra: pelo menos 6 das 10 ideias devem vir de eixos que NÃO sejam "engenharia clássica / impérios / invenções famosas" — busque fatos pouco cobertos no YouTube BR.`;
}

/**
 * Constrói a seção de exclusão com base nos tópicos já explorados.
 * @param {string[]} excludeTopics
 * @returns {string}
 */
export function buildIdeasExclusionAddendum(excludeTopics = []) {
  if (!excludeTopics.length) return "";

  const lines = excludeTopics
    .slice(0, MAX_EXCLUSION_IN_PROMPT)
    .map((t) => `- ${t}`)
    .join("\n");

  return `
TÓPICOS JÁ EXPLORADOS PELO CANAL (PROIBIDO repetir ou reformular):
${lines}

INSTRUÇÃO CRÍTICA:
- NÃO sugira estes assuntos nem variações óbvias do mesmo fato (mesmo evento, mesma pessoa, mesmo monumento).
- Se o nicho for amplo, use esta lista como "zona proibida" e explore outras subáreas do nicho.
- Prefira histórias com nomes, datas e números que NÃO aparecem acima.
- Se a pesquisa web trouxer só temas da lista, escolha ângulos laterais inéditos ou subnichos diferentes.`;
}

/**
 * Retorna as regras de novidade criativa contra clichês de curiosidades comuns.
 * @returns {string}
 */
export function buildIdeasFreshnessInstruction() {
  return `
FRESHNESS / ANTI-CLICHÊ:
- Trate cada geração como uma NOVA varredura — não recicle a "playlist mental" padrão de curiosidades (NASA MCO, concreto romano, Torre Eiffel no verão, Vasa, Panamá, Nora Stanton, Mr. Bean, Palácio Ideal do carteiro).
- Use a PESQUISA WEB como fonte primária de assuntos; o diagnóstico do nicho deve refletir o que foi encontrado AGORA, não memória genérica.
- Cada título deve apontar para um objeto/fato ESPECÍFICO e verificável — evite ideias intercambiáveis ("o segredo de X" sobre o mesmo tema de sempre).
- NotebookLM (se presente) complementa; não substitui variedade nem justifica repetir temas já listados em TÓPICOS JÁ EXPLORADOS.`;
}

/**
 * Cria uma semente numérica aleatória para a geração de eixos.
 * @returns {number}
 */
export function makeIdeasGenerationSeed() {
  return crypto.randomInt(100000, 999999999);
}
