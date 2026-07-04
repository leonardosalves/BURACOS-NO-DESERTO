/**
 * Variedade na geração de ideias do Script Master — evita repetir os mesmos assuntos.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { slugifyNiche } from "./agentMemory.js";

const MAX_HISTORY_TITLES = 80;
const MAX_EXCLUSION_IN_PROMPT = 40;

/** Assuntos que saturam canais de curiosidades — só bloquear quando já apareceram no histórico. */
export const OVERUSED_CURIOSITY_CANON = [
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
];

const EXPLORATION_LENSES = [
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
  "linguística, idiomas e comunicação humana",
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
];

function normalizeTopic(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ideasHistoryPath(workspaceDir, niche) {
  const dir = path.join(workspaceDir, ".agents", "ideas-history");
  return path.join(dir, `${slugifyNiche(niche)}.json`);
}

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
  fs.writeFileSync(file, JSON.stringify({
    niche: String(niche).trim(),
    updatedAt: new Date().toISOString(),
    titles: unique,
  }, null, 2), "utf8");
}

export function collectProjectTopics(projectsRoot) {
  const projects = [];
  const longsDir = path.join(projectsRoot, "videos longos");
  const shortsDir = path.join(projectsRoot, "videos curtos shorts");

  const scanDir = (dir, format) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      try {
        if (!fs.statSync(fullPath).isDirectory()) continue;
        if (["ASSETS", "OUTPUT", "node_modules", "temp_clips", "temp_clips_destacado", ".git"].includes(item)) {
          continue;
        }
        if (!fs.existsSync(path.join(fullPath, "build_video.py")) && item !== "FINANCAS") continue;

        let title = item;
        const storyboardPath = path.join(fullPath, "storyboard.json");
        if (fs.existsSync(storyboardPath)) {
          try {
            const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
            if (sb.strategy?.title_main) title = sb.strategy.title_main;
            else if (sb.narrative_script) {
              title = String(sb.narrative_script).split("\n")[0].slice(0, 120);
            }
          } catch { /* ignore */ }
        }
        projects.push({ name: item, title: String(title).trim(), format });
      } catch { /* ignore */ }
    }
  };

  scanDir(longsDir, "LONGO");
  scanDir(shortsDir, "SHORTS");
  return projects.map((p) => p.title).filter(Boolean);
}

export function mergeExclusionTopics({
  projectTopics = [],
  historyTopics = [],
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

  for (const t of [...previousIdeas, ...historyTopics, ...projectTopics, ...extraExclude]) {
    push(t);
  }

  const historyNorm = new Set([...historyTopics, ...previousIdeas, ...projectTopics].map(normalizeTopic));
  for (const canon of OVERUSED_CURIOSITY_CANON) {
    if (historyNorm.has(normalizeTopic(canon))) push(canon);
  }

  return out.slice(0, MAX_EXCLUSION_IN_PROMPT);
}

function seededShuffle(items, seed) {
  const arr = [...items];
  let s = Number(seed) || Date.now();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildIdeasExplorationAxes(seed = Date.now()) {
  const picked = seededShuffle(EXPLORATION_LENSES, seed).slice(0, 5);
  return `
EIXOS DE EXPLORAÇÃO DESTA RODADA (obrigatório — sessão #${seed}):
Distribua as 10 ideias entre estes ângulos DIFERENTES (mínimo 1 ideia por eixo, nenhum eixo com mais de 3 ideias):
${picked.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Regra: pelo menos 6 das 10 ideias devem vir de eixos que NÃO sejam "engenharia clássica / impérios / invenções famosas" — busque fatos pouco cobertos no YouTube BR.`;
}

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

export function buildIdeasFreshnessInstruction() {
  return `
FRESHNESS / ANTI-CLICHÊ:
- Trate cada geração como uma NOVA varredura — não recicle a "playlist mental" padrão de curiosidades (NASA MCO, concreto romano, Torre Eiffel no verão, Vasa, Panamá, Nora Stanton, Mr. Bean, Palácio Ideal do carteiro).
- Use a PESQUISA WEB como fonte primária de assuntos; o diagnóstico do nicho deve refletir o que foi encontrado AGORA, não memória genérica.
- Cada título deve apontar para um objeto/fato ESPECÍFICO e verificável — evite ideias intercambiáveis ("o segredo de X" sobre o mesmo tema de sempre).
- NotebookLM (se presente) complementa; não substitui variedade nem justifica repetir temas já listados em TÓPICOS JÁ EXPLORADOS.`;
}

export function makeIdeasGenerationSeed() {
  return crypto.randomInt(100000, 999999999);
}