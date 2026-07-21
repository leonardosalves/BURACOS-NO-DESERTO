/**
 * motionRoutes.js — API do Motion Director (video-shotcraft).
 */
import {
  buildMotionPlan,
  validateMotionPlan,
  detectarSceneFunctions,
  extrairDados,
  applyMotionPlanToStoryboard,
} from "./motionDirector.js";
import {
  SHOTCRAFT_CATALOG,
  CATALOG_STATS,
  findCard,
  cardsByCategory,
} from "./shotcraftCatalog.js";
import {
  resolveNicheMotionPrefs,
  listNichePresets,
} from "./nicheMotionPreferences.js";
import { MAPPED_CARDS, getPropsSchema } from "./shotcraftPropsMap.js";

export function registerMotionRoutes(app, { asyncHandler, fs, path, getProjectDir, readProjectJson } = {}) {
  const wrap =
    asyncHandler ||
    ((fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next));

  app.post(
    "/api/motion/plan",
    wrap(async (req, res) => {
      try {
        let { storyboard, niche, format, project, apply } = req.body || {};
        if (!storyboard && project && getProjectDir) {
          const projDir = getProjectDir(req);
          const sbPath = path.join(projDir, "storyboard.json");
          if (fs.existsSync(sbPath)) {
            storyboard = JSON.parse(fs.readFileSync(sbPath, "utf8"));
          }
          if (!niche) {
            const config = readProjectJson
              ? readProjectJson(projDir, "config_qanat.json", {})
              : {};
            niche = config.niche || "";
          }
          if (!format) {
            const config = readProjectJson
              ? readProjectJson(projDir, "config_qanat.json", {})
              : {};
            format =
              config.video_format === "SHORTS" || config.video_format === "SHORT"
                ? "9:16"
                : "16:9";
          }
        }
        if (!storyboard) {
          return res.status(400).json({ error: "storyboard obrigatório." });
        }
        const plan = buildMotionPlan({
          storyboard,
          niche: niche || "",
          format: format || "16:9",
        });
        const validation = validateMotionPlan(plan);
        let applied = null;
        if (apply && project && getProjectDir && fs) {
          applied = applyMotionPlanToStoryboard(storyboard, plan);
          const projDir = getProjectDir(req);
          const sbPath = path.join(projDir, "storyboard.json");
          fs.writeFileSync(sbPath, JSON.stringify(applied, null, 2), "utf8");
        }
        res.json({
          ok: true,
          plan,
          validation,
          applied: Boolean(applied),
          storyboard: applied || undefined,
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    })
  );

  app.get("/api/motion/catalog", (_req, res) => {
    res.json({
      ok: true,
      stats: CATALOG_STATS,
      mappedCards: MAPPED_CARDS,
      templates: SHOTCRAFT_CATALOG,
    });
  });

  app.get("/api/motion/catalog/:category", (req, res) => {
    res.json({
      ok: true,
      templates: cardsByCategory(req.params.category),
    });
  });

  app.get("/api/motion/card/:templateId", (req, res) => {
    const card = findCard(req.params.templateId);
    if (!card) return res.status(404).json({ error: "card não encontrado" });
    res.json({
      ok: true,
      card,
      propsSchema: getPropsSchema(req.params.templateId),
    });
  });

  app.post("/api/motion/detect", (req, res) => {
    const { narration } = req.body || {};
    res.json({
      ok: true,
      functions: detectarSceneFunctions(narration || ""),
      dados: extrairDados(narration || ""),
    });
  });

  app.get("/api/motion/niches", (_req, res) => {
    res.json({ ok: true, niches: listNichePresets() });
  });

  app.get("/api/motion/niche/:niche", (req, res) => {
    res.json({
      ok: true,
      prefs: resolveNicheMotionPrefs(req.params.niche),
    });
  });
}
