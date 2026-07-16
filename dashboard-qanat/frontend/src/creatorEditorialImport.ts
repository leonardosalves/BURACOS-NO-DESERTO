export type AgentReachResearchPayload = {
  summary?: string;
  facts?: string[];
  sources?: { title?: string; url?: string }[];
  query?: string;
  via?: string;
};

export type PioneerNicheMeta = {
  macroNiche?: string;
  nicheLabel?: string;
  angle?: string;
  specificAngle?: string;
  formatPattern?: string;
  youtubeSearchQuery?: string;
  firstVideoIdea?: string;
  firstVideoHook?: string;
  demandAnalysis?: string;
  contentPillars?: string[] | string;
  competitionLevel?: string;
  whyPioneer?: string;
};

/** Texto de estratégia YouTube — não é tema de vídeo (espelha pioneerNicheDiscovery.js). */
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

export function isPioneerStrategyText(text = ""): boolean {
  const t = String(text || "").trim();
  if (!t) return false;
  return PIONEER_STRATEGY_RE.some((re) => re.test(t));
}

function firstNonStrategyText(...candidates: (string | undefined)[]): string {
  for (const raw of candidates) {
    const s = String(raw || "").trim();
    if (s && !isPioneerStrategyText(s)) return s;
  }
  return "";
}

/** Garante título/gancho sobre o TEMA do vídeo, nunca sobre saturação/gap. */
export function resolvePioneerCreatorSeed(
  title: string,
  hook: string,
  pioneerMeta?: PioneerNicheMeta | null,
  whyWorks?: string
): { title: string; hook: string } {
  const meta = pioneerMeta || {};
  const contentTitle = firstNonStrategyText(
    meta.angle,
    title,
    hook,
    meta.formatPattern && meta.macroNiche
      ? `${meta.macroNiche}: ${meta.formatPattern}`
      : "",
    meta.macroNiche
  );
  const contentHook =
    firstNonStrategyText(meta.angle, hook, title, contentTitle) || contentTitle;
  return {
    title: contentTitle.slice(0, 240),
    hook: contentHook.slice(0, 500),
  };
}

export type OpenMontageConcept = {
  id: string;
  title: string;
  inspired_by: string;
  creative_twist: string;
  visual_plan?: string;
  audio_plan?: string;
  duration_sec?: number;
};

export type OpenMontageBrief = {
  content_summary?: string;
  style_profile?: string;
  hook_technique?: string;
  what_works?: string[];
  concepts?: OpenMontageConcept[];
  recommended_concept?: string;
  lumiera_requirement?: string;
  creator_title?: string;
  creator_hook?: string;
  five_aspects?: Record<string, string>;
  motion_profile?: { dominant?: string; slideshow_risk?: string };
  structure?: { estimated_duration_sec?: number; pacing?: string };
};

export type CreatorApplyIdeaOptions = {
  format?: "LONGO" | "SHORTS";
  /** Só gera narração automaticamente se true (padrão: página preparada). */
  autoRun?: boolean;
  editorialItemId?: string;
  mechanic?: string;
  whyWorks?: string;
  source?: string;
  sourceBlock?: number;
  pioneerMeta?: PioneerNicheMeta;
  /** Pesquisa Agent Reach para injetar no roteiro (fatos + fontes). */
  agentReachResearch?: AgentReachResearchPayload;
  /** Brief OpenMontage (Inspirado em vídeo) para preencher o outline do Creator. */
  openMontage?: {
    brief: OpenMontageBrief;
    conceptId?: string;
    referenceUrl?: string;
    referenceTitle?: string;
  };
  customTitle?: string;
  customHook?: string;
  customPromise?: string;
  /** Narração já aprovada por um criador especializado; abre revisão sem regenerar. */
  approvedNarration?: string;
  blocks?: Array<{ block: number; content: string }>;
};

export type OpenMontageImportPayload = {
  brief: OpenMontageBrief;
  conceptId?: string;
  referenceUrl?: string;
  referenceTitle?: string;
};

export type EditorialIdeaImport = {
  title: string;
  hookPt: string;
  format: "LONGO" | "SHORTS";
  editorialItemId?: string;
  mechanic?: string;
  whyWorks?: string;
  source?: string;
  sourceProject?: string;
  sourceBlock?: number;
  pioneerMeta?: PioneerNicheMeta;
  agentReachResearch?: AgentReachResearchPayload;
  openMontageOutline?: string;
  approvedNarration?: string;
  /** Brief serializado — permite reidratar outline após F5 / wizard session. */
  openMontage?: OpenMontageImportPayload;
};

