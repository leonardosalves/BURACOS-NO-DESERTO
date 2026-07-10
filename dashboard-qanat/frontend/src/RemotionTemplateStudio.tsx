import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Easing, interpolate } from "remotion";
import {
  createCatalogNiche,
  deleteCatalogNiche,
  extractTemplateTsxFromLlm,
  fetchCatalogNiches,
  exportRemotionTemplateCatalog,
  fetchRemotionTemplateCatalog,
  importRemotionTemplateCatalog,
  repairCommonTemplateLayoutVars,
  syncRemotionTemplateCatalog,
  validateFinalTemplateCode,
  type CatalogTemplate,
} from "./remotionTemplateStudioApi";
import {
  DEFAULT_TEMPLATE_NICHES,
  isInternalTestCatalogNiche,
  mergeNicheLists,
  normalizeNicheLabel,
} from "@lumiera/shared/remotionTemplateNiches.js";
import { hasRunnableStudioSource } from "@lumiera/shared/remotionTemplateStudioCatalog.js";
import {
  isLegacySeedTemplateId,
  LEGACY_SEED_TEMPLATE_IDS,
} from "@lumiera/shared/remotionTemplateLegacy.js";
import {
  LazySavedTemplatePreviewFrame,
  SavedTemplatePreviewFrame,
} from "./remotionTemplateLivePreview";
import {
  ArrowLeft,
  BadgeCheck,
  Braces,
  Check,
  Code2,
  Copy,
  Eye,
  Film,
  Layers3,
  Pause,
  PencilRuler,
  Play,
  Plus,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

type TemplateCategory = string;

type TemplateItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  subcategory: string;
  niche: string;
  status: "approved" | "draft";
  description: string;
  dataSlots: string[];
  sourceCode: {
    short: string;
    long: string;
  };
  shortPreview:
    | "ring"
    | "counter"
    | "comparison"
    | "pie"
    | "donut"
    | "circular-progress"
    | "progress-bars"
    | "map"
    | "bars"
    | "line"
    | "area"
    | "title"
    | "cinematic"
    | "media";
  longPreview:
    | "ring"
    | "counter"
    | "comparison"
    | "line"
    | "area"
    | "pie"
    | "donut"
    | "circular-progress"
    | "progress-bars"
    | "map"
    | "bars"
    | "title"
    | "cinematic"
    | "media";
};

type TemplateCategoryDefinition = {
  id: TemplateCategory;
  label: string;
  subcategories: string[];
};

const CATEGORIES: TemplateCategoryDefinition[] = [
  {
    id: "maps",
    label: "Mapas",
    subcategories: ["PIP mapa", "Flyover", "Mapa antigo", "Pin regional"],
  },
  {
    id: "chart-data",
    label: "Chart Data",
    subcategories: [
      "Counter",
      "Bar chart",
      "Line chart",
      "Area chart",
      "Pie chart",
      "Donut chart",
      "KPI",
      "Circular Progress",
    ],
  },
  {
    id: "text",
    label: "Text",
    subcategories: ["Lower third", "Title", "Quote", "Callout"],
  },
  {
    id: "content-animation",
    label: "Content Animation",
    subcategories: ["Processo", "Timeline", "Comparacao", "Explainer"],
  },
  {
    id: "background",
    label: "Background",
    subcategories: ["Grid", "HUD", "Blueprint", "Texture"],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    subcategories: ["Reveal", "Lens", "Depth", "Frame"],
  },
  {
    id: "transition",
    label: "Transition",
    subcategories: ["Swipe", "Map zoom", "Match cut", "Glitch"],
  },
  {
    id: "logo-branding",
    label: "Logo e Branding",
    subcategories: ["Bug", "Ident", "Watermark", "Sponsor"],
  },
  {
    id: "intro-outro",
    label: "Intro e Outro",
    subcategories: ["Hook", "Chapter", "CTA", "Recap"],
  },
  {
    id: "image-media",
    label: "Image e Media",
    subcategories: ["PIP media", "Before after", "Stack", "Gallery"],
  },
];

/** Seed vazio — templates vêm só de import/Assistir IA no Studio. */
const TEMPLATES: TemplateItem[] = [];

const TEMPLATE_STORAGE_KEY = "lumiera.remotionTemplateStudio.templates.v1";
const NICHE_STORAGE_KEY = "lumiera.remotionTemplateStudio.niches.v1";
const CATEGORY_STORAGE_KEY = "lumiera.remotionTemplateStudio.categories.v1";
const DELETED_CATALOG_STORAGE_KEY =
  "lumiera.remotionTemplateStudio.deletedCatalog.v1";

type DetailTab = "preview" | "source";
type DetailFormat = "short" | "long";
type DeletedCatalog = {
  categories: string[];
  subcategories: string[];
  templates: string[];
};

type PreviewVariant =
  TemplateItem["shortPreview"] | TemplateItem["longPreview"];

type PreviewSegment = {
  label: string;
  value: number;
  color: string;
};

type TemplatePreviewProps = {
  title?: string;
  subtitle?: string;
  progress?: number;
  value?: number;
  label?: string;
  suffix?: string;
  centerValue?: string;
  centerLabel?: string;
  segments?: PreviewSegment[];
  prefix?: string;
  unit?: string;
  trendValue?: string;
  trendLabel?: string;
  statusText?: string;
  projectCode?: string;
  location?: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeValue?: number;
  afterValue?: number;
};

const DEFAULT_PREVIEW_SEGMENTS: PreviewSegment[] = [
  { label: "Execucao", value: 34, color: "#22d3ee" },
  { label: "Planejado", value: 25, color: "#4f7cff" },
  { label: "Operacao", value: 20, color: "#facc15" },
  { label: "Restante", value: 21, color: "#ff2f8f" },
];

const PREVIEW_DURATION_BY_VARIANT: Record<PreviewVariant, number> = {
  ring: 90,
  counter: 90,
  comparison: 90,
  pie: 90,
  donut: 90,
  "circular-progress": 150,
  "progress-bars": 120,
  map: 90,
  bars: 90,
  title: 90,
  media: 90,
  line: 90,
  area: 90,
  cinematic: 90,
};

// Preview 100% fiel: Remotion Player compila e renderiza o TSX salvo (sem mock SVG).

function slugifyTemplatePart(value: string) {
  return String(value || "template")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractDataSlotsFromCode(code: string): string[] {
  const exampleMatch = code.match(
    /export\s+const\s+exampleProps\s*=\s*\{([\s\S]*?)\n\}/m
  );
  const typeMatch = code.match(/type\s+\w+Props\s*=\s*\{([\s\S]*?)\};/m);
  const block = exampleMatch?.[1] || typeMatch?.[1] || "";
  const keys = [...block.matchAll(/^\s*([A-Za-z_]\w*)\s*[?:]?\s*:/gm)].map(
    (match) => match[1]
  );
  return [...new Set(keys)];
}

function isCircularProgressContext(...labels: string[]) {
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("circular progress") ||
    haystack.includes("circular-progress") ||
    /\bcircularprogress\b/.test(haystack)
  );
}

function isDonutChartContext(...labels: string[]) {
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("donut chart") ||
    haystack.includes("donut-chart") ||
    /\bdonutchart\b/.test(haystack) ||
    /\bdonut\b/.test(haystack) ||
    /\brosca\b/.test(haystack)
  );
}

function isPieChartContext(...labels: string[]) {
  if (isDonutChartContext(...labels)) return false;
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("pie chart") ||
    haystack.includes("pie-chart") ||
    /\bpiechart\b/.test(haystack) ||
    /\bpizza\b/.test(haystack)
  );
}

function isAreaChartContext(...labels: string[]) {
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("area chart") ||
    haystack.includes("area-chart") ||
    /areachart/.test(haystack) ||
    /\barea\s*series\b/.test(haystack) ||
    haystack.includes("areadata")
  );
}

function isLineChartContext(...labels: string[]) {
  if (isAreaChartContext(...labels)) return false;
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("line chart") ||
    haystack.includes("line-chart") ||
    /\blinechart\b/.test(haystack) ||
    /\bline\s*series\b/.test(haystack)
  );
}

function isBarChartContext(...labels: string[]) {
  const haystack = labels.join(" ").toLowerCase();
  return (
    haystack.includes("bar chart") ||
    haystack.includes("bar-chart") ||
    /\bbarchart\b/.test(haystack) ||
    /\bbar\s*grid\b/.test(haystack)
  );
}

function detectChartKindFromCode(
  code = ""
):
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "donut"
  | "comparison"
  | "progress-bars"
  | "circular-progress"
  | null {
  const componentName = code.match(/export\s+default\s+function\s+(\w+)/)?.[1];
  const meta = [componentName || "", code.slice(0, 3000)]
    .join(" ")
    .toLowerCase();

  if (
    meta.includes("beforevalue") ||
    meta.includes("aftervalue") ||
    meta.includes("comparison") ||
    meta.includes("beforelabel")
  ) {
    return "comparison";
  }
  if (isDonutChartContext(meta) || meta.includes("donut")) return "donut";
  if (isPieChartContext(meta) || meta.includes("pie")) return "pie";
  if (isAreaChartContext(meta) || meta.includes("area")) return "area";
  if (
    meta.includes("progressbar") ||
    meta.includes("progress-bar") ||
    meta.includes("progressbars")
  ) {
    return "progress-bars";
  }
  if (isCircularProgressContext(meta) || meta.includes("circularprogress"))
    return "circular-progress";
  if (isLineChartContext(meta) || meta.includes("line")) return "line";
  if (
    isBarChartContext(meta) ||
    meta.includes("bar") ||
    meta.includes("column")
  )
    return "bar";

  return null;
}

function previewVariantsFromChartKind(
  kind: ReturnType<typeof detectChartKindFromCode>
): Pick<TemplateItem, "shortPreview" | "longPreview"> | null {
  if (!kind) return null;
  if (kind === "donut") return { shortPreview: "donut", longPreview: "donut" };
  if (kind === "pie") return { shortPreview: "pie", longPreview: "pie" };
  if (kind === "bar") return { shortPreview: "bars", longPreview: "bars" };
  if (kind === "area") return { shortPreview: "area", longPreview: "area" };
  if (kind === "line") return { shortPreview: "line", longPreview: "line" };
  if (kind === "comparison")
    return { shortPreview: "comparison", longPreview: "comparison" };
  if (kind === "progress-bars")
    return { shortPreview: "progress-bars", longPreview: "progress-bars" };
  if (kind === "circular-progress")
    return {
      shortPreview: "circular-progress",
      longPreview: "circular-progress",
    };
  return null;
}

/**
 * Inferência flexível de tipo de chart a partir do nome da subcategoria.
 * Cobre nomes customizados que o usuário criar (ex: "Stacked bar", "Gráfico radar", etc.)
 * A subcategoria que o usuário SELECIONOU é a fonte de verdade — prioridade máxima.
 */
function inferChartKindFromSubcategory(
  subcategory: string,
  templateName = ""
): ReturnType<typeof detectChartKindFromCode> {
  const metaLabels = [subcategory, templateName];
  // Checagens específicas
  if (isCircularProgressContext(...metaLabels)) return "circular-progress";
  if (isDonutChartContext(...metaLabels)) return "donut";
  if (isPieChartContext(...metaLabels)) return "pie";
  if (isAreaChartContext(...metaLabels)) return "area";
  if (isBarChartContext(...metaLabels)) return "bar";
  if (isLineChartContext(...metaLabels)) return "line";

  // Keyword matching flexível para subcategorias customizadas
  const hay = [subcategory, templateName].join(" ").toLowerCase();
  if (/\b(donut|rosca|anel|donuts?)\b/.test(hay)) return "donut";
  if (/\b(pie|pizza|fatia|pies?)\b/.test(hay)) return "pie";
  if (/\b(area|preenchid|filled|stacked\s*area|areas?)\b/.test(hay))
    return "area";
  if (
    /\b(comparison|comparativo|comparative|before\s*after|antes\s*depois)\b/.test(
      hay
    )
  )
    return "comparison";
  if (
    /\b(progress\s*bars?|barras?\s*de\s*progresso|progress\-bars?)\b/.test(hay)
  )
    return "progress-bars";
  if (/\b(circular\s*progress|circular\-progress)\b/.test(hay))
    return "circular-progress";
  if (/\b(bars?|barra|coluna|columns?|histogram|stack)\b/.test(hay))
    return "bar";
  if (/\b(lines?|linha|spark|trend|series?|curv)\b/.test(hay)) return "line";

  return null;
}

function resolveChartDataPreview(
  subcategory: string,
  templateName = "",
  code = ""
): Pick<TemplateItem, "shortPreview" | "longPreview"> {
  const sub = subcategory.toLowerCase();
  const nameLower = templateName.toLowerCase();

  // 1) PRIORIDADE MÁXIMA: Detectar diretamente a partir do código fonte (fonte da verdade do componente!)
  const fromCode = previewVariantsFromChartKind(detectChartKindFromCode(code));
  if (fromCode) return fromCode;

  // 2) SEGUNDA PRIORIDADE: Detectar pelo nome da subcategoria
  const fromSub = previewVariantsFromChartKind(
    inferChartKindFromSubcategory(subcategory, templateName)
  );
  if (fromSub) return fromSub;

  // 3) KPIs e Counters específicos que não são charts visuais padrão
  if (sub.includes("counter") || nameLower.includes("counter")) {
    return { shortPreview: "counter", longPreview: "counter" };
  }
  if (sub.includes("kpi") || nameLower.includes("kpi")) {
    return { shortPreview: "ring", longPreview: "ring" };
  }

  // 4) Checagens explícitas de progresso como fallback
  if (isCircularProgressContext(subcategory, templateName)) {
    return {
      shortPreview: "circular-progress",
      longPreview: "circular-progress",
    };
  }
  if (
    sub.includes("progress bar") ||
    sub.includes("progress-bar") ||
    sub.includes("barra de progresso") ||
    nameLower.includes("progress bar") ||
    nameLower.includes("progress-bar") ||
    nameLower.includes("barra de progresso")
  ) {
    return {
      shortPreview: "progress-bars",
      longPreview: "progress-bars",
    };
  }

  // 5) Último recurso: "line"
  return { shortPreview: "line", longPreview: "line" };
}

