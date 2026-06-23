import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Workspace is the parent of dashboard-qanat
const WORKSPACE_DIR = path.resolve(__dirname, "../..");
const REMOTION_DIR = path.resolve(__dirname, "../remotion-renderer");
const REMOTION_PUBLIC_DIR = path.join(REMOTION_DIR, "public");
const PYTHON_PATH = "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/projects-media", express.static(WORKSPACE_DIR));

// Helper: Resolve active project directory dynamically based on request parameters
function getProjectDir(req) {
  const projName = req.query.project || req.body.project;
  if (projName && projName !== "Buracos no Deserto") {
    const resolvedPath = path.join(WORKSPACE_DIR, projName);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }
  return WORKSPACE_DIR; // Default root project (Buracos no Deserto / Qanat)
}

// Helper: Auto-copy missing or outdated timing and render template files to project folder on-demand
function ensureFileExists(fileName, targetDir) {
  const targetPath = path.join(targetDir, fileName);
  const srcPath = path.join(WORKSPACE_DIR, fileName);
  if (!fs.existsSync(srcPath)) return;

  if (!fs.existsSync(targetPath)) {
    // File missing in project - copy from root
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(srcPath, targetPath);
    console.log(`Copied template ${fileName} from root to ${targetDir}`);
  } else {
    // File exists - update if root version is newer
    const srcMtime = fs.statSync(srcPath).mtimeMs;
    const targetMtime = fs.statSync(targetPath).mtimeMs;
    if (srcMtime > targetMtime) {
      fs.copyFileSync(srcPath, targetPath);
      console.log(`Updated ${fileName} in ${targetDir} (root version is newer)`);
    }
  }
}

// API: List valid projects in workspace
app.get("/api/projects", (req, res) => {
  try {
    const projects = [
      { name: "Buracos no Deserto", path: WORKSPACE_DIR }
    ];
    const items = fs.readdirSync(WORKSPACE_DIR);
    for (const item of items) {
      const fullPath = path.join(WORKSPACE_DIR, item);
      if (fs.statSync(fullPath).isDirectory() && !["ASSETS", "OUTPUT", "node_modules", "dashboard-qanat", "dashboard-premium", "temp_clips", "temp_clips_destacado", ".git"].includes(item)) {
        if (fs.existsSync(path.join(fullPath, "build_video.py")) || item === "FINANCAS") {
          projects.push({
            name: item,
            path: fullPath
          });
        }
      }
    }
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Create and template new project subfolder
app.post("/api/projects/create", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }
  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const projDir = path.join(WORKSPACE_DIR, safeName);
  
  try {
    if (fs.existsSync(projDir)) {
      return res.status(400).json({ error: "Já existe um projeto ou pasta com este nome" });
    }
    
    // Create directories
    fs.mkdirSync(projDir, { recursive: true });
    fs.mkdirSync(path.join(projDir, "ASSETS"), { recursive: true });
    fs.mkdirSync(path.join(projDir, "OUTPUT"), { recursive: true });
    
    // Copy templates
    ensureFileExists("build_video.py", projDir);
    ensureFileExists("build_video_destacado.py", projDir);
    ensureFileExists("mix_bgm.py", projDir);
    ensureFileExists("find_block_timings.py", projDir);
    ensureFileExists("align_transcripts.py", projDir);
    
    // Copy logo.png if it exists in root ASSETS folder
    const rootLogoPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");
    const destLogoPath = path.join(projDir, "ASSETS", "logo.png");
    if (fs.existsSync(rootLogoPath)) {
      fs.copyFileSync(rootLogoPath, destLogoPath);
      console.log(`Copied logo.png to new project ${safeName}`);
    }
    
    // Copy config
    const defaultConfigSrc = path.join(WORKSPACE_DIR, "config_qanat.json");
    const defaultConfigDest = path.join(projDir, "config_qanat.json");
    if (fs.existsSync(defaultConfigSrc)) {
      fs.copyFileSync(defaultConfigSrc, defaultConfigDest);
      try {
        const cfg = JSON.parse(fs.readFileSync(defaultConfigDest, "utf8"));
        if (cfg.gemini_api_key) {
          delete cfg.gemini_api_key;
          fs.writeFileSync(defaultConfigDest, JSON.stringify(cfg, null, 2), "utf8");
        }
      } catch (e) {}
    }
    
    // Initialize timing files
    fs.writeFileSync(path.join(projDir, "block_timings.json"), JSON.stringify({
      starts: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110],
      durations: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      total_duration: 120
    }, null, 4), "utf8");
    
    fs.writeFileSync(path.join(projDir, "transcripts_readable.txt"), "Bloco 1...\n", "utf8");
    
    res.json({ success: true, message: `Projeto ${safeName} criado e estruturado com sucesso!` });
  } catch (e) {
    res.status(500).json({ error: "Erro ao criar projeto", details: e.message });
  }
});

// API: Delete project recursively
app.post("/api/projects/delete", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }
  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  
  if (safeName === "Buracos_no_Deserto" || safeName === "Buracos_no_deserto" || safeName === "Buracos no Deserto") {
    return res.status(400).json({ error: "O projeto raiz não pode ser excluído." });
  }
  
  const projDir = path.join(WORKSPACE_DIR, safeName);
  try {
    if (!fs.existsSync(projDir)) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }
    fs.rmSync(projDir, { recursive: true, force: true });
    res.json({ success: true, message: `Projeto ${safeName} excluído com sucesso!` });
  } catch (e) {
    res.status(500).json({ error: "Erro ao excluir o projeto", details: e.message });
  }
});

// API: Check status of workspace files
app.get("/api/status", (req, res) => {
  try {
    const projDir = getProjectDir(req);

    // Auto-sync template scripts when project is accessed
    if (projDir !== WORKSPACE_DIR) {
      ensureFileExists("build_video.py", projDir);
      ensureFileExists("build_video_destacado.py", projDir);
      ensureFileExists("mix_bgm.py", projDir);
      ensureFileExists("find_block_timings.py", projDir);
      ensureFileExists("align_transcripts.py", projDir);
    }

    const assetsDir = path.join(projDir, "ASSETS");
    const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
    
    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return 0;
      let count = 0;
      const scan = (d) => {
        const items = fs.readdirSync(d);
        for (const item of items) {
          const p = path.join(d, item);
          if (fs.statSync(p).isDirectory()) {
            scan(p);
          } else {
            count++;
          }
        }
      };
      scan(dir);
      return count;
    };

    let blockTimings = null;
    const timingsPath = path.join(projDir, "block_timings.json");
    if (fs.existsSync(timingsPath)) {
      try {
        blockTimings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));
      } catch (e) {}
    }

    res.json({
      workspace: projDir,
      assets_count: countFiles(assetsDir),
      has_narration: fs.existsSync(path.join(projDir, "narracao_mestra_premium.mp3")),
      has_soundtrack: fs.existsSync(path.join(projDir, "trilha_documentario.mp3")),
      has_highlight_clip: fs.existsSync(path.join(projDir, "clip_highlight.mp4")),
      has_config: fs.existsSync(path.join(projDir, "config_qanat.json")),
      block_timings: blockTimings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get central config
app.get("/api/config", (req, res) => {
  const projDir = getProjectDir(req);
  const configPath = path.join(projDir, "config_qanat.json");
  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: "config_qanat.json não encontrado" });
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao ler config", details: err.message });
  }
});

// API: Update central config
app.post("/api/config", (req, res) => {
  const projDir = getProjectDir(req);
  const configPath = path.join(projDir, "config_qanat.json");
  try {
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2), "utf8");
    res.json({ success: true, message: "config_qanat.json salvo com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar config", details: err.message });
  }
});

// API: List output videos
app.get("/api/outputs", (req, res) => {
  const projDir = getProjectDir(req);
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  if (!fs.existsSync(outputDir)) {
    return res.json([]);
  }
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => {
        const stats = fs.statSync(path.join(outputDir, f));
        return {
          name: f,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime,
          renderEngine: f.toLowerCase().startsWith("remotion_") ? "remotion" : "standard",
          renderEngineLabel: f.toLowerCase().startsWith("remotion_") ? "Remotion" : "Renderizador Padrão"
        };
      });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete rendered video file
app.post("/api/outputs/delete", (req, res) => {
  const projDir = getProjectDir(req);
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "Nome do arquivo é obrigatório" });
  }
  const safeFilename = path.basename(filename);
  const outputDir = path.join(projDir, "OUTPUT", "qanat_persa_video_final");
  const filePath = path.join(outputDir, safeFilename);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Vídeo ${safeFilename} excluído com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir o arquivo", details: err.message });
  }
});

// API: Get storyboard data
app.get("/api/projects/storyboard", (req, res) => {
  const projDir = getProjectDir(req);
  const storyboardPath = path.join(projDir, "storyboard.json");
  if (!fs.existsSync(storyboardPath)) {
    const configPath = path.join(projDir, "config_qanat.json");
    let fallbackPrompts = [];
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (config.block_phrases && Array.isArray(config.block_phrases)) {
          fallbackPrompts = config.block_phrases.map((bp, idx) => ({
            scene: `${bp.block}.1`,
            block: bp.block,
            narration_text: bp.phrase,
            type: "imagem IA 2k",
            duration: "5 segundos",
            prompt: `Cinematic photorealistic image, 2k resolution, high detail, cinematic lighting, portraying: ${bp.phrase}`,
            editor_notes: "Ken Burns zoom in",
            stock_query: "cinematic"
          }));
        }
      } catch (e) {}
    }
    return res.json({
      strategy: { title_main: "", title_variations: [], hook: "", target_audience: "", tone: "", pinned_comment: "", cta: "" },
      narrative_script: "",
      narrative_script_tagged: "",
      visual_prompts: fallbackPrompts,
      checklist: { click_potential: 0, retention_potential: 0, comments_potential: 0, feedback: "" }
    });
  }
  try {
    const data = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar o storyboard", details: err.message });
  }
});

// API: Save storyboard data
app.post("/api/projects/storyboard", (req, res) => {
  const projDir = getProjectDir(req);
  const storyboardData = req.body;
  if (!storyboardData || !storyboardData.visual_prompts) {
    return res.status(400).json({ error: "Dados do storyboard inválidos." });
  }
  
  const storyboardPath = path.join(projDir, "storyboard.json");
  const configPath = path.join(projDir, "config_qanat.json");
  const transcriptPath = path.join(projDir, "transcripts_readable.txt");
  
  try {
    fs.writeFileSync(storyboardPath, JSON.stringify(storyboardData, null, 2), "utf8");
    
    const visualPrompts = storyboardData.visual_prompts || [];
    const narrativeText = visualPrompts.map(vp => vp.narration_text || "").filter(Boolean).join("\n\n");
    fs.writeFileSync(transcriptPath, narrativeText, "utf8");
    
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    
    const blockPhrasesMap = {};
    visualPrompts.forEach(vp => {
      if (vp.block && vp.narration_text) {
        if (!blockPhrasesMap[vp.block]) {
          blockPhrasesMap[vp.block] = [];
        }
        blockPhrasesMap[vp.block].push(vp.narration_text);
      }
    });
    
    const blockPhrases = Object.keys(blockPhrasesMap).map(b => ({
      block: parseInt(b),
      phrase: blockPhrasesMap[b].join(" ")
    }));
    
    config.block_phrases = blockPhrases;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    
    res.json({ success: true, message: "Roteiro e storyboard salvos com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar o storyboard", details: err.message });
  }
});

// API: List background music tracks
app.get("/api/music", (req, res) => {
  const projDir = getProjectDir(req);
  try {
    const files = fs.readdirSync(projDir)
      .filter(f => {
        const lower = f.toLowerCase();
        return (lower.endsWith(".mp3") || lower.endsWith(".wav")) && lower !== "narracao_mestra_premium.mp3" && !["1.mp3", "2.mp3", "3.mp3"].includes(lower);
      })
      .map(f => {
        const stats = fs.statSync(path.join(projDir, f));
        return {
          name: f,
          sizeBytes: stats.size
        };
      });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Mix soundtrack (runs mix_bgm.py)
app.post("/api/music/mix", (req, res) => {
  const projDir = getProjectDir(req);
  ensureFileExists("mix_bgm.py", projDir);
  const scriptPath = path.join(projDir, "mix_bgm.py");
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: "mix_bgm.py não encontrado" });
  }

  const child = spawn(PYTHON_PATH, ["mix_bgm.py"], {
    cwd: projDir,
    shell: true,
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });
  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      res.json({ success: true, log: stdout });
    } else {
      res.status(500).json({ error: "Erro na mixagem", log: stdout, details: stderr });
    }
  });
});

