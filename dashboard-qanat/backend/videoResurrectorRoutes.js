/**
 * Rotas API — Ressuscitador de vídeos mortos.
 */

import fs from "fs";
import path from "path";
import {
  applyPendingResurrectorReviews,
  applyResurrectorItem,
  computeResurrectorCycleProgress,
  enqueueResurrectorCandidates,
  formatResurrectorScanMessage,
  getResurrectorDashboard,
  isVideoBatchedInCurrentCycle,
  isWithinResurrectorAutoWindow,
  loadResurrectorState,
  maybeCompleteResurrectorCycle,
  normalizeResurrectorSlot,
  normalizeResurrectorTrigger,
  RESURRECTOR_AUTO_WINDOW_END_MINUTE,
  resetResurrectorFailedItems,
  runResurrectorBatch,
  saveResurrectorState,
  scanEligibleResurrectorVideos,
  withResurrectorMutex,
} from "./videoResurrector.js";
import { fetchVideoAnalytics } from "./youtubeTitleAnalytics.js";
import { diagnoseResurrectionOpportunity } from "./videoResurrectionDiagnosis.js";

const RESURRECTOR_SCHEDULER_POLL_MS = 60_000;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slotAlreadyRanToday(state, slot, now) {
  const dailyRuns = state?.dailyRuns || {};
  const run = dailyRuns?.[slot];
  if (!run?.ranAt) return false;

  if (dailyRuns.date) {
    return dailyRuns.date === localDateString(now);
  }

  const ranAt = new Date(run.ranAt);
  return (
    !Number.isNaN(ranAt.getTime()) &&
    localDateString(ranAt) === localDateString(now)
  );
}

/**
 * Lotes automáticos devidos AGORA — só dentro da janela HH:00–HH:05.
 * Fora disso não dispara (evita spam e lotes o dia inteiro).
 */
export function resolveDueResurrectorSlots(state = {}, now = new Date()) {
  const settings = state.settings || {};
  if (!settings.enabled || !settings.autoRunWhenAppOpen) return [];

  const slots = [
    ["morning", Number(settings.morningHour ?? 11)],
    ["afternoon", Number(settings.afternoonHour ?? 18)],
  ];

  return slots
    .filter(([slot, hour]) => {
      if (!Number.isFinite(hour)) return false;
      if (
        !isWithinResurrectorAutoWindow(
          now,
          hour,
          RESURRECTOR_AUTO_WINDOW_END_MINUTE
        )
      ) {
        return false;
      }
      return !slotAlreadyRanToday(state, slot, now);
    })
    .map(([slot]) => slot);
}

/**
 * Agenda lotes só nas janelas 11:00–11:05 e 18:00–18:05 (horas configuráveis).
 * Fora da janela o tick é barato (só compara o relógio).
 */