function resolvePreviewVariants(
  category: TemplateCategory,
  subcategory: string,
  templateName = "",
  code = ""
): Pick<TemplateItem, "shortPreview" | "longPreview"> {
  const sub = subcategory.toLowerCase();

  // 1) PRIORIDADE ABSOLUTA: Herdar o preview de outro template da MESMA subcategoria!
  try {
    const rawTemplates = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (rawTemplates) {
      const allTemplates = JSON.parse(rawTemplates) as TemplateItem[];
      const sibling =
        allTemplates.find(
          (t) =>
            t.subcategory.toLowerCase() === sub &&
            t.shortPreview &&
            t.shortPreview !== "media"
        ) ||
        allTemplates.find(
          (t) => t.subcategory.toLowerCase() === sub && t.shortPreview
        );

      if (sibling) {
        return {
          shortPreview: sibling.shortPreview,
          longPreview: sibling.longPreview,
        };
      }
    }
  } catch {
    // Fallback silencioso
  }

  // 2) SEGUNDA PRIORIDADE: Deduzir a partir da categoria pai ou análise de código
  if (category === "maps") {
    if (sub.includes("flyover")) {
      return { shortPreview: "map", longPreview: "cinematic" };
    }
    return { shortPreview: "map", longPreview: "map" };
  }
  if (category === "chart-data") {
    return resolveChartDataPreview(subcategory, templateName, code);
  }
  if (category === "text") {
    return { shortPreview: "title", longPreview: "title" };
  }
  if (category === "logo-branding" || category === "intro-outro") {
    return { shortPreview: "title", longPreview: "title" };
  }
  if (category === "cinematic") {
    return { shortPreview: "media", longPreview: "cinematic" };
  }
  if (category === "image-media") {
    return { shortPreview: "media", longPreview: "media" };
  }
  if (category === "background") {
    return { shortPreview: "media", longPreview: "media" };
  }
  if (category === "content-animation" || category === "transition") {
    return { shortPreview: "media", longPreview: "bars" };
  }
  return { shortPreview: "media", longPreview: "media" };
}

function normalizeTemplatePreviewVariants(
  template: TemplateItem
): TemplateItem {
  const sourceBundle = `${template.sourceCode.short}\n${template.sourceCode.long}`;
  return {
    ...template,
    ...resolvePreviewVariants(
      template.category,
      template.subcategory,
      template.name,
      sourceBundle
    ),
  };
}

function effectivePreviewVariant(
  format: "9:16" | "16:9",
  template?: Pick<
    TemplateItem,
    | "category"
    | "subcategory"
    | "name"
    | "sourceCode"
    | "shortPreview"
    | "longPreview"
  >
): PreviewVariant {
  if (!template) return "media";
  if (format === "9:16" && template.shortPreview) {
    return template.shortPreview;
  }
  if (format === "16:9" && template.longPreview) {
    return template.longPreview;
  }
  const sourceBundle = `${template.sourceCode?.short || ""}\n${template.sourceCode?.long || ""}`;
  const fixed = resolvePreviewVariants(
    template.category,
    template.subcategory,
    template.name,
    sourceBundle
  );
  return format === "9:16" ? fixed.shortPreview : fixed.longPreview;
}

function describePieSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function extractPreviewSegmentsFromCode(code: string): PreviewSegment[] {
  const palette = ["#22d3ee", "#4f7cff", "#facc15", "#ff2f8f", "#7c2dff"];
  const block =
    code.match(/segments\s*:\s*\[([\s\S]*?)\]\s*,?/m)?.[1] ||
    code.match(/segments\s*=\s*\[([\s\S]*?)\]\s*;/m)?.[1] ||
    code.match(/items\s*:\s*\[([\s\S]*?)\]\s*,?/m)?.[1] ||
    code.match(/items\s*=\s*\[([\s\S]*?)\]\s*;/m)?.[1] ||
    "";
  const segments: PreviewSegment[] = [];
  for (const match of block.matchAll(/\{([^}]+)\}/g)) {
    const objectBody = match[1];
    const label = objectBody.match(/label\s*:\s*["']([^"']+)["']/)?.[1];
    const value = Number(objectBody.match(/value\s*:\s*(\d+(?:\.\d+)?)/)?.[1]);
    const color =
      objectBody.match(/color\s*:\s*["']([^"']+)["']/)?.[1] ||
      palette[segments.length % palette.length];
    if (label && Number.isFinite(value) && value > 0) {
      segments.push({ label, value, color });
    }
  }
  return segments.length ? segments : DEFAULT_PREVIEW_SEGMENTS;
}

function buildPreviewPropsFromSlots(slots: string[]): TemplatePreviewProps {
  const props: TemplatePreviewProps = {};
  for (const slot of slots) {
    const key = slot.trim();
    if (!key) continue;
    const normalized = key.toLowerCase();
    if (normalized === "progress" || normalized === "value") {
      props[normalized === "progress" ? "progress" : "value"] = 78;
    } else if (normalized === "label" || normalized === "centerlabel") {
      props.label = "Completion Rate";
      props.centerLabel = "Completion Rate";
    } else if (normalized === "title") {
      props.title = "Engineering KPI";
    } else if (normalized === "subtitle") {
      props.subtitle = "Live metric";
    } else if (normalized === "suffix") {
      props.suffix = "%";
    } else if (normalized === "centervalue") {
      props.centerValue = "78%";
    }
  }
  if (!props.progress && !props.value) props.progress = 78;
  if (!props.label) props.label = "Completion Rate";
  return props;
}

function extractDefaultPropsFromCode(code: string): Record<string, any> {
  const defaults: Record<string, any> = {};

  // Encontra o bloco de parâmetros do componente padrão
  const match = code.match(
    /export\s+default\s+function\s+\w+\s*\(\s*\{([\s\S]*?)\}\s*\)/
  );
  if (!match) return defaults;

  const paramsBlock = match[1];

  // Regex para capturar atribuições de valor padrão, ex: key = value
  // Suporta strings com aspas simples, duplas ou crases, números, e booleanos
  const regex =
    /(\w+)\s*=\s*(?:["']([^"']*)["']|`([^`]*)`|([-\d.]+)|(true|false))/g;

  for (const item of paramsBlock.matchAll(regex)) {
    const key = item[1];
    const strVal = item[2] ?? item[3];
    const numVal = item[4] ? Number(item[4]) : undefined;
    const boolVal = item[5] ? item[5] === "true" : undefined;

    if (strVal !== undefined) {
      defaults[key] = strVal;
    } else if (numVal !== undefined && !Number.isNaN(numVal)) {
      defaults[key] = numVal;
    } else if (boolVal !== undefined) {
      defaults[key] = boolVal;
    }
  }

  return defaults;
}

function buildPreviewPropsFromTemplate(
  template: Pick<
    TemplateItem,
    "dataSlots" | "sourceCode" | "subcategory" | "name"
  >
): TemplatePreviewProps {
  const code = `${template.sourceCode.short}\n${template.sourceCode.long}`;

  // 1) Extrai os valores padrão diretamente da assinatura do componente!
  const defaultProps = extractDefaultPropsFromCode(code);

  // 2) Cria a base de props a partir dos data slots
  const props = buildPreviewPropsFromSlots(template.dataSlots);

  // 3) Mescla com os valores padrão extraídos do código (dando prioridade ao código do usuário)
  const merged: TemplatePreviewProps = {
    ...props,
    title: defaultProps.title ?? props.title,
    subtitle: defaultProps.subtitle ?? props.subtitle,
    progress:
      defaultProps.progress ??
      defaultProps.value ??
      props.progress ??
      props.value,
    value: defaultProps.value ?? props.value,
    label: defaultProps.label ?? props.label,
    suffix: defaultProps.suffix ?? defaultProps.unit ?? props.suffix,
    centerValue:
      defaultProps.centerValue ??
      (defaultProps.value !== undefined
        ? String(defaultProps.value)
        : undefined) ??
      props.centerValue,
    centerLabel:
      defaultProps.centerLabel ?? defaultProps.label ?? props.centerLabel,
    prefix: defaultProps.prefix ?? props.prefix,
    unit: defaultProps.unit ?? props.unit,
    trendValue: defaultProps.trendValue ?? props.trendValue,
    trendLabel: defaultProps.trendLabel ?? props.trendLabel,
    statusText: defaultProps.statusText ?? props.statusText,
    projectCode: defaultProps.projectCode ?? props.projectCode,
    location: defaultProps.location ?? props.location,
    beforeLabel: defaultProps.beforeLabel ?? props.beforeLabel,
    afterLabel: defaultProps.afterLabel ?? props.afterLabel,
    beforeValue: defaultProps.beforeValue ?? props.beforeValue,
    afterValue: defaultProps.afterValue ?? props.afterValue,
  };

  merged.segments = extractPreviewSegmentsFromCode(code);

  const centerValue = code.match(/centerValue\s*:\s*["']([^"']+)["']/)?.[1];
  const centerLabel = code.match(/centerLabel\s*:\s*["']([^"']+)["']/)?.[1];
  if (centerValue) merged.centerValue = centerValue;
  if (centerLabel) merged.centerLabel = centerLabel;

  if (isAreaChartContext(template.subcategory, template.name)) {
    merged.title = merged.title || "Area Series";
  } else if (isPieChartContext(template.subcategory)) {
    merged.title = merged.title || "Pie Series";
  } else if (isDonutChartContext(template.subcategory)) {
    merged.centerValue = merged.centerValue || "78%";
    merged.centerLabel = merged.centerLabel || merged.label || "Total";
  } else {
    const subLower = template.subcategory.toLowerCase();
    const nameLower = template.name ? template.name.toLowerCase() : "";
    if (
      subLower.includes("progress") ||
      subLower.includes("progresso") ||
      nameLower.includes("progress") ||
      nameLower.includes("progresso")
    ) {
      merged.title = merged.title || "Progresso do Projeto";
    }
  }

  return merged;
}

function buildFormatSource({
  code,
  niche,
  categoryLabel,
  subcategory,
  format,
}: {
  code: string;
  niche: string;
  categoryLabel: string;
  subcategory: string;
  format: DetailFormat;
}) {
  const aspect = format === "short" ? "9:16 Shorts" : "16:9 Longos";
  return [
    `// ${niche} / ${categoryLabel} / ${subcategory} / ${aspect}`,
    "// Importado pelo Template Studio.",
    code.trim() || "export default function Template() {\n  return null;\n}",
  ].join("\n");
}

function subcategoryKey(name: string) {
  return name.trim().toLowerCase();
}

function subcategoryExists(subcategories: string[], name: string) {
  const key = subcategoryKey(name);
  return subcategories.some((item) => subcategoryKey(item) === key);
}

function deletedSubcategoryKey(categoryId: string, subcategoryName: string) {
  return `${categoryId.trim().toLowerCase()}::${subcategoryKey(
    subcategoryName
  )}`;
}

function emptyDeletedCatalog(): DeletedCatalog {
  return { categories: [], subcategories: [], templates: [] };
}

function normalizeDeletedCatalog(raw: Partial<DeletedCatalog> = {}) {
  return {
    categories: Array.isArray(raw.categories)
      ? raw.categories.map(String).filter(Boolean)
      : [],
    subcategories: Array.isArray(raw.subcategories)
      ? raw.subcategories.map(String).filter(Boolean)
      : [],
    templates: Array.isArray(raw.templates)
      ? raw.templates.map(String).filter(Boolean)
      : [],
  };
}

function readDeletedCatalog(): DeletedCatalog {
  if (typeof window === "undefined") return emptyDeletedCatalog();
  try {
    const raw = window.localStorage.getItem(DELETED_CATALOG_STORAGE_KEY);
    if (!raw) return emptyDeletedCatalog();
    return normalizeDeletedCatalog(JSON.parse(raw));
  } catch {
    return emptyDeletedCatalog();
  }
}

function writeDeletedCatalog(deleted: DeletedCatalog) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DELETED_CATALOG_STORAGE_KEY,
    JSON.stringify(normalizeDeletedCatalog(deleted))
  );
}

function addUnique(list: string[], value: string) {
  return list.includes(value) ? list : [...list, value];
}

function removeValue(list: string[], value: string) {
  return list.filter((item) => item !== value);
}

function mutateDeletedCatalog(
  updater: (deleted: DeletedCatalog) => DeletedCatalog
) {
  const next = normalizeDeletedCatalog(updater(readDeletedCatalog()));
  writeDeletedCatalog(next);
  return next;
}

function filterDeletedTemplates(
  templates: TemplateItem[],
  deleted: DeletedCatalog
) {
  const deletedTemplates = new Set(deleted.templates);
  const deletedCategories = new Set(deleted.categories);
  const deletedSubcategories = new Set(deleted.subcategories);
  return templates.filter((template) => {
    if (deletedTemplates.has(template.id)) return false;
    if (deletedCategories.has(template.category)) return false;
    return !deletedSubcategories.has(
      deletedSubcategoryKey(template.category, template.subcategory)
    );
  });
}