// API: Render videos streaming logs via Server-Sent Events (SSE)
app.get("/api/render/:mode", (req, res) => {
  const projDir = getProjectDir(req);
  const mode = req.params.mode; // 'standard' or 'highlighted'
  const withoutImpactTitles = req.query.withoutImpactTitles === "1";

  if (mode === "remotion") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendLog = (text) => {
      res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
    };

    let child = null;

    try {
      sendLog("[Remotion] Preparando linha do tempo, assets, narração e legendas...");
      const renderPlan = prepareRemotionRender(projDir);
      sendLog(`[PROGRESSO] 10%`);
      sendLog(`[Remotion] ${renderPlan.sceneCount} cenas e ${renderPlan.captionCount} legendas prontas.`);
      sendLog(`[Remotion] Duração estimada: ${renderPlan.totalDuration.toFixed(1)}s`);

      child = spawn("npx", [
        "remotion",
        "render",
        "src/index.ts",
        "LumieraTimeline",
        `"${renderPlan.outputPath}"`,
        "--props",
        `"${renderPlan.propsPath}"`,
        "--codec",
        "h264",
      ], {
        cwd: REMOTION_DIR,
        shell: true,
        env: { ...process.env }
      });

      child.stdout.on("data", (data) => {
        const text = data.toString().trim();
        if (text) {
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            sendLog(`[Remotion] ${line}`);
            const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
            if (progressMatch) {
              const pct = Math.min(99, Math.max(10, Math.round(Number(progressMatch[1]))));
              sendLog(`[PROGRESSO] ${pct}%`);
            }
          }
        }
      });

      child.stderr.on("data", (data) => {
        const text = data.toString().trim();
        if (text) {
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            sendLog(`[Remotion] ${line}`);
          }
        }
      });

      child.on("close", (code) => {
        if (code === 0) {
          sendLog("[PROGRESSO] 100%");
          sendLog(`[Remotion] Arquivo final: ${renderPlan.outputPath}`);
          res.write(`data: ${JSON.stringify({ type: "complete", code })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: "failed", code })}\n\n`);
        }
        res.end();
      });
    } catch (err) {
      sendLog(`[ERRO] ${err.message}`);
      res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
      res.end();
    }

    req.on("close", () => {
      if (child) child.kill();
    });

    return;
  }

  const scriptName = mode === "highlighted" ? "build_video_destacado.py" : "build_video.py";
  ensureFileExists(scriptName, projDir);
  const scriptPath = path.join(projDir, scriptName);

  if (!fs.existsSync(scriptPath)) {
    res.status(404).json({ error: `${scriptName} não encontrado no workspace` });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendLog = (text) => {
    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
  };

  let runScriptName = scriptName;
  let tempScriptPath = null;

  if (withoutImpactTitles) {
    const sourceCode = fs.readFileSync(scriptPath, "utf8");
    const patchedCode = sourceCode.replace(
      /_raw_impacts\s*=\s*_config\.get\(['"]impact_texts['"],\s*\[\]\)/,
      "_raw_impacts = []"
    );
    runScriptName = `.render_sem_titulos_${scriptName}`;
    tempScriptPath = path.join(projDir, runScriptName);
    fs.writeFileSync(tempScriptPath, patchedCode, "utf8");
  }

  sendLog(`[Dashboard] Iniciando script de renderização: ${scriptName}${withoutImpactTitles ? " (sem títulos grandes)" : ""}...`);

  const child = spawn(PYTHON_PATH, [runScriptName], {
    cwd: projDir,
    shell: true,
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });

  child.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        sendLog(line);
      }
    }
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        sendLog(`[ERRO] ${line}`);
      }
    }
  });

  child.on("close", (code) => {
    if (tempScriptPath && fs.existsSync(tempScriptPath)) {
      try { fs.unlinkSync(tempScriptPath); } catch (e) {}
    }

    if (code === 0) {
      res.write(`data: ${JSON.stringify({ type: "complete", code })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "failed", code })}\n\n`);
    }
    res.end();
  });

  req.on("close", () => {
    child.kill();
  });
});

// Helper: Get configured API key
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return null;
  }
}

function safeProjectSlug(projectDir) {
  return path.basename(projectDir).replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
}

function readProjectJson(projectDir, fileName, fallback = {}) {
  const filePath = path.join(projectDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return fallback;
  }
}

