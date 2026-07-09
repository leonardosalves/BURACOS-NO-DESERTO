import fs from "fs";
import path from "path";

export const NOTEBOOKLM_BRIEF_FILENAME = "notebooklm_research_brief.md";

const LOCATION_RE =
  /\b(?:em|na cidade de|no país|em|de)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wáàâãéêíóôõúç\-]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wáàâãéêíóôõúç\-]+){0,3})/g;

const STAT_RE =
  /(\d[\d.,]*)\s*(km|m|metros|%|anos?|séculos?|milhões?|bilhões?|toneladas?|pessoas|soldados|horas?|dias?|meses?)/gi;

const SHORT_SKILL_BLOCK = `### Skill SHORTS (viral-short-form)
- Gancho em ≤10 palavras no frame 1; payoff real no roteiro.
- 80–130 palavras totais; 3–5 wow-facts com números e nomes.
- Fechamento declarativo — sem "comenta aí".
- Gancho limpo 1,5s sem overlay informativo na abertura.`;

const LONG_SKILL_BLOCK = `### Skill LONGO (documental)
- 1500–3000 palavras; blocos com escalada narrativa.
- Open loops entre blocos; fatos verificáveis a cada seção.
- Título específico; gancho de 3s que anuncia a tese do vídeo.`;

function yamlEscape(value = "") {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

function parseFrontmatter(md = "") {
  const raw = String(md || "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val === "true") meta[key] = true;
    else if (val === "false") meta[key] = false;
    else if (/^\d+$/.test(val)) meta[key] = Number(val);
    else meta[key] = val;
  }
  return { meta, body: raw.slice(match[0].length).trim() };
}

function extractNumberedFacts(text = "") {
  const facts = [];
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\d+[\).\]:]\s+/.test(trimmed) && trimmed.length >= 20) {
      facts.push(trimmed.replace(/^\d+[\).\]:]\s+/, "").trim());
    } else if (/^[-•*]\s+/.test(trimmed) && trimmed.length >= 24) {
      facts.push(trimmed.replace(/^[-•*]\s+/, "").trim());
    }
  }
  return [...new Set(facts)].slice(0, 40);
}

function extractStats(text = "") {
  const stats = [];
  const raw = String(text || "");
  let m;
  const re = new RegExp(STAT_RE.source, STAT_RE.flags);
  while ((m = re.exec(raw)) !== null) {
    const value = m[1];
    const unit = m[2];
    const start = Math.max(0, m.index - 40);
    const label = raw
      .slice(start, m.index + m[0].length)
      .replace(/\s+/g, " ")
      .trim();
    stats.push({ value, unit, label: label.slice(-80) });
    if (stats.length >= 24) break;
  }
  return stats;
}

function extractLocations(text = "") {
  const places = [];
  const raw = String(text || "");
  let m;
  const re = new RegExp(LOCATION_RE.source, LOCATION_RE.flags);
  while ((m = re.exec(raw)) !== null) {
    const place = m[1]?.trim();
    if (place && place.length >= 3 && !places.includes(place)) {
      places.push(place);
    }
    if (places.length >= 12) break;
  }
  return places.map((place) => ({ place, context: "" }));
}

function extractHooks(text = "") {
  return extractNumberedFacts(text)
    .filter((f) => f.length <= 120)
    .slice(0, 8);
}