function filterDeletedCategories(
  categories: TemplateCategoryDefinition[],
  deleted: DeletedCatalog
) {
  const deletedCategories = new Set(deleted.categories);
  const deletedSubcategories = new Set(deleted.subcategories);
  return categories
    .filter((category) => !deletedCategories.has(category.id))
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.filter(
        (subcategory) =>
          !deletedSubcategories.has(
            deletedSubcategoryKey(category.id, subcategory)
          )
      ),
    }));
}

function mergeCategoryCatalog(
  stored: TemplateCategoryDefinition[],
  seed: TemplateCategoryDefinition[] = CATEGORIES
): TemplateCategoryDefinition[] {
  const byId = new Map<string, TemplateCategoryDefinition>();

  for (const item of seed) {
    byId.set(item.id, {
      ...item,
      subcategories: [...item.subcategories],
    });
  }

  for (const item of stored) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, {
        ...item,
        subcategories: [...item.subcategories],
      });
      continue;
    }
    const mergedSubs = [...existing.subcategories];
    for (const sub of item.subcategories) {
      if (!subcategoryExists(mergedSubs, sub)) mergedSubs.push(sub);
    }
    byId.set(item.id, {
      ...existing,
      label: existing.label || item.label,
      subcategories: mergedSubs,
    });
  }

  return Array.from(byId.values());
}

function syncCategoriesFromTemplates(
  categories: TemplateCategoryDefinition[],
  templates: TemplateItem[]
): TemplateCategoryDefinition[] {
  const byId = new Map(
    categories.map((item) => [
      item.id,
      { ...item, subcategories: [...item.subcategories] },
    ])
  );

  for (const template of templates) {
    const cleanSubcategory = template.subcategory?.trim();
    if (!template.category || !cleanSubcategory) continue;

    let categoryDef = byId.get(template.category);
    if (!categoryDef) {
      categoryDef = {
        id: template.category,
        label: template.category,
        subcategories: [],
      };
      byId.set(template.category, categoryDef);
    }
    if (!subcategoryExists(categoryDef.subcategories, cleanSubcategory)) {
      categoryDef.subcategories.push(cleanSubcategory);
    }
  }

  return Array.from(byId.values());
}

function ensureSubcategoryRegistered(
  categories: TemplateCategoryDefinition[],
  categoryId: string,
  subcategoryName: string
): TemplateCategoryDefinition[] {
  const clean = subcategoryName.trim();
  if (!clean) return categories;

  const nextCategories = categories.some((item) => item.id === categoryId)
    ? categories
    : [...categories, { id: categoryId, label: categoryId, subcategories: [] }];

  return nextCategories.map((item) => {
    if (item.id !== categoryId) return item;
    if (subcategoryExists(item.subcategories, clean)) return item;
    return {
      ...item,
      subcategories: [...item.subcategories, clean],
    };
  });
}

function readStoredNichesRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NICHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredNiches(niches: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NICHE_STORAGE_KEY, JSON.stringify(niches));
  } catch {
    /* ignore */
  }
}

function readStoredCategoriesRaw(): TemplateCategoryDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as TemplateCategoryDefinition[])
      : [];
  } catch {
    return [];
  }
}

function purgeLegacyTemplatesFromList(templates: TemplateItem[]) {
  return templates
    .filter((tpl) => !isLegacySeedTemplateId(tpl.id))
    .filter((tpl) => hasRunnableStudioSource(tpl.sourceCode));
}

function matchesStudioNiche(templateNiche = "", activeNiche = "") {
  const tpl = String(templateNiche || "")
    .trim()
    .toLowerCase();
  const active = String(activeNiche || "")
    .trim()
    .toLowerCase();
  if (!active) return true;
  if (!tpl) return true;
  return tpl === active;
}

function normalizeTemplateNicheOnLoad(template: TemplateItem): TemplateItem {
  return {
    ...template,
    niche: normalizeNicheLabel(template.niche || "") || template.niche,
  };
}

function migrateLegacySeedTemplates() {
  if (typeof window === "undefined") return;
  try {
    const deleted = readDeletedCatalog();
    let changed = false;
    const nextDeleted = { ...deleted };
    for (const id of LEGACY_SEED_TEMPLATE_IDS) {
      if (!nextDeleted.templates.includes(id)) {
        nextDeleted.templates = addUnique(nextDeleted.templates, id);
        changed = true;
      }
    }
    if (changed) writeDeletedCatalog(nextDeleted);

    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const cleaned = purgeLegacyTemplatesFromList(parsed as TemplateItem[]);
    if (cleaned.length !== parsed.length) {
      window.localStorage.setItem(
        TEMPLATE_STORAGE_KEY,
        JSON.stringify(cleaned)
      );
    }
  } catch {
    /* ignore */
  }
}

function loadStoredTemplates() {
  migrateLegacySeedTemplates();
  const seed = TEMPLATES.map(normalizeTemplatePreviewVariants);
  const deleted = readDeletedCatalog();
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return filterDeletedTemplates(seed, deleted);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? filterDeletedTemplates(
          purgeLegacyTemplatesFromList(
            (parsed as TemplateItem[])
              .map(normalizeTemplatePreviewVariants)
              .map(normalizeTemplateNicheOnLoad)
          ),
          deleted
        )
      : filterDeletedTemplates(seed, deleted);
  } catch {
    return filterDeletedTemplates(seed, deleted);
  }
}

function catalogTemplateToTemplateItem(
  tpl: CatalogTemplate
): TemplateItem | null {
  const short = String(tpl.sourceCode?.short || "").trim();
  const long = String(tpl.sourceCode?.long || "").trim();
  if (!short && !long) return null;
  const sourceCode = { short: short || long, long: long || short };
  return normalizeTemplatePreviewVariants({
    id: String(tpl.id || ""),
    name: String(tpl.name || ""),
    category: String(tpl.category || "chart-data") as TemplateCategory,
    subcategory: String(tpl.subcategory || ""),
    niche: normalizeNicheLabel(tpl.niche || "") || String(tpl.niche || ""),
    status: tpl.status === "approved" ? "approved" : "draft",
    description: String(tpl.description || ""),
    dataSlots: Array.isArray(tpl.dataSlots) ? tpl.dataSlots.map(String) : [],
    sourceCode,
    shortPreview: (tpl.shortPreview || "media") as TemplateItem["shortPreview"],
    longPreview: (tpl.longPreview || "media") as TemplateItem["longPreview"],
  });
}

function mergeStudioTemplateLists(
  local: TemplateItem[],
  fromApi: CatalogTemplate[]
): TemplateItem[] {
  const byId = new Map<string, TemplateItem>();
  for (const raw of fromApi) {
    const tpl = catalogTemplateToTemplateItem(raw);
    if (tpl) byId.set(tpl.id, tpl);
  }
  for (const tpl of local) {
    const prev = byId.get(tpl.id);
    const merged = prev
      ? normalizeTemplatePreviewVariants({
          ...prev,
          ...tpl,
          sourceCode:
            tpl.sourceCode?.short?.trim() || tpl.sourceCode?.long?.trim()
              ? tpl.sourceCode
              : prev.sourceCode,
        })
      : normalizeTemplatePreviewVariants(tpl);
    byId.set(tpl.id, merged);
  }
  return [...byId.values()];
}

function studioTemplatesToSyncPayload(
  templates: TemplateItem[],
  niche: string
) {
  return templates
    .filter((tpl) => matchesStudioNiche(tpl.niche, niche))
    .map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      subcategory: tpl.subcategory,
      niche: tpl.niche || niche,
      status: tpl.status,
      description: tpl.description,
      dataSlots: tpl.dataSlots,
      shortPreview: tpl.shortPreview,
      longPreview: tpl.longPreview,
      sourceCode: {
        short: String(tpl.sourceCode?.short || "").trim(),
        long: String(tpl.sourceCode?.long || "").trim(),
      },
    }))
    .filter((tpl) => tpl.sourceCode.short || tpl.sourceCode.long);
}

async function pushAllTemplatesToServer(templates: TemplateItem[]) {
  const byNiche = new Map<string, TemplateItem[]>();
  for (const tpl of templates) {
    const key = normalizeNicheLabel(tpl.niche) || "Engenharia";
    const bucket = byNiche.get(key) || [];
    bucket.push(tpl);
    byNiche.set(key, bucket);
  }
  let synced = 0;
  for (const [key, list] of byNiche) {
    const payload = studioTemplatesToSyncPayload(list, key);
    if (!payload.length) continue;
    const res = await syncRemotionTemplateCatalog({
      niche: key,
      templates: payload,
      replace: true,
    });
    if (res.success) synced += payload.length;
  }
  return synced;
}

function buildLocalCatalogExport(templates: TemplateItem[]) {
  const niches: Record<
    string,
    { templates: ReturnType<typeof studioTemplatesToSyncPayload> }
  > = {};
  const byNiche = new Map<string, TemplateItem[]>();
  for (const tpl of templates) {
    const key = normalizeNicheLabel(tpl.niche) || "Engenharia";
    const bucket = byNiche.get(key) || [];
    bucket.push(tpl);
    byNiche.set(key, bucket);
  }
  for (const [key, list] of byNiche) {
    const payload = studioTemplatesToSyncPayload(list, key);
    if (payload.length) niches[key] = { templates: payload };
  }
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    source: "lumiera-browser",
    niches,
  };
}

function loadStudioCatalog() {
  const deleted = readDeletedCatalog();
  const templates = loadStoredTemplates();
  const categories = filterDeletedCategories(
    syncCategoriesFromTemplates(
      mergeCategoryCatalog(readStoredCategoriesRaw()),
      templates
    ),
    deleted
  );
  return { templates, categories };
}