function findProjectFile(projectDir, fileName) {
  if (!fileName) return null;
  const safeName = path.basename(fileName);
  const candidates = [
    path.join(projectDir, safeName),
    path.join(projectDir, "ASSETS", safeName),
    path.join(projectDir, "ASSETS", "images", safeName),
    path.join(projectDir, "ASSETS", "videos", safeName),
    path.join(projectDir, "ASSETS", "audio", safeName),
    path.join(projectDir, "MUSICAS", safeName),
  ];

  // Fallback to workspace root directory if not found in project folder
  if (projectDir !== WORKSPACE_DIR) {
    candidates.push(
      path.join(WORKSPACE_DIR, safeName),
      path.join(WORKSPACE_DIR, "ASSETS", safeName),
      path.join(WORKSPACE_DIR, "ASSETS", "images", safeName),
      path.join(WORKSPACE_DIR, "ASSETS", "videos", safeName),
      path.join(WORKSPACE_DIR, "ASSETS", "audio", safeName)
    );
  }

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function copyRemotionAsset(sourcePath, targetDir, prefix = "") {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  fs.mkdirSync(targetDir, { recursive: true });
  const parsed = path.parse(sourcePath);
  const safeBase = `${prefix}${parsed.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const destName = `${safeBase}${parsed.ext.toLowerCase()}`;
  const destPath = path.join(targetDir, destName);
  fs.copyFileSync(sourcePath, destPath);
  return destName;
}

function getAudioDuration(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(cmd, { encoding: "utf8" }).trim();
    const dur = parseFloat(output);
    return Number.isFinite(dur) ? dur : 0;
  } catch (e) {
    console.error("Error getting audio duration:", e.message);
    return 0;
  }
}

function parseDurationSeconds(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/[\d.]+/);
    if (match) return Number(match[0]);
  }
  return fallback;
}

function captionsFromWordTranscripts(wordTranscripts) {
  const captions = [];
  if (!Array.isArray(wordTranscripts)) return captions;

  for (const segment of wordTranscripts) {
    const segmentStart = Number(segment?.start_time || 0);
    if (!Array.isArray(segment?.words)) continue;
    for (const word of segment.words) {
      const start = segmentStart + Number(word?.start || 0);
      const end = segmentStart + Number(word?.end || word?.start || 0.4);
      captions.push({
        text: String(word?.word || "").trimStart(),
        startMs: Math.max(0, Math.round(start * 1000)),
        endMs: Math.max(0, Math.round(end * 1000)),
        timestampMs: Math.max(0, Math.round(start * 1000)),
        confidence: null,
      });
    }
  }

  return captions.filter(caption => caption.text.trim());
}

function fallbackCaptionsFromScenes(scenes) {
  const captions = [];
  for (const scene of scenes) {
    const words = String(scene.narrationText || "").split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const step = Math.max(180, (scene.duration * 1000) / words.length);
    words.forEach((word, index) => {
      const startMs = Math.round((scene.start * 1000) + (index * step));
      captions.push({
        text: index === 0 ? word : ` ${word}`,
        startMs,
        endMs: Math.round(startMs + step),
        timestampMs: startMs,
        confidence: null,
      });
    });
  }
  return captions;
}

function prepareRemotionRender(projectDir) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", { starts: [], durations: [] });
  const wordTranscripts = readProjectJson(projectDir, "word_transcripts.json", []);
  const projectSlug = safeProjectSlug(projectDir);
  const publicProjectDir = path.join(REMOTION_PUBLIC_DIR, "projects", projectSlug);

  if (!publicProjectDir.startsWith(path.join(REMOTION_PUBLIC_DIR, "projects"))) {
    throw new Error("Caminho Remotion inválido.");
  }

  fs.rmSync(publicProjectDir, { recursive: true, force: true });
  fs.mkdirSync(publicProjectDir, { recursive: true });

  const timelineAssets = config.timeline_assets || {};
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];
  const promptByBlock = new Map();
  for (const prompt of visualPrompts) {
    const block = Number(prompt?.block || 1);
    if (!promptByBlock.has(block)) promptByBlock.set(block, []);
    promptByBlock.get(block).push(prompt);
  }

  const blockNumbers = [...new Set([
    ...Object.keys(timelineAssets).map(Number).filter(Boolean),
    ...visualPrompts.map(prompt => Number(prompt?.block || 0)).filter(Boolean),
    ...(Array.isArray(config.block_phrases) ? config.block_phrases.map(item => Number(item?.block || 0)).filter(Boolean) : []),
  ])].sort((a, b) => a - b);

  const scenes = [];
  let runningStart = 0;

  for (const block of blockNumbers) {
    const blockIndex = Math.max(0, block - 1);
    const blockStart = Number(timings.starts?.[blockIndex]);
    const blockDuration = Number(timings.durations?.[blockIndex]);
    const start = Number.isFinite(blockStart) ? blockStart : runningStart;
    const duration = Number.isFinite(blockDuration) && blockDuration > 0 ? blockDuration : 8;
    const mappedAssets = Array.isArray(timelineAssets[String(block)]) ? timelineAssets[String(block)] : [];
    const prompts = promptByBlock.get(block) || [];
    const fixedTotal = mappedAssets.reduce((sum, item) => sum + (Number(item?.fixed) || 0), 0);
    const autoCount = mappedAssets.filter(item => !Number(item?.fixed)).length;
    const autoDuration = autoCount > 0 ? Math.max(1, (duration - fixedTotal) / autoCount) : duration;
    let localStart = start;

    if (mappedAssets.length > 0) {
      mappedAssets.forEach((item, index) => {
        const sourcePath = findProjectFile(projectDir, item?.asset);
        const copiedName = copyRemotionAsset(sourcePath, publicProjectDir, `b${block}_${index + 1}_`);
        if (!copiedName) return;

        const sceneDuration = Math.max(1, Number(item?.fixed) || autoDuration);
        const prompt = prompts[index] || prompts[0] || {};
        scenes.push({
          block,
          asset: `projects/${projectSlug}/${copiedName}`,
          type: item?.type === "video" ? "video" : "image",
          start: localStart,
          duration: sceneDuration,
          narrationText: prompt?.narration_text || "",
          editorNotes: prompt?.editor_notes || storyboard.editing_map || "",
        });
        localStart += sceneDuration;
      });
    } else {
      prompts.forEach((prompt, index) => {
        const sceneDuration = parseDurationSeconds(prompt?.duration, Math.max(2, duration / Math.max(1, prompts.length)));
        scenes.push({
          block,
          asset: "",
          type: "image",
          start: localStart,
          duration: sceneDuration,
          narrationText: prompt?.narration_text || "",
          editorNotes: prompt?.editor_notes || storyboard.editing_map || "",
        });
        localStart += sceneDuration;
      });
    }

    runningStart = Math.max(runningStart, start + duration);
  }

  const validScenes = scenes.filter(scene => scene.asset);
  if (validScenes.length === 0) {
    throw new Error("Nenhum asset mapeado encontrado na linha do tempo para renderizar via Remotion.");
  }

  const narrationSource = findProjectFile(projectDir, "narracao_mestra_premium.mp3");
  const narration = copyRemotionAsset(narrationSource, publicProjectDir, "narration_");
  const narrationDuration = narrationSource ? getAudioDuration(narrationSource) : 0;

  const totalDurationBeforeLogo = Math.max(
    Number(timings.total_duration || 0),
    ...validScenes.map(scene => scene.start + scene.duration),
    narrationDuration,
    1
  );

  const logoSource = findProjectFile(projectDir, "logo.png");
  if (logoSource) {
    const copiedLogo = copyRemotionAsset(logoSource, publicProjectDir, "logo_final_");
    if (copiedLogo) {
      validScenes.push({
        block: blockNumbers.length + 1,
        asset: `projects/${projectSlug}/${copiedLogo}`,
        type: "image",
        start: totalDurationBeforeLogo,
        duration: 3.0,
        narrationText: "",
        editorNotes: "zoom in, logo final da marca",
      });
    }
  }

  const totalDuration = Math.max(
    Number(timings.total_duration || 0),
    ...validScenes.map(scene => scene.start + scene.duration),
    narrationDuration,
    1
  );

  const blockRanges = blockNumbers.map((block) => {
    const blockIndex = Math.max(0, block - 1);
    const blockStart = Number(timings.starts?.[blockIndex]);
    const blockDuration = Number(timings.durations?.[blockIndex]);
    const scenesForBlock = validScenes.filter(scene => scene.block === block);
    const start = Number.isFinite(blockStart) ? blockStart : Math.min(...scenesForBlock.map(scene => scene.start));
    const duration = Number.isFinite(blockDuration) ? blockDuration : Math.max(...scenesForBlock.map(scene => scene.start + scene.duration)) - start;
    return { block, start: Number.isFinite(start) ? start : 0, duration: Number.isFinite(duration) ? duration : totalDuration };
  });

  const bgmTracks = [];
  if (config.use_single_bgm && config.single_bgm) {
    const source = findProjectFile(projectDir, config.single_bgm);
    const copied = copyRemotionAsset(source, publicProjectDir, "bgm_single_");
    if (copied) {
      bgmTracks.push({ block: 0, file: `projects/${projectSlug}/${copied}`, start: 0, duration: totalDuration });
    }
  } else if (Array.isArray(config.bgm_mappings)) {
    for (const mapping of config.bgm_mappings) {
      const block = Number(mapping?.block || 0);
      const range = blockRanges.find(item => item.block === block);
      const source = findProjectFile(projectDir, mapping?.file);
      const copied = copyRemotionAsset(source, publicProjectDir, `bgm_b${block}_`);
      if (copied && range) {
        bgmTracks.push({ block, file: `projects/${projectSlug}/${copied}`, start: range.start, duration: range.duration });
      }
    }
  }

  // Ensure the last BGM track extends to totalDuration to cover the logo scene
  if (bgmTracks.length > 0) {
    const lastBgm = bgmTracks[bgmTracks.length - 1];
    lastBgm.duration = totalDuration - lastBgm.start;
  }

  const captions = captionsFromWordTranscripts(wordTranscripts);
  const finalCaptions = captions.length > 0 ? captions : fallbackCaptionsFromScenes(validScenes);
  const format = config.aspect_ratio === "16:9" ? "16:9" : "9:16";

  const props = {
    projectName: path.basename(projectDir),
    format,
    totalDuration,
    scenes: validScenes,
    captions: finalCaptions,
    narration: narration ? `projects/${projectSlug}/${narration}` : null,
    bgmTracks,
    editingMap: storyboard.editing_map || storyboard.hyperframe_prompt || "",
  };

  const propsPath = path.join(publicProjectDir, "props.json");
  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf8");

  const outputDir = path.join(projectDir, "OUTPUT", "qanat_persa_video_final");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `remotion_${Date.now()}.mp4`);

  return { propsPath, outputPath, totalDuration, sceneCount: validScenes.length, captionCount: finalCaptions.length };
}

function getMediaTypeFromName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if ([".mp4", ".mov", ".webm", ".mkv"].includes(ext)) return "video";
  if (ext === ".svg") return "svg";
  return "image";
}

function listProjectMediaAssets(projectDir) {
  const assetsDir = path.join(projectDir, "ASSETS");
  const assetFiles = [];
  if (!fs.existsSync(assetsDir)) return assetFiles;

  const scan = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath);
      } else {
        const rel = path.relative(assetsDir, fullPath).replace(/\\/g, "/");
        const ext = path.extname(rel).toLowerCase();
        if ([".mp4", ".mov", ".webm", ".mkv", ".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) {
          assetFiles.push({
            rel,
            mtime: fs.statSync(fullPath).mtimeMs
          });
        }
      }
    }
  };

  scan(assetsDir);

  const getAssetSortKey = (filename, mtime) => {
    const baseName = path.basename(filename);
    // Matches 12 to 14 digit timestamps e.g. 202606231437
    const match = baseName.match(/_?(\d{12,14})(?=\.[a-zA-Z0-9]+$)/);
    if (match) {
      return { timestamp: Number(match[1]), mtime };
    }
    const fallbackMatch = baseName.match(/(\d{8,14})/);
    if (fallbackMatch) {
      return { timestamp: Number(fallbackMatch[1]), mtime };
    }
    return { timestamp: 0, mtime };
  };

  return assetFiles
    .sort((a, b) => {
      const keyA = getAssetSortKey(a.rel, a.mtime);
      const keyB = getAssetSortKey(b.rel, b.mtime);
      if (keyA.timestamp > 0 && keyB.timestamp > 0) {
        if (keyA.timestamp !== keyB.timestamp) {
          return keyA.timestamp - keyB.timestamp;
        }
      }
      return keyA.mtime - keyB.mtime;
    })
    .map(x => x.rel);
}

function buildTimelineFromStoryboard(projectDir) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", { durations: [] });
  const assetFiles = listProjectMediaAssets(projectDir);
  const visualPrompts = Array.isArray(storyboard.visual_prompts) ? storyboard.visual_prompts : [];

  if (assetFiles.length === 0) {
    throw new Error("Nenhum arquivo de mídia encontrado em ASSETS.");
  }

  const promptsByBlock = new Map();
  for (const prompt of visualPrompts) {
    const block = Number(prompt?.block || 1);
    if (!promptsByBlock.has(block)) promptsByBlock.set(block, []);
    promptsByBlock.get(block).push(prompt);
  }

  let blocks = [...promptsByBlock.keys()].sort((a, b) => a - b);
  if (blocks.length === 0) {
    const totalBlocks = Array.isArray(config.block_phrases) && config.block_phrases.length > 0
      ? config.block_phrases.length
      : 12;
    blocks = Array.from({ length: totalBlocks }, (_, index) => index + 1);
  }

  const timelineAssets = {};
  const warnings = [];
  let assetIndex = 0;

  for (const block of blocks) {
    const expectedScenes = promptsByBlock.get(block) || [];
    const expectedCount = Math.max(1, expectedScenes.length || 1);
    const blockDuration = Number(timings.durations?.[block - 1]);
    const effectiveBlockDuration = Number.isFinite(blockDuration) && blockDuration > 0 ? blockDuration : expectedCount * 4;
    const slotDuration = Math.max(0.5, effectiveBlockDuration / expectedCount);
    const blockAssets = [];

    for (let slot = 0; slot < expectedCount && assetIndex < assetFiles.length; slot++) {
      const asset = assetFiles[assetIndex++];
      blockAssets.push({
        asset,
        type: getMediaTypeFromName(asset),
        fixed: Number(slotDuration.toFixed(1)),
      });
    }

    if (blockAssets.length > 0) {
      timelineAssets[String(block)] = blockAssets;
    }

    if (blockAssets.length < expectedCount) {
      warnings.push(`Bloco ${block}: esperava ${expectedCount} asset(s), mas só havia ${blockAssets.length} disponível(is).`);
    }
  }

  if (assetIndex < assetFiles.length) {
    warnings.push(`${assetFiles.length - assetIndex} asset(s) extra foram ignorados para preservar a quantidade original do roteiro.`);
  }

  return { timelineAssets, assetCount: assetFiles.length, warnings };
}

// Gemini API call with automatic retry and model fallback for 503/429 errors
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.1-flash-lite"];

async function callGeminiWithRetry(apiKey, promptOrBody, { maxRetries = 4, models = GEMINI_MODELS, bodyOverride = null } = {}) {
  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestBody = bodyOverride || {
          contents: [{ role: "user", parts: [{ text: promptOrBody }] }]
        };
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          }
        );

        if (response.ok) {
          const result = await response.json();
          let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
          responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          console.log(`[Gemini] Success with model=${model} on attempt ${attempt}`);
          return responseText;
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;
        const status = response.status;

        if (status === 503 || status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          console.warn(`[Gemini] ${status} from ${model} (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          lastError = new Error(`${model}: ${errMsg}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // For non-retryable errors (400, 401, 403, etc.), throw immediately
        throw new Error(errMsg);
      } catch (err) {
        if (err.message && !err.message.includes(model)) {
          throw err; // Re-throw non-retryable errors
        }
        lastError = err;
      }
    }
    console.warn(`[Gemini] All ${maxRetries} attempts failed for ${model}, trying next model...`);
  }

  throw lastError || new Error("Todos os modelos Gemini falharam após múltiplas tentativas.");
}


function extractJsonCandidate(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstObject = raw.indexOf("{");
  const firstArray = raw.indexOf("[");
  const start = firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  if (start === -1) return raw;

  const closeForOpen = raw[start] === "{" ? "}" : "]";
  const stack = [closeForOpen];
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
    } else if (ch === "}" || ch === "]") {
      if (ch !== stack.pop()) break;
      if (stack.length === 0) return raw.slice(start, i + 1);
    }
  }

  const fallback = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return fallback ? fallback[0] : raw;
}

function parseJsonCandidate(text) {
  const candidate = extractJsonCandidate(text);
  const variants = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, "$1"),
    candidate.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1")
  ];

  let lastError;
  for (const variant of variants) {
    try {
      return JSON.parse(variant);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function parseAiJsonResponse(responseText, apiKey, contextLabel = "resposta da IA") {
  try {
    return parseJsonCandidate(responseText);
  } catch (firstError) {
    const candidate = extractJsonCandidate(responseText);
    const repairPrompt = `Corrija o texto abaixo para JSON 100% valido. Preserve todos os dados e textos originais, apenas corrija sintaxe JSON, aspas internas, virgulas e escapes. Retorne APENAS o JSON corrigido, sem markdown.\n\n${candidate}`;
    try {
      const repairedText = await callGeminiWithRetry(apiKey, repairPrompt, { maxRetries: 2, models: ["gemini-2.5-flash", "gemini-2.0-flash"] });
      return parseJsonCandidate(repairedText);
    } catch (repairError) {
      repairError.message = `${contextLabel}: ${firstError.message}`;
      throw repairError;
    }
  }
}

function normalizeApiKeys(...values) {
  const keys = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      keys.push(...value);
    } else if (typeof value === "string" && value.includes(",")) {
      keys.push(...value.split(","));
    } else if (value) {
      keys.push(value);
    }
  }

  return [...new Set(keys.map(key => String(key).trim()).filter(Boolean))];
}

function getApiKeys(projectDir = WORKSPACE_DIR) {
  const keys = normalizeApiKeys(
    process.env.GEMINI_API_KEYS,
    process.env.GOOGLE_API_KEYS,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY
  );

  const appendConfigKeys = (configPath) => {
    const config = readJsonFile(configPath);
    if (config) {
      keys.push(...normalizeApiKeys(config.gemini_api_keys, config.google_api_keys, config.gemini_api_key, config.google_api_key));
    }
  };

  appendConfigKeys(path.join(projectDir, "config_qanat.json"));

  if (projectDir !== WORKSPACE_DIR) {
    appendConfigKeys(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }

  return [...new Set(keys)];
}

function getApiKey(projectDir = WORKSPACE_DIR) {
  const keys = getApiKeys(projectDir);
  if (keys.length > 0) return keys[0];

  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  
  // Try current project dir first
  const configPath = path.join(projectDir, "config_qanat.json");
  const projectConfig = readJsonFile(configPath);
  if (projectConfig?.gemini_api_key) {
    return projectConfig.gemini_api_key;
  }
  
  // Fallback to workspace root
  if (projectDir !== WORKSPACE_DIR) {
    const rootConfigPath = path.join(WORKSPACE_DIR, "config_qanat.json");
    const rootConfig = readJsonFile(rootConfigPath);
    if (rootConfig?.gemini_api_key) {
      return rootConfig.gemini_api_key;
    }
  }
  return null;
}

function getXaiApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.XAI_API_KEY) return process.env.XAI_API_KEY;

  const readConfigKey = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.xai_api_key || config?.grok_api_key || null;
  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));
  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {
    return readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));
  }

  return null;
}

function getAiProvider(projectDir = WORKSPACE_DIR) {
  const readProvider = (configPath) => {
    const config = readJsonFile(configPath);
    return config?.ai_provider || config?.metadata_provider || null;
  };

  return readProvider(path.join(projectDir, "config_qanat.json")) ||
    (projectDir !== WORKSPACE_DIR ? readProvider(path.join(WORKSPACE_DIR, "config_qanat.json")) : null) ||
    "gemini";
}

async function generateMetadataWithXai(prompt, apiKey) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: [
        { role: "system", content: "Você é um especialista em SEO para YouTube. Retorne apenas o markdown solicitado." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (e) {}
    throw new Error(errData.error?.message || `Erro da xAI: ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Erro ao gerar metadados com Grok.";
}

// API: Check if Gemini API key exists
app.get("/api/ai/key-status", (req, res) => {
  const projDir = getProjectDir(req);
  const configuredKeys = getApiKeys(projDir);
  if (configuredKeys.length > 0) {
    return res.json({ has_key: true, key_count: configuredKeys.length });
  }

  const configPath = path.join(projDir, "config_qanat.json");
  let hasKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
  if (!hasKey && fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.gemini_api_key) {
        hasKey = true;
      }
    } catch (e) {}
  }
  // Try fallback to root config
  if (!hasKey && projDir !== WORKSPACE_DIR) {
    const rootConfigPath = path.join(WORKSPACE_DIR, "config_qanat.json");
    if (fs.existsSync(rootConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(rootConfigPath, "utf8"));
        if (config.gemini_api_key) {
          hasKey = true;
        }
      } catch (e) {}
    }
  }
  res.json({ has_key: hasKey });
});

