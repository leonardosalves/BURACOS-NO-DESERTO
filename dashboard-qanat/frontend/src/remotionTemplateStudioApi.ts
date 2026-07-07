import {
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "@lumiera/shared/remotionTemplateStudioValidate.js";

export type TemplateAdaptRequest = {
  niche: string;
  templateType: string;
  category: string;
  subcategory: string;
  briefing: string;
  propsDraft: string;
  originalCode: string;
};

export type TemplateAdaptResponse = {
  ok: boolean;
  code?: string;
  source?: string;
  error?: string;
  errors?: string[];
  stage?: string;
};

export { validateFinalTemplateCode, validateOriginalTemplateCode };

export async function adaptRemotionTemplate(
  payload: TemplateAdaptRequest
): Promise<TemplateAdaptResponse> {
  const res = await fetch("/api/ai/template-studio/adapt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as TemplateAdaptResponse;
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || "Falha ao adaptar template.",
      errors: data.errors,
      stage: data.stage,
    };
  }
  return data;
}
