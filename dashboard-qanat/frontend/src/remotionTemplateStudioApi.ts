import {
  extractTemplateTsxFromLlm,
  repairCommonTemplateLayoutVars,
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "@lumiera/shared/remotionTemplateStudioValidate.js";

export type TemplateAdaptRequest = {
  niche: string;
  templateType: string;
  propsInput: string;
  briefing: string;
  originalCode: string;
  category?: string;
  subcategory?: string;
};

export type TemplateAdaptResponse = {
  success: boolean;
  code?: string;
  source?: string;
  attempts?: number;
  error?: string;
  errors?: string[];
  stage?: string;
};

export {
  extractTemplateTsxFromLlm,
  repairCommonTemplateLayoutVars,
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
};

const ADAPT_ENDPOINT = "/api/ai/template-studio/adapt";

type ParsedResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

export async function readApiJsonResponse<T>(
  res: Response
): Promise<ParsedResponse<T>> {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 160);
    const hint = snippet.startsWith("<!DOCTYPE")
      ? "O servidor retornou HTML (rota ausente, backend offline ou proxy incorreto)."
      : "Resposta não é JSON.";
    return {
      data: null,
      error: `${hint} HTTP ${res.status}. Endpoint: ${ADAPT_ENDPOINT}. ${snippet}`,
      status: res.status,
    };
  }

  try {
    return {
      data: JSON.parse(raw) as T,
      error: null,
      status: res.status,
    };
  } catch {
    return {
      data: null,
      error: "JSON inválido na resposta do servidor.",
      status: res.status,
    };
  }
}

export type CatalogTemplate = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  niche: string;
  status: "approved" | "draft";
  description: string;
  dataSlots: string[];
  motion_template_id: string | null;
  orchestration_ready: boolean;
  shortPreview?: string | null;
  longPreview?: string | null;
};

export type CatalogResponse = {
  success: boolean;
  niche: string;
  templates: CatalogTemplate[];
  approved: CatalogTemplate[];
  orchestration_ready: CatalogTemplate[];
  updated_at: string | null;
  error?: string;
};

export type CatalogSyncRequest = {
  niche: string;
  templates: Array<{
    id: string;
    name: string;
    category?: string;
    subcategory?: string;
    niche?: string;
    status?: "approved" | "draft";
    description?: string;
    dataSlots?: string[];
    shortPreview?: string | null;
    longPreview?: string | null;
  }>;
};

const CATALOG_ENDPOINT = "/api/ai/template-studio/catalog";
const CATALOG_SYNC_ENDPOINT = "/api/ai/template-studio/catalog/sync";

export async function fetchRemotionTemplateCatalog(
  niche: string
): Promise<CatalogResponse> {
  try {
    const res = await fetch(
      `${CATALOG_ENDPOINT}?niche=${encodeURIComponent(niche || "Engenharia")}`
    );
    const parsed = await readApiJsonResponse<CatalogResponse>(res);
    if (parsed.error || !parsed.data) {
      return {
        success: false,
        niche,
        templates: [],
        approved: [],
        orchestration_ready: [],
        updated_at: null,
        error: parsed.error || "Catálogo indisponível.",
      };
    }
    return parsed.data;
  } catch (err) {
    return {
      success: false,
      niche,
      templates: [],
      approved: [],
      orchestration_ready: [],
      updated_at: null,
      error:
        err instanceof Error
          ? err.message
          : "Falha de rede ao buscar catálogo.",
    };
  }
}

export async function syncRemotionTemplateCatalog(
  payload: CatalogSyncRequest
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch(CATALOG_SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const parsed = await readApiJsonResponse<{
      success: boolean;
      count?: number;
      error?: string;
    }>(res);
    if (parsed.error || !parsed.data) {
      return { success: false, error: parsed.error || "Sync falhou." };
    }
    return parsed.data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Falha de rede no sync.",
    };
  }
}

export async function adaptRemotionTemplate(
  payload: TemplateAdaptRequest
): Promise<TemplateAdaptResponse> {
  let res: Response;
  try {
    res = await fetch(ADAPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `Falha de rede ao chamar ${ADAPT_ENDPOINT}: ${err.message}`
          : "Falha de rede ao chamar Assistir IA.",
    };
  }

  const parsed = await readApiJsonResponse<TemplateAdaptResponse>(res);

  if (parsed.error || !parsed.data) {
    return {
      success: false,
      error: parsed.error || "Resposta vazia do servidor.",
    };
  }

  if (!parsed.data.success) {
    return {
      success: false,
      error:
        parsed.data.error ||
        parsed.data.errors?.[0] ||
        `Assistir IA falhou (HTTP ${parsed.status}).`,
      errors: parsed.data.errors,
      stage: parsed.data.stage,
    };
  }

  if (!parsed.data.code?.trim()) {
    return {
      success: false,
      error: "Servidor retornou success sem código TSX.",
    };
  }

  return parsed.data;
}