// API: Save Gemini API key to config_qanat.json
app.post("/api/ai/save-key", (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Chave de API não fornecida" });
  }
  const projDir = getProjectDir(req);
  const configPath = path.join(projDir, "config_qanat.json");
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    config.gemini_api_key = key;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    res.json({ success: true, message: "Chave de API salva com sucesso no config_qanat.json" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar a chave", details: err.message });
  }
});

app.get("/api/ai/settings", (req, res) => {
  const projDir = getProjectDir(req);
  res.json({
    provider: getAiProvider(projDir),
    gemini_key_count: getApiKeys(projDir).length,
    has_xai_key: !!getXaiApiKey(projDir)
  });
});

app.post("/api/ai/settings", (req, res) => {
  const projDir = getProjectDir(req);
  const configPath = path.join(projDir, "config_qanat.json");
  const { provider, gemini_key, gemini_keys, xai_key } = req.body || {};

  try {
    let config = readJsonFile(configPath) || {};

    if (provider === "gemini" || provider === "xai") {
      config.ai_provider = provider;
    }

    const parsedGeminiKeys = normalizeApiKeys(gemini_keys, gemini_key);
    if (parsedGeminiKeys.length > 0) {
      config.gemini_api_keys = parsedGeminiKeys;
      config.gemini_api_key = parsedGeminiKeys[0];
    }

    if (typeof xai_key === "string" && xai_key.trim()) {
      const trimmedXaiKey = xai_key.trim();
      config.xai_api_key = trimmedXaiKey.startsWith("xai-") ? trimmedXaiKey : `xai-${trimmedXaiKey}`;
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    res.json({
      success: true,
      provider: config.ai_provider || "gemini",
      gemini_key_count: normalizeApiKeys(config.gemini_api_keys, config.gemini_api_key).length,
      has_xai_key: !!config.xai_api_key
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar configurações de IA", details: err.message });
  }
});

// Helper: Generate system instructions with workspace script context
function getProjectContext(projectDir) {
  const configPath = path.join(projectDir, "config_qanat.json");
  const timingsPath = path.join(projectDir, "block_timings.json");
  const transcriptPath = path.join(projectDir, "transcripts_readable.txt");
  let config = {};
  let timings = {};
  let transcript = "";
  let bgmRecommendations = [];
  if (fs.existsSync(configPath)) {
    try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (e) {}
  }
  if (config.gemini_api_key) { config = { ...config }; delete config.gemini_api_key; }
  if (fs.existsSync(timingsPath)) {
    try { timings = JSON.parse(fs.readFileSync(timingsPath, "utf8")); } catch (e) {}
  }
  if (fs.existsSync(transcriptPath)) {
    try { transcript = fs.readFileSync(transcriptPath, "utf8"); } catch (e) {}
  }
  const storyboardPath = path.join(projectDir, "storyboard.json");
  if (fs.existsSync(storyboardPath)) {
    try {
      const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
      bgmRecommendations = storyboard.bgm_recommendations || [];
    } catch (e) {}
  }
  const assetsDir = path.join(projectDir, "ASSETS");
  let assetsList = [];
  if (fs.existsSync(assetsDir)) { try { assetsList = fs.readdirSync(assetsDir).filter(f => !f.startsWith('.')); } catch(e) {} }
  const musicDir = path.join(projectDir, "MUSICAS");
  let musicList = [];
  if (fs.existsSync(musicDir)) { try { musicList = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3')); } catch(e) {} }
  const projectName = path.basename(projectDir);
  return `Voce eh o "Lumiera Agent" - assistente autonomo com poderes totais sobre o projeto de video. Pode modificar configs, disparar acoes, e auxiliar em qualquer parte do fluxo.

PROJETO ATUAL: "${projectName}"

DADOS DO PROJETO:
1. Config (config_qanat.json): ${JSON.stringify(config, null, 2)}
2. Timings: ${JSON.stringify(timings, null, 2)}
3. Roteiro: ${transcript || "(vazio)"}
4. Assets: ${assetsList.length > 0 ? assetsList.join(', ') : '(vazio)'}
5. Musicas: ${musicList.length > 0 ? musicList.join(', ') : '(nenhuma)'}
6. Recomendações de Trilha BGM por Bloco da IA: ${JSON.stringify(bgmRecommendations, null, 2)}

ACOES DISPONIVEIS - AUTONOMIA TOTAL:
Quando o usuario pedir para fazer algo no projeto, voce DEVE executar a acao inserindo um bloco JSON de acao no final da sua resposta. Use o formato:

\`\`\`lumiera-action
{"actions":[{"type":"update_config","field":"highlight_keywords","value":["exemplo"]}]}
\`\`\`

TIPOS DE ACAO:
- "update_config": Modifica campo do config. Fields: "highlight_keywords" (array strings), "bgm_mappings" (array {block,file}), "impact_texts" (array {block,start_offset,end_offset,text}), "script" (string).
- "trigger_render": Compila video. Params: {"render_type":"standard"ou"highlighted"}.
- "trigger_mix": Mixa trilha sonora.
- "navigate_tab": Navega aba. Params: {"tab":"status"|"timeline"|"music"|"terminal"|"ai"|"creator"}.
- "show_message": Notificacao. Params: {"message":"texto","type":"success"|"warning"|"error"}.

REGRAS:
1. Responda em portugues brasileiro, profissional e direto.
2. Quando modificar algo, SEMPRE inclua o bloco lumiera-action.
3. Primeiro explique, depois inclua o bloco de acao.
4. Autonomia total para modificar qualquer parte do projeto.
5. Sem bloco de acao para perguntas sem mudancas.`;
}

// API: Chat assistant
app.post("/api/ai/chat", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada. Configure-a na aba Agente IA." });
  }
  
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Mensagens inválidas ou vazias" });
  }
  
  try {
    const systemInstruction = getProjectContext(projDir);
    const formattedContents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));
    const chatBody = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };
    const responseText = await callGeminiWithRetry(apiKey, null, { bodyOverride: chatBody });
    
    res.json({ text: responseText || "Desculpe, não consegui obter uma resposta." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar IA", details: err.message });
  }
});

// API: Execute AI agent actions
app.post("/api/ai/execute-action", async (req, res) => {
  const projDir = getProjectDir(req);
  const { actions } = req.body;
  if (!actions || !Array.isArray(actions)) {
    return res.status(400).json({ error: "No actions provided" });
  }
  const results = [];
  for (const action of actions) {
    try {
      switch (action.type) {
        case "update_config": {
          const configPath = path.join(projDir, "config_qanat.json");
          let config = {};
          if (fs.existsSync(configPath)) {
            try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch(e) {}
          }
          config[action.field] = action.value;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
          results.push({ type: action.type, field: action.field, status: "ok" });
          break;
        }
        case "trigger_render": {
          results.push({ type: action.type, status: "ok", message: "Render queued" });
          break;
        }
        case "trigger_mix": {
          results.push({ type: action.type, status: "ok", message: "Mix queued" });
          break;
        }
        case "navigate_tab": {
          results.push({ type: action.type, tab: action.tab, status: "ok" });
          break;
        }
        case "show_message": {
          results.push({ type: action.type, message: action.message, status: "ok" });
          break;
        }
        default:
          results.push({ type: action.type, status: "error", message: "Unknown action type" });
      }
    } catch (err) {
      results.push({ type: action.type, status: "error", message: err.message });
    }
  }
  res.json({ results });
});

// API: Generate YouTube Metadata (SEO Titles, Description, Tags, Chapters)
function getFirstSentences(text, count = 2) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}