export function parseNotebooklmBriefMarkdown(md = "") {
  const { meta, body } = parseFrontmatter(md);
  const accumulatedMatch = body.match(
    /## Material acumulado[\s\S]*?(?=## Instruções de roteiro|$)/i
  );
  const accumulatedSection = accumulatedMatch
    ? accumulatedMatch[0].replace(/## Material acumulado[^\n]*\n?/i, "").trim()
    : body;

  const facts = extractNumberedFacts(accumulatedSection);
  const stats = extractStats(accumulatedSection);
  const locations = extractLocations(accumulatedSection);
  const hooks = extractHooks(accumulatedSection);

  return {
    meta,
    accumulated: accumulatedSection.slice(0, 16000),
    facts,
    stats,
    locations,
    hooks,
    templateHints: {
      locations,
      stats,
      hooks,
      wow_facts: facts.slice(0, 10),
    },
    factCount: facts.length,
    skipWebResearch:
      meta.skip_web_research === true ||
      facts.length >= 4 ||
      accumulatedSection.length >= 500,
  };
}

export function notebooklmBriefPath(projDir) {
  if (!projDir) return null;
  return path.join(projDir, NOTEBOOKLM_BRIEF_FILENAME);
}

export function buildNotebooklmBriefMarkdown(session = {}, opts = {}) {
  const project = String(opts.project || "projeto").trim();
  const niche = String(session.niche || opts.niche || "documentário").trim();
  const format = String(session.format || opts.format || "SHORTS").trim();
  const status = String(session.status || "draft").trim();
  const turns = Array.isArray(session.turns) ? session.turns : [];
  const accumulated =
    String(session.accumulatedSummary || "").trim() ||
    turns
      .filter((t) => t.role === "assistant")
      .map((t) => String(t.content || "").trim())
      .join("\n\n---\n\n");

  const parsed = parseNotebooklmBriefMarkdown(
    `---\nstatus: ${status}\n---\n${accumulated}`
  );
  const factCount = parsed.facts.length;
  const skipWeb = parsed.skipWebResearch;
  const updatedAt = session.updatedAt || new Date().toISOString();
  const questions = Array.isArray(session.questions) ? session.questions : [];

  const turnBlocks = turns
    .map((turn, idx) => {
      const role = turn.role === "user" ? "Editor Lumiera" : "NotebookLM";
      const at = turn.at ? ` (${turn.at})` : "";
      return `### Turno ${idx + 1} — ${role}${at}\n\n${String(turn.content || "").trim()}`;
    })
    .join("\n\n");

  const factsBlock =
    parsed.facts.length > 0
      ? parsed.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "_Nenhum fato estruturado ainda — continue respondendo ao NotebookLM._";

  const locationsBlock =
    parsed.locations.length > 0
      ? parsed.locations.map((l) => `- **${l.place}**`).join("\n")
      : "_Nenhum local/POI detectado ainda._";

  const statsBlock =
    parsed.stats.length > 0
      ? parsed.stats
          .map((s) => `- ${s.value} ${s.unit} — ${s.label}`)
          .join("\n")
      : "_Nenhuma estatística estruturada ainda._";

  const questionsBlock =
    questions.length > 0
      ? questions.map((q) => `- ${q}`).join("\n")
      : "_Sem perguntas pendentes._";

  const skillBlock =
    format === "SHORTS" || format === "SHORT"
      ? SHORT_SKILL_BLOCK
      : LONG_SKILL_BLOCK;

  return `---
project: "${yamlEscape(project)}"
niche: "${yamlEscape(niche)}"
format: "${yamlEscape(format)}"
status: "${yamlEscape(status)}"
updated_at: "${yamlEscape(updatedAt)}"
fact_count: ${factCount}
location_count: ${parsed.locations.length}
skip_web_research: ${skipWeb}
temporary: true
source: notebooklm
---

# NotebookLM — Brief de Pesquisa (temporário)

> Arquivo gerado automaticamente pelo Lumiera. **Fonte única** para roteiro, narração e props de templates Remotion. Quando \`skip_web_research: true\`, o pipeline não repete buscas na web.

## Meta

| Campo | Valor |
| --- | --- |
| Projeto | ${project} |
| Nicho | ${niche} |
| Formato | ${format} |
| Status | ${status} |
| Atualizado | ${updatedAt} |
| Fatos extraídos | ${factCount} |
| Pular busca web | ${skipWeb ? "sim" : "não"} |

## Perguntas pendentes

${questionsBlock}

## Fatos extraídos (auto)

${factsBlock}

## Locais / POIs (templates geo e Remotion)

${locationsBlock}

## Números e datas

${statsBlock}

## Material acumulado (NotebookLM)

${turnBlocks || accumulated || "_Vazio._"}

## Instruções de roteiro (skill Lumiera)

${skillBlock}

_Processar este MD para montar narração e roteiro — não inventar fatos fora deste brief._
`;
}

export function writeNotebooklmBrief(projDir, session = {}, opts = {}) {
  if (!projDir) return null;
  const filePath = notebooklmBriefPath(projDir);
  const markdown = buildNotebooklmBriefMarkdown(session, opts);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, markdown, "utf8");
  return {
    path: filePath,
    relativePath: NOTEBOOKLM_BRIEF_FILENAME,
    markdown,
    parsed: parseNotebooklmBriefMarkdown(markdown),
  };
}

