import { adaptRemotionTemplate } from "./remotionTemplateStudioService.js";
import {
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "../shared/remotionTemplateStudioValidate.js";

function normalizeAdaptBody(body = {}) {
  return {
    niche: String(body.niche || "Engenharia").trim(),
    templateType: String(body.templateType || "").trim(),
    category: String(body.category || "").trim(),
    subcategory: String(body.subcategory || "").trim(),
    briefing: String(body.briefing || "").trim(),
    propsDraft: String(body.propsInput || body.propsDraft || "").trim(),
    originalCode: String(body.originalCode || "").trim(),
  };
}

function sendAdaptSuccess(res, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    success: true,
    code: payload.code,
    source: payload.source,
    attempts: payload.attempts,
  });
}

function sendAdaptError(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json({
    success: false,
    error:
      payload.error ||
      payload.errors?.[0] ||
      "Nao foi possivel gerar o template final.",
    errors: payload.errors,
    stage: payload.stage,
  });
}

async function handleAdapt(req, res, deps) {
  try {
    const projDir = deps.getProjectDir(req);
    const normalized = normalizeAdaptBody(req.body);
    const result = await adaptRemotionTemplate(normalized, {
      callGemini: deps.callGemini,
      projDir,
    });

    if (!result.ok || !result.code) {
      return sendAdaptError(res, 422, result);
    }

    return sendAdaptSuccess(res, result);
  } catch (err) {
    return sendAdaptError(res, 500, {
      error: err?.message || "Erro ao adaptar template.",
      stage: "server",
    });
  }
}

export function registerRemotionTemplateStudioRoutes(
  app,
  { getProjectDir, callGemini }
) {
  const deps = { getProjectDir, callGemini };

  app.post("/api/ai/template-studio/validate-original", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const { originalCode } = req.body || {};
    res.json(validateOriginalTemplateCode(originalCode));
  });

  app.post("/api/ai/template-studio/validate-final", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const { code } = req.body || {};
    res.json(validateFinalTemplateCode(code));
  });

  app.post("/api/ai/template-studio/adapt", (req, res) =>
    handleAdapt(req, res, deps)
  );

  // Alias legível — mesma implementação
  app.post("/api/ai/assistir-ia", (req, res) => handleAdapt(req, res, deps));
}
