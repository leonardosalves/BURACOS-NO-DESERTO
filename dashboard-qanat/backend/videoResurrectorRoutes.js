/**
 * Rotas API — Ressuscitador de vídeos mortos.
 */

import fs from "fs";
import path from "path";
import {
  applyResurrectorItem,
  computeResurrectorCycleProgress,
  enqueueResurrectorCandidates,
  formatResurrectorScanMessage,
  getResurrectorDashboard,
  isVideoBatchedInCurrentCycle,
  loadResurrectorState,
  maybeCompleteResurrectorCycle,
  normalizeResurrectorSlot,
  normalizeResurrectorTrigger,
  resetResurrectorFailedItems,
  runResurrectorBatch,
  saveResurrectorState,
  scanEligibleResurrectorVideos,
} from "./videoResurrector.js";

export function registerVideoResurrectorRoutes(app, deps) {
  const {
    WORKSPACE_DIR,
    PROJECTS_ROOT,
    getApiKey,
    callGeminiWithRetry,
  } = deps;

  const resurrectorDeps = () => ({
    workspaceDir: WORKSPACE_DIR,
    projectsRoot: PROJECTS_ROOT,
    getApiKey,
    callGeminiWithRetry,
    callGemini: (prompt, opts) => callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, opts),
  });

  app.get("/api/youtube/resurrector", async (_req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      res.json(getResurrectorDashboard(state));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/youtube/resurrector/settings", (req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      const patch = req.body?.settings || req.body || {};
      state.settings = {
        ...state.settings,
        ...(typeof patch.enabled === "boolean" ? { enabled: patch.enabled } : {}),
        ...(typeof patch.autoRunWhenAppOpen === "boolean" ? { autoRunWhenAppOpen: patch.autoRunWhenAppOpen } : {}),
        ...(typeof patch.autoRunDaily === "boolean" ? { autoRunWhenAppOpen: patch.autoRunDaily } : {}),
        ...(Number.isFinite(Number(patch.minAgeDays)) ? { minAgeDays: Math.max(1, Math.min(365, Number(patch.minAgeDays))) } : {}),
        ...(Number.isFinite(Number(patch.morningBatchSize)) ? { morningBatchSize: Math.max(1, Math.min(20, Number(patch.morningBatchSize))) } : {}),
        ...(Number.isFinite(Number(patch.afternoonBatchSize)) ? { afternoonBatchSize: Math.max(1, Math.min(20, Number(patch.afternoonBatchSize))) } : {}),
        ...(Number.isFinite(Number(patch.morningHour)) ? { morningHour: Math.max(0, Math.min(23, Number(patch.morningHour))) } : {}),
        ...(Number.isFinite(Number(patch.afternoonHour)) ? { afternoonHour: Math.max(0, Math.min(23, Number(patch.afternoonHour))) } : {}),
        ...(Number.isFinite(Number(patch.cooldownDays)) ? { cooldownDays: Math.max(7, Math.min(180, Number(patch.cooldownDays))) } : {}),
      };
      saveResurrectorState(WORKSPACE_DIR, state);
      res.json(getResurrectorDashboard(state));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/youtube/resurrector/scan", async (_req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      const { eligible, allEligible, diagnostics } = await scanEligibleResurrectorVideos(
        WORKSPACE_DIR,
        PROJECTS_ROOT,
        state.settings,
      );
      const catalog = allEligible || eligible;
      const completion = maybeCompleteResurrectorCycle(state, catalog);
      let next = completion.state;
      const pending = completion.advanced
        ? catalog
        : catalog.filter((row) => !isVideoBatchedInCurrentCycle(next, row.videoId));
      const { state: enqueued, added } = enqueueResurrectorCandidates(next, pending);
      next = enqueued;
      next.cycleProgress = computeResurrectorCycleProgress(next, allEligible || eligible);
      next.scanDiagnostics = diagnostics;
      saveResurrectorState(WORKSPACE_DIR, next);
      res.json({
        eligible: eligible.length,
        added,
        diagnostics,
        message: formatResurrectorScanMessage(diagnostics, { eligible: eligible.length, added }),
        dashboard: getResurrectorDashboard(next),
      });
    } catch (err) {
      res.status(500).json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/run-batch", async (req, res) => {
    try {
      const slot = normalizeResurrectorSlot(req.body?.slot || "morning");
      const trigger = normalizeResurrectorTrigger(req.body?.trigger || "manual");
      const limit = Number.isFinite(Number(req.body?.limit)) ? Number(req.body.limit) : null;
      const finalizeSlot = typeof req.body?.finalizeSlot === "boolean" ? req.body.finalizeSlot : null;
      const result = await runResurrectorBatch(WORKSPACE_DIR, PROJECTS_ROOT, resurrectorDeps(), {
        slot,
        trigger,
        limit,
        finalizeSlot,
      });
      res.json({
        ...result,
        dashboard: getResurrectorDashboard(result.state),
      });
    } catch (err) {
      res.status(500).json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/retry-failed", (_req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      const reset = resetResurrectorFailedItems(state);
      saveResurrectorState(WORKSPACE_DIR, state);
      res.json({
        reset,
        dashboard: getResurrectorDashboard(state),
        message: reset
          ? `${reset} vídeo(s) com falha voltaram para a fila.`
          : "Nenhuma falha pendente para reprocessar.",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/youtube/resurrector/items/:id", (req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      const idx = state.items.findIndex((i) => i.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: "Item não encontrado." });

      const patch = req.body || {};
      const item = state.items[idx];

      if (patch.status === "skipped") {
        item.status = "skipped";
      }
      if (patch.selectedTitle) item.selectedTitle = String(patch.selectedTitle).slice(0, 100);
      if (patch.proposedMetadata && typeof patch.proposedMetadata === "object") {
        item.proposedMetadata = { ...item.proposedMetadata, ...patch.proposedMetadata };
      }
      if (typeof patch.description === "string") {
        item.proposedMetadata = { ...(item.proposedMetadata || {}), description: patch.description };
      }
      if (Array.isArray(patch.tags)) {
        item.proposedMetadata = { ...(item.proposedMetadata || {}), tags: patch.tags };
      }

      item.updatedAt = new Date().toISOString();
      state.items[idx] = item;
      saveResurrectorState(WORKSPACE_DIR, state);
      res.json({ item, dashboard: getResurrectorDashboard(state) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/youtube/resurrector/items/:id/apply", async (req, res) => {
    try {
      const result = await applyResurrectorItem(WORKSPACE_DIR, req.params.id, {
        title: req.body?.title,
        description: req.body?.description,
        tags: req.body?.tags,
      });
      const state = loadResurrectorState(WORKSPACE_DIR);
      res.json({ ...result, dashboard: getResurrectorDashboard(state) });
    } catch (err) {
      res.status(500).json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/items/:id/thumbnail", async (req, res) => {
    try {
      const { data, mimeType, fileName } = req.body || {};
      if (!data) return res.status(400).json({ error: "Envie a imagem em base64 no campo 'data'." });

      const state = loadResurrectorState(WORKSPACE_DIR);
      const idx = state.items.findIndex((i) => i.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: "Item não encontrado." });

      const item = state.items[idx];
      if (item.format !== "LONG") {
        return res.status(400).json({ error: "Thumbnail manual só para vídeos longos." });
      }

      const buffer = Buffer.from(String(data), "base64");
      const ext = String(fileName || "").toLowerCase().endsWith(".png") || mimeType === "image/png"
        ? ".png"
        : ".jpg";
      const dir = item.projectPath && fs.existsSync(item.projectPath)
        ? path.join(item.projectPath, "ASSETS", "resurrector_thumbnails")
        : path.join(WORKSPACE_DIR, "ASSETS", "resurrector_thumbnails");
      fs.mkdirSync(dir, { recursive: true });
      const outPath = path.join(dir, `thumb_${item.videoId}${ext}`);
      fs.writeFileSync(outPath, buffer);

      state.items[idx] = {
        ...item,
        thumbnailLocalPath: outPath,
        thumbnailStatus: "ready",
        updatedAt: new Date().toISOString(),
      };
      saveResurrectorState(WORKSPACE_DIR, state);
      res.json({ ok: true, path: outPath, item: state.items[idx] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

}