function extractKeywords(text, limit = 15) {
  const stopWords = new Set([
    "a", "o", "os", "as", "um", "uma", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "e", "ou", "que", "para", "por", "com", "sem", "como", "mais", "mas", "foi", "ser", "são", "seu",
    "sua", "seus", "suas", "esse", "essa", "este", "esta", "isso", "não", "sim", "ao", "aos", "pela",
    "pelo", "pelos", "pelas", "quando", "onde", "porque", "sobre", "entre", "até", "também", "muito"
  ]);

  const counts = new Map();
  const words = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]{4,}/g) || [];

  for (const word of words) {
    if (!stopWords.has(word)) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function buildFallbackYoutubeMetadata({ transcript, chaptersText, storyboard }) {
  const strategy = storyboard?.strategy || {};
  const baseTitle = strategy.title_main || getFirstSentences(transcript, 1) || "O Segredo Escondido no Deserto";
  const hook = strategy.hook || getFirstSentences(transcript, 2) || "Uma história que parece impossível, mas foi real.";
  const keywords = extractKeywords(`${baseTitle} ${hook} ${transcript}`, 15);
  const tags = [...new Set([
    ...keywords,
    "documentario",
    "historia",
    "curiosidades",
    "engenharia antiga",
    "misterios antigos"
  ])].slice(0, 15);

  const chapters = chaptersText?.trim()
    ? chaptersText.trim().split(/\r?\n/).map(line => line.replace(" - Bloco ", " - O segredo do bloco ")).join("\n")
    : "00:00 - O começo do mistério";

  return `## TÍTULOS
1. ${baseTitle.slice(0, 58)}
2. O detalhe que quase ninguém percebeu nessa história
3. Como isso foi possível no meio do deserto?
4. A engenharia antiga que ainda intriga especialistas
5. Você nunca mais vai olhar para isso do mesmo jeito

## DESCRIÇÃO
${hook}
Neste vídeo, você vai entender os detalhes por trás dessa história e por que ela continua chamando atenção até hoje.

Assista até o final para ver como cada peça se conecta e revela algo maior do que parece.

#documentario #historia #curiosidades #engenharia #misterios

## TAGS
${tags.join(", ")}

## COMENTÁRIO PINADO
Qual detalhe dessa história mais te surpreendeu? Comenta aqui embaixo, porque eu quero ver qual parte chamou mais atenção.

## CAPÍTULOS
${chapters}`;
}

function buildProjectTranscript({ transcript, config, storyboard }) {
  const candidates = [];

  if (typeof transcript === "string") {
    candidates.push(transcript);
  }

  if (typeof storyboard?.narrative_script === "string") {
    candidates.push(storyboard.narrative_script);
  }

  if (Array.isArray(storyboard?.visual_prompts)) {
    candidates.push(storyboard.visual_prompts
      .map(item => item?.narration_text)
      .filter(Boolean)
      .join("\n\n"));
  }

  if (Array.isArray(config?.block_phrases)) {
    candidates.push(config.block_phrases
      .map(item => item?.phrase)
      .filter(Boolean)
      .join("\n\n"));
  }

  return candidates
    .map(value => String(value || "").trim())
    .find(value => value.length > 120) || "";
}

app.post("/api/ai/optimize-youtube", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKeys = getApiKeys(projDir);
  const xaiKey = getXaiApiKey(projDir);
  const aiProvider = getAiProvider(projDir);
  if (apiKeys.length === 0 && !xaiKey) {
    return res.status(401).json({ error: "Nenhuma chave de IA configurada." });
  }
  
  try {
    const configPath = path.join(projDir, "config_qanat.json");
    const timingsPath = path.join(projDir, "block_timings.json");
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    
    let config = {};
    let timings = { starts: [] };
    let transcript = "";
    
    if (fs.existsSync(configPath)) {
      try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (e) {}
    }
    if (fs.existsSync(timingsPath)) {
      try { timings = JSON.parse(fs.readFileSync(timingsPath, "utf8")); } catch (e) {}
    }
    if (fs.existsSync(transcriptPath)) {
      try { transcript = fs.readFileSync(transcriptPath, "utf8"); } catch (e) {}
    }
    
    const blockNames = [
      "Abertura",
      "Bloco 2",
      "Bloco 3",
      "Bloco 4",
      "Bloco 5",
      "Bloco 6",
      "Bloco 7",
      "Bloco 8",
      "Bloco 9",
      "Bloco 10",
      "Bloco 11",
      "Conclusão"
    ];
    
    let chaptersText = "";
    if (timings.starts && timings.starts.length > 0) {
      for (let i = 0; i < timings.starts.length && i < blockNames.length; i++) {
        const sec = timings.starts[i];
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ts = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        chaptersText += `${ts} - ${blockNames[i]}\n`;
      }
    }
    
    // Load storyboard for extra context
    let storyboard = {};
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (fs.existsSync(storyboardPath)) {
      try { storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8")); } catch (e) {}
    }

    transcript = buildProjectTranscript({ transcript, config, storyboard });
    if (!transcript) {
      return res.status(400).json({
        error: "Roteiro não encontrado para este projeto.",
        details: "Crie ou carregue transcripts_readable.txt, storyboard.json com narrative_script/visual_prompts, ou config_qanat.json com block_phrases."
      });
    }
    
    const storyContext = storyboard.strategy ? `
Contexto Estratégico do Vídeo:
- Título Original: ${storyboard.strategy.title_main || "N/A"}
- Hook: ${storyboard.strategy.hook || "N/A"}
- Público-alvo: ${storyboard.strategy.target_audience || "N/A"}
- Tom: ${storyboard.strategy.tone || "N/A"}
- Comentário Pinado Sugerido: ${storyboard.strategy.pinned_comment || "N/A"}
- CTA: ${storyboard.strategy.cta || "N/A"}
` : "";

    const prompt = `Você é um especialista em SEO para YouTube, psicologia de cliques e crescimento de canais. Seu objetivo é MAXIMIZAR a taxa de clique (CTR) e o engajamento nos comentários.

Analise o roteiro abaixo e gere metadados que provoquem curiosidade IRRESISTÍVEL:

## REGRAS PARA OS TÍTULOS:
- Use "curiosity gap" (lacuna de curiosidade): o espectador PRECISA clicar para descobrir a resposta
- Inclua gatilhos emocionais: medo, surpresa, indignação, fascinação
- Use números quando possível ("A razão nº 1...", "99% das pessoas não sabem...")
- Evite clickbait vazio: o título deve prometer algo que o vídeo ENTREGA
- Máximo 60 caracteres por título
- Gere 5 opções variadas (curiosidade, emoção, número, urgência, provocação)

## REGRAS PARA A DESCRIÇÃO:
- As 2 PRIMEIRAS LINHAS são CRUCIAIS (aparecem sem precisar clicar "Mostrar mais")
- Primeira linha: gancho emocional que complementa o título
- Segunda linha: promessa concreta do que o espectador vai aprender
- Resto: SEO keywords naturais, links, call-to-action
- Inclua 3-5 hashtags relevantes no final

## REGRAS PARA AS TAGS:
- 15 tags ordenadas por volume de busca estimado
- Mix de tags genéricas (alto volume) + específicas (baixa competição)
- Inclua variações com erros de digitação comuns se relevante

## REGRAS PARA O COMENTÁRIO PINADO:
- Crie um comentário que PROVOQUE respostas dos espectadores
- Use uma pergunta aberta que gere debate nos comentários
- Inclua CTA sutil para inscrição

## REGRAS PARA OS CAPÍTULOS:
- Use os timestamps reais fornecidos abaixo
- Nomes dos capítulos devem ser chamativos e curiosos (não genéricos como "Introdução")

${storyContext}

Roteiro do Vídeo:
IMPORTANTE: o roteiro completo do projeto está abaixo. Use este conteúdo como fonte principal. Não diga que o roteiro não foi fornecido.

--- INÍCIO DO ROTEIRO ---
${transcript}
--- FIM DO ROTEIRO ---

Marcadores com tempos exatos do projeto:
${chaptersText}

FORMATO DE SAÍDA OBRIGATÓRIO (use exatamente estes headers em Markdown):

## TÍTULOS
(liste os 5 títulos numerados)

## DESCRIÇÃO
(descrição completa pronta para colar)

## TAGS
(tags separadas por vírgula)

## COMENTÁRIO PINADO
(texto do comentário pinado)

## CAPÍTULOS
(lista de capítulos com timestamps)`;

    const errors = [];

    if (aiProvider === "xai" && xaiKey) {
      const responseText = await generateMetadataWithXai(prompt, xaiKey);
      return res.json({ text: responseText, provider: "xai" });
    }

    try {
      const apiKey = apiKeys[0];
      const responseText = await callGeminiWithRetry(apiKey, prompt);
      return res.json({ text: responseText || "Erro ao gerar metadados.", tried_keys: 1 });
    } catch (geminiErr) {
      errors.push({ status: 503, message: geminiErr.message, quotaExceeded: true });
    }

    if (xaiKey) {
      try {
        const responseText = await generateMetadataWithXai(prompt, xaiKey);
        return res.json({
          text: responseText,
          provider: "xai",
          warning: `As ${apiKeys.length} chaves Gemini falharam. Usei Grok/xAI como fallback.`
        });
      } catch (err) {
        errors.push({ status: "xai", message: err.message, quotaExceeded: false });
      }
    }

    const fallbackText = buildFallbackYoutubeMetadata({ transcript, chaptersText, storyboard });
    const quotaErrors = errors.filter(error => error.quotaExceeded).length;

    return res.json({
      text: fallbackText,
      fallback: true,
      tried_keys: apiKeys.length,
      warning: quotaErrors === apiKeys.length
        ? `Todas as ${apiKeys.length} chaves cadastradas atingiram limite temporário. Usei metadados locais por enquanto.`
        : `Não consegui gerar com Gemini usando as ${apiKeys.length} chaves cadastradas. Usei metadados locais por enquanto.`
    });


  } catch (err) {
    res.status(500).json({ error: "Erro ao otimizar metadados", details: err.message });
  }
});
// API: AI-powered BGM suggestion per block
app.post("/api/ai/suggest-bgm", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
  }

  try {
    const { mode } = req.body; // 'LONGO' or 'SHORTS'
    
    // Get storyboard for context
    let storyboard = {};
    const storyboardPath = path.join(projDir, "storyboard.json");
    if (fs.existsSync(storyboardPath)) {
      try { storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8")); } catch (e) {}
    }
    
    // Get transcript for context
    let transcript = "";
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    if (fs.existsSync(transcriptPath)) {
      try { transcript = fs.readFileSync(transcriptPath, "utf8"); } catch (e) {}
    }
    
    // Build block summaries from storyboard
    let blockSummaries = "";
    if (storyboard.visual_prompts) {
      const blocks = {};
      storyboard.visual_prompts.forEach(vp => {
        const b = vp.block;
        if (!blocks[b]) blocks[b] = [];
        blocks[b].push(vp.narration_text || "");
      });
      Object.keys(blocks).sort((a,b) => a-b).forEach(b => {
        blockSummaries += `Bloco ${b}: ${blocks[b].join(" ").substring(0, 200)}...\n`;
      });
    }
    
    const musicListStr = "";

    let bgmPrompt;
    if (mode === "SHORTS") {
      bgmPrompt = `Você é um editor de vídeo especialista em trilha sonora. Analise o roteiro do vídeo curto (Shorts) abaixo e escolha A MELHOR trilha sonora entre os arquivos disponíveis.

Arquivos de música disponíveis:
${musicListStr}

Roteiro:
${transcript || blockSummaries}

Responda APENAS com um JSON válido no formato:
{"file": "nome_exato_do_arquivo.mp3", "reason": "explicação breve de por que esta trilha combina"}`;
    } else {
      bgmPrompt = `Você é um editor de vídeo especialista em trilha sonora para documentários. Analise o tom emocional de cada bloco do roteiro e sugira a melhor trilha sonora para CADA bloco.

Arquivos de música disponíveis:
${musicListStr}

Resumo por bloco:
${blockSummaries}

Regras:
- O mesmo arquivo pode ser usado em múltiplos blocos se for adequado
- Priorize transições suaves entre blocos adjacentes
- Escolha trilhas que amplificam a emoção do texto narrado

Responda APENAS com um JSON válido no formato:
{"suggestions": [{"block": 1, "file": "nome_exato.mp3", "reason": "breve"}, ...]}`;
    }
    
    bgmPrompt = mode === "SHORTS"
      ? `Voce e um editor de video especialista em trilha sonora. Analise o roteiro do video curto (Shorts) abaixo e recomende apenas a IDEIA de trilha sonora ideal para o video inteiro.

Roteiro:
${transcript || blockSummaries}

Importante:
- Nao escolha arquivo de musica.
- Nao cite nomes de faixas enviadas.
- A configuracao real continua manual na opcao Trilha Unica.

Responda APENAS com um JSON valido no formato:
{"mode": "SHORTS", "recommendation": "descricao da ideia de trilha para o video inteiro", "search_theme": "3 a 5 palavras-chave em ingles para busca (ex: cinematic mystery dark tension)", "reason": "explicacao breve", "manual_note": "Escolha manualmente uma faixa em Trilha Unica."}`
      : `Voce e um editor de video especialista em trilha sonora para documentarios. Analise o tom emocional de cada bloco do roteiro e recomende apenas a IDEIA de trilha sonora ideal para CADA bloco.

Resumo por bloco:
${blockSummaries || transcript}

Regras:
- Nao escolha arquivos de musica.
- Nao cite nomes de faixas enviadas.
- Descreva estilo, instrumentos, energia, clima emocional e progressao.
- A configuracao real continua manual na opcao Por Bloco.

Responda APENAS com um JSON valido no formato:
{"mode": "LONGO", "suggestions": [{"block": 1, "recommendation": "ideia de trilha para este bloco", "search_theme": "3 a 5 palavras-chave em ingles para busca (ex: epic tribal drums action)", "reason": "breve"}], "manual_note": "Escolha manualmente as faixas em Por Bloco."}`;

    const responseText = await callGeminiWithRetry(apiKey, bgmPrompt);
    
    const parsed = await parseAiJsonResponse(responseText, apiKey, "Sugestao de BGM");
    
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Erro ao sugerir BGM", details: err.message });
  }
});

// API: List available assets inside ASSETS/ folder
app.get("/api/assets/list", (req, res) => {
  const projDir = getProjectDir(req);
  const assetsDir = path.join(projDir, "ASSETS");
  if (!fs.existsSync(assetsDir)) {
    return res.json([]);
  }
  try {
    const scanDir = (dir) => {
      let results = [];
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else {
          const relPath = path.relative(assetsDir, fullPath).replace(/\\/g, "/");
          // Categorize media types
          let type = "other";
          if (relPath.endsWith(".mp4")) {
            type = "video";
          } else if (relPath.endsWith(".png") || relPath.endsWith(".jpeg") || relPath.endsWith(".jpg")) {
            type = "image";
          } else if (relPath.endsWith(".svg")) {
            type = "svg";
          }
          results.push({
            name: relPath,
            sizeBytes: stats.size,
            type: type
          });
        }
      }
      return results;
    };
    res.json(scanDir(assetsDir));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Binary stream upload for narration audio file
app.post("/api/upload-narration", (req, res) => {
  const projDir = getProjectDir(req);
  const narrationFile = path.join(projDir, "narracao_mestra_premium.mp3");
  const writeStream = fs.createWriteStream(narrationFile);
  
  req.pipe(writeStream);
  
  writeStream.on("finish", () => {
    res.json({ success: true, message: "Narração enviada e salva com sucesso!" });
  });
  
  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao escrever arquivo de narração", details: err.message });
  });
});

// API: Binary stream upload for background music
app.post("/api/upload-bgm", (req, res) => {
  const projDir = getProjectDir(req);
  const { block, filename } = req.query;
  
  if (!filename) {
    return res.status(400).json({ error: "O parâmetro filename é obrigatório." });
  }

  const safeFilename = path.basename(filename);
  const destFilePath = path.join(projDir, safeFilename);
  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    try {
      if (block) {
        const configPath = path.join(projDir, "config_qanat.json");
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }

        if (!config.bgm_mappings) {
          config.bgm_mappings = [];
        }

        const blockNum = parseInt(block, 10);
        const existingIdx = config.bgm_mappings.findIndex(m => m.block === blockNum);
        if (existingIdx !== -1) {
          config.bgm_mappings[existingIdx].file = safeFilename;
        } else {
          config.bgm_mappings.push({ block: blockNum, file: safeFilename });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      }

      res.json({
        success: true,
        message: `Música ${safeFilename} enviada com sucesso!`,
        file: safeFilename
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao atualizar configuração de trilhas", details: err.message });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao escrever arquivo de música", details: err.message });
  });
});

