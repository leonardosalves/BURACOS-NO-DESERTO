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
  WhiteboardRenderError,
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
    let scriptTitle = "";
    if (hasScript) {
      try {
        const segmentsData = JSON.parse(
          fs.readFileSync(
            path.join(runDir, "script", "voiceover_segments.json"),
            "utf8"
          )
        );
        segments = segmentsData.segments || [];
        scriptTitle = String(segmentsData.title || "").trim();
      } catch {}
      if (!scriptTitle) {
        const titlePath = path.join(runDir, "script", "title.txt");
        if (fs.existsSync(titlePath)) {
          scriptTitle = fs.readFileSync(titlePath, "utf8").trim();
        }
      }
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
            imageUrl: `/api/whiteboard/board-image?id=${runId}&board=${encodeURIComponent(boardId)}`,
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
      scriptTitle,
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
    const resume = Boolean(req.body.resume);
    const forceNarration = Boolean(req.body.forceNarration);
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
      const logs = [];

      // 1. Synthesize voiceover using Portuguese Fish Speech.
      //    Na retomada, pula o TTS se a narração já foi gerada (preserva progresso).
      const narrationWav = path.join(runDir, "audio", "narration.wav");
      const narrationExists =
        fs.existsSync(narrationWav) && fs.statSync(narrationWav).size > 0;
      if (narrationExists && !forceNarration) {
        logs.push(
          resume
            ? "Narração já gerada — pulando TTS (retomada do ponto da falha)."
            : "Narração já existe — pulando TTS."
        );
      } else {
        await synthesizePortugueseFishSpeech(WORKSPACE_DIR, runDir);
      }

      // 2. Run all remaining calibration and Remotion rendering scripts
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
      res.json({ success: true, logs, resumed: resume && narrationExists });
    } catch (err) {
      console.error("Erro ao renderizar whiteboard run:", err);
      await pool.query("UPDATE whiteboard_runs SET status = $1 WHERE id = $2", [
        "error",
        runId,
      ]);

      // Diagnóstico estruturado quando a falha vem de uma etapa do render.
      if (err instanceof WhiteboardRenderError) {
        const errorLog =
          err.reportExcerpt || err.stderr || err.stdout || err.message || "";
        res.status(500).json({
          error: "Renderização interrompida.",
          stage: err.stage,
          failedStep: err.failedStep,
          errorLog: errorLog.slice(0, 6000),
          reportPath: err.reportPath,
          details: err.message,
        });
        return;
      }

      // Falha na narração (Fish Speech / ffmpeg) ou outra etapa anterior.
      res.status(500).json({
        error: "Falha antes da renderização (narração/preparação).",
        stage: "Narração / preparação",
        errorLog: (err.stderr?.toString?.() || err.message || "").slice(
          0,
          6000
        ),
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

  // Serve a imagem (miniatura) de um quadro específico para validação visual.
  app.get("/api/whiteboard/board-image", async (req, res) => {
    try {
      const runId = Number(req.query.id);
      const boardId = String(req.query.board || "").trim();
      if (!runId || !boardId)
        return res
          .status(400)
          .json({ error: "id do projeto e board são obrigatórios." });

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

      const imagePath = path.join(
        run.folder_path,
        "images",
        `${boardId}.model-generated.png`
      );
      if (!fs.existsSync(imagePath)) {
        return res
          .status(404)
          .json({ error: "Imagem do quadro não encontrada." });
      }

      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(imagePath);
    } catch (err) {
      console.error("Erro em /api/whiteboard/board-image:", err);
      res.status(500).json({
        error: "Erro ao carregar imagem do quadro.",
        details: err.message,
      });
    }
  });

  // Validação pré-render: checklist de roteiro, imagens, FFmpeg e disco.
  app.get("/api/whiteboard/precheck", async (req, res) => {
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

      const runDir = run.folder_path;
      const checks = [];
      const add = (category, label, status, message) =>
        checks.push({ category, label, status, message });

      // ── Roteiro ──
      const segPath = path.join(runDir, "script", "voiceover_segments.json");
      let segments = [];
      if (fs.existsSync(segPath)) {
        try {
          segments =
            JSON.parse(fs.readFileSync(segPath, "utf8")).segments || [];
        } catch {}
      }
      if (segments.length === 0) {
        add(
          "Roteiro",
          "Quadros com texto",
          "fail",
          "Nenhum quadro encontrado no roteiro."
        );
      } else {
        const empty = segments.filter((s) => !String(s.text || "").trim());
        if (empty.length > 0) {
          add(
            "Roteiro",
            "Quadros com texto",
            "warn",
            `${empty.length} quadro(s) com texto vazio.`
          );
        } else {
          add(
            "Roteiro",
            "Quadros com texto",
            "pass",
            `${segments.length} quadros com texto.`
          );
        }
      }

      // ── Imagens ──
      const boardIds = segments.map((s) => s.boardId).filter(Boolean);
      const uniqueBoards = Array.from(new Set(boardIds));
      const imagesDir = path.join(runDir, "images");
      const present = [];
      const missing = [];
      const badDims = [];
      for (const boardId of uniqueBoards) {
        const imgPath = path.join(imagesDir, `${boardId}.model-generated.png`);
        if (!fs.existsSync(imgPath) || fs.statSync(imgPath).size === 0) {
          missing.push(boardId);
          continue;
        }
        present.push(boardId);
        try {
          const meta = await sharp(imgPath).metadata();
          if (meta.width && meta.height) {
            const ratio = meta.width / meta.height;
            if (
              Math.abs(ratio - 16 / 9) > 0.15 &&
              Math.abs(ratio - 9 / 16) > 0.15
            ) {
              badDims.push(`${boardId} (${meta.width}×${meta.height})`);
            }
          }
        } catch {
          badDims.push(`${boardId} (ilegível)`);
        }
      }
      if (uniqueBoards.length === 0) {
        add(
          "Imagens",
          "Imagens carregadas",
          "warn",
          "Nenhum quadro para validar imagens."
        );
      } else if (missing.length > 0) {
        add(
          "Imagens",
          "Imagens carregadas",
          "fail",
          `${present.length}/${uniqueBoards.length} carregadas. Faltam: ${missing.join(", ")}.`
        );
      } else {
        add(
          "Imagens",
          "Imagens carregadas",
          "pass",
          `${present.length}/${uniqueBoards.length} imagens carregadas.`
        );
      }
      if (badDims.length > 0) {
        add(
          "Imagens",
          "Proporção 16:9",
          "warn",
          `Proporção fora do esperado em: ${badDims.join(", ")}.`
        );
      } else if (present.length > 0) {
        add(
          "Imagens",
          "Proporção 16:9",
          "pass",
          "Todas as imagens com proporção adequada."
        );
      }

      // ── FFmpeg ──
      let ffmpegOk = false;
      try {
        execSync("ffmpeg -version", { stdio: "ignore", windowsHide: true });
        ffmpegOk = true;
      } catch {
        ffmpegOk = false;
      }
      add(
        "Render",
        "FFmpeg disponível",
        ffmpegOk ? "pass" : "fail",
        ffmpegOk ? "FFmpeg encontrado." : "FFmpeg não encontrado no PATH."
      );

      // ── Pasta de saída gravável ──
      const videoDir = path.join(runDir, "video");
      let writable = false;
      try {
        if (!fs.existsSync(videoDir))
          fs.mkdirSync(videoDir, { recursive: true });
        const probe = path.join(videoDir, ".write-probe");
        fs.writeFileSync(probe, "ok");
        fs.rmSync(probe);
        writable = true;
      } catch {
        writable = false;
      }
      add(
        "Render",
        "Pasta de saída gravável",
        writable ? "pass" : "fail",
        writable
          ? "Pasta video/ gravável."
          : "Não foi possível gravar em video/."
      );

      const failCount = checks.filter((c) => c.status === "fail").length;
      const warnCount = checks.filter((c) => c.status === "warn").length;
      const passCount = checks.filter((c) => c.status === "pass").length;

      res.json({
        success: true,
        ready: failCount === 0,
        checks,
        passCount,
        warnCount,
        failCount,
      });
    } catch (err) {
      console.error("Erro em /api/whiteboard/precheck:", err);
      res.status(500).json({
        error: "Erro ao executar validação pré-render.",
        details: err.message,
      });
    }
  });
}
