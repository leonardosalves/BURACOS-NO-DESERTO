import { adaptRemotionTemplate } from "./remotionTemplateStudioService.js";
import {
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "../shared/remotionTemplateStudioValidate.js";

export function registerRemotionTemplateStudioRoutes(
  app,
  { getProjectDir, callGemini }
) {
  app.post("/api/ai/template-studio/validate-original", (req, res) => {
    const { originalCode } = req.body || {};
    const result = validateOriginalTemplateCode(originalCode);
    res.json(result);
  });

  app.post("/api/ai/template-studio/validate-final", (req, res) => {
    const { code } = req.body || {};
    const result = validateFinalTemplateCode(code);
    res.json(result);
  });

  app.post("/api/ai/template-studio/adapt", async (req, res) => {
    try {
      const projDir = getProjectDir(req);
      const result = await adaptRemotionTemplate(req.body || {}, {
        callGemini,
        projDir,
      });
      if (!result.ok) {
        return res.status(422).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err?.message || "Erro ao adaptar template.",
      });
    }
  });
}
