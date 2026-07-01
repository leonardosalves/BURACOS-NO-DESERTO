export type AgentReachResearchPayload = {
  summary?: string;
  facts?: string[];
  sources?: { title?: string; url?: string }[];
  query?: string;
  via?: string;
};

export type CreatorApplyIdeaOptions = {
  format?: 'LONGO' | 'SHORTS';
  /** Só gera narração automaticamente se true (padrão: página preparada). */
  autoRun?: boolean;
  editorialItemId?: string;
  mechanic?: string;
  whyWorks?: string;
  source?: string;
  sourceBlock?: number;
  /** Pesquisa Agent Reach para injetar no roteiro (fatos + fontes). */
  agentReachResearch?: AgentReachResearchPayload;
};

export type EditorialIdeaImport = {
  title: string;
  hookPt: string;
  format: 'LONGO' | 'SHORTS';
  editorialItemId?: string;
  mechanic?: string;
  whyWorks?: string;
  source?: string;
  sourceProject?: string;
  sourceBlock?: number;
  agentReachResearch?: AgentReachResearchPayload;
};

export function parseEditorialSourceProject(source?: string): string | undefined {
  const raw = String(source || '').trim();
  if (!raw) return undefined;
  const idx = raw.indexOf(':');
  return idx >= 0 ? raw.slice(idx + 1).trim() : raw;
}

export function buildAgentReachResearchOutline(research?: AgentReachResearchPayload | null): string {
  if (!research?.summary && !(research?.facts?.length)) return '';
  const lines: string[] = ['PESQUISA WEB (Agent Reach) — use estes fatos na narração:'];
  if (research.query) lines.push(`Tema pesquisado: ${research.query}`);
  if (research.facts?.length) {
    lines.push('', 'Fatos encontrados:');
    research.facts.slice(0, 8).forEach((f) => lines.push(`• ${f}`));
  } else if (research.summary) {
    lines.push('', research.summary.slice(0, 3500));
  }
  if (research.sources?.length) {
    lines.push('', 'Fontes:');
    research.sources.slice(0, 6).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title || s.url}${s.url ? ` — ${s.url}` : ''}`);
    });
  }
  return lines.join('\n');
}

export function buildEditorialImportOutline(
  importData: Pick<EditorialIdeaImport, 'whyWorks' | 'mechanic' | 'sourceProject' | 'sourceBlock' | 'agentReachResearch'>,
): string {
  const parts: string[] = [];
  const researchBlock = buildAgentReachResearchOutline(importData.agentReachResearch);
  if (researchBlock) parts.push(researchBlock);
  if (importData.whyWorks) parts.push(importData.whyWorks);
  if (importData.mechanic) parts.push(`Mecânica: ${importData.mechanic}`);
  if (importData.sourceProject) {
    const blockHint = importData.sourceBlock ? ` · bloco ${importData.sourceBlock}` : '';
    parts.push(`Origem: ${importData.sourceProject}${blockHint}`);
  }
  return parts.join('\n\n');
}

export function isClipFactorySource(source?: string): boolean {
  return String(source || '').startsWith('clip-factory:');
}

/** Normaliza texto vindo da fila — evita [object Object] no Creator. */
export function coerceCreatorTextField(value: unknown, fallback = ''): string {
  if (value == null) return String(fallback || '').trim();
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s || s.includes('[object Object]')) return String(fallback || '').trim();
    return s;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested = obj.phrase ?? obj.text ?? obj.hook ?? obj.title ?? obj.angle ?? '';
    return coerceCreatorTextField(nested, fallback);
  }
  const s = String(value).trim();
  if (!s || s === '[object Object]' || s.includes('[object Object]')) return String(fallback || '').trim();
  return s;
}