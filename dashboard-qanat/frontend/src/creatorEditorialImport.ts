export type CreatorApplyIdeaOptions = {
  format?: 'LONGO' | 'SHORTS';
  /** Só gera narração automaticamente se true (padrão: página preparada). */
  autoRun?: boolean;
  editorialItemId?: string;
  mechanic?: string;
  whyWorks?: string;
  source?: string;
  sourceBlock?: number;
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
};

export function parseEditorialSourceProject(source?: string): string | undefined {
  const raw = String(source || '').trim();
  if (!raw) return undefined;
  const idx = raw.indexOf(':');
  return idx >= 0 ? raw.slice(idx + 1).trim() : raw;
}

export function buildEditorialImportOutline(importData: Pick<EditorialIdeaImport, 'whyWorks' | 'mechanic' | 'sourceProject' | 'sourceBlock'>): string {
  const parts: string[] = [];
  if (importData.whyWorks) parts.push(importData.whyWorks);
  if (importData.mechanic) parts.push(`Mecânica: ${importData.mechanic}`);
  if (importData.sourceProject) {
    const blockHint = importData.sourceBlock ? ` · bloco ${importData.sourceBlock}` : '';
    parts.push(`Origem: ${importData.sourceProject}${blockHint}`);
  }
  return parts.join('\n');
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