// API: Binary stream upload for specific scene asset (saved in ASSETS/cena_scene.ext and updated in config)
app.post("/api/upload-scene-asset", (req, res) => {
  const projDir = getProjectDir(req);
  const { scene, type, filename, idx } = req.query;
  if (!scene || !type || !filename) {
    return res.status(400).json({ error: "Parâmetros scene, type e filename são obrigatórios." });
  }

  const ext = path.extname(filename).toLowerCase() || (type === "video" ? ".mp4" : ".png");
  const assetsDir = path.join(projDir, "ASSETS");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");
  const destFileName = idx !== undefined ? safeFilename : `cena_${scene}${ext}`;
  const destFilePath = path.join(assetsDir, destFileName);
  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    const configPath = path.join(projDir, "config_qanat.json");
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      if (!config.timeline_assets) {
        config.timeline_assets = {};
      }

      const assetItem = {
        asset: destFileName,
        type: type === "video" ? "video" : "image"
      };
      if (type === "video") {
        assetItem.fixed = 8.00;
      }

      if (idx !== undefined) {
        const blockKey = String(scene);
        if (!config.timeline_assets[blockKey]) {
          config.timeline_assets[blockKey] = [];
        }
        const assetIdx = parseInt(idx, 10);
        config.timeline_assets[blockKey][assetIdx] = assetItem;
      } else {
        // Extract block number (integer part) from scene number (e.g. "6" from "6.3")
        const blockKey = String(Math.floor(parseFloat(scene)));
        if (!config.timeline_assets[blockKey]) {
          config.timeline_assets[blockKey] = [];
        }
        config.timeline_assets[blockKey].push(assetItem);
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      
      res.json({ 
        success: true, 
        message: `Arquivo ${destFileName} salvo e vinculado ao Bloco/Cena ${scene} com sucesso!`,
        asset: destFileName
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar na configuração", details: err.message });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao escrever arquivo de mídia", details: err.message });
  });
});

// API: Logo endpoints (Status, Upload, Reset)
app.get("/api/logo/status", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const activeProject = req.query.project || "Buracos no Deserto";
    
    const localLogoAssets = path.join(projDir, "ASSETS", "logo.png");
    const localLogoRoot = path.join(projDir, "logo.png");

    let hasProjectLogo = false;
    let projectLogoPath = null;
    if (activeProject !== "Buracos no Deserto") {
      if (fs.existsSync(localLogoAssets)) {
        hasProjectLogo = true;
        projectLogoPath = `/api/projects-media/${encodeURIComponent(activeProject)}/ASSETS/logo.png`;
      } else if (fs.existsSync(localLogoRoot)) {
        hasProjectLogo = true;
        projectLogoPath = `/api/projects-media/${encodeURIComponent(activeProject)}/logo.png`;
      }
    }

    const globalLogoUrl = `/api/projects-media/ASSETS/logo.png`;
    const currentLogoUrl = hasProjectLogo ? projectLogoPath : globalLogoUrl;

    res.json({
      hasProjectLogo,
      projectLogoUrl: projectLogoPath,
      globalLogoUrl,
      currentLogoUrl
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao obter status do logotipo", details: err.message });
  }
});

app.post("/api/logo/upload", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const isGlobal = req.query.global === "true";
    
    let targetPath;
    if (isGlobal) {
      targetPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");
    } else {
      const assetsDir = path.join(projDir, "ASSETS");
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      targetPath = path.join(assetsDir, "logo.png");
    }

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on("finish", () => {
      res.json({ success: true, message: "Logo salvo com sucesso!" });
    });

    writeStream.on("error", (err) => {
      res.status(500).json({ error: "Erro ao salvar arquivo de logo", details: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao inicializar upload do logotipo", details: err.message });
  }
});

app.post("/api/logo/reset", (req, res) => {
  try {
    const projDir = getProjectDir(req);
    const activeProject = req.query.project || "Buracos no Deserto";

    if (activeProject === "Buracos no Deserto") {
      return res.status(400).json({ error: "Não é possível resetar o logo do projeto padrão (ele já é o padrão global)." });
    }

    const localLogoAssets = path.join(projDir, "ASSETS", "logo.png");
    const localLogoRoot = path.join(projDir, "logo.png");

    let deleted = false;
    if (fs.existsSync(localLogoAssets)) {
      fs.unlinkSync(localLogoAssets);
      deleted = true;
    }
    if (fs.existsSync(localLogoRoot)) {
      fs.unlinkSync(localLogoRoot);
      deleted = true;
    }

    res.json({ 
      success: true, 
      message: deleted ? "Logo do projeto removido. Usando logo global." : "Nenhum logo de projeto personalizado encontrado." 
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao redefinir logotipo", details: err.message });
  }
});

// API: Generate complete custom video script & JSON configurations
const SCRIPT_CREATIVE_REINFORCEMENT = `
REFORCO CRIATIVO NAO OBRIGATORIO:
Use estas ideias apenas como apoio de qualidade narrativa, sem mudar o formato de resposta, sem mudar a divisao em blocos e sem impor novas regras ao fluxo existente.
- Antes de propor ideias ou roteiro, pense no que o publico desse nicho busca agora: duvidas fortes, medos, desejos, polemicas, curiosidades, tendencias e formatos que prendem atencao.
- Evite ideias genericas e repetidas. Varie os angulos entre misterio, descoberta, conflito, erro historico, detalhe esquecido, comparacao inesperada, pergunta provocadora, mito versus realidade e payoff emocional.
- Cada ideia deve ter promessa clara, emocao dominante e motivo concreto para funcionar.
- Na narracao, priorize voz humana, direta, brasileira e cinematografica, com frases que abrem loops e depois entregam recompensa real.
- Reforce os primeiros segundos com gancho forte, quebra de expectativa e uma pergunta implicita que faca a pessoa querer continuar.
- Use tensao progressiva, microcliffhangers, prova, revelacao e payoff final para sustentar retencao.
- O resultado deve satisfazer o espectador; curiosidade sem entrega nao serve.
`;

app.post("/api/ai/generate-creator-script", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
  }
  
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt/Tema não fornecido" });
  }
  
  const promptSystem = `Você é o "AI Video Creator Engine" (Gerador de Roteiros Virais para YouTube + Hyperframe), um roteirista profissional, estrategista de retenção e editor de vídeos para YouTube.
O usuário deseja criar um documentário cinematográfico de 12 blocos sobre o tema: "${prompt}".
Sua missão é criar ideias, roteiros e instruções de edição com alto potencial de clique, retenção, comentários, compartilhamentos, inscritos e satisfação real do público.

${SCRIPT_CREATIVE_REINFORCEMENT}

Regras Gerais:
- Esqueça qualquer tema ou vídeo anterior para não ficar repetitivo.
- A narração do roteiro deve soar humana, natural, direta e com ritmo de vídeo viral. Evite frases robotizadas e explicações lentas.
- O roteiro completo deve durar entre 2 e 5 minutos (cerca de 300 a 600 palavras) e ser dividido em 12 blocos lógicos.
- Crie um gancho inicial que prenda a atenção nos primeiros 3 segundos do bloco 1.
- Utilize técnicas de retenção (open loops, curiosidade progressiva, microcliffhangers, payoff final).
- Defina no máximo 5 prompts visuais de cena (cada cena/vídeo gerado por IA deve ter no máximo 10 segundos). A geração de imagens e destaques estáticos (img ou svg) é ilimitada. Nunca coloque texto dentro dos prompts de imagem ou vídeo (o texto deve entrar separado na edição).

Você deve responder com um objeto JSON válido contendo exatamente as seguintes propriedades:
1. "script": O roteiro de narração completo recomendado para o vídeo (em português brasileiro). Esta narração será dividida em 12 blocos lógicos.
2. "block_phrases": Um array de 12 objetos, um para cada bloco. Cada objeto tem as chaves:
   - "block": (int de 1 a 12)
   - "phrase": A frase inicial do bloco que serve para sincronizar o áudio com o Whisper. Ela deve ter cerca de 4 a 8 palavras e ser o início exato da narração daquele bloco.
3. "impact_texts": Um array contendo sugestões de overlays de frases de impacto. Cada objeto deve ter:
   - "block": (int de 1 a 12)
   - "start_offset": Tempo em segundos a partir do início do bloco para exibir a frase (ex: 0.00, 2.50)
   - "end_offset": Tempo em segundos a partir do início do bloco para ocultar a frase (ex: 4.50, 7.00)
   - "text": O texto curto de impacto em letras maiúsculas (ex: "A GRANDE CONSTRUÇÃO", "SEM ELETRICIDADE")
   Insira cerca de 2 a 3 frases de impacto por bloco.
4. "highlight_keywords": Um array de strings com as palavras-chave que serão destacadas em Gold nas legendas do vídeo (em letras minúsculas).
5. "bgm_mappings": Um array de 12 objetos mapeando cada bloco para um arquivo de trilha sonora recomendado. Utilize apenas os seguintes arquivos disponíveis no projeto:
   - "Middle Eastern Ambient Drone.mp3"
   - "Ancient Desert Cinematic .mp3"
   - "Historical Tension Strings.mp3"
   - "Arabian Caravan Cinematic.mp3"
   - "Cinematic Duduk Sadness.mp3"
   - "Persian Mystical Oasis.mp3"

Retorne APENAS o JSON puro. Não insira blocos de código com markdown \`\`\`json ou explicações antes ou depois. Responda apenas com o JSON estruturado.`;

  try {
    const responseText = await callGeminiWithRetry(apiKey, promptSystem);
    const parsedData = await parseAiJsonResponse(responseText, apiKey, "Roteiro/configuracao");
    
    // Save script to transcripts_readable.txt
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    fs.writeFileSync(transcriptPath, parsedData.script, "utf8");
    
    // Save configuration
    const configPath = path.join(projDir, "config_qanat.json");
    let currentConfig = {};
    if (fs.existsSync(configPath)) {
      try { currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (e) {}
    }
    
    const newConfig = {
      gemini_api_key: currentConfig.gemini_api_key,
      highlight_keywords: parsedData.highlight_keywords,
      bgm_mappings: parsedData.bgm_mappings,
      impact_texts: parsedData.impact_texts,
      block_phrases: parsedData.block_phrases
    };
    
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
    
    res.json({ success: true, script: parsedData.script, config: newConfig });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar roteiro/configuração", details: err.message });
  }
});

function getExistingProjectsMetadata(workspaceDir) {
  const projects = [];
  try {
    // 1. Root project
    const rootConfigPath = path.join(workspaceDir, "config_qanat.json");
    const rootStoryboardPath = path.join(workspaceDir, "storyboard.json");
    let rootTitle = "Buracos no Deserto";
    let rootFormat = "LONGO";
    if (fs.existsSync(rootConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(rootConfigPath, "utf8"));
        if (config.aspect_ratio === "9:16") rootFormat = "SHORTS";
      } catch (e) {}
    }
    if (fs.existsSync(rootStoryboardPath)) {
      try {
        const sb = JSON.parse(fs.readFileSync(rootStoryboardPath, "utf8"));
        if (sb.strategy?.title_main) rootTitle = sb.strategy.title_main;
      } catch (e) {}
    }
    projects.push({ name: "Buracos no Deserto", title: rootTitle, format: rootFormat });

    // 2. Subfolders
    if (fs.existsSync(workspaceDir)) {
      const items = fs.readdirSync(workspaceDir);
      for (const item of items) {
        const fullPath = path.join(workspaceDir, item);
        try {
          if (fs.statSync(fullPath).isDirectory() && !["ASSETS", "OUTPUT", "node_modules", "dashboard-qanat", "dashboard-premium", "temp_clips", "temp_clips_destacado", ".git"].includes(item)) {
            if (fs.existsSync(path.join(fullPath, "build_video.py")) || item === "FINANCAS") {
              let title = item;
              let format = "LONGO";
              const configPath = path.join(fullPath, "config_qanat.json");
              const storyboardPath = path.join(fullPath, "storyboard.json");
              if (fs.existsSync(configPath)) {
                try {
                  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                  if (config.aspect_ratio === "9:16") format = "SHORTS";
                } catch (e) {}
              }
              if (fs.existsSync(storyboardPath)) {
                try {
                  const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
                  if (sb.strategy?.title_main) title = sb.strategy.title_main;
                } catch (e) {}
              }
              projects.push({ name: item, title, format });
            }
          }
        } catch (err) {}
      }
    }
  } catch (e) {
    console.error("Error reading existing projects metadata:", e);
  }
  return projects;
}

// API: SCRIPT MASTER Step 1 - Generate Research & 10 Ideas
app.post("/api/ai/creator/ideas", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
  }

  const { niche, format } = req.body;
  if (!niche || !format) {
    return res.status(400).json({ error: "Nicho e Formato são obrigatórios." });
  }

  const projectsMeta = getExistingProjectsMetadata(WORKSPACE_DIR);
  const sameFormatTitles = projectsMeta
    .filter(p => p.format === format)
    .map(p => p.title);
  const otherFormat = format === "SHORTS" ? "LONGO" : "SHORTS";
  const otherFormatTitles = projectsMeta
    .filter(p => p.format === otherFormat)
    .map(p => p.title);

  let exclusionInstruction = "";
  if (sameFormatTitles.length > 0) {
    exclusionInstruction += `\nIMPORTANTE: Os seguintes temas JÁ foram criados no formato ${format}. Você NÃO PODE, sob hipótese alguma, sugerir ou repetir nenhuma ideia parecida ou com esses mesmos temas para o formato ${format}:\n` + sameFormatTitles.map(t => `- ${t}`).join("\n") + "\n";
  }
  if (otherFormatTitles.length > 0) {
    exclusionInstruction += `\nNOTA: Os seguintes temas foram criados no formato ${otherFormat}. Você PODE sugerir adaptações deles para o formato ${format} (por exemplo, transformar um tema que era de vídeo curto em um vídeo longo ou vice-versa, se for estratégico e relevante), mas NÃO os repita no mesmo formato:\n` + otherFormatTitles.map(t => `- ${t}`).join("\n") + "\n";
  }

  const promptSystem = `Você é o "Lumiera Ideas Engine" (Gerador de Roteiros Virais para YouTube + Hyperframe), um estrategista de retenção e pesquisador de tendências do YouTube.
O usuário fornecerá um Nicho de Vídeo e um Formato (Longo ou Shorts).
Faça uma análise rápida, objetiva e estratégica do nicho e gere exatamente 10 ideias de vídeo virais exclusivas (evitando temas genéricos, sem focar em projetos passados de Qanat para evitar repetições).

${SCRIPT_CREATIVE_REINFORCEMENT}

Diversidade obrigatoria de ideias:
- As 10 ideias devem explorar angulos diferentes entre si; nao entregue variacoes do mesmo titulo.
- Misture pelo menos estes tipos de abordagem quando fizer sentido: misterio, erro historico, detalhe esquecido, revelacao cientifica, comparacao improvavel, historia humana, mito versus realidade, pergunta provocadora, conflito moral e curiosidade visual.
- Evite repetir estruturas como "o segredo de..." em muitas ideias. Varie promessa, emocao e mecanismo de clique.
- Escolha a melhor ideia pelo potencial de retencao e comentario, nao apenas pelo titulo mais chamativo.

Responda APENAS com um objeto JSON válido, sem explicações extras, sem blocos de código com markdown \`\`\`json ou textos antes/depois. O JSON deve possuir exatamente a seguinte estrutura:
{
  "diagnostic": {
    "looking_for": "O que as pessoas estão procurando nesse nicho agora",
    "pain_points": "Principais dores desse público",
    "desires": "Desejos que movem o público",
    "retention_fears": "Medos ou dúvidas que geram retenção",
    "comment_hooks": "Curiosidades ou polêmicas que geram comentários",
    "title_style": "Que tipo de título teria mais chance de clique",
    "core_emotion": "Emoção principal a ser ativada",
    "retention_topics": "Tópicos com maior potencial de retenção",
    "strong_angle": "Qual o ângulo mais forte para o vídeo"
  },
  "ideas": [
    {
      "title": "Título provisório instigante",
      "promise": "Promessa clara do vídeo",
      "emotion": "Emoção dominante",
      "why_works": "Por que esse vídeo pode funcionar",
      "best_format": "LONGO, SHORTS ou AMBOS"
    }
  ],
  "best_idea_index": 0,
  "best_idea_reason": "Explicação detalhada de por que esta é a melhor ideia"
}`;

  try {
    const fullPrompt = `${promptSystem}\n\nENTRADAS:\nNICHO: ${niche}\nFORMATO: ${format}\n${exclusionInstruction}`;
    const responseText = await callGeminiWithRetry(apiKey, fullPrompt);
    const parsedData = await parseAiJsonResponse(responseText, apiKey, "Ideias e diagnostico");
    res.json(parsedData);
  } catch (err) {
    console.error("[IDEAS ENDPOINT ERROR]", err.message);
    res.status(500).json({ error: "Erro ao gerar ideias/diagnóstico", details: err.message });
  }
});

