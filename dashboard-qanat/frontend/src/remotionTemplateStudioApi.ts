import {
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

export { validateFinalTemplateCode, validateOriginalTemplateCode };

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
