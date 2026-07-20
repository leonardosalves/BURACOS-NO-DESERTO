import fs from "fs";
import path from "path";
import pg from "pg";
import sharp from "sharp";
import {
  createWhiteboardRun,
  synthesizePortugueseFishSpeech,
  runWhiteboardRender,
  ensureWhiteboardDatabase,
  resolvePythonPath,
  getSkillPaths,
} from "./whiteboardService.js";
import { buildPythonSpawnEnv } from "./pythonEnv.js";
import { execSync } from "child_process";

const pool = new pg.Pool({
  connectionString:
    process.env.LUMIERA_DATABASE_URL ||
    "postgresql://lumiera@127.0.0.1:5432/lumiera",
});

export function registerWhiteboardRoutes(app, deps) {
  const { WORKSPACE_DIR } = deps;

  // Initialize DB on route registration
  ensureWhiteboardDatabase();

  app.post("/api/whiteboard/create", async (req, res) => {
    try {
      const topic = String(req.body.topic || "").trim();
      const durationSec = Number(req.body.durationSec || 45);

      if (!topic) {
        return res
          .status(400)
          .json({ error: "O tema do vídeo (topic) é obrigatório." });
      }

      const result = await createWhiteboardRun(deps, { topic, durationSec });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Erro em /api/whiteboard/create:", err);
      res.status(500).json({
        error: "Erro ao criar projeto whiteboard.",
        details: err.message,
      });
    }
  });

  app.get("/api/whiteboard/runs", async (req, res) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM whiteboard_runs ORDER BY created_at DESC"
      );
      res.json({ success: true, runs: result.rows });
    } catch (err) {
      console.error("Erro em /api/whiteboard/runs:", err);
      res.status(500).json({
        error: "Erro ao listar projetos whiteboard.",
        details: err.message,
      });
    } finally {
      client.release();
    }
  });

  app.get("/api/whiteboard/detail", async (req, res) => {
    const runId = Number(req.query.id);
    if (!runId)
      return res.status(400).json({ error: "id do projeto obrigatório." });

    const client = await pool.connect();
    let run = null;
    try {
      const result = await client.query(
        "SELECT * FROM whiteboard_runs WHERE id = $1",
        [runId]
      );
      run = result.rows[0];
    } catch (err) {
      console.error("Erro em /api/whiteboard/detail DB:", err);
      return res.status(500).json({
        error: "Erro ao carregar detalhes no banco.",
        details: err.message,
      });
    } finally {
      client.release();
    }

    if (!run) return res.status(404).json({ error: "Projeto não encontrado." });

    const runDir = run.folder_path;
    const hasScript = fs.existsSync(
      path.join(runDir, "script", "voiceover_segments.json")
    );
    const hasPlan = fs.existsSync(
      path.join(runDir, "infographic", "infographic_plan.json")
    );
    const hasVideo = fs.existsSync(path.join(runDir, "video", "preview.mp4"));

    // Check image report status
    let imageReport = null;
    const reportPath = path.join(runDir, "image_generation_report.json");
    if (fs.existsSync(reportPath)) {
      try {
        imageReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      } catch {}
    }

    // Read segments text
    let segments = [];
    if (hasScript) {
      try {
        const segmentsData = JSON.parse(
          fs.readFileSync(
            path.join(runDir, "script", "voiceover_segments.json"),
            "utf8"
          )
        );
        segments = segmentsData.segments || [];
      } catch {}
    }

    // Load final imagegen prompts text
    const prompts = {};
    const promptsDir = path.join(runDir, "imagegen_prompts");
    if (fs.existsSync(promptsDir)) {
      const files = fs.readdirSync(promptsDir);
      for (const file of files) {
        if (file.endsWith(".imagegen_prompt.txt")) {
          const boardId = file.replace(".imagegen_prompt.txt", "");
          prompts[boardId] = fs
            .readFileSync(path.join(promptsDir, file), "utf8")
            .trim();
        }
      }
    }

    // Check existing model-generated board images
    const imagesStatus = {};
    const imagesDir = path.join(runDir, "images");
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        if (file.endsWith(".model-generated.png")) {
          const boardId = file.replace(".model-generated.png", "");
          imagesStatus[boardId] = {
            present: true,
            filename: file,
            size: fs.statSync(path.join(imagesDir, file)).size,
          };
        }
      }
    }

    res.json({
      success: true,
      run,
      hasScript,
      hasPlan,
      hasVideo,
      imageReport,
      segments,
      prompts,
      imagesStatus,
    });
  });

  app.post("/api/whiteboard/upload-image", async (req, res) => {
    try {
      const runId = Number(req.body.runId);
      const boardId = String(req.body.boardId || "").trim();
      const imageBase64 = String(req.body.imageBase64 || "").trim();

      if (!runId || !boardId || !imageBase64) {
        return res
          .status(400)
          .json({ error: "runId, boardId e imageBase64 são obrigatórios." });
      }

      const client = await pool.connect();
      let run = null;
      try {
        const result = await client.query(
          "SELECT * FROM whiteboard_runs WHERE id = $1",
          [runId]
        );
        run = result.rows[0];
      } finally {
        client.release();
      }

      if (!run)
        return res.status(404).json({ error: "Projeto não encontrado." });

      const runDir = run.folder_path;
      const imagesDir = path.join(runDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      const destPath = path.join(imagesDir, `${boardId}.model-generated.png`);
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      await sharp(buffer).png().toFile(destPath);

      // Update image generation report
      const python = resolvePythonPath(WORKSPACE_DIR);
      const sPaths = getSkillPaths(WORKSPACE_DIR);
      execSync(
        `"${python}" "${sPaths.generateBoardImages}" --project-dir "${runDir}" --provider interactive`,
        {
          cwd: WORKSPACE_DIR,
          env: buildPythonSpawnEnv(),
          windowsHide: true,
        }
      );

      res.json({
        success: true,
        message: `Imagem de ${boardId} enviada com sucesso.`,
      });
    } catch (err) {
      console.error("Erro em /api/whiteboard/upload-image:", err);
      res.status(500).json({
        error: "Erro ao salvar imagem do quadro.",
        details: err.message,
      });
    }
  });

  app.post("/api/whiteboard/render", async (req, res) => {
    const runId = Number(req.body.runId);
    if (!runId) return res.status(400).json({ error: "runId é obrigatório." });

    const client = await pool.connect();
    let run = null;
    try {
      const result = await client.query(
        "SELECT * FROM whiteboard_runs WHERE id = $1",
        [runId]
      );
      run = result.rows[0];
    } finally {
      client.release();
    }

    if (!run) return res.status(404).json({ error: "Projeto não encontrado." });

    const runDir = run.folder_path;

    // Set status to rendering
    await pool.query("UPDATE whiteboard_runs SET status = $1 WHERE id = $2", [
      "rendering",
      runId,
    ]);

    try {
      // 1. Synthesize voiceover using Portuguese Fish Speech
      await synthesizePortugueseFishSpeech(WORKSPACE_DIR, runDir);

      // 2. Run all remaining calibration and Remotion rendering scripts
      const logs = [];
      await runWhiteboardRender(WORKSPACE_DIR, runDir, {
        onLog: (msg) => {
          logs.push(msg);
        },
      });

      // Update status to completed
      await pool.query("UPDATE whiteboard_runs SET status = $1 WHERE id = $2", [
        "completed",
        runId,
      ]);
      res.json({ success: true, logs });
    } catch (err) {
      console.error("Erro ao renderizar whiteboard run:", err);
      await pool.query("UPDATE whiteboard_runs SET status = $1 WHERE id = $2", [
        "error",
        runId,
      ]);
      res.status(500).json({
        error: "Erro ao renderizar vídeo do quadro.",
        details: err.message,
      });
    }
  });

  app.get("/api/whiteboard/preview-video", async (req, res) => {
    try {
      const runId = Number(req.query.id);
      if (!runId)
        return res.status(400).json({ error: "id do projeto é obrigatório." });

      const client = await pool.connect();
      let run = null;
      try {
        const result = await client.query(
          "SELECT * FROM whiteboard_runs WHERE id = $1",
          [runId]
        );
        run = result.rows[0];
      } finally {
        client.release();
      }

      if (!run)
        return res.status(404).json({ error: "Projeto não encontrado." });

      const videoPath = path.join(run.folder_path, "video", "preview.mp4");
      if (!fs.existsSync(videoPath)) {
        return res
          .status(404)
          .json({ error: "Arquivo preview.mp4 não encontrado." });
      }

      res.sendFile(videoPath);
    } catch (err) {
      console.error("Erro em /api/whiteboard/preview-video:", err);
      res.status(500).json({
        error: "Erro ao carregar preview do vídeo.",
        details: err.message,
      });
    }
  });
}