function uniqueCategoryId(
  label: string,
  categories: TemplateCategoryDefinition[]
) {
  const base = slugifyTemplatePart(label || "categoria");
  let id = base;
  let suffix = 2;
  while (categories.some((item) => item.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function PreviewFill({
  children = null,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>
  );
}

function TemplatePreviewCanvas({
  frame,
  width,
  height,
  fps,
  format,
  variant,
  previewProps = {},
}: {
  frame: number;
  width: number;
  height: number;
  fps: number;
  format: "9:16" | "16:9";
  variant: PreviewVariant;
  previewProps?: TemplatePreviewProps;
}) {
  const loopProgress = interpolate(frame % (fps * 3), [0, fps * 3 - 1], [0, 1]);
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const isVertical = format === "9:16";
  const palette = ["#4f7cff", "#7c2dff", "#22d3ee", "#ff2f8f"];
  const bars = [42, 80, 34, 72, 56, 92];
  const targetValue = Number(previewProps.progress ?? previewProps.value ?? 78);
  const metricLabel = previewProps.label || "Completion Rate";
  const metricSuffix = previewProps.suffix || "%";
  const metricTitle = previewProps.title || "";
  const metricSubtitle = previewProps.subtitle || "";
  const fillProgress = interpolate(frame, [10, fps * 2.6 + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const displayValue = Math.round(targetValue * fillProgress);
  const titleEnter = interpolate(frame, [14, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subtitleEnter = interpolate(frame, [24, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ringCircumference = 402;
  const ringRadius = isVertical ? 60 : 64;
  const ringStroke = isVertical ? 16 : 18;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        backgroundColor: "#0b111b",
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <PreviewFill
        style={{
          opacity: 0.28,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.13) 1px, transparent 1px)",
          backgroundSize: `${Math.round(width / 9)}px ${Math.round(width / 9)}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(34,211,238,.22), transparent 28%), linear-gradient(135deg, rgba(14,165,233,.08), transparent 55%)",
          transform: `translateY(${interpolate(loopProgress, [0, 1], [-height * 0.12, height * 0.12])}px)`,
        }}
      />

      {variant === "pie" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width={isVertical ? 132 : 188}
            height={isVertical ? 132 : 188}
            viewBox="0 0 180 180"
          >
            {[
              { size: 0.34, color: "#22d3ee", offset: 0 },
              { size: 0.22, color: "#4f7cff", offset: 0.34 },
              { size: 0.18, color: "#facc15", offset: 0.56 },
              { size: 0.16, color: "#ff2f8f", offset: 0.74 },
              { size: 0.1, color: "#7c2dff", offset: 0.9 },
            ].map((segment, index) => {
              const circumference = 2 * Math.PI * 58;
              const dash = circumference * segment.size * enter;
              const gap = circumference - dash;
              const rotate = segment.offset * 360 - 90;
              return (
                <circle
                  key={segment.color}
                  cx="90"
                  cy="90"
                  r="58"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isVertical ? 24 : 28}
                  strokeLinecap="butt"
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(${rotate} 90 90)`}
                  opacity={interpolate(
                    frame,
                    [index * 5 + 6, index * 5 + 22],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )}
                />
              );
            })}
            <circle cx="90" cy="90" r="34" fill="#0b111b" />
          </svg>
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              transform: `scale(${enter})`,
            }}
          >
            <div style={{ fontSize: isVertical ? 18 : 28, fontWeight: 900 }}>
              {metricTitle || "PIE"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: isVertical ? 8 : 11 }}>
              {metricLabel}
            </div>
          </div>
        </div>
      )}

      {variant === "donut" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width={isVertical ? 132 : 188}
            height={isVertical ? 132 : 188}
            viewBox="0 0 180 180"
          >
            {[
              { size: 0.34, color: "#22d3ee", offset: 0 },
              { size: 0.22, color: "#4f7cff", offset: 0.34 },
              { size: 0.18, color: "#facc15", offset: 0.56 },
              { size: 0.16, color: "#ff2f8f", offset: 0.74 },
              { size: 0.1, color: "#7c2dff", offset: 0.9 },
            ].map((segment, index) => {
              const circumference = 2 * Math.PI * 58;
              const dash = circumference * segment.size * enter;
              const gap = circumference - dash;
              const rotate = segment.offset * 360 - 90;
              return (
                <circle
                  key={segment.color}
                  cx="90"
                  cy="90"
                  r="58"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isVertical ? 24 : 28}
                  strokeLinecap="butt"
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(${rotate} 90 90)`}
                  opacity={interpolate(
                    frame,
                    [index * 5 + 6, index * 5 + 22],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )}
                />
              );
            })}
            <circle cx="90" cy="90" r="34" fill="#0b111b" />
          </svg>
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              transform: `scale(${enter})`,
            }}
          >
            <div style={{ fontSize: isVertical ? 18 : 28, fontWeight: 900 }}>
              {previewProps.centerValue || displayValue + metricSuffix}
            </div>
            <div style={{ color: "#94a3b8", fontSize: isVertical ? 8 : 11 }}>
              {previewProps.centerLabel || metricLabel}
            </div>
          </div>
        </div>
      )}

      {variant === "ring" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg
            width={isVertical ? 120 : 170}
            height={isVertical ? 120 : 170}
            viewBox="0 0 180 180"
          >
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#1f2a44"
              strokeWidth="18"
            />
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#4f7cff"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="402"
              strokeDashoffset={
                402 - 402 * interpolate(loopProgress, [0, 1], [0.18, 0.78])
              }
              transform="rotate(-90 90 90)"
            />
            <circle
              cx="90"
              cy="90"
              r="64"
              fill="none"
              stroke="#ff2f8f"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="402"
              strokeDashoffset={
                402 - 402 * interpolate(loopProgress, [0, 1], [0.06, 0.22])
              }
              transform="rotate(170 90 90)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              transform: `scale(${enter})`,
            }}
          >
            <div style={{ fontSize: isVertical ? 23 : 38, fontWeight: 900 }}>
              {displayValue}
              {metricSuffix}
            </div>
            <div style={{ color: "#a7b0c2", fontSize: isVertical ? 8 : 13 }}>
              {metricLabel}
            </div>
          </div>
        </div>
      )}

      {variant === "counter" && (
        <>
          {/* Tag de Código do Projeto */}
          <div
            style={{
              position: "absolute",
              top: isVertical ? 24 : 18,
              left: isVertical ? 16 : 28,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              border: "1px solid rgba(34,211,238,0.3)",
              background: "rgba(8,13,24,0.6)",
              fontSize: isVertical ? 8 : 11,
              fontWeight: 800,
              color: "#e2e8f0",
              letterSpacing: 1.5,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                background: "#facc15",
                borderRadius: "50%",
              }}
            />
            <span>{previewProps.projectCode || "ENG-8241"}</span>
          </div>

          {/* Título e Subtítulo */}
          <div
            style={{
              position: "absolute",
              top: isVertical ? 64 : 54,
              left: isVertical ? 16 : 28,
              right: isVertical ? 16 : 28,
              opacity: titleEnter,
            }}
          >
            <div
              style={{
                fontSize: isVertical ? 11 : 16,
                fontWeight: 950,
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                color: "white",
              }}
            >
              {previewProps.title || "MÉTRICA ESTRUTURAL"}
            </div>
            {previewProps.subtitle && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: isVertical ? 8 : 10,
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {previewProps.subtitle}
              </div>
            )}
          </div>

          {/* Painel Central */}
          <div
            style={{
              position: "absolute",
              top: isVertical ? "52%" : "54%",
              left: "50%",
              width: isVertical ? width * 0.88 : width * 0.58,
              height: isVertical ? height * 0.44 : height * 0.54,
              transform: `translate(-50%, -50%) scale(${enter})`,
              background: "rgba(8,13,24,0.55)",
              border: "1px solid rgba(34,211,238,0.18)",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
            }}
          >
            <span
              style={{
                color: "#22d3ee",
                fontSize: isVertical ? 8 : 10,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {previewProps.statusText || "MONITORAMENTO ATIVO"}
            </span>

            {/* Número Animado */}
            <div
              style={{
                fontSize: isVertical ? 28 : 42,
                fontWeight: 950,
                color: "white",
                textShadow: "0 0 16px rgba(34,211,238,0.25)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {previewProps.prefix}
              {displayValue.toLocaleString("pt-BR")}
              <span
                style={{
                  fontSize: isVertical ? 11 : 16,
                  color: "#facc15",
                  marginLeft: 4,
                }}
              >
                {previewProps.unit || previewProps.suffix}
              </span>
            </div>

            {/* Label do Contador */}
            <div
              style={{
                marginTop: 10,
                padding: "4px 10px",
                border: "1px solid rgba(250,204,21,0.25)",
                background: "rgba(250,204,21,0.04)",
                fontSize: isVertical ? 9 : 12,
                fontWeight: 800,
                color: "rgba(255,255,255,0.85)",
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              {previewProps.label}
            </div>

            {/* Variação (Trend) */}
            {(previewProps.trendValue || previewProps.trendLabel) && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  opacity: subtitleEnter,
                }}
              >
                {previewProps.trendValue && (
                  <div
                    style={{
                      padding: "3px 8px",
                      border: "1px solid rgba(34,211,238,0.18)",
                      background: "rgba(2,6,23,0.3)",
                      fontSize: isVertical ? 8 : 11,
                      fontWeight: 900,
                      color: "#facc15",
                    }}
                  >
                    {previewProps.trendValue}
                  </div>
                )}
                {previewProps.trendLabel && (
                  <div
                    style={{
                      padding: "3px 8px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(2,6,23,0.2)",
                      fontSize: isVertical ? 8 : 10,
                      fontWeight: 750,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    {previewProps.trendLabel}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de Progresso e Localização no Rodapé */}
          <div
            style={{
              position: "absolute",
              left: isVertical ? 16 : 28,
              bottom: isVertical ? 28 : 20,
              right: isVertical ? 16 : 28,
              background: "rgba(8,13,24,0.6)",
              padding: "10px 12px",
              borderLeft: "2px solid #facc15",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: isVertical ? 8 : 10,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              <span>{previewProps.location || "CANTEIRO CENTRAL"}</span>
              <span>{previewProps.label}</span>
            </div>
            <div
              style={{
                height: 4,
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fillProgress * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #22d3ee, #facc15)",
                }}
              />
            </div>
          </div>
        </>
      )}

      {variant === "comparison" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: isVertical ? 16 : 24,
          }}
        >
          {previewProps.title && (
            <div
              style={{
                fontSize: isVertical ? 11 : 16,
                fontWeight: 950,
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: isVertical ? 20 : 28,
                textAlign: "center",
              }}
            >
              {previewProps.title}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "stretch",
              width: "100%",
              height: isVertical ? height * 0.44 : height * 0.52,
              position: "relative",
            }}
          >
            {/* Barra da Esquerda: Before */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: isVertical ? 16 : 24,
                  fontWeight: 900,
                  color: "#ef4444",
                  fontFamily: "monospace",
                }}
              >
                {Math.round(toNumber(previewProps.beforeValue, 34) * enter)}%
              </div>
              <div
                style={{
                  width: isVertical ? 38 : 58,
                  height: `${toNumber(previewProps.beforeValue, 34) * enter}%`,
                  backgroundColor: "#ef4444",
                  borderRadius: 4,
                  boxShadow: "0 0 16px rgba(239,68,68,0.35)",
                }}
              />
              <div
                style={{
                  fontSize: isVertical ? 9 : 11,
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                {previewProps.beforeLabel || "Before"}
              </div>
            </div>

            {/* Linha Divisória */}
            <div
              style={{
                width: 1,
                backgroundColor: "rgba(255,255,255,0.12)",
                margin: "0 10px",
              }}
            />

            {/* Barra da Direita: After */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: isVertical ? 16 : 24,
                  fontWeight: 900,
                  color: "#3b82f6",
                  fontFamily: "monospace",
                }}
              >
                {Math.round(toNumber(previewProps.afterValue, 89) * enter)}%
              </div>
              <div
                style={{
                  width: isVertical ? 38 : 58,
                  height: `${toNumber(previewProps.afterValue, 89) * enter}%`,
                  backgroundColor: "#3b82f6",
                  borderRadius: 4,
                  boxShadow: "0 0 16px rgba(59,130,246,0.35)",
                }}
              />
              <div
                style={{
                  fontSize: isVertical ? 9 : 11,
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                {previewProps.afterLabel || "After"}
              </div>
            </div>
          </div>
        </div>
      )}

      {variant === "circular-progress" && (
        <>
          <div
            style={{
              position: "absolute",
              left: isVertical ? 14 : 28,
              right: isVertical ? 14 : 28,
              top: isVertical ? 42 : 36,
              opacity: titleEnter,
              transform: `translateY(${interpolate(titleEnter, [0, 1], [12, 0])}px)`,
            }}
          >
            {metricTitle ? (
              <div
                style={{
                  fontSize: isVertical ? 11 : 16,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#67e8f9",
                }}
              >
                {metricTitle}
              </div>
            ) : null}
            {metricSubtitle ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: isVertical ? 9 : 12,
                  color: "#94a3b8",
                  opacity: subtitleEnter,
                }}
              >
                {metricSubtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: isVertical ? 148 : 220,
                height: isVertical ? 148 : 220,
                borderRadius: 999,
                boxShadow: `0 0 ${interpolate(fillProgress, [0, 1], [8, 34])}px rgba(34,211,238,${interpolate(fillProgress, [0, 1], [0.12, 0.42])})`,
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 180 180"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(15,23,42,.92)"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(34,211,238,.18)"
                  strokeWidth={ringStroke}
                  strokeDasharray={`${ringCircumference * 0.12} ${ringCircumference}`}
                  strokeDashoffset={
                    -ringCircumference *
                    interpolate(fillProgress, [0, 1], [0, 0.88])
                  }
                />
                <circle
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={
                    ringCircumference -
                    ringCircumference * (targetValue / 100) * fillProgress
                  }
                />
                <circle
                  cx="90"
                  cy="90"
                  r={ringRadius}
                  fill="none"
                  stroke="#4f7cff"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`2 ${ringCircumference - 2}`}
                  strokeDashoffset={
                    ringCircumference -
                    ringCircumference * (targetValue / 100) * fillProgress
                  }
                  opacity={0.85}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: isVertical ? 28 : 42,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "#f8fafc",
                  }}
                >
                  {displayValue}
                  <span
                    style={{
                      fontSize: isVertical ? 12 : 18,
                      color: "#67e8f9",
                      marginLeft: 2,
                    }}
                  >
                    {metricSuffix}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: isVertical ? 9 : 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    opacity: subtitleEnter,
                  }}
                >
                  {metricLabel}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: isVertical ? 16 : 28,
              right: isVertical ? 16 : 28,
              bottom: isVertical ? 28 : 24,
              height: 4,
              borderRadius: 999,
              backgroundColor: "rgba(15,23,42,.9)",
              overflow: "hidden",
              opacity: titleEnter,
            }}
          >
            <div
              style={{
                width: `${targetValue * fillProgress}%`,
                height: "100%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(34,211,238,.35), #22d3ee)",
                boxShadow: "0 0 16px rgba(34,211,238,.45)",
              }}
            />
          </div>
        </>
      )}

      {variant === "progress-bars" && (
        <div
          style={{
            position: "absolute",
            left: isVertical ? 16 : 32,
            right: isVertical ? 16 : 32,
            top: isVertical ? "20%" : "15%",
            bottom: isVertical ? "15%" : "12%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: isVertical ? 12 : 20,
          }}
        >
          {previewProps.title && (
            <div
              style={{
                fontSize: isVertical ? 11 : 16,
                fontWeight: 900,
                color: "#67e8f9",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              {previewProps.title}
            </div>
          )}
          {(previewProps.segments || [])
            .slice(0, isVertical ? 4 : 5)
            .map((item, index) => {
              const itemProgress = interpolate(
                frame,
                [index * 6 + 10, index * 6 + 34],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                }
              );
              const currentVal = Math.round(item.value * itemProgress);
              return (
                <div
                  key={index}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      fontSize: isVertical ? 9 : 12,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{ color: "#e2e8f0", textTransform: "uppercase" }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: item.color || "#22d3ee",
                        fontFamily: "monospace",
                      }}
                    >
                      {currentVal}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: isVertical ? 8 : 12,
                      borderRadius: 999,
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${item.value * itemProgress}%`,
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: item.color || "#22d3ee",
                        boxShadow: `0 0 12px ${item.color || "#22d3ee"}aa`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {variant === "bars" && (
        <div
          style={{
            position: "absolute",
            left: width * 0.1,
            right: width * 0.1,
            bottom: height * 0.14,
            height: height * 0.54,
            display: "flex",
            alignItems: "end",
            gap: isVertical ? 5 : 12,
          }}
        >
          {bars.map((bar, index) => {
            const barProgress = interpolate(
              frame,
              [index * 5, index * 5 + 24],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }
            );
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${bar * barProgress}%`,
                  backgroundColor: palette[index % palette.length],
                  borderRadius: "4px 4px 0 0",
                  boxShadow: `0 0 18px ${palette[index % palette.length]}55`,
                }}
              />
            );
          })}
        </div>
      )}

      {variant === "line" && (
        <>
          <div
            style={{
              position: "absolute",
              left: isVertical ? 12 : 24,
              right: isVertical ? 12 : 24,
              top: isVertical ? 18 : 16,
              opacity: titleEnter,
            }}
          >
            <div
              style={{
                fontSize: isVertical ? 10 : 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#67e8f9",
              }}
            >
              {metricTitle || "Line Series"}
            </div>
            {metricSubtitle ? (
              <div
                style={{
                  marginTop: 4,
                  fontSize: isVertical ? 8 : 11,
                  color: "#94a3b8",
                }}
              >
                {metricSubtitle}
              </div>
            ) : null}
          </div>
          <svg
            viewBox="0 0 520 260"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: isVertical ? "24% 8% 16%" : "18% 8% 12%",
              width: "auto",
              height: "auto",
            }}
          >
            {[70, 130, 190].map((y) => (
              <line
                key={y}
                x1="20"
                y1={y}
                x2="500"
                y2={y}
                stroke="rgba(148,163,184,.18)"
                strokeWidth="2"
              />
            ))}
            <path
              d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35"
              fill="none"
              stroke="#22d3ee"
              strokeWidth={isVertical ? 7 : 9}
              strokeLinecap="round"
              strokeDasharray="640"
              strokeDashoffset={640 - 640 * enter}
            />
            <path
              d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35 L490 235 L20 235 Z"
              fill="rgba(34,211,238,.16)"
              opacity={enter}
            />
            {[
              [20, 210],
              [95, 145],
              [160, 165],
              [250, 75],
              [340, 105],
              [490, 35],
            ].map(([cx, cy], index) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={isVertical ? 5 : 6}
                fill="#facc15"
                opacity={interpolate(
                  frame,
                  [index * 4 + 8, index * 4 + 20],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}
              />
            ))}
          </svg>
        </>
      )}

      {variant === "area" && (
        <>
          <div
            style={{
              position: "absolute",
              left: isVertical ? 12 : 24,
              right: isVertical ? 12 : 24,
              top: isVertical ? 18 : 16,
              opacity: titleEnter,
            }}
          >
            <div
              style={{
                fontSize: isVertical ? 10 : 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#67e8f9",
              }}
            >
              {metricTitle || "Area Series"}
            </div>
            {metricSubtitle ? (
              <div
                style={{
                  marginTop: 4,
                  fontSize: isVertical ? 8 : 11,
                  color: "#94a3b8",
                }}
              >
                {metricSubtitle}
              </div>
            ) : null}
          </div>
          <svg
            viewBox="0 0 520 260"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: isVertical ? "24% 8% 16%" : "18% 8% 12%",
              width: "auto",
              height: "auto",
            }}
          >
            {[70, 130, 190].map((y) => (
              <line
                key={y}
                x1="20"
                y1={y}
                x2="500"
                y2={y}
                stroke="rgba(148,163,184,.18)"
                strokeWidth="2"
              />
            ))}
            <path
              d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35 L490 235 L20 235 Z"
              fill="rgba(34,211,238,.34)"
              opacity={enter}
            />
            <path
              d="M20 210 L95 145 L160 165 L250 75 L340 105 L490 35"
              fill="none"
              stroke="#22d3ee"
              strokeWidth={isVertical ? 5 : 7}
              strokeLinecap="round"
              strokeDasharray="640"
              strokeDashoffset={640 - 640 * enter}
            />
          </svg>
        </>
      )}

      {variant === "map" && (
        <div
          style={{
            position: "absolute",
            inset: isVertical ? "18% 12% 16%" : "14% 10%",
            border: "2px solid rgba(34,211,238,.68)",
            borderRadius: 10,
            backgroundColor: "rgba(8,47,73,.44)",
            transform: `scale(${interpolate(loopProgress, [0, 1], [1, 1.18])}) translate(${interpolate(loopProgress, [0, 1], [0, -width * 0.018])}px, ${interpolate(loopProgress, [0, 1], [0, height * 0.018])}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "48%",
              top: "45%",
              width: isVertical ? 14 : 20,
              height: isVertical ? 14 : 20,
              borderRadius: 999,
              backgroundColor: "#67e8f9",
              boxShadow: "0 0 28px #22d3ee",
              transform: `scale(${interpolate(loopProgress, [0, 0.5, 1], [0.78, 1.35, 0.78])})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 14,
              height: 4,
              backgroundColor: "#fbbf24",
              borderRadius: 999,
            }}
          />
        </div>
      )}

      {variant === "title" && (
        <div
          style={{
            position: "absolute",
            left: width * 0.12,
            right: width * 0.12,
            top: "50%",
            borderLeft: "4px solid #67e8f9",
            paddingLeft: isVertical ? 12 : 22,
            translate: `${interpolate(enter, [0, 1], [-40, 0])}px -50%`,
            opacity: enter,
          }}
        >
          <div
            style={{
              height: isVertical ? 12 : 20,
              width: "76%",
              borderRadius: 999,
              backgroundColor: "white",
            }}
          />
          <div
            style={{
              marginTop: 12,
              height: isVertical ? 8 : 14,
              width: "48%",
              borderRadius: 999,
              backgroundColor: "#22d3ee",
            }}
          />
        </div>
      )}

      {(variant === "cinematic" || variant === "media") && (
        <div
          style={{
            position: "absolute",
            inset: isVertical ? "18% 11%" : "14% 11%",
            borderRadius: 10,
            border: "1px solid rgba(251,191,36,.45)",
            background:
              "linear-gradient(135deg, rgba(113,113,122,.9), rgba(9,9,11,.95) 48%, rgba(8,47,73,.86))",
            transform: `scale(${interpolate(loopProgress, [0, 1], [1.02, 1.14])}) translateX(${interpolate(loopProgress, [0, 1], [0, -width * 0.018])}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "10%",
              bottom: "12%",
              width: "42%",
              height: "28%",
              border: "1px solid rgba(255,255,255,.35)",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "12%",
              top: "12%",
              width: isVertical ? 32 : 52,
              height: isVertical ? 32 : 52,
              borderRadius: 999,
              backgroundColor: "rgba(251,191,36,.7)",
              filter: "blur(8px)",
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,.68)",
          padding: "4px 7px",
          fontSize: isVertical ? 10 : 13,
          fontWeight: 800,
        }}
      >
        {format === "9:16" ? "Shorts" : "Longos"}
      </div>
    </div>
  );
}

function useTemplatePreviewTimeline({
  fps,
  durationInFrames,
  autoPlay,
  loop,
}: {
  fps: number;
  durationInFrames: number;
  autoPlay: boolean;
  loop: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    setPlaying(autoPlay);
    if (autoPlay) setFrame(0);
  }, [autoPlay, durationInFrames]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
      accRef.current = 0;
      return;
    }

    const tick = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      accRef.current += ts - lastRef.current;
      lastRef.current = ts;
      const frameMs = 1000 / fps;

      if (accRef.current >= frameMs) {
        accRef.current %= frameMs;
        setFrame((prev) => {
          const next = prev + 1;
          if (next >= durationInFrames) {
            return loop ? 0 : durationInFrames - 1;
          }
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, fps, durationInFrames, loop]);

  const playFromStart = useCallback(() => {
    setFrame(0);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    setPlaying((current) => {
      if (current) return false;
      setFrame(0);
      return true;
    });
  }, []);

  const pause = useCallback(() => setPlaying(false), []);

  return { frame, playing, playFromStart, toggle, pause, setFrame };
}

function TemplatePreviewSlot({
  template,
  format,
  size = "card",
  autoPlay = false,
}: {
  template: TemplateItem;
  format: "9:16" | "16:9";
  size?: "card" | "detail";
  autoPlay?: boolean;
}) {
  const source =
    format === "9:16" ? template.sourceCode.short : template.sourceCode.long;

  if (size === "card") {
    return (
      <LazySavedTemplatePreviewFrame
        sourceCode={source}
        format={format}
        size="card"
        autoPlay={autoPlay}
      />
    );
  }

  return (
    <SavedTemplatePreviewFrame
      sourceCode={source}
      format={format}
      size={size}
      autoPlay={autoPlay}
      fallback={null}
    />
  );
}

function PreviewFrame({
  format,
  variant,
  previewProps,
  size = "card",
  autoPlay = false,
}: {
  format: "9:16" | "16:9";
  variant: PreviewVariant;
  previewProps?: TemplatePreviewProps;
  size?: "card" | "detail";
  autoPlay?: boolean;
}) {
  const vertical = format === "9:16";
  const dimensions =
    size === "detail"
      ? vertical
        ? { width: 270, height: 480, className: "w-[154px] sm:w-[190px]" }
        : {
            width: 640,
            height: 360,
            className: "w-[280px] sm:w-[430px] lg:w-[520px]",
          }
      : vertical
        ? { width: 162, height: 288, className: "w-[92px]" }
        : { width: 304, height: 171, className: "w-[190px]" };
  const fps = 30;
  const durationInFrames = PREVIEW_DURATION_BY_VARIANT[variant] || 90;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { frame, playing, playFromStart, toggle, pause, setFrame } =
    useTemplatePreviewTimeline({
      fps,
      durationInFrames,
      autoPlay,
      loop: true,
    });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const next = el.clientWidth / dimensions.width;
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dimensions.width]);

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden rounded-[6px] border border-white/10 bg-[#0b111b] shadow-lg shadow-black/30 ${dimensions.className}`}
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
    >
      <div
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <TemplatePreviewCanvas
          frame={frame}
          width={dimensions.width}
          height={dimensions.height}
          fps={fps}
          format={format}
          variant={variant}
          previewProps={previewProps}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
        <button
          type="button"
          onClick={toggle}
          className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg transition ${
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
          aria-label={playing ? "Pausar preview" : "Reproduzir preview"}
        >
          {playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-[1px]" />
          )}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-6">
        <button
          type="button"
          onClick={playing ? pause : playFromStart}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/15 bg-black/55 text-white hover:border-cyan-300/50"
          aria-label={playing ? "Pausar" : "Play do inicio"}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-[1px]" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, durationInFrames - 1)}
          value={frame}
          onChange={(event) => {
            pause();
            setFrame(Number(event.target.value));
          }}
          className="h-1.5 w-full cursor-pointer accent-cyan-300"
        />
        <span className="shrink-0 font-mono text-[10px] font-bold text-zinc-300">
          {(frame / fps).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}

function TemplateDetailPanel({
  template,
  activeTab,
  activeFormat,
  copied,
  onTabChange,
  onFormatChange,
  onCopy,
  onBack,
  onApprove,
  onChangePreview,
}: {
  template: TemplateItem;
  activeTab: DetailTab;
  activeFormat: DetailFormat;
  copied: boolean;
  onTabChange: (tab: DetailTab) => void;
  onFormatChange: (format: DetailFormat) => void;
  onCopy: () => void;
  onBack: () => void;
  onApprove?: () => void;
  onChangePreview?: (variant: PreviewVariant) => void;
}) {
  const activeSource = template.sourceCode[activeFormat];
  const activeAspectRatio = activeFormat === "short" ? "9:16" : "16:9";

  return (
    <section className="bg-[#0e1522]">
      <div className="border-b border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-300 hover:border-cyan-300/50 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Templates
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-white">{template.name}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-300">
              {template.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {onChangePreview && (
              <div className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2 py-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Preview:
                </span>
                <select
                  value={template.shortPreview}
                  onChange={(e) =>
                    onChangePreview(e.target.value as PreviewVariant)
                  }
                  className="rounded bg-black/40 px-2 py-1 text-xs font-bold text-zinc-200 outline-none hover:text-white"
                >
                  <option value="line">Gráfico de Linha</option>
                  <option value="bars">Gráfico de Barras</option>
                  <option value="area">Gráfico de Área</option>
                  <option value="pie">Gráfico de Pizza</option>
                  <option value="donut">Gráfico de Rosca</option>
                  <option value="circular-progress">Progresso Circular</option>
                  <option value="progress-bars">Barras de Progresso</option>
                  <option value="counter">Contador Estatístico</option>
                  <option value="ring">KPI / Anel</option>
                  <option value="map">Mapa Satélite</option>
                  <option value="title">Título Slide</option>
                  <option value="media">Imagem / Vídeo</option>
                </select>
              </div>
            )}

            {template.status === "draft" && onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-black text-slate-950 transition shadow-lg shadow-emerald-500/10"
              >
                <BadgeCheck className="h-4 w-4" />
                Aprovar template
              </button>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase ${
                template.status === "approved"
                  ? "bg-emerald-400/12 text-emerald-300"
                  : "bg-amber-300/12 text-amber-200"
              }`}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {template.status === "approved" ? "Aprovado" : "Rascunho"}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 border-white/10 bg-[#111827]">
          <div className="flex">
            <button
              type="button"
              onClick={() => onTabChange("preview")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "preview"
                  ? "border-blue-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => onTabChange("source")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
                activeTab === "source"
                  ? "border-blue-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Code2 className="h-4 w-4" />
              Source Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => onFormatChange("short")}
                className={`rounded px-2.5 py-1 text-xs font-black ${
                  activeFormat === "short"
                    ? "bg-cyan-300 text-slate-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                9:16 Shorts
              </button>
              <button
                type="button"
                onClick={() => onFormatChange("long")}
                className={`rounded px-2.5 py-1 text-xs font-black ${
                  activeFormat === "long"
                    ? "bg-cyan-300 text-slate-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                16:9 Longos
              </button>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="mr-2 inline-flex items-center gap-2 rounded-md bg-black/30 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-black/50 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="min-h-[430px] overflow-hidden rounded-b-lg border border-white/10 bg-[#162030]">
          {activeTab === "preview" ? (
            <div className="grid min-h-[430px] place-items-center px-4 py-5">
              <div className="flex flex-wrap items-center justify-center gap-8">
                <div className="space-y-2">
                  <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    {activeFormat === "short" ? "Shorts 9:16" : "Longos 16:9"}
                  </p>
                  <TemplatePreviewSlot
                    template={template}
                    format={activeAspectRatio}
                    size="detail"
                    autoPlay
                  />
                  <p className="text-center text-[10px] font-bold text-zinc-500">
                    Preview 100% fiel ao TSX salvo (Remotion Player).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <pre className="min-h-[430px] overflow-auto p-5 text-left font-mono text-xs leading-relaxed text-cyan-50">
              <code>{activeSource}</code>
            </pre>
          )}
        </div>
      </div>
      <div className="grid gap-4 border-t border-white/10 p-4 lg:grid-cols-[1fr_280px]">
        <section>
          <h4 className="text-sm font-black text-white">Description</h4>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Template Remotion com preview animado frame-a-frame, props
            declaradas e codigo separado para Shorts 9:16 e Longos 16:9.
          </p>
        </section>
        <section>
          <h4 className="text-sm font-black text-white">Data slots</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {template.dataSlots.map((slot) => (
              <span
                key={slot}
                className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-zinc-300"
              >
                {slot}
              </span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export function RemotionTemplateStudio({
  projectNiche,
}: {
  activeProject: string;
  projectNiche: string;
}) {
  const normalizedProjectNiche = normalizeNicheLabel(projectNiche);
  const initialNiche = normalizedProjectNiche || "Engenharia";
  const studioCatalog = useMemo(() => loadStudioCatalog(), []);
  const [niche, setNiche] = useState(initialNiche);
  const [niches, setNiches] = useState<string[]>(() =>
    mergeNicheLists(DEFAULT_TEMPLATE_NICHES, readStoredNichesRaw(), [
      initialNiche,
    ])
  );
  const [categories, setCategories] = useState<TemplateCategoryDefinition[]>(
    studioCatalog.categories
  );
  const [category, setCategory] = useState<TemplateCategory>("maps");
  const [subcategory, setSubcategory] = useState("PIP mapa");
  const [selectedId, setSelectedId] = useState("");
  const [detailTemplateId, setDetailTemplateId] = useState("");
  const [templates, setTemplates] = useState<TemplateItem[]>(
    studioCatalog.templates
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("preview");
  const [detailFormat, setDetailFormat] = useState<DetailFormat>("short");
  const [copiedTemplateId, setCopiedTemplateId] = useState("");
  const [finalCodeDraft, setFinalCodeDraft] = useState("");
  const [studioError, setStudioError] = useState("");
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogSyncNote, setCatalogSyncNote] = useState("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipCatalogSyncAfterHydrateRef = useRef(false);
  const nicheTemplateCountsRef = useRef<Record<string, number>>({});
  const currentCategory = categories.find((c) => c.id === category);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const nichesRes = await fetchCatalogNiches();
      const nicheList = mergeNicheLists(
        DEFAULT_TEMPLATE_NICHES,
        readStoredNichesRaw(),
        nichesRes.niches?.map((row) => row.niche) || [],
        [niche, initialNiche]
      ).filter((item) => !isInternalTestCatalogNiche(item));

      const allFromApi: CatalogTemplate[] = [];
      for (const item of nicheList) {
        const res = await fetchRemotionTemplateCatalog(item);
        if (res.success && res.templates.length) {
          allFromApi.push(...res.templates);
        }
      }
      if (!alive) return;

      const deleted = readDeletedCatalog();
      const serverFirst = purgeLegacyTemplatesFromList(
        mergeStudioTemplateLists([], allFromApi)
      );
      const merged = filterDeletedTemplates(
        allFromApi.length > 0
          ? serverFirst
          : purgeLegacyTemplatesFromList(
              mergeStudioTemplateLists(studioCatalog.templates, allFromApi)
            ),
        deleted
      );
      setTemplates(merged);
      const counts: Record<string, number> = {};
      for (const tpl of merged) {
        const key = (
          normalizeNicheLabel(tpl.niche) || "Engenharia"
        ).toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
      nicheTemplateCountsRef.current = counts;
      if (allFromApi.length > 0) {
        skipCatalogSyncAfterHydrateRef.current = true;
      }
      const mergedForNiche = merged.filter((tpl) =>
        matchesStudioNiche(tpl.niche, niche)
      );
      const firstWithTemplates = syncCategoriesFromTemplates(
        mergeCategoryCatalog(readStoredCategoriesRaw()),
        mergedForNiche
      ).find((cat) => mergedForNiche.some((tpl) => tpl.category === cat.id));
      if (alive) {
        setCategories(
          syncCategoriesFromTemplates(
            mergeCategoryCatalog(readStoredCategoriesRaw()),
            mergedForNiche
          )
        );
        if (firstWithTemplates) {
          setCategory(firstWithTemplates.id);
          setSubcategory("");
        }
      }
      if (alive && allFromApi.length > 0) {
        setCatalogSyncNote(
          `${allFromApi.length} template${allFromApi.length === 1 ? "" : "s"} carregado${allFromApi.length === 1 ? "" : "s"} do servidor.`
        );
      }
      if (!alive) return;
      setCatalogReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!catalogReady) return;
    if (skipCatalogSyncAfterHydrateRef.current) {
      skipCatalogSyncAfterHydrateRef.current = false;
      return;
    }
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const byNiche = new Map<string, TemplateItem[]>();
      // Inicializa nichos conhecidos com array vazio para garantir sincronização de deleção
      for (const key of Object.keys(nicheTemplateCountsRef.current)) {
        byNiche.set(key, []);
      }
      for (const tpl of templates) {
        const key = (
          normalizeNicheLabel(tpl.niche) || "Engenharia"
        ).toLowerCase();
        const bucket = byNiche.get(key) || [];
        bucket.push(tpl);
        byNiche.set(key, bucket);
      }
      void (async () => {
        let synced = 0;
        const newCounts: Record<string, number> = {};
        for (const [key, list] of byNiche) {
          const prevCount =
            nicheTemplateCountsRef.current[key.toLowerCase()] || 0;
          if (list.length === 0 && prevCount === 0) continue;

          const payload = studioTemplatesToSyncPayload(list, key);
          const res = await syncRemotionTemplateCatalog({
            niche: key,
            templates: payload,
            replace: true,
          });
          if (res.success) {
            synced += 1;
            newCounts[key.toLowerCase()] = list.length;
          } else {
            newCounts[key.toLowerCase()] = prevCount;
          }
        }
        nicheTemplateCountsRef.current = {
          ...nicheTemplateCountsRef.current,
          ...newCounts,
        };
        if (synced > 0) {
          setCatalogSyncNote(
            "Catálogo sincronizado com o servidor com sucesso."
          );
        }
      })();
    }, 600);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [templates, catalogReady]);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalogNiches().then((response) => {
      if (cancelled) return;
      const fromApi =
        response.niches
          ?.map((row) => row.niche)
          .filter((item) => !isInternalTestCatalogNiche(item)) || [];
      setNiches((current) => {
        const merged = mergeNicheLists(
          DEFAULT_TEMPLATE_NICHES,
          readStoredNichesRaw(),
          fromApi,
          current,
          [niche]
        );
        writeStoredNiches(
          merged.filter((item) => !DEFAULT_TEMPLATE_NICHES.includes(item))
        );
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    writeStoredNiches(
      niches.filter((item) => !DEFAULT_TEMPLATE_NICHES.includes(item))
    );
  }, [niches]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TEMPLATE_STORAGE_KEY,
        JSON.stringify(templates)
      );
    } catch {
      // Mantem a tela funcional mesmo quando storage estiver indisponivel.
    }
  }, [templates]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CATEGORY_STORAGE_KEY,
        JSON.stringify(categories)
      );
    } catch {
      // Mantem a tela funcional mesmo quando storage estiver indisponivel.
    }
  }, [categories]);

  useEffect(() => {
    setCategories((current) => {
      const synced = syncCategoriesFromTemplates(current, templates);
      const changed =
        synced.length !== current.length ||
        synced.some((cat) => {
          const prev = current.find((item) => item.id === cat.id);
          if (!prev) return true;
          return cat.subcategories.some(
            (sub) => !subcategoryExists(prev.subcategories, sub)
          );
        });
      return changed ? synced : current;
    });
  }, [templates]);

  const subcategories = currentCategory?.subcategories || [];
  const sanitizedFinalCodeDraft = useMemo(
    () =>
      repairCommonTemplateLayoutVars(extractTemplateTsxFromLlm(finalCodeDraft)),
    [finalCodeDraft]
  );
  const finalValidation = useMemo(
    () => validateFinalTemplateCode(sanitizedFinalCodeDraft),
    [sanitizedFinalCodeDraft]
  );
  const canSaveDraft =
    finalValidation.ok && Boolean(sanitizedFinalCodeDraft.trim());
  const nicheTemplates = useMemo(
    () => templates.filter((t) => matchesStudioNiche(t.niche, niche)),
    [niche, templates]
  );
  const categoryTemplates = useMemo(
    () => nicheTemplates.filter((t) => t.category === category),
    [category, nicheTemplates]
  );
  const categoriesWithTemplates = useMemo(
    () =>
      categories
        .map((item) => ({
          ...item,
          count: nicheTemplates.filter((tpl) => tpl.category === item.id)
            .length,
        }))
        .filter((item) => item.count > 0),
    [categories, nicheTemplates]
  );
  const showingCategoryFallback = useMemo(() => {
    if (!subcategory || !categoryTemplates.length) return false;
    return !categoryTemplates.some((t) => t.subcategory === subcategory);
  }, [categoryTemplates, subcategory]);
  const visibleTemplates = useMemo(() => {
    if (!subcategory) return categoryTemplates;
    const matched = categoryTemplates.filter(
      (t) => t.subcategory === subcategory
    );
    return matched.length ? matched : categoryTemplates;
  }, [categoryTemplates, subcategory]);
  const detailTemplate = visibleTemplates.find(
    (t) => t.id === detailTemplateId
  );
  const selected =
    visibleTemplates.find((t) => t.id === selectedId) ||
    visibleTemplates[0] ||
    null;

  useEffect(() => {
    setDetailTemplateId("");
    setDetailTab("preview");
    setDetailFormat("short");
    setSelectedId(visibleTemplates[0]?.id || "");
  }, [category, niche, subcategory]);

  const lastNicheRef = useRef(niche);
  const initialAutoSelectDoneRef = useRef(false);

  useEffect(() => {
    if (!catalogReady) return;
    const nicheChanged = lastNicheRef.current !== niche;
    if (nicheChanged) {
      lastNicheRef.current = niche;
    }
    if (nicheChanged || !initialAutoSelectDoneRef.current) {
      initialAutoSelectDoneRef.current = true;
      const first = categoriesWithTemplates[0];
      if (first) {
        setCategory(first.id);
        setSubcategory(first.subcategories[0] || "");
      }
    }
  }, [niche, catalogReady, categoriesWithTemplates]);

  async function exportTemplateBackup() {
    const local = buildLocalCatalogExport(templates);
    const server = await exportRemotionTemplateCatalog();
    const mergedNiches = { ...local.niches };
    if (server.success && server.niches) {
      for (const [key, entry] of Object.entries(server.niches)) {
        const existing = mergedNiches[key]?.templates || [];
        const byId = new Map(existing.map((tpl) => [tpl.id, tpl]));
        for (const tpl of entry.templates || []) {
          byId.set(String(tpl.id || ""), tpl);
        }
        mergedNiches[key] = { templates: [...byId.values()] };
      }
    }
    const blob = new Blob(
      [JSON.stringify({ ...local, niches: mergedNiches }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lumiera-templates-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setCatalogSyncNote("Backup JSON baixado.");
  }

  const [gitPushing, setGitPushing] = useState(false);

  async function pushTemplatesToGit() {
    setGitPushing(true);
    setCatalogSyncNote("Salvando no GitHub...");
    try {
      const res = await fetch("/api/ai/template-studio/catalog/git-push", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        window.alert(
          data.message || "Catálogo enviado para o GitHub com sucesso!"
        );
        setCatalogSyncNote("Sincronizado com o GitHub.");
      } else {
        window.alert(`Falha ao enviar: ${data.error || "Erro desconhecido"}`);
        setCatalogSyncNote("Erro ao sincronizar com Git.");
      }
    } catch (err) {
      window.alert(
        `Erro de rede ao salvar no GitHub: ${err instanceof Error ? err.message : String(err)}`
      );
      setCatalogSyncNote("Erro de conexão com Git.");
    } finally {
      setGitPushing(false);
    }
  }

  async function importTemplateBackup(file: File) {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as {
        niches?: Record<string, { templates: CatalogTemplate[] }>;
      };
      if (!parsed?.niches || typeof parsed.niches !== "object") {
        setStudioError("Arquivo invalido: falta a secao niches.");
        return;
      }
      const imported = await importRemotionTemplateCatalog({
        version: 1,
        niches: parsed.niches,
      });
      if (!imported.success) {
        setStudioError(imported.error || "Falha ao importar backup.");
        return;
      }
      const allFromApi: CatalogTemplate[] = [];
      for (const key of Object.keys(parsed.niches)) {
        const res = await fetchRemotionTemplateCatalog(key);
        if (res.success) allFromApi.push(...res.templates);
      }
      setTemplates((current) => {
        const deleted = readDeletedCatalog();
        return filterDeletedTemplates(
          purgeLegacyTemplatesFromList(
            mergeStudioTemplateLists(current, allFromApi)
          ),
          deleted
        );
      });
      setNiches((current) =>
        mergeNicheLists(current, Object.keys(parsed.niches || {}))
      );
      setStudioError("");
      setCatalogSyncNote(
        `${imported.imported || 0} template${imported.imported === 1 ? "" : "s"} restaurado${imported.imported === 1 ? "" : "s"} do backup.`
      );
    } catch (err) {
      setStudioError(
        err instanceof Error ? err.message : "Nao foi possivel ler o backup."
      );
    }
  }

  function deleteTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const shouldDelete = window.confirm(
      `Excluir o template "${template.name}"?`
    );
    if (!shouldDelete) return;
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      templates: addUnique(deleted.templates, templateId),
    }));
    setTemplates((current) => current.filter((item) => item.id !== templateId));
    if (detailTemplateId === templateId) {
      setDetailTemplateId("");
    }
    if (selectedId === templateId) {
      const nextTemplate = visibleTemplates.find(
        (item) => item.id !== templateId
      );
      setSelectedId(nextTemplate?.id || "");
    }
  }

  async function addNicheCatalog() {
    const label = window.prompt("Nome do novo catálogo (nicho)");
    const cleanLabel = normalizeNicheLabel(label || "");
    if (!cleanLabel) return;

    const exists = niches.some(
      (item) => item.toLowerCase() === cleanLabel.toLowerCase()
    );
    if (exists) {
      if (
        !window.confirm(
          `O catalogo "${cleanLabel}" ja existe. Abrir esse nicho mesmo assim?`
        )
      ) {
        return;
      }
      setNiche(cleanLabel);
      setDetailTemplateId("");
      setSelectedId("");
      return;
    }

    const created = await createCatalogNiche(cleanLabel);
    if (!created.success) {
      setStudioError(created.error || "Nao foi possivel criar o catalogo.");
      return;
    }

    setStudioError("");
    setNiches((current) => mergeNicheLists(current, [cleanLabel]));
    setNiche(cleanLabel);
    setCategory(categories[0]?.id || "maps");
    setSubcategory(categories[0]?.subcategories[0] || "Geral");
    setDetailTemplateId("");
    setSelectedId("");
  }

  async function removeNicheCatalog(nicheName: string) {
    if (!window.confirm(`Deseja mesmo excluir o nicho "${nicheName}"?`)) {
      return;
    }
    const res = await deleteCatalogNiche(nicheName);
    if (!res.success) {
      setStudioError(res.error || "Não foi possível excluir o catálogo.");
      return;
    }
    setStudioError("");

    // 1. Marcar todos os templates deste nicho como excluídos no deletedCatalog
    const templatesInNiche = templates.filter(
      (t) => t.niche.toLowerCase() === nicheName.toLowerCase()
    );
    const templateIdsToDelete = templatesInNiche.map((t) => t.id);
    if (templateIdsToDelete.length > 0) {
      mutateDeletedCatalog((deleted) => ({
        ...deleted,
        templates: [...new Set([...deleted.templates, ...templateIdsToDelete])],
      }));
    }

    // 2. Remover do estado de templates
    setTemplates((current) =>
      current.filter((t) => t.niche.toLowerCase() !== nicheName.toLowerCase())
    );

    // 3. Remover do estado de nichos
    setNiches((current) =>
      current.filter((n) => n.toLowerCase() !== nicheName.toLowerCase())
    );

    if (niche.toLowerCase() === nicheName.toLowerCase()) {
      const remaining = niches.filter(
        (n) => n.toLowerCase() !== nicheName.toLowerCase()
      );
      const nextNiche = remaining[0] || "Engenharia";
      setNiche(nextNiche);
    }
    setDetailTemplateId("");
    setSelectedId("");
  }

  function addCategory() {
    const label = window.prompt("Nome da nova categoria");
    const cleanLabel = String(label || "").trim();
    if (!cleanLabel) return;
    const firstSubcategory =
      window.prompt("Primeira subcategoria dessa categoria", "Geral") ||
      "Geral";
    const cleanSubcategory = String(firstSubcategory).trim() || "Geral";
    const id = uniqueCategoryId(cleanLabel, categories);
    const categoryDefinition: TemplateCategoryDefinition = {
      id,
      label: cleanLabel,
      subcategories: [cleanSubcategory],
    };
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      categories: removeValue(deleted.categories, id),
      subcategories: removeValue(
        deleted.subcategories,
        deletedSubcategoryKey(id, cleanSubcategory)
      ),
    }));
    setCategories((current) => [...current, categoryDefinition]);
    setCategory(id);
    setSubcategory(cleanSubcategory);
    setDetailTemplateId("");
  }

  function addSubcategory() {
    if (!currentCategory) return;
    const label = window.prompt(
      `Nova subcategoria em "${currentCategory.label}"`
    );
    const cleanLabel = String(label || "").trim();
    if (!cleanLabel) return;
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      subcategories: removeValue(
        deleted.subcategories,
        deletedSubcategoryKey(currentCategory.id, cleanLabel)
      ),
    }));
    setCategories((current) =>
      ensureSubcategoryRegistered(current, currentCategory.id, cleanLabel)
    );
    setSubcategory(cleanLabel);
    setDetailTemplateId("");
  }

  function deleteCategory(categoryId: string) {
    const target = categories.find((item) => item.id === categoryId);
    if (!target) return;
    const shouldDelete = window.confirm(
      `Excluir a categoria "${target.label}" e todos os templates dela?`
    );
    if (!shouldDelete) return;
    const nextCategories = categories.filter((item) => item.id !== categoryId);
    const categorySubcategoryKeys = target.subcategories.map((item) =>
      deletedSubcategoryKey(categoryId, item)
    );
    const categoryTemplateIds = templates
      .filter((template) => template.category === categoryId)
      .map((template) => template.id);
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      categories: addUnique(deleted.categories, categoryId),
      subcategories: [
        ...new Set([...deleted.subcategories, ...categorySubcategoryKeys]),
      ],
      templates: [...new Set([...deleted.templates, ...categoryTemplateIds])],
    }));
    setCategories(nextCategories);
    setTemplates((current) =>
      current.filter((template) => template.category !== categoryId)
    );
    if (category === categoryId) {
      const nextCategory = nextCategories[0];
      setCategory(nextCategory?.id || "");
      setSubcategory(nextCategory?.subcategories[0] || "");
      setSelectedId("");
      setDetailTemplateId("");
    }
  }

  function deleteSubcategory(subcategoryName: string) {
    if (!currentCategory) return;
    const shouldDelete = window.confirm(
      `Excluir a subcategoria "${subcategoryName}" e todos os templates dela?`
    );
    if (!shouldDelete) return;
    const remainingSubcategories = currentCategory.subcategories.filter(
      (item) => item !== subcategoryName
    );
    const subcategoryTemplateIds = templates
      .filter(
        (template) =>
          template.category === currentCategory.id &&
          template.subcategory === subcategoryName
      )
      .map((template) => template.id);
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      subcategories: addUnique(
        deleted.subcategories,
        deletedSubcategoryKey(currentCategory.id, subcategoryName)
      ),
      templates: [
        ...new Set([...deleted.templates, ...subcategoryTemplateIds]),
      ],
    }));
    setCategories((current) =>
      current.map((item) =>
        item.id === currentCategory.id
          ? { ...item, subcategories: remainingSubcategories }
          : item
      )
    );
    setTemplates((current) =>
      current.filter(
        (template) =>
          !(
            template.category === currentCategory.id &&
            template.subcategory === subcategoryName
          )
      )
    );
    if (subcategory === subcategoryName) {
      setSubcategory(remainingSubcategories[0] || "");
      setSelectedId("");
      setDetailTemplateId("");
    }
  }

  function deleteAllSubcategories() {
    if (!currentCategory) return;
    if (currentCategory.subcategories.length === 0) {
      window.alert("Não há subcategorias para excluir nesta categoria.");
      return;
    }
    const shouldDelete = window.confirm(
      `Excluir TODAS as ${currentCategory.subcategories.length} subcategorias de "${currentCategory.label}" e todos os seus templates?`
    );
    if (!shouldDelete) return;

    const subcategoryKeys = currentCategory.subcategories.map((sub) =>
      deletedSubcategoryKey(currentCategory.id, sub)
    );

    const subcategoryTemplateIds = templates
      .filter(
        (template) =>
          template.category === currentCategory.id &&
          currentCategory.subcategories.includes(template.subcategory)
      )
      .map((template) => template.id);

    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      subcategories: [
        ...new Set([...deleted.subcategories, ...subcategoryKeys]),
      ],
      templates: [
        ...new Set([...deleted.templates, ...subcategoryTemplateIds]),
      ],
    }));

    setCategories((current) =>
      current.map((item) =>
        item.id === currentCategory.id ? { ...item, subcategories: [] } : item
      )
    );

    setTemplates((current) =>
      current.filter(
        (template) =>
          !(
            template.category === currentCategory.id &&
            currentCategory.subcategories.includes(template.subcategory)
          )
      )
    );

    setSubcategory("");
    setSelectedId("");
    setDetailTemplateId("");
  }

  async function copyTemplateSource(template?: TemplateItem) {
    if (!template) return;
    try {
      await navigator.clipboard.writeText(template.sourceCode[detailFormat]);
      setCopiedTemplateId(`${template.id}:${detailFormat}`);
      window.setTimeout(() => setCopiedTemplateId(""), 1600);
    } catch {
      window.alert("Nao foi possivel copiar o codigo automaticamente.");
    }
  }

  function approveTemplate(templateId: string) {
    setTemplates((current) =>
      current.map((item) =>
        item.id === templateId ? { ...item, status: "approved" as const } : item
      )
    );
  }

  function changeTemplatePreviewVariant(
    templateId: string,
    variant: PreviewVariant
  ) {
    setTemplates((current) =>
      current.map((item) =>
        item.id === templateId
          ? { ...item, shortPreview: variant, longPreview: variant }
          : item
      )
    );
  }

  function saveAssistedDraft() {
    if (!canSaveDraft) {
      setStudioError(
        finalValidation.errors[0] ||
          "Cole o codigo TSX completo e valido antes de salvar o draft."
      );
      return;
    }
    const categoryLabel = currentCategory?.label || category;
    mutateDeletedCatalog((deleted) => ({
      ...deleted,
      categories: removeValue(deleted.categories, category),
      subcategories: removeValue(
        deleted.subcategories,
        deletedSubcategoryKey(category, subcategory)
      ),
    }));
    setCategories((current) =>
      ensureSubcategoryRegistered(current, category, subcategory)
    );
    const cleanCode = sanitizedFinalCodeDraft.trim();
    const dataSlots = extractDataSlotsFromCode(cleanCode);
    const id = `draft-${slugifyTemplatePart(niche)}-${slugifyTemplatePart(
      categoryLabel
    )}-${slugifyTemplatePart(subcategory)}-${Date.now()}`;
    const template = normalizeTemplatePreviewVariants({
      id,
      name: `${niche} ${subcategory} Draft`,
      category,
      subcategory,
      niche,
      status: "draft",
      description: `Template importado para ${categoryLabel} / ${subcategory}.`,
      dataSlots: dataSlots.length
        ? dataSlots
        : ["title", "subtitle", "progress", "label"],
      sourceCode: {
        short: buildFormatSource({
          code: cleanCode,
          niche,
          categoryLabel,
          subcategory,
          format: "short",
        }),
        long: buildFormatSource({
          code: cleanCode,
          niche,
          categoryLabel,
          subcategory,
          format: "long",
        }),
      },
      shortPreview: "media" as TemplateItem["shortPreview"],
      longPreview: "media" as TemplateItem["longPreview"],
    });

    setTemplates((current) => [template, ...current]);
    setFinalCodeDraft(cleanCode);
    setSelectedId(id);
    setDetailTemplateId(id);
    setDetailTab("preview");
    setDetailFormat("short");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[260px_1fr_360px]">
        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 rounded-xl border border-white/8 bg-[#080c13] p-3">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/8 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
              <Layers3 className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Nicho
              </p>
              <p className="truncate text-xs font-bold text-white">
                Catálogo global
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => void exportTemplateBackup()}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
                title="Baixar backup JSON dos templates"
              >
                <Download className="h-3 w-3" />
                Backup
              </button>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200">
                <Upload className="h-3 w-3" />
                Restaurar
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importTemplateBackup(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={gitPushing}
              onClick={() => void pushTemplatesToGit()}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[10px] font-semibold transition-colors ${
                gitPushing
                  ? "cursor-not-allowed border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/8 text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-500/15"
              }`}
              title="Enviar catálogo de templates para o GitHub"
            >
              <Upload className="h-3 w-3" />
              {gitPushing ? "Enviando…" : "Salvar no GitHub"}
            </button>
            <button
              type="button"
              onClick={() => void addNicheCatalog()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/8 py-1.5 text-[10px] font-semibold text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/15"
              title="Criar novo catálogo de nicho"
            >
              <Plus className="h-3 w-3" />
              Novo catálogo
            </button>
          </div>

          {/* Niche grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {niches
              .filter((item) => !isInternalTestCatalogNiche(item))
              .map((item) => {
                const isActive = niche === item;
                return (
                  <div
                    key={item}
                    role="button"
                    tabIndex={0}
                    onClick={() => setNiche(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setNiche(item);
                      }
                    }}
                    className={`group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border py-2 pl-2.5 pr-1.5 text-left text-[11px] font-semibold transition-all ${
                      isActive
                        ? "border-cyan-400/60 bg-cyan-400/12 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.08)]"
                        : "border-white/8 bg-white/[0.025] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-1.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-cyan-400" />
                    )}
                    <span
                      className={`min-w-0 flex-1 truncate ${isActive ? "ml-3" : ""}`}
                    >
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeNicheCatalog(item);
                      }}
                      className="shrink-0 rounded-md p-0.5 text-red-500/50 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      title={`Excluir nicho "${item}"`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-1">
            {/* Section header */}
            <div className="flex items-center justify-between pb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Categorias
              </p>
              <button
                type="button"
                onClick={addCategory}
                className="flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/8 px-2 py-0.5 text-[9px] font-bold text-cyan-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
              >
                <Plus className="h-2.5 w-2.5" />
                Nova
              </button>
            </div>

            {/* Category list */}
            {categories.map((item) => {
              const count = templates.filter(
                (tpl) =>
                  matchesStudioNiche(tpl.niche, niche) &&
                  tpl.category === item.id
              ).length;
              const isActive = category === item.id;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setCategory(item.id);
                    setSubcategory("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCategory(item.id);
                      setSubcategory("");
                    }
                  }}
                  className={`group relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg border py-2 pl-3 pr-2 text-left transition-all ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/10 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
                      : "border-transparent bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:bg-white/[0.05] hover:text-zinc-300"
                  }`}
                >
                  {/* Active accent bar */}
                  <span
                    className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-blue-400 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  {/* Label */}
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight">
                    {item.label}
                  </span>

                  {/* Count badge */}
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums transition-colors ${
                      isActive
                        ? "bg-blue-500/25 text-blue-200"
                        : "bg-white/[0.06] text-zinc-600"
                    }`}
                  >
                    {count}
                  </span>

                  {/* Delete button — visible on hover */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCategory(item.id);
                    }}
                    className="shrink-0 rounded-md p-0.5 text-red-500/50 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    title={`Excluir categoria "${item.label}"`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="overflow-hidden rounded-xl border border-white/8 bg-[#0d1220]">
          {/* Main header */}
          <div className="border-b border-white/8 bg-[#0a0f1a] px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Breadcrumb + title */}
              <div>
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
                  <Film className="h-2.5 w-2.5" />
                  Showcase
                </p>
                <h2 className="mt-0.5 text-base font-black tracking-tight text-white">
                  {niche}
                  <span className="mx-1.5 text-zinc-600">/</span>
                  <span className="text-cyan-300">
                    {currentCategory?.label}
                  </span>
                </h2>
                {catalogSyncNote ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-400/80">
                    <Check className="h-2.5 w-2.5" />
                    {catalogSyncNote}
                  </p>
                ) : null}
              </div>

              {/* Subcategory pills + actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* All pill */}
                <button
                  type="button"
                  onClick={() => setSubcategory("")}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[10px] font-bold transition-all ${
                    !subcategory
                      ? "border-amber-400/50 bg-amber-400/12 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.08)]"
                      : "border-white/8 bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                  }`}
                >
                  Todos
                  <span
                    className={`rounded-full px-1 py-0.5 text-[8px] font-black tabular-nums ${
                      !subcategory
                        ? "bg-amber-400/25 text-amber-300"
                        : "bg-white/8 text-zinc-600"
                    }`}
                  >
                    {categoryTemplates.length}
                  </span>
                </button>

                {/* Subcategory pills */}
                {subcategories.map((item) => (
                  <span
                    key={item}
                    className={`group inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[10px] font-bold transition-all ${
                      subcategory === item
                        ? "border-amber-400/50 bg-amber-400/12 text-amber-200"
                        : "border-white/8 bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-300"
                    }`}
                  >
                    <button type="button" onClick={() => setSubcategory(item)}>
                      {item}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSubcategory(item)}
                      className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-red-400/60 hover:text-red-300"
                      title="Excluir subcategoria"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}

                {/* Add subcategory */}
                <button
                  type="button"
                  onClick={addSubcategory}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/6 px-3 text-[10px] font-bold text-cyan-400/80 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Sub
                </button>

                {/* Delete all subcategories */}
                {subcategories.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteAllSubcategories}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-red-400/15 bg-red-400/6 px-3 text-[10px] font-bold text-red-400/70 transition-colors hover:border-red-400/35 hover:text-red-300"
                    title="Excluir todas as subcategorias"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    Limpar
                  </button>
                )}

                {/* Restore deleted */}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Deseja restaurar todas as categorias, subcategorias e templates excluídos localmente?"
                      )
                    ) {
                      window.localStorage.removeItem(
                        "lumiera.remotionTemplateStudio.deletedCatalog.v1"
                      );
                      window.location.reload();
                    }
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-white/8 bg-white/[0.025] px-3 text-[10px] font-bold text-zinc-500 transition-colors hover:border-white/18 hover:text-zinc-300"
                  title="Restaurar todos os itens da lixeira"
                >
                  Restaurar excluídos
                </button>
              </div>
            </div>
          </div>

          {detailTemplate ? (
            <TemplateDetailPanel
              template={detailTemplate}
              activeTab={detailTab}
              activeFormat={detailFormat}
              copied={
                copiedTemplateId === `${detailTemplate.id}:${detailFormat}`
              }
              onTabChange={setDetailTab}
              onFormatChange={setDetailFormat}
              onCopy={() => copyTemplateSource(detailTemplate)}
              onBack={() => setDetailTemplateId("")}
              onApprove={() => approveTemplate(detailTemplate.id)}
              onChangePreview={(variant) =>
                changeTemplatePreviewVariant(detailTemplate.id, variant)
              }
            />
          ) : (
            <div className="p-4 space-y-3">
              {showingCategoryFallback ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/6 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <p className="text-[10px] text-amber-200/80">
                    Nenhum template em &quot;{subcategory}&quot;. Mostrando os{" "}
                    {categoryTemplates.length} da categoria{" "}
                    {currentCategory?.label}.
                  </p>
                </div>
              ) : null}
              <div className="grid gap-3 2xl:grid-cols-2">
                {visibleTemplates.map((template) => (
                  <article
                    key={template.id}
                    onClick={() => {
                      setSelectedId(template.id);
                      setDetailTemplateId(template.id);
                      setDetailTab("preview");
                      setDetailFormat("short");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(template.id);
                        setDetailTemplateId(template.id);
                        setDetailTab("preview");
                        setDetailFormat("short");
                      }
                    }}
                    tabIndex={0}
                    className={`group cursor-pointer overflow-hidden rounded-xl border text-left transition-all ${
                      selected?.id === template.id
                        ? "border-cyan-400/60 bg-[#0e1b2a] shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                        : "border-white/8 bg-[#0c1118] hover:border-white/18 hover:bg-[#0f1521]"
                    }`}
                  >
                    {/* Preview thumbnails */}
                    <div className="flex gap-2 border-b border-white/6 bg-black/30 p-2.5">
                      <TemplatePreviewSlot
                        template={template}
                        format="9:16"
                        size="card"
                        autoPlay
                      />
                      <TemplatePreviewSlot
                        template={template}
                        format="16:9"
                        size="card"
                        autoPlay
                      />
                    </div>

                    {/* Card body */}
                    <div className="p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <h3 className="truncate text-[13px] font-bold text-white">
                          {template.name}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                              template.status === "approved"
                                ? "bg-emerald-400/12 text-emerald-300"
                                : "bg-amber-300/12 text-amber-300"
                            }`}
                          >
                            <BadgeCheck className="h-2.5 w-2.5" />
                            {template.status === "approved"
                              ? "Aprovado"
                              : "Draft"}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                            className="grid h-6 w-6 place-items-center rounded-md border border-transparent text-zinc-600 opacity-0 transition-all group-hover:border-red-400/20 group-hover:bg-red-500/10 group-hover:text-red-300 group-hover:opacity-100"
                            title="Excluir template"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                        {template.description}
                      </p>
                      {template.dataSlots.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {template.dataSlots.map((slot) => (
                            <span
                              key={slot}
                              className="rounded-md border border-white/6 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}

                {/* Empty state */}
                {!visibleTemplates.length && (
                  <div className="col-span-2 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/8 p-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
                      <Layers3 className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-400">
                        Nenhum template aqui ainda
                      </p>
                      {nicheTemplates.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] text-zinc-600">
                            Você tem {nicheTemplates.length} template
                            {nicheTemplates.length === 1 ? "" : "s"} no nicho{" "}
                            {niche}, mas nenhum em &quot;
                            {currentCategory?.label}&quot;.
                          </p>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {categoriesWithTemplates.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setCategory(item.id);
                                  setSubcategory("");
                                }}
                                className="rounded-full border border-cyan-400/20 bg-cyan-400/6 px-3 py-1 text-[10px] font-semibold text-cyan-400/80 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
                              >
                                {item.label} ({item.count})
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-[11px] text-zinc-600">
                          <p>Templates ficam no servidor e neste navegador.</p>
                          <p>
                            Se criou templates no dev server, abra{" "}
                            <a
                              href="http://127.0.0.1:5176/"
                              className="text-cyan-400 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              127.0.0.1:5176
                            </a>{" "}
                            e aguarde a sincronização.
                          </p>
                          <p>Ou crie um draft pelo painel da direita →</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <aside className="flex flex-col gap-3">
          {/* ── Implementar template ─────────────────────────────── */}
          <section className="overflow-hidden rounded-xl border border-white/8 bg-[#080c13]">
            <div className="flex items-center gap-2 border-b border-white/8 bg-[#0a0f1a] px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10">
                <PencilRuler className="h-3 w-3 text-amber-400" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                Implementar template
              </h3>
            </div>

            <div className="p-3">
              <p className="mb-2.5 text-[10px] leading-relaxed text-zinc-600">
                Cole o código Remotion TSX completo gerado externamente.
                Briefing e geração ficam no seu fluxo.
              </p>

              <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Código final gerado
              </label>
              <textarea
                value={finalCodeDraft}
                onChange={(e) => {
                  setFinalCodeDraft(e.target.value);
                  setStudioError("");
                }}
                className="min-h-[360px] w-full resize-y rounded-lg border border-cyan-400/15 bg-[#040a10] p-3 font-mono text-[10px] leading-relaxed text-cyan-100/90 outline-none transition-colors focus:border-cyan-400/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.04)]"
                placeholder={
                  'Cole o TSX completo: imports, Props, export default, exampleProps e animação.\n\nEx.: "use client" + remotion + componente final pronto para render.'
                }
                spellCheck={false}
              />

              {/* Validation feedback */}
              {studioError ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-500/8 px-3 py-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  <p className="text-[10px] text-red-300">{studioError}</p>
                </div>
              ) : null}
              {!canSaveDraft && finalCodeDraft.trim() ? (
                <ul className="mt-2 space-y-1 rounded-lg border border-amber-400/20 bg-amber-500/6 px-3 py-2">
                  {finalValidation.errors.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-[10px] text-amber-200/80"
                    >
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canSaveDraft ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/6 px-3 py-2">
                  <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                  <p className="text-[10px] text-emerald-300">
                    Código válido — pronto para salvar como draft.
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => saveAssistedDraft()}
                disabled={!canSaveDraft}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-2.5 text-[11px] font-black text-slate-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:bg-cyan-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Salvar draft
              </button>
            </div>
          </section>

          {/* ── Contrato do template ──────────────────────────────── */}
          <section className="overflow-hidden rounded-xl border border-white/8 bg-[#080c13]">
            <div className="flex items-center gap-2 border-b border-white/8 bg-[#0a0f1a] px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-400/10">
                <Braces className="h-3 w-3 text-cyan-400" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">
                Contrato do template
              </h3>
            </div>

            <div className="p-3">
              {selected ? (
                <>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold text-white">
                      {selected.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(selected.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-400/20 bg-red-500/8 px-2 py-1 text-[9px] font-bold text-red-300/80 transition-colors hover:border-red-400/40 hover:text-red-200"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      Excluir
                    </button>
                  </div>
                  <p className="mb-2.5 text-[10px] leading-relaxed text-zinc-600">
                    Todo template aprovado precisa ter preview 9:16 e 16:9,
                    props declaradas e safe zones de legenda.
                  </p>
                  <div className="space-y-1">
                    {selected.dataSlots.map((slot) => (
                      <div
                        key={slot}
                        className="flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.025] px-2.5 py-1.5"
                      >
                        <span className="font-mono text-[10px] text-zinc-300">
                          {slot}
                        </span>
                        <Copy className="h-3 w-3 text-zinc-600" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-2 text-center text-[11px] text-zinc-600">
                  Nenhum template selecionado.
                </p>
              )}
            </div>
          </section>

          {/* ── Regra de orquestração ─────────────────────────────── */}
          <section className="overflow-hidden rounded-xl border border-red-500/15 bg-red-950/8">
            <div className="flex items-center gap-2 border-b border-red-500/10 bg-red-950/15 px-4 py-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/10">
                <Film className="h-2.5 w-2.5 text-red-400" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-red-200/80">
                Regra de orquestração
              </h3>
            </div>
            <p className="px-4 py-3 text-[10px] leading-relaxed text-red-200/50">
              Shorts usam no máximo 1 template Remotion. Longos usam até 8.
              Texto solto sem template aprovado não entra automaticamente.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