function normalizeKeys(data) {
  if (!data || typeof data !== "object") return data;
  
  const normalized = {};
  
  // Strategy
  const strategyKey = Object.keys(data).find(k => k.toLowerCase() === "strategy" || k.toLowerCase() === "estrategia");
  if (strategyKey && typeof data[strategyKey] === "object") {
    const s = data[strategyKey];
    normalized.strategy = {
      title_main: s.title_main || s.titulo_principal || s.tituloMain || s.title || "",
      title_variations: s.title_variations || s.variacoes_titulo || s.variacoes || s.variations || [],
      hook: s.hook || s.gancho || "",
      target_audience: s.target_audience || s.publico_alvo || s.publico || "",
      tone: s.tone || s.tom || "",
      pinned_comment: s.pinned_comment || s.comentario_fixado || "",
      cta: s.cta || ""
    };
  } else {
    normalized.strategy = { title_main: "", title_variations: [], hook: "", target_audience: "", tone: "", pinned_comment: "", cta: "" };
  }

  // Narrative script
  const scriptKey = Object.keys(data).find(k => k.toLowerCase() === "narrative_script" || k.toLowerCase() === "roteiro_narrativo" || k.toLowerCase() === "roteiro");
  normalized.narrative_script = data[scriptKey] || data.script || data.narrativeScript || "";

  // Visual prompts
  const promptsKey = Object.keys(data).find(k => k.toLowerCase() === "visual_prompts" || k.toLowerCase() === "prompts_visuais" || k.toLowerCase() === "prompts");
  const rawPrompts = data[promptsKey] || [];
  normalized.visual_prompts = (Array.isArray(rawPrompts) ? rawPrompts : []).map((vp, index) => ({
    scene: vp.scene || vp.cena || (index + 1),
    block: vp.block || vp.bloco || Math.floor(index / 2) + 1,
    narration_text: vp.narration_text || vp.narration_excerpt || vp.trecho_narracao || "",
    function: vp.function || vp.funcao || "",
    duration: vp.duration || vp.duracao || "até 10 segundos",
    type: vp.type || vp.tipo || "imagem IA 2k",
    aspect_ratio: vp.aspect_ratio || vp.aspectRatio || vp.formato || vp.proporcao || "16:9",
    prompt: vp.prompt || "",
    text_overlay: vp.text_overlay || vp.textOverlay || vp.texto_tela || vp.textoTela || vp.texto || "",
    editor_notes: vp.editor_notes || vp.editorNotes || vp.observacao_edicao || vp.observacao || "",
    stock_query: vp.stock_query || vp.stockQuery || vp.busca_termo || ""
  }));

  // Editing map
  const mapKey = Object.keys(data).find(k => k.toLowerCase() === "editing_map" || k.toLowerCase() === "mapa_edicao" || k.toLowerCase() === "mapa");
  normalized.editing_map = data[mapKey] || "";

  // Hyperframe prompt
  const hfKey = Object.keys(data).find(k => k.toLowerCase() === "hyperframe_prompt" || k.toLowerCase() === "prompt_hyperframe" || k.toLowerCase() === "prompt_final");
  normalized.hyperframe_prompt = data[hfKey] || "";

  // BGM recommendations
  const bgmRecKey = Object.keys(data).find(k => k.toLowerCase() === "bgm_recommendations" || k.toLowerCase() === "bgm_recommendations_list" || k.toLowerCase() === "recomendacoes_trilha" || k.toLowerCase() === "recomendacoes_bgm");
  if (bgmRecKey && Array.isArray(data[bgmRecKey])) {
    normalized.bgm_recommendations = data[bgmRecKey].map(r => ({
      block: r.block || r.bloco || 0,
      scope: r.scope || r.escopo || (r.block || r.bloco ? "block" : "video"),
      recommendation: r.recommendation || r.recomendacao || r.indicacao || r.sugestao || ""
    }));
  } else {
    normalized.bgm_recommendations = [];
  }

  // Checklist
  const checkKey = Object.keys(data).find(k => k.toLowerCase() === "checklist" || k.toLowerCase() === "lista_qualidade");
  if (checkKey && typeof data[checkKey] === "object") {
    const c = data[checkKey];
    normalized.checklist = {
      click_potential: c.click_potential || c.potencial_clique || c.clique || 0,
      retention_potential: c.retention_potential || c.potencial_retencao || c.retencao || 0,
      comments_potential: c.comments_potential || c.potencial_comentarios || c.comentarios || 0,
      feedback: c.feedback || c.sugestoes || ""
    };
  } else {
    normalized.checklist = { click_potential: 0, retention_potential: 0, comments_potential: 0, feedback: "" };
  }

  // Technical config
  const techKey = Object.keys(data).find(k => k.toLowerCase() === "technical_config" || k.toLowerCase() === "config_tecnica" || k.toLowerCase() === "configuracao_tecnica");
  if (techKey && typeof data[techKey] === "object") {
    const t = data[techKey];
    normalized.technical_config = {
      script: t.script || t.roteiro || "",
      block_phrases: t.block_phrases || t.frases_bloco || t.blockPhrases || [],
      impact_texts: t.impact_texts || t.textos_impacto || t.impactTexts || [],
      highlight_keywords: t.highlight_keywords || t.palavras_chave || t.highlightKeywords || [],
      bgm_mappings: t.bgm_mappings || t.mapeamento_trilhas || t.bgmMappings || []
    };
  } else {
    normalized.technical_config = { script: "", block_phrases: [], impact_texts: [], highlight_keywords: [], bgm_mappings: [] };
  }

  return normalized;
}