export function buildPioneerCreatorOutline(
  meta: PioneerNicheMeta,
  whyWorks?: string
): string {
  const lines: string[] = [
    'TEMA DO VÍDEO (conteúdo real para o espectador — NÃO fale sobre "nicho virgem", saturação de mercado, gap de pontos ou como achar nichos no YouTube):',
  ];
  if (meta.macroNiche) lines.push(`Macro-nicho: ${meta.macroNiche}`);
  if (meta.angle) lines.push(`Ângulo / assunto: ${meta.angle}`);
  if (meta.formatPattern)
    lines.push(`Estrutura do vídeo: ${meta.formatPattern}`);
  if (meta.youtubeSearchQuery)
    lines.push(`Referência de pesquisa: ${meta.youtubeSearchQuery}`);
  if (whyWorks) {
    lines.push(
      "",
      "Contexto estratégico (só para o roteirista — NÃO transforme isso no tema do vídeo):",
      whyWorks
    );
  }
  return lines.join("\n");
}

export function parseEditorialSourceProject(
  source?: string
): string | undefined {
  const raw = String(source || "").trim();
  if (!raw) return undefined;
  const idx = raw.indexOf(":");
  return idx >= 0 ? raw.slice(idx + 1).trim() : raw;
}

export function buildAgentReachResearchOutline(
  research?: AgentReachResearchPayload | null
): string {
  if (!research?.summary && !research?.facts?.length) return "";
  const lines: string[] = [
    "PESQUISA WEB (Agent Reach) — use estes fatos na narração:",
  ];
  if (research.query) lines.push(`Tema pesquisado: ${research.query}`);
  if (research.facts?.length) {
    lines.push("", "Fatos encontrados:");
    research.facts.slice(0, 8).forEach((f) => lines.push(`• ${f}`));
  } else if (research.summary) {
    lines.push("", research.summary.slice(0, 3500));
  }
  if (research.sources?.length) {
    lines.push("", "Fontes:");
    research.sources.slice(0, 6).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title || s.url}${s.url ? ` — ${s.url}` : ""}`);
    });
  }
  return lines.join("\n");
}

export function resolveOpenMontageConcept(
  brief: OpenMontageBrief,
  conceptId?: string
): OpenMontageConcept | undefined {
  const concepts = brief.concepts || [];
  if (!concepts.length) return undefined;
  const picked = conceptId
    ? concepts.find((c) => c.id === conceptId)
    : concepts.find((c) => c.id === brief.recommended_concept);
  return picked || concepts[0];
}

/** Outline rico para o Creator a partir do brief OpenMontage (5 aspectos + twist + plano visual/áudio). */
export function buildOpenMontageCreatorOutline(opts: {
  brief: OpenMontageBrief;
  conceptId?: string;
  referenceUrl?: string;
  referenceTitle?: string;
}): string {
  const { brief, conceptId, referenceUrl, referenceTitle } = opts;
  const concept = resolveOpenMontageConcept(brief, conceptId);
  const lines: string[] = [
    "BRIEF OPENMONTAGE — vídeo inspirado em referência (NÃO copiar; manter estrutura com twist criativo):",
  ];

  if (referenceUrl) {
    lines.push(
      `Referência: ${referenceTitle ? `"${referenceTitle}" — ` : ""}${referenceUrl}`
    );
  }
  if (brief.content_summary)
    lines.push("", "Resumo do referência:", brief.content_summary);
  if (concept) {
    lines.push(
      "",
      `Conceito escolhido (${concept.id}): ${concept.title}`,
      `Mantém do referência: ${concept.inspired_by}`,
      `Twist criativo: ${concept.creative_twist}`
    );
    if (concept.visual_plan) lines.push(`Plano visual: ${concept.visual_plan}`);
    if (concept.audio_plan) lines.push(`Plano de áudio: ${concept.audio_plan}`);
    if (concept.duration_sec)
      lines.push(`Duração alvo: ~${concept.duration_sec}s`);
  }
  if (brief.style_profile)
    lines.push("", `Estilo / pacing: ${brief.style_profile}`);
  if (brief.hook_technique)
    lines.push(`Técnica de gancho: ${brief.hook_technique}`);
  if (brief.what_works?.length) {
    lines.push("", "O que funciona no referência:");
    brief.what_works.forEach((w) => lines.push(`• ${w}`));
  }
  if (brief.structure?.pacing || brief.structure?.estimated_duration_sec) {
    lines.push(
      "",
      `Estrutura: pacing ${brief.structure.pacing || "medium"}, ~${brief.structure.estimated_duration_sec || "?"}s`
    );
  }
  if (brief.motion_profile?.dominant) {
    const risk = brief.motion_profile.slideshow_risk
      ? ` · risco slideshow: ${brief.motion_profile.slideshow_risk}`
      : "";
    lines.push(`Motion: ${brief.motion_profile.dominant}${risk}`);
  }
  if (brief.five_aspects) {
    const fa = brief.five_aspects;
    const aspectLines = [
      fa.subject && `Subject: ${fa.subject}`,
      fa.subject_motion && `Subject motion: ${fa.subject_motion}`,
      fa.scene && `Scene: ${fa.scene}`,
      fa.spatial_framing && `Framing: ${fa.spatial_framing}`,
      fa.camera && `Camera: ${fa.camera}`,
    ].filter(Boolean);
    if (aspectLines.length) {
      lines.push("", "5 aspectos (shots):");
      aspectLines.forEach((a) => lines.push(`• ${a}`));
    }
  }
  if (brief.lumiera_requirement) {
    lines.push(
      "",
      "Requisito Lumiera (roteiro deve cumprir):",
      brief.lumiera_requirement
    );
  }
  lines.push(
    "",
    "Instrução ao roteirista: preserve o pacing e o gancho do referência, mas o assunto e o twist devem ser claramente diferenciados."
  );
  return lines.join("\n");
}

/** Monta outline do Creator a partir do import (inclui reidratação OpenMontage). */
export function resolveEditorialImportOutline(
  importData: Pick<
    EditorialIdeaImport,
    | "whyWorks"
    | "mechanic"
    | "sourceProject"
    | "sourceBlock"
    | "agentReachResearch"
    | "pioneerMeta"
    | "openMontageOutline"
    | "openMontage"
  >
): string {
  let openMontageOutline = importData.openMontageOutline?.trim() || "";
  if (!openMontageOutline && importData.openMontage?.brief) {
    openMontageOutline = buildOpenMontageCreatorOutline({
      brief: importData.openMontage.brief,
      conceptId: importData.openMontage.conceptId,
      referenceUrl: importData.openMontage.referenceUrl,
      referenceTitle: importData.openMontage.referenceTitle,
    });
  }
  return buildEditorialImportOutline({
    ...importData,
    openMontageOutline: openMontageOutline || undefined,
  });
}

export function buildEditorialImportOutline(
  importData: Pick<
    EditorialIdeaImport,
    | "whyWorks"
    | "mechanic"
    | "sourceProject"
    | "sourceBlock"
    | "agentReachResearch"
    | "pioneerMeta"
  > & {
    openMontageOutline?: string;
  }
): string {
  const parts: string[] = [];
  if (importData.openMontageOutline) parts.push(importData.openMontageOutline);
  const researchBlock = buildAgentReachResearchOutline(
    importData.agentReachResearch
  );
  if (researchBlock) parts.push(researchBlock);
  const hasPioneerMeta = Boolean(
    importData.pioneerMeta?.angle ||
    importData.pioneerMeta?.macroNiche ||
    importData.pioneerMeta?.formatPattern
  );
  if (
    (importData.mechanic === "pioneer-niche" || hasPioneerMeta) &&
    importData.pioneerMeta
  ) {
    parts.push(
      buildPioneerCreatorOutline(importData.pioneerMeta, importData.whyWorks)
    );
  } else if (
    importData.whyWorks &&
    !isPioneerStrategyText(importData.whyWorks)
  ) {
    parts.push(importData.whyWorks);
  } else if (
    importData.whyWorks &&
    isPioneerStrategyText(importData.whyWorks)
  ) {
    parts.push(
      "TEMA DO VÍDEO: use o título/gancho como assunto real. Contexto estratégico (NÃO vire isso no roteiro):",
      importData.whyWorks
    );
  }
  if (importData.mechanic) parts.push(`Mecânica: ${importData.mechanic}`);
  if (importData.sourceProject) {
    const blockHint = importData.sourceBlock
      ? ` · bloco ${importData.sourceBlock}`
      : "";
    parts.push(`Origem: ${importData.sourceProject}${blockHint}`);
  }
  return parts.join("\n\n");
}

export function isClipFactorySource(source?: string): boolean {
  return String(source || "").startsWith("clip-factory:");
}

/** Normaliza texto vindo da fila — evita [object Object] no Creator. */
export function coerceCreatorTextField(value: unknown, fallback = ""): string {
  if (value == null) return String(fallback || "").trim();
  if (typeof value === "string") {
    const s = value.trim();
    if (!s || s.includes("[object Object]"))
      return String(fallback || "").trim();
    return s;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested =
      obj.phrase ?? obj.text ?? obj.hook ?? obj.title ?? obj.angle ?? "";
    return coerceCreatorTextField(nested, fallback);
  }
  const s = String(value).trim();
  if (!s || s === "[object Object]" || s.includes("[object Object]"))
    return String(fallback || "").trim();
  return s;
}