export function startVideoResurrectorScheduler(deps, options = {}) {
  const { WORKSPACE_DIR, PROJECTS_ROOT, getApiKey, callGeminiWithRetry } = deps;
  const intervalMs = Math.max(
    15_000,
    Number(options.intervalMs) || RESURRECTOR_SCHEDULER_POLL_MS
  );
  let running = false;

  const resurrectorDeps = () => ({
    workspaceDir: WORKSPACE_DIR,
    projectsRoot: PROJECTS_ROOT,
    getApiKey,
    callGeminiWithRetry,
    callGemini: (prompt, opts) =>
      callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, opts),
  });

  const tick = async () => {
    if (running) return;
    const now = new Date();
    // Fora de HH:00–HH:05 nenhum horário configurável entra na janela.
    if (now.getMinutes() > RESURRECTOR_AUTO_WINDOW_END_MINUTE) return;

    running = true;
    try {
      let state = loadResurrectorState(WORKSPACE_DIR);
      const dueSlots = resolveDueResurrectorSlots(state, now);
      for (const slot of dueSlots) {
        await runResurrectorBatch(
          WORKSPACE_DIR,
          PROJECTS_ROOT,
          resurrectorDeps(),
          { slot, trigger: "auto" }
        );
        state = loadResurrectorState(WORKSPACE_DIR);
        if (slotAlreadyRanToday(state, slot, new Date())) {
          console.log(
            `[Ressuscitador] Lote ${slot} executado na janela HH:00–HH:05.`
          );
        }
      }
    } catch (err) {
      console.warn("[Ressuscitador] Falha no agendador:", err?.message || err);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return timer;
}

export function registerVideoResurrectorRoutes(app, deps) {
  const { WORKSPACE_DIR, PROJECTS_ROOT, getApiKey, callGeminiWithRetry } = deps;

  const resurrectorDeps = () => ({
    workspaceDir: WORKSPACE_DIR,
    projectsRoot: PROJECTS_ROOT,
    getApiKey,
    callGeminiWithRetry,
    callGemini: (prompt, opts) =>
      callGeminiWithRetry(getApiKey(WORKSPACE_DIR), prompt, opts),
  });

  app.get("/api/youtube/resurrector", async (_req, res) => {
    try {
      const state = loadResurrectorState(WORKSPACE_DIR);
      res.json(getResurrectorDashboard(state));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/youtube/resurrector/settings", async (req, res) => {
    try {
      const payload = await withResurrectorMutex(() => {
        const state = loadResurrectorState(WORKSPACE_DIR);
        const patch = req.body?.settings || req.body || {};
        state.settings = {
          ...state.settings,
          ...(typeof patch.enabled === "boolean"
            ? { enabled: patch.enabled }
            : {}),
          ...(typeof patch.autoRunWhenAppOpen === "boolean"
            ? { autoRunWhenAppOpen: patch.autoRunWhenAppOpen }
            : {}),
          ...(typeof patch.autoApplyToYoutube === "boolean"
            ? { autoApplyToYoutube: patch.autoApplyToYoutube }
            : {}),
          ...(typeof patch.autoRunDaily === "boolean"
            ? { autoRunWhenAppOpen: patch.autoRunDaily }
            : {}),
          ...(Number.isFinite(Number(patch.minAgeDays))
            ? {
                minAgeDays: Math.max(
                  1,
                  Math.min(365, Number(patch.minAgeDays))
                ),
              }
            : {}),
          ...(Number.isFinite(Number(patch.morningBatchSize))
            ? {
                morningBatchSize: Math.max(
                  1,
                  Math.min(20, Number(patch.morningBatchSize))
                ),
              }
            : {}),
          ...(Number.isFinite(Number(patch.afternoonBatchSize))
            ? {
                afternoonBatchSize: Math.max(
                  1,
                  Math.min(20, Number(patch.afternoonBatchSize))
                ),
              }
            : {}),
          ...(Number.isFinite(Number(patch.morningHour))
            ? {
                morningHour: Math.max(
                  0,
                  Math.min(23, Number(patch.morningHour))
                ),
              }
            : {}),
          ...(Number.isFinite(Number(patch.afternoonHour))
            ? {
                afternoonHour: Math.max(
                  0,
                  Math.min(23, Number(patch.afternoonHour))
                ),
              }
            : {}),
          ...(Number.isFinite(Number(patch.cooldownDays))
            ? {
                cooldownDays: Math.max(
                  7,
                  Math.min(180, Number(patch.cooldownDays))
                ),
              }
            : {}),
        };
        saveResurrectorState(WORKSPACE_DIR, state);
        return getResurrectorDashboard(state);
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/youtube/resurrector/scan", async (_req, res) => {
    try {
      const payload = await withResurrectorMutex(async () => {
        const state = loadResurrectorState(WORKSPACE_DIR);
        const { eligible, allEligible, diagnostics } =
          await scanEligibleResurrectorVideos(
            WORKSPACE_DIR,
            PROJECTS_ROOT,
            state.settings
          );
        const catalog = allEligible || eligible;
        const completion = maybeCompleteResurrectorCycle(state, catalog);
        let next = completion.state;
        const pending = completion.advanced
          ? catalog
          : catalog.filter(
              (row) => !isVideoBatchedInCurrentCycle(next, row.videoId)
            );
        const { state: enqueued, added } = enqueueResurrectorCandidates(
          next,
          pending
        );
        next = enqueued;
        next.cycleProgress = computeResurrectorCycleProgress(
          next,
          allEligible || eligible
        );
        next.scanDiagnostics = diagnostics;
        saveResurrectorState(WORKSPACE_DIR, next);
        return {
          eligible: eligible.length,
          added,
          diagnostics,
          message: formatResurrectorScanMessage(diagnostics, {
            eligible: eligible.length,
            added,
          }),
          dashboard: getResurrectorDashboard(next),
        };
      });
      res.json(payload);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/items/:id/diagnose", async (req, res) => {
    try {
      const payload = await withResurrectorMutex(async () => {
        const state = loadResurrectorState(WORKSPACE_DIR);
        const idx = state.items.findIndex((item) => item.id === req.params.id);
        if (idx < 0) return { notFound: true };
        const item = state.items[idx];
        const analytics = await fetchVideoAnalytics(
          WORKSPACE_DIR,
          item.videoId
        );
        const diagnosis = diagnoseResurrectionOpportunity(item, analytics);
        state.items[idx] = {
          ...item,
          analyticsBaseline: analytics,
          diagnosis,
          opportunityScore: diagnosis.score,
          updatedAt: new Date().toISOString(),
        };
        saveResurrectorState(WORKSPACE_DIR, state);
        return { item: state.items[idx], diagnosis, analytics };
      });
      if (payload.notFound)
        return res.status(404).json({ error: "Item não encontrado." });
      res.json(payload);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/deep-scan", async (req, res) => {
    try {
      const payload = await withResurrectorMutex(async () => {
        let state = loadResurrectorState(WORKSPACE_DIR);
        const scanned = await scanEligibleResurrectorVideos(
          WORKSPACE_DIR,
          PROJECTS_ROOT,
          state.settings
        );
        const catalog = scanned.allEligible || scanned.eligible || [];
        const completion = maybeCompleteResurrectorCycle(state, catalog);
        state = completion.state;
        const pending = catalog.filter(
          (row) => !isVideoBatchedInCurrentCycle(state, row.videoId)
        );
        state = enqueueResurrectorCandidates(state, pending).state;

        const requestedLimit = Number(req.body?.limit);
        const limit = Number.isFinite(requestedLimit)
          ? Math.max(1, Math.min(500, requestedLimit))
          : 500;
        const candidates = [...state.items]
          .filter((item) => catalog.some((row) => row.videoId === item.videoId))
          .sort(
            (a, b) =>
              new Date(a.publishedAt || 0).getTime() -
              new Date(b.publishedAt || 0).getTime()
          )
          .slice(0, limit);

        let analyzed = 0;
        let unavailable = 0;
        const concurrency = 4;
        for (
          let offset = 0;
          offset < candidates.length;
          offset += concurrency
        ) {
          const chunk = candidates.slice(offset, offset + concurrency);
          const results = await Promise.all(
            chunk.map(async (item) => {
              const analytics = await fetchVideoAnalytics(
                WORKSPACE_DIR,
                item.videoId
              );
              return {
                id: item.id,
                analytics,
                diagnosis: diagnoseResurrectionOpportunity(item, analytics),
              };
            })
          );
          for (const result of results) {
            const idx = state.items.findIndex((item) => item.id === result.id);
            if (idx < 0) continue;
            state.items[idx] = {
              ...state.items[idx],
              analyticsBaseline: result.analytics,
              diagnosis: result.diagnosis,
              opportunityScore: result.diagnosis.score,
              updatedAt: new Date().toISOString(),
            };
            if (result.analytics?.available === false) unavailable += 1;
            else analyzed += 1;
          }
          saveResurrectorState(WORKSPACE_DIR, state);
        }

        state.scanDiagnostics = {
          ...scanned.diagnostics,
          deepScanAt: new Date().toISOString(),
          deepScanAnalyzed: analyzed,
          deepScanUnavailable: unavailable,
        };
        state.cycleProgress = computeResurrectorCycleProgress(state, catalog);
        saveResurrectorState(WORKSPACE_DIR, state);
        const ranked = [...state.items]
          .filter((item) => item.diagnosis)
          .sort(
            (a, b) =>
              Number(b.opportunityScore || 0) - Number(a.opportunityScore || 0)
          );
        return {
          analyzed,
          unavailable,
          total: candidates.length,
          highPotential: ranked.filter(
            (item) => item.diagnosis?.tier === "high"
          ).length,
          mediumPotential: ranked.filter(
            (item) => item.diagnosis?.tier === "medium"
          ).length,
          topOpportunities: ranked.slice(0, 12).map((item) => ({
            id: item.id,
            videoId: item.videoId,
            title: item.title,
            score: item.opportunityScore,
            treatment: item.diagnosis?.treatmentLabel,
          })),
          dashboard: getResurrectorDashboard(state),
        };
      });
      res.json(payload);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/run-batch", async (req, res) => {
    try {
      const slot = normalizeResurrectorSlot(req.body?.slot || "morning");
      const trigger = normalizeResurrectorTrigger(
        req.body?.trigger || "manual"
      );
      const limit = Number.isFinite(Number(req.body?.limit))
        ? Number(req.body.limit)
        : null;
      const finalizeSlot =
        typeof req.body?.finalizeSlot === "boolean"
          ? req.body.finalizeSlot
          : null;
      const result = await runResurrectorBatch(
        WORKSPACE_DIR,
        PROJECTS_ROOT,
        resurrectorDeps(),
        {
          slot,
          trigger,
          limit,
          finalizeSlot,
        }
      );
      res.json({
        ...result,
        dashboard: getResurrectorDashboard(result.state),
      });
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/apply-pending", async (_req, res) => {
    try {
      const result = await applyPendingResurrectorReviews(WORKSPACE_DIR);
      res.json({
        ...result,
        dashboard: getResurrectorDashboard(result.state),
      });
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/retry-failed", async (_req, res) => {
    try {
      const payload = await withResurrectorMutex(() => {
        const state = loadResurrectorState(WORKSPACE_DIR);
        const reset = resetResurrectorFailedItems(state);
        saveResurrectorState(WORKSPACE_DIR, state);
        return {
          reset,
          dashboard: getResurrectorDashboard(state),
          message: reset
            ? `${reset} vídeo(s) com falha voltaram para a fila.`
            : "Nenhuma falha pendente para reprocessar.",
        };
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/youtube/resurrector/items/:id", async (req, res) => {
    try {
      const payload = await withResurrectorMutex(() => {
        const state = loadResurrectorState(WORKSPACE_DIR);
        const idx = state.items.findIndex((i) => i.id === req.params.id);
        if (idx < 0) return { notFound: true };

        const patch = req.body || {};
        const item = state.items[idx];

        if (patch.status === "skipped") {
          item.status = "skipped";
        }
        if (patch.selectedTitle)
          item.selectedTitle = String(patch.selectedTitle).slice(0, 100);
        if (
          patch.proposedMetadata &&
          typeof patch.proposedMetadata === "object"
        ) {
          item.proposedMetadata = {
            ...item.proposedMetadata,
            ...patch.proposedMetadata,
          };
        }
        if (typeof patch.description === "string") {
          item.proposedMetadata = {
            ...(item.proposedMetadata || {}),
            description: patch.description,
          };
        }
        if (Array.isArray(patch.tags)) {
          item.proposedMetadata = {
            ...(item.proposedMetadata || {}),
            tags: patch.tags,
          };
        }

        item.updatedAt = new Date().toISOString();
        state.items[idx] = item;
        saveResurrectorState(WORKSPACE_DIR, state);
        return { item, dashboard: getResurrectorDashboard(state) };
      });
      if (payload?.notFound) {
        return res.status(404).json({ error: "Item não encontrado." });
      }
      res.json(payload);
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
      res
        .status(500)
        .json({ error: err.message, needsReauth: err.needsReauth });
    }
  });

  app.post("/api/youtube/resurrector/items/:id/thumbnail", async (req, res) => {
    try {
      const { data, mimeType, fileName } = req.body || {};
      if (!data)
        return res
          .status(400)
          .json({ error: "Envie a imagem em base64 no campo 'data'." });

      const state = loadResurrectorState(WORKSPACE_DIR);
      const idx = state.items.findIndex((i) => i.id === req.params.id);
      if (idx < 0)
        return res.status(404).json({ error: "Item não encontrado." });

      const item = state.items[idx];
      if (item.format !== "LONG") {
        return res
          .status(400)
          .json({ error: "Thumbnail manual só para vídeos longos." });
      }

      const buffer = Buffer.from(String(data), "base64");
      const ext =
        String(fileName || "")
          .toLowerCase()
          .endsWith(".png") || mimeType === "image/png"
          ? ".png"
          : ".jpg";
      const dir =
        item.projectPath && fs.existsSync(item.projectPath)
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