export function loadNotebooklmBrief(projDir) {
  const filePath = notebooklmBriefPath(projDir);
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      available: false,
      path: filePath,
      relativePath: NOTEBOOKLM_BRIEF_FILENAME,
    };
  }
  try {
    const markdown = fs.readFileSync(filePath, "utf8");
    const parsed = parseNotebooklmBriefMarkdown(markdown);
    return {
      available: true,
      path: filePath,
      relativePath: NOTEBOOKLM_BRIEF_FILENAME,
      markdown,
      parsed,
      status: parsed.meta?.status || "unknown",
      skipWebResearch: parsed.skipWebResearch,
    };
  } catch (err) {
    return {
      available: false,
      path: filePath,
      relativePath: NOTEBOOKLM_BRIEF_FILENAME,
      error: err.message,
    };
  }
}

export function syncNotebooklmBriefFromSession(
  session,
  { projDir, project, niche, format } = {}
) {
  if (!projDir || !session) return null;
  return writeNotebooklmBrief(projDir, session, {
    project: project || path.basename(projDir),
    niche: niche || session.niche,
    format: format || session.format,
  });
}

export function shouldSkipWebResearchForBrief(brief = {}) {
  if (!brief?.available) return false;
  if (brief.skipWebResearch === true) return true;
  const parsed = brief.parsed || {};
  return (
    (parsed.factCount || parsed.facts?.length || 0) >= 4 &&
    String(parsed.accumulated || "").length >= 400
  );
}

export function formatNotebooklmBriefPromptBlock(
  brief = {},
  format = "SHORTS",
  label = "BRIEF NOTEBOOKLM (MD DO PROJETO)"
) {
  const parsed =
    brief.parsed || parseNotebooklmBriefMarkdown(brief.markdown || "");
  const accumulated = String(parsed.accumulated || brief.markdown || "").trim();
  if (!accumulated) return "";

  const factsList =
    parsed.facts?.length > 0
      ? `\nFATOS ESTRUTURADOS (${parsed.facts.length}):\n${parsed.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n`
      : "";

  const geoHints =
    parsed.locations?.length > 0
      ? `\nLOCAIS/POIs PARA TEMPLATES GEO:\n${parsed.locations.map((l) => `- ${l.place}`).join("\n")}\n`
      : "";

  const skillNote =
    format === "SHORTS" || format === "SHORT"
      ? "Aplique skill viral-short-form: gancho ≤10 palavras, 80–130 palavras, wow-facts, fechamento declarativo."
      : "Aplique skill documental LONGO: 1500–3000 palavras, open loops, escalada por blocos.";

  return `\n${label}:
Arquivo: ${NOTEBOOKLM_BRIEF_FILENAME} (fonte única — NÃO busque na web fatos já presentes aqui)

${skillNote}

${factsList}${geoHints}
MATERIAL ACUMULADO:
${accumulated.slice(0, 14000)}

INSTRUÇÃO: Use EXCLUSIVAMENTE este brief para fatos, números, datas, nomes, ganchos e locais. Não contradiga nem invente dados fora deste material. Popular templates Remotion com locais e stats listados acima quando a cena citar o lugar.
`;
}

export function mergeBriefIntoStoryboard(storyboard = {}, brief = {}) {
  if (!brief?.available || !brief.parsed) return storyboard;
  const parsed = brief.parsed;
  const facts = [
    ...new Set([...(storyboard.research_facts || []), ...(parsed.facts || [])]),
  ];
  const next = {
    ...storyboard,
    research_facts: facts,
    notebooklm_brief: {
      path: brief.relativePath || NOTEBOOKLM_BRIEF_FILENAME,
      fact_count: parsed.factCount || facts.length,
      skip_web_research: brief.skipWebResearch,
      updated_at: parsed.meta?.updated_at || null,
    },
    template_hints: {
      ...(storyboard.template_hints &&
      typeof storyboard.template_hints === "object"
        ? storyboard.template_hints
        : {}),
      ...(parsed.templateHints || {}),
    },
  };
  if (!next.web_research?.summary && parsed.accumulated) {
    next.web_research = {
      ...(next.web_research || {}),
      summary: String(parsed.accumulated).slice(0, 8000),
      via: "notebooklm-brief-md",
    };
  }
  return next;
}
