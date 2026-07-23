import path from "path";
import fs from "fs";
import {
  findProjectVideoFiles,
  processProjectWatermark,
} from "./geminiWatermarkService.js";

export function registerGeminiWatermarkRoutes(app, resolveProjectPath) {
  /**
   * GET /api/render/remove-watermark-gemini/status
   * Retorna contagem de vídeos e estado do projeto.
   */
  app.get("/api/render/remove-watermark-gemini/status", (req, res) => {
    try {
      const projParam = req.query.project || req.query.project_dir || "";
      const projDir = resolveProjectPath(projParam);

      if (!projDir || !fs.existsSync(projDir)) {
        return res
          .status(404)
          .json({ ok: false, error: "Projeto não encontrado." });
      }

      const videoFiles = findProjectVideoFiles(projDir);
      const backups = videoFiles.filter((v) => fs.existsSync(`${v}.bak`));

      return res.json({
        ok: true,
        project: path.basename(projDir),
        total_videos: videoFiles.length,
        backups_count: backups.length,
        videos: videoFiles.map((v) => ({
          name: path.basename(v),
          path: v,
          has_backup: fs.existsSync(`${v}.bak`),
        })),
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/render/remove-watermark-gemini/stream
   * Inicia a remoção de watermark e envia eventos SSE (Server-Sent Events) em tempo real.
   */
  app.get("/api/render/remove-watermark-gemini/stream", async (req, res) => {
    const projParam = req.query.project || req.query.project_dir || "";
    const projDir = resolveProjectPath(projParam);

    if (!projDir || !fs.existsSync(projDir)) {
      res.status(404).end("Projeto não encontrado.");
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendSSE = (type, payload) => {
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    };

    const onLog = (msg) => {
      sendSSE("log", { text: msg });
    };

    const onProgress = (percent, phase) => {
      sendSSE("progress", { percent, phase });
    };

    try {
      sendSSE("log", {
        text: `[WATERMARK] Conectado ao canal SSE do projeto: ${path.basename(projDir)}`,
      });

      const options = {
        watermarkPos: req.query.pos || "bottom_right",
        watermarkSize: parseInt(req.query.size || "64", 10),
      };

      const result = await processProjectWatermark(
        projDir,
        options,
        onLog,
        onProgress
      );

      sendSSE("complete", { ok: true, summary: result });
    } catch (err) {
      sendSSE("log", { text: `[WATERMARK] ERRO FATAL: ${err.message}` });
      sendSSE("complete", { ok: false, error: err.message });
    } finally {
      res.end();
    }
  });
}
