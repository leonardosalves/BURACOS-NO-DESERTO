import { adaptRemotionTemplate } from "./remotionTemplateStudioService.js";
import {
  createCatalogNiche,
  getCatalogForNiche,
  listCatalogNiches,
  exportFullTemplateCatalog,
  importFullTemplateCatalog,
  pruneCatalogEntriesWithoutSource,
  purgeLegacySeedTemplatesFromCatalogFile,
  purgeTestNichesFromCatalogFile,
  syncCatalogForNiche,
} from "./remotionTemplateCatalogService.js";
import {
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "../shared/remotionTemplateStudioValidate.js";
import { buildEngenhariaSeedTemplates } from "../shared/remotionTemplateEngenhariaSeed.js";

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

  purgeLegacySeedTemplatesFromCatalogFile();
  purgeTestNichesFromCatalogFile();
  pruneCatalogEntriesWithoutSource();

  const engSnapshot = getCatalogForNiche("Engenharia");
  if (engSnapshot.templates.length < 10) {
    const { templates } = buildEngenhariaSeedTemplates("Engenharia");
    syncCatalogForNiche("Engenharia", templates);
  }

  app.get("/api/ai/template-studio/catalog/niches", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const niches = listCatalogNiches();
      res.json({ success: true, niches });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err?.message || "Falha ao listar nichos.",
      });
    }
  });

  app.post("/api/ai/template-studio/catalog/niche", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const niche = String(req.body?.niche || "").trim();
      const result = createCatalogNiche(niche);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err?.message || "Falha ao criar catálogo.",
      });
    }
  });

  app.get("/api/ai/template-studio/catalog", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const niche = String(req.query?.niche || "Engenharia").trim();
    const catalog = getCatalogForNiche(niche);
    res.json({ success: true, ...catalog });
  });

  app.get("/api/ai/template-studio/catalog/export", (_req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const payload = exportFullTemplateCatalog();
      res.json({ success: true, ...payload });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err?.message || "Falha ao exportar catalogo.",
      });
    }
  });

  app.post("/api/ai/template-studio/catalog/import", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const result = importFullTemplateCatalog(req.body || {});
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err?.message || "Falha ao importar catalogo.",
      });
    }
  });

  app.post("/api/ai/template-studio/catalog/sync", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const niche = String(req.body?.niche || "Engenharia").trim();
      const templates = Array.isArray(req.body?.templates)
        ? req.body.templates
        : [];
      const replace = Boolean(req.body?.replace);
      const result = syncCatalogForNiche(niche, templates, { replace });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err?.message || "Falha ao sincronizar catálogo.",
      });
    }
  });
}
