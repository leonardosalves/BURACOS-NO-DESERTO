/**
 * motionRoutes.js
 * Router dedicado para toda a API de motion design (video-shotcraft).
 * Registro: registerMotionRoutes(app, deps)  OR  app.use("/api/motion", router)
 */

import { Router } from "express";
import {
  buildMotionPlan,
  validateMotionPlan,
  applyMotionOverrides,
  detectarSceneFunctions,
  extrairDados,
  applyMotionPlanToStoryboard,
  ensureShotcraftOnStoryboard,
} from "./motionDirector.js";
import {
  SHOTCRAFT_CATALOG,
  CATALOG_STATS,
  findCard,
  cardsByCategory,
  cardsByFunction,
  searchCardsByTags,
} from "./shotcraftCatalog.js";
import {
  getPropsSchema,
  TOTAL_MAPPED_CARDS,
  MAPPED_CARDS,
} from "./shotcraftPropsMap.js";
import {
  resolveNicheMotionPrefs,
  listNichePresets,
} from "./nicheMotionPreferences.js";
import {
  tagStoryboardWithMotion,
  tagSceneWithMotion,
  calcularPotencialMotion,
} from "./creatorSceneTagger.js";

function createMotionRouter(deps = {}) {
  const router = Router();
  const { fs, path, getProjectDir, readProjectJson } = deps;

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      catalog_total: SHOTCRAFT_CATALOG.length,
      props_mapped: TOTAL_MAPPED_CARDS,
      mapped_cards: MAPPED_CARDS,
      categories: CATALOG_STATS.categories,
      niches: listNichePresets(),
    });
  });

  router.post("/plan", (req, res) => {
    try {
      let { storyboard, niche, format, project, apply } = req.body || {};
      if (!storyboard && project && getProjectDir && fs && path) {
        const projDir = getProjectDir(req);
        const sbPath = path.join(projDir, "storyboard.json");
        if (fs.existsSync(sbPath)) {
          storyboard = JSON.parse(fs.readFileSync(sbPath, "utf8"));
        }
        if (!niche && readProjectJson) {
          const config = readProjectJson(projDir, "config_qanat.json", {});
          niche = config.niche || "";
        }
        if (!format && readProjectJson) {
          const config = readProjectJson(projDir, "config_qanat.json", {});
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
      if (apply && project && getProjectDir && fs && path) {
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
  });

  router.post("/plan/override", (req, res) => {
    try {
      const { plan, overrides, project, apply } = req.body || {};
      if (!plan) return res.status(400).json({ error: "plan obrigatório." });
      const merged = applyMotionOverrides(plan, overrides || {});
      let storyboard = null;
      if (apply && project && getProjectDir && fs && path) {
        const projDir = getProjectDir(req);
        const sbPath = path.join(projDir, "storyboard.json");
        if (fs.existsSync(sbPath)) {
          const sb = JSON.parse(fs.readFileSync(sbPath, "utf8"));
          storyboard = applyMotionPlanToStoryboard(sb, merged);
          fs.writeFileSync(
            sbPath,
            JSON.stringify(storyboard, null, 2),
            "utf8"
          );
        }
      }
      res.json({
        ok: true,
        plan: merged,
        validation: validateMotionPlan(merged),
        storyboard,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/plan/preview", (req, res) => {
    try {
      const { storyboard, niche, format, overrides } = req.body || {};
      if (!storyboard) {
        return res.status(400).json({ error: "storyboard obrigatório." });
      }
      let plan = buildMotionPlan({
        storyboard,
        niche: niche || "",
        format: format || "16:9",
      });
      if (overrides) plan = applyMotionOverrides(plan, overrides);
      res.json({ ok: true, plan, validation: validateMotionPlan(plan) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/catalog", (_req, res) => {
    res.json({
      ok: true,
      stats: CATALOG_STATS,
      total_mapped: TOTAL_MAPPED_CARDS,
      mappedCards: MAPPED_CARDS,
      templates: SHOTCRAFT_CATALOG,
    });
  });

  router.get("/catalog/category/:category", (req, res) => {
    res.json({ ok: true, templates: cardsByCategory(req.params.category) });
  });

  // compat legado: /api/motion/catalog/:category
  router.get("/catalog/:category", (req, res, next) => {
    if (req.params.category === "category") return next();
    // se for templateId conhecido, devolve card; senão category
    const card = findCard(req.params.category);
    if (card) {
      return res.json({
        ok: true,
        card,
        propsSchema: getPropsSchema(req.params.category),
      });
    }
    res.json({ ok: true, templates: cardsByCategory(req.params.category) });
  });

  router.get("/catalog/function/:func", (req, res) => {
    res.json({ ok: true, templates: cardsByFunction(req.params.func) });
  });

  router.post("/catalog/search", (req, res) => {
    const { text, format, limit } = req.body || {};
    res.json({
      ok: true,
      results: searchCardsByTags(text || "", {
        format: format || "16:9",
        limit: limit || 5,
      }),
    });
  });

  router.get("/card/:templateId", (req, res) => {
    const card = findCard(req.params.templateId);
    if (!card) return res.status(404).json({ error: "card não encontrado" });
    res.json({
      ok: true,
      card,
      propsSchema: getPropsSchema(req.params.templateId),
    });
  });

  router.get("/props-schema/:templateId", (req, res) => {
    res.json({ ok: true, schema: getPropsSchema(req.params.templateId) });
  });

  router.post("/detect", (req, res) => {
    const { narration } = req.body || {};
    res.json({
      ok: true,
      functions: detectarSceneFunctions(narration || ""),
      dados: extrairDados(narration || ""),
    });
  });

  router.post("/tag-storyboard", (req, res) => {
    const { storyboard, format, niche } = req.body || {};
    if (!storyboard) {
      return res.status(400).json({ error: "storyboard obrigatório." });
    }
    res.json({
      ok: true,
      storyboard: tagStoryboardWithMotion(storyboard, { format, niche }),
    });
  });

  router.post("/tag-scene", (req, res) => {
    const { scene, format, niche } = req.body || {};
    if (!scene) return res.status(400).json({ error: "scene obrigatório." });
    res.json({
      ok: true,
      scene: tagSceneWithMotion(scene, { format, niche }),
    });
  });

  router.post("/idea-potential", (req, res) => {
    const { ideia, format, niche } = req.body || {};
    if (!ideia) return res.status(400).json({ error: "ideia obrigatório." });
    res.json({
      ok: true,
      ideia: calcularPotencialMotion(ideia, { format, niche }),
    });
  });

  router.get("/niches", (_req, res) => {
    res.json({ ok: true, niches: listNichePresets() });
  });

  router.get("/niche/:niche", (req, res) => {
    res.json({
      ok: true,
      prefs: resolveNicheMotionPrefs(req.params.niche),
    });
  });

  // ensure shotcraft + tag on project storyboard
  router.post("/ensure", (req, res) => {
    try {
      const { storyboard, niche, format, project } = req.body || {};
      let sb = storyboard;
      if (!sb && project && getProjectDir && fs && path) {
        const projDir = getProjectDir(req);
        const sbPath = path.join(projDir, "storyboard.json");
        if (fs.existsSync(sbPath)) {
          sb = JSON.parse(fs.readFileSync(sbPath, "utf8"));
        }
      }
      if (!sb) return res.status(400).json({ error: "storyboard obrigatório." });
      const tagged = tagStoryboardWithMotion(sb, {
        niche: niche || "",
        format: format || "16:9",
      });
      const result = ensureShotcraftOnStoryboard(tagged, {
        niche: niche || "",
        format: format || "16:9",
      });
      if (project && getProjectDir && fs && path) {
        const projDir = getProjectDir(req);
        const sbPath = path.join(projDir, "storyboard.json");
        fs.writeFileSync(
          sbPath,
          JSON.stringify(result.storyboard, null, 2),
          "utf8"
        );
      }
      res.json({
        ok: true,
        storyboard: result.storyboard,
        plan: result.plan,
        validation: result.validation,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

/**
 * Compat com registro atual do server.js
 */
export function registerMotionRoutes(app, deps = {}) {
  const router = createMotionRouter(deps);
  app.use("/api/motion", router);
  return router;
}

export default createMotionRouter;