// API: SCRIPT MASTER Step 2 - Generate Strategy, Complete Script, and technical mappings
app.post("/api/ai/creator/script", async (req, res) => {
  const { niche, format, idea, project } = req.body;
  if (!niche || !format || !idea || !project) {
    return res.status(400).json({ error: "Nicho, formato, ideia selecionada e nome do projeto são obrigatórios." });
  }

  const safeProjectName = project.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const projDir = path.join(WORKSPACE_DIR, safeProjectName);

  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
  }

  // Automatically create and template project directory on-the-fly if it doesn't exist
  if (!fs.existsSync(projDir)) {
    try {
      fs.mkdirSync(projDir, { recursive: true });
      fs.mkdirSync(path.join(projDir, "ASSETS"), { recursive: true });
      fs.mkdirSync(path.join(projDir, "OUTPUT"), { recursive: true });
      
      ensureFileExists("build_video.py", projDir);
      ensureFileExists("build_video_destacado.py", projDir);
      ensureFileExists("mix_bgm.py", projDir);
      ensureFileExists("find_block_timings.py", projDir);
      ensureFileExists("align_transcripts.py", projDir);
      
      // Copy logo.png if it exists in root ASSETS folder
      const rootLogoPath = path.join(WORKSPACE_DIR, "ASSETS", "logo.png");
      const destLogoPath = path.join(projDir, "ASSETS", "logo.png");
      if (fs.existsSync(rootLogoPath)) {
        fs.copyFileSync(rootLogoPath, destLogoPath);
        console.log(`Copied logo.png to new project ${safeProjectName}`);
      }
      
      const defaultConfigSrc = path.join(WORKSPACE_DIR, "config_qanat.json");
      const defaultConfigDest = path.join(projDir, "config_qanat.json");
      if (fs.existsSync(defaultConfigSrc)) {
        fs.copyFileSync(defaultConfigSrc, defaultConfigDest);
        try {
          const cfg = JSON.parse(fs.readFileSync(defaultConfigDest, "utf8"));
          if (cfg.gemini_api_key) {
            delete cfg.gemini_api_key;
            fs.writeFileSync(defaultConfigDest, JSON.stringify(cfg, null, 2), "utf8");
          }
        } catch (e) {}
      }
      
      fs.writeFileSync(path.join(projDir, "block_timings.json"), JSON.stringify({
        starts: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110],
        durations: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        total_duration: 120
      }, null, 4), "utf8");
    } catch (err) {
      return res.status(500).json({ error: "Erro ao criar pasta do novo projeto", details: err.message });
    }
  }

  const promptSystem = `Você é o "Lumiera Script Master" (Roteirista Profissional, Estrategista de Retenção, Diretor Criativo e Editor de Vídeos para YouTube).
O usuário selecionou a seguinte ideia de vídeo para o nicho "${niche}" (Formato: "${format}"):
Título: "${idea.title}"
Promessa: "${idea.promise}"
Emoção: "${idea.emotion}"

SUA MISSÃO PRINCIPAL:
Crie um roteiro COMPLETO de narração para o vídeo e DIVIDA TODA a narração em segmentos sequenciais. Para CADA segmento da narração, gere um prompt visual correspondente (imagem 2K ou vídeo IA máx 10s). A narração inteira deve ser coberta — sem lacunas. Se precisar de 50, 80 ou 100 segmentos, gere todos. O array "visual_prompts" É o roteiro do vídeo.

${SCRIPT_CREATIVE_REINFORCEMENT}

Reforco especifico para montagem do roteiro:
- Use o reforco acima para melhorar promessa, ritmo, tensao, payoff e naturalidade da narracao.
- Preserve exatamente o formato JSON solicitado abaixo e a estrutura atual de blocos/segmentos.
- Nao reduza a cobertura visual: o array visual_prompts continua cobrindo toda a narracao, como o programa ja espera.

Regras do Roteiro:
1. Pesquise internamente o nicho (tendências, dores, desejos, medos, polêmicas, curiosidades).
2. Não repita temas de vídeos anteriores.
3. Prenda a atenção nos primeiros 3 segundos.
4. Use open loop, curiosidade progressiva, microcliffhangers e payoff final.
5. Narração em português brasileiro, natural, humana e direta.
6. Formato: "${format}".
   - SHORTS: 30-50 segundos, 5 cenas (gancho, contexto, desenvolvimento, virada, payoff+CTA).
   - LONGO: O roteiro DEVE ser muito profundo, detalhado e extenso. O tempo de vídeo ideal é de 10 a 20 minutos (1500 a 3000 palavras). Explore cada detalhe do assunto ao máximo, traga histórias, metáforas, contexto histórico, dados e crie uma narrativa imersiva. Estruture em pelo menos 12 blocos (cold open, promessa, contexto, desenvolvimento profundo, tensão, valor, resumo, payoff, CTA). NUNCA faça um roteiro superficial ou curto.

Regras dos Prompts Visuais:
- CUBRA 100% DA NARRAÇÃO. Cada 1-2 frases da narração = 1 prompt visual. Nenhuma frase fica sem cobertura visual.
- 80-90% devem ser IMAGEM IA 2K (photorealistic 2k resolution, cinematic, para usar com efeito Ken Burns zoom lento).
- 10-20% devem ser VÍDEO IA (máximo estrito de 10 segundos, apenas para movimento ativo: água, fogo, multidão, câmera em movimento).
- Prompts variados: close-ups, planos abertos, aéreas, texturas, detalhes, paisagens, mapas, infográficos visuais.
- Nunca coloque texto dentro dos prompts visuais.
- Cada prompt deve ter um stock_query para busca em Pexels/Pixabay/Canva.

FORMATO DE RESPOSTA - JSON válido com estas propriedades:

1. "strategy": {
   "title_main": "Título principal com alta taxa de clique",
   "title_variations": ["var1", "var2", "var3", "var4", "var5"],
   "hook": "Gancho de 3 segundos",
   "target_audience": "Público-alvo",
   "tone": "Tom do vídeo",
   "pinned_comment": "Comentário fixado estratégico",
   "cta": "CTA suave"
}

2. "narrative_script": "A narração COMPLETA do vídeo inteiro em texto corrido (limpa, sem tags).",

3. "narrative_script_tagged": "A mesma narração COMPLETA, mas com 'auto tags' de áudio. É fundamental que as tags sejam colocadas EXATAMENTE de acordo com a emoção e o momento da narração. Use [pause] para suspense, (breath) antes de frases longas ou após surpresas, (sigh) para cansaço/desilusão, (laughs) para humor leve, ou <break time=\"1.5s\"/> para viradas drásticas de assunto. Dê ritmo humano e teatral ao texto.",

4. "visual_prompts": [
   GERE UM OBJETO PARA CADA SEGMENTO DA NARRAÇÃO. Cubra o vídeo inteiro. Exemplo para LONGO: 40-80 objetos. Cada objeto:
   {
     "scene": "1.1",
     "block": 1,
     "narration_text": "O trecho EXATO da narração que será falado durante esta cena. Copie 1-2 frases da narração.",
     "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
     "duration": "3 a 5 segundos",
     "prompt": "Prompt cinematográfico completo em inglês. Para imagem: photorealistic 2k resolution, cinematic lighting, sharp detail, no text. Para vídeo: cinematic motion, max 10 seconds, no text.",
     "editor_notes": "Como usar na edição: Ken Burns zoom in, dissolve, corte seco, etc. + justificativa imagem vs vídeo.",
     "stock_query": "termo curto em inglês para busca em Pexels/Pixabay/Canva"
   }
]

5. "bgm_recommendations": [
   GERE UM OBJETO PARA CADA BLOCO DA NARRATIVA.
   {
     "block": 1,
     "recommendation": "Descreva o tipo de trilha sonora ideal para este bloco (ex: drone tenso de suspense, bateria tribal épica crescendo, piano triste e suave)."
   }
]

6. "editing_map": "Instruções gerais de edição."

7. "hyperframe_prompt": "Prompt final para o agente HyperFrame em português."

8. "checklist": {
   "click_potential": 0-10,
   "retention_potential": 0-10,
   "comments_potential": 0-10,
   "feedback": "Avaliação rápida"
}

9. "technical_config": {
   "script": "Narração dividida em 12 parágrafos (Longo) ou 5 (Shorts) separados por quebra de linha.",
   "block_phrases": [{"block": 1, "phrase": "início do bloco"}],
   "impact_texts": [{"block": 1, "start_offset": 0.0, "end_offset": 4.5, "text": "TEXTO IMPACTO"}],
   "highlight_keywords": ["palavra1", "palavra2"],
   "bgm_mappings": [{"block": 1, "file": "sugestao_nome_trilha.mp3"}]
}

REGRAS FINAIS:
- Retorne APENAS JSON puro, sem markdown, sem explicações.
- O JSON deve ser 100% válido. Escape aspas internas com barra invertida.
- O array visual_prompts deve cobrir TODA a narração sem lacunas.
- Gere quantas cenas forem necessárias (40-80+ para Longo, 5-10 para Shorts).`;


  let responseText = "";
  try {
    responseText = await callGeminiWithRetry(apiKey, promptSystem);

    const rawData = await parseAiJsonResponse(responseText, apiKey, "Roteiro e estrategia");
    const parsedData = normalizeKeys(rawData);

    // Save full storyboard JSON
    const storyboardPath = path.join(projDir, "storyboard.json");
    fs.writeFileSync(storyboardPath, JSON.stringify(parsedData, null, 2), "utf8");

    // Save technical configurations to active project directory
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    let scriptText = parsedData.technical_config?.script;
    if (Array.isArray(scriptText)) {
      scriptText = scriptText.join("\n\n");
    } else if (typeof scriptText !== "string") {
      scriptText = String(scriptText || "");
    }
    fs.writeFileSync(transcriptPath, scriptText, "utf8");

    const configPath = path.join(projDir, "config_qanat.json");
    let currentConfig = {};
    if (fs.existsSync(configPath)) {
      try { currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (e) {}
    }

    const newConfig = {
      gemini_api_key: currentConfig.gemini_api_key,
      highlight_keywords: parsedData.technical_config?.highlight_keywords || [],
      bgm_mappings: [],
      impact_texts: parsedData.technical_config?.impact_texts || [],
      block_phrases: parsedData.technical_config?.block_phrases || []
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");

    res.json(parsedData);
  } catch (err) {
    console.error("Erro no endpoint /api/ai/creator/script:", err);
    if (responseText) {
      console.error("Raw responseText returned from Gemini was:\n", responseText);
    }
    res.status(500).json({ error: "Erro ao gerar roteiro e estratégia", details: err.message });
  }
});

// API: Automap available files in ASSETS to script narrative blocks using Gemini
app.post("/api/ai/auto-map-assets", async (req, res) => {
  const projDir = getProjectDir(req);
  
  try {
    const mapped = buildTimelineFromStoryboard(projDir);
    const autoConfigPath = path.join(projDir, "config_qanat.json");
    let autoConfig = {};
    if (fs.existsSync(autoConfigPath)) {
      autoConfig = JSON.parse(fs.readFileSync(autoConfigPath, "utf8"));
    }

    autoConfig.timeline_assets = mapped.timelineAssets;
    fs.writeFileSync(autoConfigPath, JSON.stringify(autoConfig, null, 2), "utf8");

    return res.json({
      success: true,
      timeline_assets: mapped.timelineAssets,
      asset_count: mapped.assetCount,
      warnings: mapped.warnings,
    });

    // List available assets
    const assetsDir = path.join(projDir, "ASSETS");
    let assetFiles = [];
    if (fs.existsSync(assetsDir)) {
      const scan = (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            scan(fullPath);
          } else {
            const rel = path.relative(assetsDir, fullPath).replace(/\\/g, "/");
            if (rel.endsWith(".mp4") || rel.endsWith(".png") || rel.endsWith(".jpg") || rel.endsWith(".jpeg")) {
              assetFiles.push(rel);
            }
          }
        }
      };
      scan(assetsDir);
    }
    
    const transcriptPath = path.join(projDir, "transcripts_readable.txt");
    let transcript = "";
    if (fs.existsSync(transcriptPath)) {
      transcript = fs.readFileSync(transcriptPath, "utf8");
    }
    
    const prompt = `Você é o "AI Asset Timeline Mapper".
Temos um conjunto de arquivos B-roll na pasta "ASSETS":
${JSON.stringify(assetFiles, null, 2)}

E temos o seguinte roteiro de documentário estruturado em blocos:
${transcript}

Mapeie estes arquivos de mídia para preencher os 12 blocos lógicos da linha do tempo. Cada bloco deve possuir entre 2 a 8 arquivos associados (misturando vídeos de forma flexível ou imagens).

Responda com um objeto JSON puro, sem blocos de código com markdown \`\`\`json ou explicações extras. O objeto deve conter uma propriedade "timeline_assets" estruturada da seguinte forma:
{
  "timeline_assets": {
    "1": [
      {"asset": "videos/video_1.mp4", "type": "video", "fixed": 8.00},
      {"asset": "images/img_1.jpeg", "type": "image"}
    ],
    "2": [
      {"asset": "videos/video_3.mp4", "type": "video", "fixed": 8.00},
      {"asset": "images/img_12.jpeg", "type": "image"}
    ],
    ...
    "12": [
      {"asset": "images/img_70.jpeg", "type": "image"}
    ]
  }
}

Regras importantes:
- Utilize APENAS os nomes de arquivos reais da lista fornecida. Não invente arquivos que não existem.
- O tipo ("type") deve ser "video", "image" ou "svg".
- Se for "video", adicione uma propriedade "fixed" indicando quanto tempo o vídeo é exibido (geralmente 8.00 ou 10.00 segundos). Se for "image", não inclua "fixed" (ela será esticada ou encurtada de forma flexível pelo editor).
- Mapeie de forma a contar a história visualmente do bloco de acordo com o texto da narração correspondente.`;

    const responseText = await callGeminiWithRetry(apiKey, prompt);
    
    const parsedData = await parseAiJsonResponse(responseText, apiKey, "Mapeamento de assets");
    
    // Save back to config
    const configPath = path.join(projDir, "config_qanat.json");
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    
    config.timeline_assets = parsedData.timeline_assets;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    
    res.json({ success: true, timeline_assets: parsedData.timeline_assets });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mapear assets", details: err.message });
  }
});

// API: Run dynamic whisper transcription sync sequentially
app.get("/api/sync-timings", (req, res) => {
  const projDir = getProjectDir(req);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendLog = (text) => {
    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
  };

  sendLog("[Dashboard] Iniciando Sincronização e Alinhamento por Transcrição...");
  sendLog("[1/2] Executando análise do Whisper (find_block_timings.py)...");

  ensureFileExists("find_block_timings.py", projDir);
  ensureFileExists("align_transcripts.py", projDir);

  const child1 = spawn(PYTHON_PATH, ["find_block_timings.py"], {
    cwd: projDir,
    shell: true,
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });

  child1.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      text.split(/\r?\n/).forEach(line => sendLog(line));
    }
  });

  child1.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      text.split(/\r?\n/).forEach(line => sendLog(`[ERRO Whisper] ${line}`));
    }
  });

  child1.on("close", (code1) => {
    if (code1 !== 0) {
      res.write(`data: ${JSON.stringify({ type: "failed", code: code1 })}\n\n`);
      res.end();
      return;
    }

    sendLog("\n[2/2] Gerando banco de palavras e alinhamento (align_transcripts.py)...");
    const child2 = spawn(PYTHON_PATH, ["align_transcripts.py"], {
      cwd: projDir,
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    child2.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        text.split(/\r?\n/).forEach(line => sendLog(line));
      }
    });

    child2.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        text.split(/\r?\n/).forEach(line => sendLog(`[ERRO Alinhador] ${line}`));
      }
    });

    child2.on("close", (code2) => {
      if (code2 === 0) {
        res.write(`data: ${JSON.stringify({ type: "complete", code: code2 })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: "failed", code: code2 })}\n\n`);
      }
      res.end();
    });
  });

  req.on("close", () => {
    child1.kill();
  });
});

// Serve frontend build static files in production
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
