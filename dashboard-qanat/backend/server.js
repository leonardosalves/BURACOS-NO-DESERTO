import express from "express";
import https from "https";

import { searchMusic, downloadMusicTrack, searchSoundEffects, downloadSoundEffect } from "./epidemicService.js";
import {
  buildOverlayOrchestrationPlan,
  buildOrchestrationPrompt,
  enforceOverlayOrchestration,
  VARIETY_PROFILES,
} from "./overlayOrchestration.js";
import {
  buildYoutubeMetadataPrompt,
  buildFallbackYoutubeMetadata,
  parseYoutubeMetadataMarkdown,
  resolveYoutubeMetadataContext,
} from "./youtubeMetadataOptimizer.js";

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

// Desktop projects configuration

const PROJECTS_ROOT = path.join(process.env.USERPROFILE || "C:\\Users\\Leo", "Desktop", "Lumiera Videos");

const LONGS_DIR = path.join(PROJECTS_ROOT, "videos longos");

const SHORTS_DIR = path.join(PROJECTS_ROOT, "videos curtos shorts");

// Auto-create directories on startup

if (!fs.existsSync(PROJECTS_ROOT)) fs.mkdirSync(PROJECTS_ROOT, { recursive: true });

if (!fs.existsSync(LONGS_DIR)) fs.mkdirSync(LONGS_DIR, { recursive: true });

if (!fs.existsSync(SHORTS_DIR)) fs.mkdirSync(SHORTS_DIR, { recursive: true });

// OpenRouter Settings

const OPENROUTER_DEFAULT_KEY = "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";

const OPENROUTER_FREE_MODELS = [

  "google/gemma-4-31b-it:free",

  "meta-llama/llama-3.3-70b-instruct:free",

  "meta-llama/llama-3.2-3b-instruct:free",

  "nousresearch/hermes-3-llama-3.1-405b:free",

  "qwen/qwen3-coder:free"

];

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/projects-media", (req, res, next) => {

  const decodedUrl = decodeURIComponent(req.path);

  const parts = decodedUrl.split("/").filter(Boolean);

  if (parts.length === 0) {

    return res.status(404).end();

  }

  

  const projName = parts[0].replace(/ /g, "_");

  

  // Decide where this file lives

  let projDir = WORKSPACE_DIR;

  if (projName === "ASSETS") {

    projDir = WORKSPACE_DIR;

    const fileSubpath = parts.join("/");

    const fullFilePath = path.join(projDir, fileSubpath);

    if (fs.existsSync(fullFilePath)) {

      return res.sendFile(fullFilePath);

    }

  } else {

    const candidateLong = path.join(LONGS_DIR, projName);

    const candidateShort = path.join(SHORTS_DIR, projName);

    

    if (fs.existsSync(candidateLong)) {

      projDir = candidateLong;

    } else if (fs.existsSync(candidateShort)) {

      projDir = candidateShort;

    } else {

      projDir = path.join(WORKSPACE_DIR, projName);

    }

    

    const fileSubpath = parts.slice(1).join("/");

    const fullFilePath = path.join(projDir, fileSubpath);

    if (fs.existsSync(fullFilePath)) {

      return res.sendFile(fullFilePath);

    }

  }

  next();

});

// Helper: Resolve active project directory dynamically based on request parameters

function getProjectDir(req) {
  const rawProjName = req.query?.project || req.body?.project;
  if (!rawProjName) {
    return WORKSPACE_DIR;
  }

  // Test multiple project name variations for robust matching
  const decoded = decodeURIComponent(rawProjName);
  const candidates = [
    rawProjName,
    decoded,
    rawProjName.replace(/ /g, "_"),
    decoded.replace(/ /g, "_"),
    rawProjName.replace(/%20/g, " "),
    decoded.replace(/ /g, "%20")
  ];

  const uniqueCandidates = [...new Set(candidates)];

  for (const name of uniqueCandidates) {
    const candidateLong = path.join(LONGS_DIR, name);
    if (fs.existsSync(candidateLong)) {
      global.lastActiveProjectDir = candidateLong;
      return candidateLong;
    }
    const candidateShort = path.join(SHORTS_DIR, name);
    if (fs.existsSync(candidateShort)) {
      global.lastActiveProjectDir = candidateShort;
      return candidateShort;
    }
    const candidateWork = path.join(WORKSPACE_DIR, name);
    if (fs.existsSync(candidateWork)) {
      global.lastActiveProjectDir = candidateWork;
      return candidateWork;
    }
  }

  global.lastActiveProjectDir = WORKSPACE_DIR;
  return WORKSPACE_DIR;
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
    const projects = [];
    
    const inferNiche = (itemName) => {
      const name = itemName.toLowerCase();
      if (name.includes("romano") || name.includes("castelo") || name.includes("viking") || name.includes("inca") || name.includes("asteca") || name.includes("muralha") || name.includes("medieval") || name.includes("giram") || name.includes("fortes")) {
        return "História";
      }
      if (name.includes("computador") || name.includes("antikythera") || name.includes("tecnologia")) {
        return "Tecnologia";
      }
      if (name.includes("deserto") || name.includes("amazonia") || name.includes("ilhas") || name.includes("flutuantes")) {
        return "Geografia";
      }
      if (name.includes("financas") || name.includes("dinheiro") || name.includes("invest")) {
        return "Finanças";
      }
      return "Curiosidades";
    };

    const scanDir = (dir, format) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory() && !["ASSETS", "OUTPUT", "node_modules", "temp_clips", "temp_clips_destacado", ".git"].includes(item)) {
          if (fs.existsSync(path.join(fullPath, "build_video.py")) || item === "FINANCAS") {
            let title = item;
            let niche = "Curiosidades";

            // Check config_qanat.json first
            const configPath = path.join(fullPath, "config_qanat.json");
            if (fs.existsSync(configPath)) {
              try {
                const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
                if (cfg.niche) {
                  niche = cfg.niche;
                } else {
                  niche = inferNiche(item);
                  cfg.niche = niche;
                  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
                }
              } catch (e) {}
            } else {
              niche = inferNiche(item);
            }

            const storyboardPath = path.join(fullPath, "storyboard.json");
            if (fs.existsSync(storyboardPath)) {
              try {
                const sb = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
                if (sb.strategy?.title_main) title = sb.strategy.title_main;
              } catch (e) {}
            }

            projects.push({ name: item, path: fullPath, format, title, niche });
          }
        }
      }
    };
    
    scanDir(LONGS_DIR, "LONGO");
    scanDir(SHORTS_DIR, "SHORTS");
    
    res.json(projects);

  } catch (e) {

    res.status(500).json({ error: e.message });

  }

});

// API: Create and template new project subfolder

app.post("/api/projects/create", (req, res) => {

  const { name, format, niche } = req.body;

  if (!name || !name.trim()) {

    return res.status(400).json({ error: "Nome do projeto é obrigatório" });

  }

  

  const isShort = (format === "SHORTS");

  const targetParentDir = isShort ? SHORTS_DIR : LONGS_DIR;

  const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

  const projDir = path.join(targetParentDir, safeName);

  

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

    ensureFileExists("upload_pipeline.py", projDir);

    ensureFileExists("upload_youtube.py", projDir);

    ensureFileExists("upload_instagram.py", projDir);

    ensureFileExists("upload_tiktok_playwright.py", projDir);

    ensureFileExists("upload_kwai_playwright.py", projDir);

    

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

        cfg.aspect_ratio = isShort ? "9:16" : "16:9";

        cfg.niche = niche || "Geral";

        if (cfg.gemini_api_key) delete cfg.gemini_api_key;

        fs.writeFileSync(defaultConfigDest, JSON.stringify(cfg, null, 2), "utf8");

      } catch (e) {}

    } else {

      const cfg = { aspect_ratio: isShort ? "9:16" : "16:9", niche: niche || "Geral" };

      fs.writeFileSync(defaultConfigDest, JSON.stringify(cfg, null, 2), "utf8");

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

  

  let projDir = path.join(WORKSPACE_DIR, safeName);

  const candidateLong = path.join(LONGS_DIR, safeName);

  const candidateShort = path.join(SHORTS_DIR, safeName);

  if (fs.existsSync(candidateLong)) {

    projDir = candidateLong;

  } else if (fs.existsSync(candidateShort)) {

    projDir = candidateShort;

  }

  

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

    let existingConfig = {};

    if (fs.existsSync(configPath)) {

      try {

        existingConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

      } catch (e) {}

    }

    const mergedConfig = { ...existingConfig, ...req.body };

    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), "utf8");

    res.json({ success: true, message: "config_qanat.json salvo com sucesso" });

  } catch (err) {

    res.status(500).json({ error: "Erro ao salvar config", details: err.message });

  }

});

// POST /api/upload/youtube/save-credentials
app.post("/api/upload/youtube/save-credentials", (req, res) => {
  const { client_id, client_secret } = req.body;
  if (!client_id || !client_secret) {
    return res.status(400).json({ error: "Client ID e Client Secret são obrigatórios" });
  }
  const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  try {
    fs.writeFileSync(secretsPath, JSON.stringify({ client_id, client_secret }, null, 2), "utf8");
    res.json({ success: true, message: "Credenciais de API do YouTube salvas com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar credenciais do YouTube", details: err.message });
  }
});

// POST /api/upload/instagram/save-credentials
app.post("/api/upload/instagram/save-credentials", (req, res) => {
  const { instagram_business_account_id, access_token } = req.body;
  if (!instagram_business_account_id || !access_token) {
    return res.status(400).json({ error: "ID da conta Business e Token de Acesso são obrigatórios" });
  }
  const secretsPath = path.join(WORKSPACE_DIR, "instagram_secrets.json");
  try {
    fs.writeFileSync(secretsPath, JSON.stringify({ instagram_business_account_id, access_token }, null, 2), "utf8");
    res.json({ success: true, message: "Credenciais de API do Instagram salvas com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar credenciais do Instagram", details: err.message });
  }
});

// GET /api/upload/status
app.get("/api/upload/status", (req, res) => {
  const ytSecrets = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  const ytToken = path.join(WORKSPACE_DIR, "youtube_token.json");
  const igSecrets = path.join(WORKSPACE_DIR, "instagram_secrets.json");
  const ttCookies = path.join(WORKSPACE_DIR, "tiktok_cookies.json");
  const kwCookies = path.join(WORKSPACE_DIR, "kwai_cookies.json");

  let yt_client_id = null;
  if (fs.existsSync(ytSecrets)) {
    try {
      const data = JSON.parse(fs.readFileSync(ytSecrets, "utf8"));
      yt_client_id = data.client_id;
    } catch (e) {}
  }

  let ig_account_id = null;
  if (fs.existsSync(igSecrets)) {
    try {
      const data = JSON.parse(fs.readFileSync(igSecrets, "utf8"));
      ig_account_id = data.instagram_business_account_id;
    } catch (e) {}
  }

  res.json({
    youtube: {
      connected: fs.existsSync(ytSecrets) && fs.existsSync(ytToken),
      has_secrets: fs.existsSync(ytSecrets),
      client_id: yt_client_id
    },
    instagram: {
      connected: fs.existsSync(igSecrets),
      account_id: ig_account_id
    },
    tiktok: {
      connected: fs.existsSync(ttCookies)
    },
    kwai: {
      connected: fs.existsSync(kwCookies)
    }
  });
});

// GET /api/upload/youtube/auth-url
app.get("/api/upload/youtube/auth-url", (req, res) => {
  const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  if (!fs.existsSync(secretsPath)) {
    return res.status(400).json({ error: "Credenciais do YouTube ausentes no servidor." });
  }
  try {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    const redirectUri = "http://localhost:3005/api/upload/youtube/callback";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${secrets.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline&prompt=consent`;
    res.json({ url: authUrl });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar URL do YouTube", details: err.message });
  }
});

// GET /api/upload/youtube/callback
app.get("/api/upload/youtube/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Código não fornecido.");
  }
  const secretsPath = path.join(WORKSPACE_DIR, "youtube_client_secrets.json");
  if (!fs.existsSync(secretsPath)) {
    return res.status(400).send("Credenciais do YouTube ausentes.");
  }
  try {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    const redirectUri = "http://localhost:3005/api/upload/youtube/callback";
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: secrets.client_id,
        client_secret: secrets.client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokens = await response.json();
    if (tokens.error) {
      return res.status(400).send(`Erro ao obter tokens: ${tokens.error_description || tokens.error}`);
    }
    const tokenPath = path.join(WORKSPACE_DIR, "youtube_token.json");
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), "utf8");
    res.send(`
      <html>
        <body style="background:#09090b; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
          <div style="text-align:center; border: 1px solid #27272a; padding: 2rem; border-radius: 1.5rem; background: #0c0c0e;">
            <h1 style="color:#d4af37;">YouTube Conectado!</h1>
            <p style="color:#a1a1aa;">Conta vinculada com sucesso. Você já pode fechar esta aba.</p>
            <button onclick="window.close()" style="background:#d4af37; border:none; padding:0.5rem 1.5rem; border-radius:0.5rem; font-weight:bold; cursor:pointer;">Fechar</button>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Erro: ${err.message}`);
  }
});

// POST /api/upload/launch-login
app.post("/api/upload/launch-login", (req, res) => {
  const { platform } = req.body;
  if (!platform || !["tiktok", "kwai"].includes(platform.toLowerCase())) {
    return res.status(400).json({ error: "Plataforma inválida." });
  }
  
  // Start capture_cookies.py in headful mode in background
  const cpScript = path.join(WORKSPACE_DIR, "capture_cookies.py");
  if (!fs.existsSync(cpScript)) {
    return res.status(404).json({ error: "Script capture_cookies.py não encontrado." });
  }
  
  const child = spawn(PYTHON_PATH, ["capture_cookies.py", platform.toLowerCase()], {
    cwd: WORKSPACE_DIR,
    shell: true,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  
  res.json({ success: true, message: `Navegador aberto na sua área de trabalho para login do ${platform.toUpperCase()}. Realize o login e feche-o para concluir.` });
});

// GET /api/projects/upload-pipeline
app.get("/api/projects/upload-pipeline", (req, res) => {
  const projDir = getProjectDir(req);
  const platforms = req.query.platforms || "";
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendLog = (text) => {
    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);
  };

  sendLog(`[Pipeline] Iniciando Upload Automatizado com plataformas: ${platforms}...`);
  
  const scriptPath = path.join(projDir, "upload_pipeline.py");
  if (!fs.existsSync(scriptPath)) {
    ensureFileExists("upload_pipeline.py", projDir);
  }

  const child = spawn(PYTHON_PATH, ["upload_pipeline.py", projDir, platforms], {
    cwd: projDir,
    shell: true
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.strip ? line.strip() : line.trim()) {
        sendLog(line.strip ? line.strip() : line.trim());
      }
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.strip ? line.strip() : line.trim()) {
        sendLog(`[Error] ${line.strip() ? line.strip() : line.trim()}`);
      }
    }
  });

  child.on("close", (code) => {
    if (code === 0) {
      res.write(`data: ${JSON.stringify({ type: "complete", message: "Processo de upload concluído!" })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: `O processo encerrou com código ${code}` })}\n\n`);
    }
    res.end();
  });
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

      .filter(f => f.endsWith(".mp4") || f.endsWith(".mov") || f.endsWith(".webm"))

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

    // Auto-migrate: Bind assets from config.timeline_assets to storyboard scenes if not already bound

    const configPath = path.join(projDir, "config_qanat.json");

    if (fs.existsSync(configPath) && data.visual_prompts && Array.isArray(data.visual_prompts)) {

      try {

        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        if (config.timeline_assets) {

          const blockAssetCounts = {};

          data.visual_prompts.forEach(vp => {

            const blockNum = vp.block || 1;

            const blockKey = String(blockNum);

            if (blockAssetCounts[blockKey] === undefined) {

              blockAssetCounts[blockKey] = 0;

            }

            const assetIdx = blockAssetCounts[blockKey];

            blockAssetCounts[blockKey]++;

            if (!vp.asset && config.timeline_assets[blockKey] && config.timeline_assets[blockKey][assetIdx]) {

              const configAsset = config.timeline_assets[blockKey][assetIdx];

              if (configAsset && configAsset.asset) {

                vp.asset = configAsset;

              }

            }

          });

        }

      } catch (e) {

        console.error("Migration error:", e);

      }

    }

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

    // Reconstruct config.timeline_assets from scene assets in storyboardData.visual_prompts

    const nextTimelineAssets = {};

    visualPrompts.forEach((vp) => {

      const blockNum = vp.block || 1;

      const blockKey = String(blockNum);

      if (!nextTimelineAssets[blockKey]) {

        nextTimelineAssets[blockKey] = [];

      }

      const assetIdx = nextTimelineAssets[blockKey].length;

      if (vp.asset && vp.asset.asset) {

        nextTimelineAssets[blockKey][assetIdx] = vp.asset;

      } else {

        nextTimelineAssets[blockKey][assetIdx] = {};

      }

    });

    config.timeline_assets = nextTimelineAssets;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    res.json({ success: true, message: "Roteiro e storyboard salvos com sucesso!" });

  } catch (err) {

    res.status(500).json({ error: "Erro ao salvar o storyboard", details: err.message });

  }

});

// GET /api/render/config

app.get("/api/render/config", (req, res) => {

  const globalConfigPath = path.join(__dirname, "render_config_global.json");

  if (!fs.existsSync(globalConfigPath)) {

    return res.json({

      fps: 30,

      blockGapSeconds: 1.0,

      musicVolume: 0.15,

      useRemotionByDefault: true,

      debugOverlay: false,

      youtubeChannel: {
        channelUrl: "https://www.youtube.com/channel/UCYYcyky9A8fob3t6TlIENYA",
        channelName: "",
        subscriberCount: "",
      },

    });

  }

  try {

    const data = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));

    res.json(data);

  } catch (err) {

    res.status(500).json({ error: "Erro ao ler configurações globais." });

  }

});

// POST /api/render/config

app.post("/api/render/config", (req, res) => {

  const globalConfigPath = path.join(__dirname, "render_config_global.json");

  const configData = req.body;

  try {

    fs.writeFileSync(globalConfigPath, JSON.stringify(configData, null, 2), "utf8");

    res.json({ success: true, message: "Configurações globais salvas com sucesso." });

  } catch (err) {

    res.status(500).json({ error: "Erro ao salvar configurações globais." });

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

const AUDIO_TRACK_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"]);

const PROTECTED_AUDIO_FILES = new Set([

  "narracao_mestra_premium.mp3",

  "narracao_master.mp3",

  "voiceover.mp3",

  "1.mp3",

  "2.mp3",

  "3.mp3"

]);

function isDeletableBgmFile(fileName) {

  const safeName = path.basename(String(fileName || ""));

  const lower = safeName.toLowerCase();

  return (

    safeName &&

    safeName === fileName &&

    AUDIO_TRACK_EXTENSIONS.has(path.extname(lower)) &&

    !PROTECTED_AUDIO_FILES.has(lower)

  );

}

function clearBgmReferences(projDir, removedNames) {

  const configPath = path.join(projDir, "config_qanat.json");

  const config = readJsonFile(configPath);

  if (!config) return;

  const removed = new Set(removedNames.map(name => String(name).toLowerCase()));

  let changed = false;

  if (Array.isArray(config.bgm_mappings)) {

    const nextMappings = config.bgm_mappings.filter(mapping => !removed.has(String(mapping.file || "").toLowerCase()));

    changed = changed || nextMappings.length !== config.bgm_mappings.length;

    config.bgm_mappings = nextMappings;

  }

  if (config.single_bgm && removed.has(String(config.single_bgm).toLowerCase())) {

    config.single_bgm = "";

    config.use_single_bgm = false;

    changed = true;

  }

  if (changed) {

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

  }

}

function clearAudioReferences(projDir, removedNames) {

  clearBgmReferences(projDir, removedNames);

  const sfxTimelinePath = path.join(projDir, "sfx_timeline.json");

  const sfxTimeline = readJsonFile(sfxTimelinePath);

  if (!sfxTimeline || !Array.isArray(sfxTimeline.sfx_events)) return;

  const removed = new Set(removedNames.map(name => String(name).toLowerCase()));

  const nextEvents = sfxTimeline.sfx_events.filter(event => !removed.has(String(event.file || "").toLowerCase()));

  if (nextEvents.length !== sfxTimeline.sfx_events.length) {

    sfxTimeline.sfx_events = nextEvents;

    fs.writeFileSync(sfxTimelinePath, JSON.stringify(sfxTimeline, null, 2), "utf8");

  }

}

function deleteProjectAudioFile(projDir, fileName) {

  if (!isDeletableBgmFile(fileName)) {

    const err = new Error("Arquivo de audio invalido ou protegido.");

    err.statusCode = 400;

    throw err;

  }

  const root = path.resolve(projDir);

  const targetPath = path.resolve(projDir, fileName);

  if (!targetPath.startsWith(root + path.sep)) {

    const err = new Error("Caminho invalido.");

    err.statusCode = 400;

    throw err;

  }

  if (!fs.existsSync(targetPath)) {

    const err = new Error("Arquivo de audio nao encontrado.");

    err.statusCode = 404;

    throw err;

  }

  fs.unlinkSync(targetPath);

  clearAudioReferences(projDir, [fileName]);

  return fileName;

}

// API: Delete one background music track

app.delete("/api/music/:filename", (req, res) => {

  const projDir = getProjectDir(req);

  try {

    const deleted = deleteProjectAudioFile(projDir, req.params.filename);

    res.json({ success: true, deleted: [deleted] });

  } catch (err) {

    res.status(err.statusCode || 500).json({ error: err.message });

  }

});

app.post("/api/music/delete", (req, res) => {

  const projDir = getProjectDir(req);

  try {

    const deleted = deleteProjectAudioFile(projDir, req.body?.filename);

    res.json({ success: true, deleted: [deleted] });

  } catch (err) {

    res.status(err.statusCode || 500).json({ error: err.message });

  }

});

// API: Delete all user/downloaded background music tracks from the current project

app.delete("/api/music", (req, res) => {

  const projDir = getProjectDir(req);

  try {

    const deleted = [];

    for (const fileName of fs.readdirSync(projDir)) {

      if (!isDeletableBgmFile(fileName)) continue;

      deleted.push(deleteProjectAudioFile(projDir, fileName));

    }

    res.json({ success: true, deleted });

  } catch (err) {

    res.status(err.statusCode || 500).json({ error: err.message });

  }

});

app.post("/api/music/delete-all", (req, res) => {

  const projDir = getProjectDir(req);

  try {

    const deleted = [];

    for (const fileName of fs.readdirSync(projDir)) {

      if (!isDeletableBgmFile(fileName)) continue;

      deleted.push(deleteProjectAudioFile(projDir, fileName));

    }

    res.json({ success: true, deleted });

  } catch (err) {

    res.status(err.statusCode || 500).json({ error: err.message });

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

// API: Search music/SFX on Epidemic Sound MCP

app.get("/api/epidemic/search", async (req, res) => {

  const projDir = getProjectDir(req);

  const token = getEpidemicSoundKey(projDir) || "";

  const { query, type } = req.query;

  if (!query) {

    return res.status(400).json({ error: "O termo de busca (query) é obrigatório." });

  }

  try {

    if (type === "sfx") {

      const results = await searchSoundEffects(token, query);

      res.json(results);

    } else {

      const results = await searchMusic(token, query);

      res.json(results);

    }

  } catch (err) {

    res.status(500).json({ error: "Erro ao buscar na Epidemic Sound", details: err.message });

  }

});

// API: Download track/SFX and auto-map

app.post("/api/epidemic/download", async (req, res) => {

  const projDir = getProjectDir(req);

  const token = getEpidemicSoundKey(projDir) || "";

  const { id, type, title, block, previewUrl } = req.body;

  if (!id || !type) {

    return res.status(400).json({ error: "Parâmetros 'id' e 'type' são obrigatórios." });

  }

  try {

    const safeTitle = (title || `audio_${id}`).replace(/[^a-zA-Z0-9_-]/g, "_");

    if (type === "sfx") {

      // Save SFX directly to project ASSETS folder

      const assetsDir = path.join(projDir, "ASSETS");

      fs.mkdirSync(assetsDir, { recursive: true });

      const filename = `sfx_${safeTitle}.mp3`;

      const destPath = path.join(assetsDir, filename);

      await downloadSoundEffect(token, id, destPath, previewUrl);

      res.json({ success: true, filename, type: "sfx", message: `Efeito sonoro baixado e salvo em ASSETS/${filename}` });

    } else {

      // Save BGM directly to project folder

      const filename = `ES_${safeTitle}.mp3`;

      const destPath = path.join(projDir, filename);

      await downloadMusicTrack(token, id, destPath, previewUrl);

      // Auto-map BGM based on block

      const configPath = path.join(projDir, "config_qanat.json");

      let config = readJsonFile(configPath) || {};

      if (block !== undefined && block > 0) {

        // Map BGM to specific block

        if (!Array.isArray(config.bgm_mappings)) {

          config.bgm_mappings = [];

        }

        // Remove existing mapping for this block if any

        config.bgm_mappings = config.bgm_mappings.filter(item => Number(item.block) !== Number(block));

        config.bgm_mappings.push({

          block: Number(block),

          file: filename

        });

        config.bgm_mappings.sort((a, b) => a.block - b.block);

        config.use_single_bgm = false;

        console.log(`[Epidemic MCP] Auto-mapped BGM ${filename} to block ${block}`);

      } else {

        // Map BGM as single BGM

        config.single_bgm = filename;

        config.use_single_bgm = true;

        console.log(`[Epidemic MCP] Auto-mapped BGM ${filename} as single soundtrack`);

      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

      res.json({

        success: true,

        filename,

        type: "bgm",

        message: `Música baixada e mapeada com sucesso: ${filename}`

      });

    }

  } catch (err) {

    res.status(500).json({ error: "Erro ao baixar arquivo da Epidemic Sound", details: err.message });

  }

});

// Helper: Translate Portuguese query terms to English and sanitize for Epidemic Sound search

function translateOrCleanQuery(query) {

  if (!query) return "cinematic mystery";

  let q = query.toLowerCase();

  const translations = {

    "misterioso": "mysterious",

    "misteriosa": "mysterious",

    "mistério": "mystery",

    "misterio": "mystery",

    "tensão": "tension",

    "tensao": "tension",

    "triste": "sad",

    "tristeza": "sadness",

    "alegre": "happy",

    "feliz": "happy",

    "épico": "epic",

    "epico": "epic",

    "épica": "epic",

    "epica": "epic",

    "ação": "action",

    "acao": "action",

    "documentário": "documentary",

    "documentario": "documentary",

    "sombrio": "dark",

    "sombria": "dark",

    "escuro": "dark",

    "leve": "light",

    "suave": "soft",

    "rápido": "fast",

    "rapido": "fast",

    "lento": "slow",

    "percussão": "percussion",

    "percussao": "percussion",

    "bateria": "drums",

    "cordas": "strings",

    "piano": "piano",

    "flauta": "flute",

    "suspeito": "suspense",

    "suspense": "suspense",

    "dramático": "dramatic",

    "dramatico": "dramatic",

    "dramática": "dramatic",

    "dramatica": "dramatic",

    "urgente": "urgent",

    "urgência": "urgent",

    "urgencia": "urgent",

    "clímax": "climax",

    "climax": "climax",

    "final": "ending",

    "fechamento": "outro",

    "abertura": "intro",

    "introdução": "intro",

    "introducao": "intro",

    "crescente": "building",

    "esferas": "spheres",

    "bronze": "bronze",

    "vento": "wind",

    "deserto": "desert",

    "areias": "sand",

    "antigo": "ancient",

    "antiga": "ancient"

  };

  for (const [pt, en] of Object.entries(translations)) {

    const regex = new RegExp(`\\b${pt}\\b`, "g");

    q = q.replace(regex, en);

  }

  q = q.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

  q = q.replace(/\s+/g, " ").trim();

  return q;

}

function normalizeAudioChoiceKey(value) {

  return String(value || "")

    .toLowerCase()

    .replace(/^es_/, "")

    .replace(/\.(mp3|wav|m4a|aac|flac|ogg)$/i, "")

    .replace(/[^a-z0-9]+/g, " ")

    .trim();

}

function makeEpidemicFilename(title) {

  return `ES_${String(title || "track").replace(/[^a-zA-Z0-9_-]/g, "_")}.mp3`;

}

function collectExistingAutoBgmKeys(projDir, config) {

  const keys = new Set();

  try {

    for (const fileName of fs.readdirSync(projDir)) {

      if (/^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName)) {

        keys.add(normalizeAudioChoiceKey(fileName));

      }

    }

  } catch (err) {}

  if (config?.single_bgm) {

    keys.add(normalizeAudioChoiceKey(config.single_bgm));

  }

  if (Array.isArray(config?.bgm_mappings)) {

    for (const mapping of config.bgm_mappings) {

      if (mapping?.file) keys.add(normalizeAudioChoiceKey(mapping.file));

    }

  }

  return keys;

}

function deleteGeneratedBgmCycleFiles(projDir) {

  const deleted = [];

  try {

    for (const fileName of fs.readdirSync(projDir)) {

      const isGeneratedBgm = /^ES_.*\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(fileName) || fileName === "trilha_documentario.mp3";

      if (!isGeneratedBgm) continue;

      const targetPath = path.resolve(projDir, fileName);

      if (!targetPath.startsWith(path.resolve(projDir) + path.sep)) continue;

      fs.unlinkSync(targetPath);

      deleted.push(fileName);

    }

  } catch (err) {}

  return deleted;

}

function pickFreshTrack(tracks, usedKeys, excludedKeys, block) {

  const candidates = (tracks || []).filter((track) => {

    const titleKey = normalizeAudioChoiceKey(track.title);

    const fileKey = normalizeAudioChoiceKey(makeEpidemicFilename(track.title));

    const idKey = String(track.id || "").toLowerCase();

    return (

      titleKey &&

      !usedKeys.has(titleKey) &&

      !usedKeys.has(fileKey) &&

      !usedKeys.has(idKey) &&

      !excludedKeys.has(titleKey) &&

      !excludedKeys.has(fileKey) &&

      !excludedKeys.has(idKey)

    );

  });

  if (candidates.length === 0) return null;

  // Do not always take position 0; the Epidemic API often returns the same safe top results.

  const rotatedIndex = Math.min(candidates.length - 1, Math.abs(Number(block) || 1) % Math.min(candidates.length, 4));

  return candidates[rotatedIndex];

}

// Helper: Run automated soundtrack selection and download logic

async function runAutoSoundtrackLogic(projDir, token, mode) {

  const bgmSuggestionsPath = path.join(projDir, "storyboard.json");

  const configPath = path.join(projDir, "config_qanat.json");

  let config = readJsonFile(configPath) || {};

  const logs = [];

  if (!fs.existsSync(bgmSuggestionsPath)) {

    logs.push("storyboard.json ausente. Download automatico de BGM ignorado para evitar trilha generica fora de contexto.");

    return logs;

  }

  const storyboard = JSON.parse(fs.readFileSync(bgmSuggestionsPath, "utf8"));

  const previousAutoBgmKeys = collectExistingAutoBgmKeys(projDir, config);

  if (mode === "SHORTS" || config.use_single_bgm) {

    const rawSearchTheme = storyboard.strategy?.search_theme || storyboard.strategy?.bgm_search_theme || storyboard.bgm_recommendations?.[0]?.search_theme || "";

    if (!String(rawSearchTheme).trim()) {

      logs.push("SHORTS/trilha unica sem tema de BGM no roteiro. Nenhum download automatico feito.");

      return logs;

    }

    const searchTheme = translateOrCleanQuery(rawSearchTheme);

    logs.push(`Buscando trilha única para o tema: "${searchTheme}" (original: "${rawSearchTheme}")...`);

    try {

      const removed = deleteGeneratedBgmCycleFiles(projDir);

      if (removed.length > 0) {

        logs.push(`Removendo ${removed.length} BGM automÃ¡ticas antigas antes de escolher uma nova trilha.`);

      }

      let tracks = await searchMusic(token, searchTheme);

      const track = pickFreshTrack(tracks, new Set(), previousAutoBgmKeys, 1);

      if (track) {

        const filename = makeEpidemicFilename(track.title);

        const destPath = path.join(projDir, filename);

        logs.push(`Baixando faixa: "${track.title}"...`);

        await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

        config.single_bgm = filename;

        config.use_single_bgm = true;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

        logs.push(`Sucesso! Trilha única mapeada: ${filename}`);

      } else {

        logs.push(`Nenhuma música encontrada para o tema "${searchTheme}".`);

      }

    } catch (err) {

      logs.push(`Erro ao buscar/baixar trilha única: ${err.message}`);

      throw err;

    }

  } else {

    const suggestions = storyboard.bgm_recommendations || [];

    if (suggestions.length === 0) {

      logs.push("bgm_recommendations vazio. Nenhum download automatico feito para evitar trilhas genericas e repetidas.");

      return logs;

    }

    logs.push(`Processando ${suggestions.length} blocos para download automático...`);

    const removed = deleteGeneratedBgmCycleFiles(projDir);

    if (removed.length > 0) {

      logs.push(`Removendo ${removed.length} BGM automÃ¡ticas antigas antes de escolher novas trilhas.`);

    }

    config.bgm_mappings = [];

    config.use_single_bgm = false;

    config.single_bgm = "";

    const usedTracks = new Set();

    for (const sug of suggestions) {

      const block = Number(sug.block || 1);

      const rawSearchTheme = sug.search_theme || sug.recommendation || "";

      if (!String(rawSearchTheme).trim()) {

        logs.push(`[Bloco ${block}] Sem tema/recomendacao de BGM. Ignorado.`);

        continue;

      }

      const searchTheme = translateOrCleanQuery(rawSearchTheme);

      logs.push(`[Bloco ${block}] Buscando por tema: "${searchTheme}" (original: "${rawSearchTheme}")...`);

      try {

        let tracks = await searchMusic(token, searchTheme);

        const track = pickFreshTrack(tracks, usedTracks, previousAutoBgmKeys, block);

        if (track) {

          usedTracks.add(String(track.id || "").toLowerCase());

          usedTracks.add(normalizeAudioChoiceKey(track.title));

          usedTracks.add(normalizeAudioChoiceKey(makeEpidemicFilename(track.title)));

          const filename = makeEpidemicFilename(track.title);

          const destPath = path.join(projDir, filename);

          logs.push(`[Bloco ${block}] Baixando: "${track.title}"...`);

          await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

          config.bgm_mappings = config.bgm_mappings.filter(item => Number(item.block) !== block);

          config.bgm_mappings.push({ block, file: filename });

          logs.push(`[Bloco ${block}] Mapeada com sucesso: ${filename}`);

        } else {

          logs.push(`[Bloco ${block}] Nenhuma musica nova encontrada para o tema "${searchTheme}".`);

        }

      } catch (e) {

        logs.push(`[Bloco ${block}] Erro ao processar: ${e.message}`);

      }

    }

    config.bgm_mappings.sort((a, b) => a.block - b.block);

    config.use_single_bgm = false;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    logs.push("Download e mapeamento por blocos concluído!");

  }

  return logs;

}

// API: Auto-soundtrack project blocks using AI recommendations search themes

app.post("/api/epidemic/auto-soundtrack", async (req, res) => {

  const projDir = getProjectDir(req);

  const token = getEpidemicSoundKey(projDir) || "";

  try {

    const { mode } = req.body;

    const logs = await runAutoSoundtrackLogic(projDir, token, mode);

    res.json({ success: true, logs });

  } catch (err) {

    res.status(500).json({ error: "Erro no processo de automação de trilha", details: err.message });

  }

});

// Helper: Ensure all mapped BGM files are downloaded from Epidemic Sound before rendering

async function ensureProjectBgmTracks(projDir) {

  const token = getEpidemicSoundKey(projDir) || "";

  const configPath = path.join(projDir, "config_qanat.json");

  if (!fs.existsSync(configPath)) return;

  let config = {};

  try {

    config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  } catch (e) {

    return;

  }

  // Check if BGM mappings are completely empty

  const hasMappings = (config.use_single_bgm && config.single_bgm) || (Array.isArray(config.bgm_mappings) && config.bgm_mappings.length > 0);

  if (!hasMappings) {

    console.log("[BGM Auto-Fetch] Nenhum mapeamento de trilha sonora encontrado. Executando sonoplastia inteligente automática...");

    try {

      await runAutoSoundtrackLogic(projDir, token, config.aspect_ratio === "9:16" ? "SHORTS" : "LONGO");

      config = JSON.parse(fs.readFileSync(configPath, "utf8")); // reload config

    } catch (err) {

      console.error("[BGM Auto-Fetch] Falha na sonoplastia automática pré-render:", err.message);

    }

  }

  const filesToDownload = [];

  if (config.use_single_bgm && config.single_bgm) {

    filesToDownload.push(config.single_bgm);

  } else if (Array.isArray(config.bgm_mappings)) {

    for (const m of config.bgm_mappings) {

      if (m.file) filesToDownload.push(m.file);

    }

  }

  for (const filename of filesToDownload) {

    const destPath = path.join(projDir, filename);

    if (!fs.existsSync(destPath)) {

      console.log(`[BGM Auto-Fetch] Arquivo ${filename} ausente. Tentando baixar do Epidemic Sound...`);

      let cleanTitle = filename;

      if (cleanTitle.startsWith("ES_")) {

        cleanTitle = cleanTitle.substring(3);

      }

      if (cleanTitle.endsWith(".mp3")) {

        cleanTitle = cleanTitle.substring(0, cleanTitle.length - 4);

      }

      cleanTitle = cleanTitle.replace(/_/g, " ").trim();

      try {

        const tracks = await searchMusic(token, cleanTitle);

        if (tracks.length > 0) {

          const track = tracks[0];

          console.log(`[BGM Auto-Fetch] Baixando "${track.title}" para ${filename}...`);

          await downloadMusicTrack(token, track.id, destPath, track.previewUrl);

        }

      } catch (err) {

        console.error(`[BGM Auto-Fetch] Falha ao baixar ${filename}:`, err.message);

      }

    }

  }

}

function sanitizeProjectBlockTimings(projDir) {

  const timingsPath = path.join(projDir, "block_timings.json");

  if (!fs.existsSync(timingsPath)) {

    return { changed: false, message: "" };

  }

  let timings;

  try {

    timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));

  } catch (err) {

    return { changed: false, message: `block_timings.json invalido: ${err.message}` };

  }

  const starts = Array.isArray(timings.starts) ? timings.starts.map(Number) : [];

  const durations = Array.isArray(timings.durations) ? timings.durations.map(Number) : [];

  const blockCount = Math.max(starts.length, durations.length);

  if (blockCount === 0) {

    return { changed: false, message: "" };

  }

  const totalFromFile = Number(timings.total_duration);

  const finitePositiveDurations = durations.filter(value => Number.isFinite(value) && value > 0.25);

  const fallbackDuration = finitePositiveDurations.length

    ? finitePositiveDurations.reduce((sum, value) => sum + value, 0) / finitePositiveDurations.length

    : 8;

  const totalDuration = Number.isFinite(totalFromFile) && totalFromFile > 0

    ? totalFromFile

    : Math.max(1, finitePositiveDurations.reduce((sum, value) => sum + value, 0));

  let maxSeenStart = -Infinity;

  const unreliable = [];

  const sanitizedDurations = [];

  for (let i = 0; i < blockCount; i++) {

    const start = starts[i];

    const duration = durations[i];

    const startIsOutOfOrder = Number.isFinite(start) && start + 0.05 < maxSeenStart;

    const durationIsInvalid = !Number.isFinite(duration) || duration <= 0.25;

    const durationIsSuspicious = Number.isFinite(duration) && blockCount > 3 && duration > totalDuration * 0.4;

    if (Number.isFinite(start) && start > maxSeenStart) {

      maxSeenStart = start;

    }

    if (startIsOutOfOrder || durationIsInvalid || durationIsSuspicious) {

      unreliable.push(i);

      sanitizedDurations[i] = null;

    } else {

      sanitizedDurations[i] = duration;

    }

  }

  if (unreliable.length === 0) {

    return { changed: false, message: "" };

  }

  const reliableTotal = sanitizedDurations.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  const remaining = Math.max(unreliable.length * 1, totalDuration - reliableTotal);

  const replacementDuration = Math.max(1, remaining / unreliable.length || fallbackDuration);

  for (const index of unreliable) {

    sanitizedDurations[index] = replacementDuration;

  }

  const sanitizedStarts = [];

  let cursor = 0;

  for (let i = 0; i < blockCount; i++) {

    sanitizedStarts.push(Number(cursor.toFixed(3)));

    sanitizedDurations[i] = Number(Math.max(0.5, sanitizedDurations[i]).toFixed(3));

    cursor += sanitizedDurations[i];

  }

  const sanitized = {

    ...timings,

    starts: sanitizedStarts,

    durations: sanitizedDurations,

    total_duration: Number(cursor.toFixed(3))

  };

  fs.writeFileSync(timingsPath, JSON.stringify(sanitized, null, 2), "utf8");

  return {

    changed: true,

    message: `block_timings corrigido: ${unreliable.length} bloco(s) com tempo invalido ou fora de ordem.`

  };

}

// Helper: Detect, search, download and map sound effects (SFX) based on storyboard keywords

async function ensureProjectSfxTracks(projDir) {

  const token = getEpidemicSoundKey(projDir) || "";

  const storyboardPath = path.join(projDir, "storyboard.json");

  const timingsPath = path.join(projDir, "block_timings.json");

  if (!fs.existsSync(storyboardPath) || !fs.existsSync(timingsPath)) {

    console.log("[SFX Auto-Fetch] storyboard.json ou block_timings.json ausente. Pulando SFX.");

    return;

  }

  let storyboard = {};

  let timings = {};

  try {

    storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

    timings = JSON.parse(fs.readFileSync(timingsPath, "utf8"));

  } catch (e) {

    console.error("[SFX Auto-Fetch] Erro ao ler arquivos:", e.message);

    return;

  }

  const starts = [0.0].concat(timings.starts || []);

  const visualPrompts = storyboard.visual_prompts || [];

  const sfxEvents = [];

  // 1. Download transition whoosh sfx

  const whooshFile = "sfx_whoosh_transition.mp3";

  const whooshPath = path.join(projDir, whooshFile);

  if (!fs.existsSync(whooshPath)) {

    try {

      console.log("[SFX Auto-Fetch] Buscando transição whoosh...");

      const sfxs = await searchSoundEffects(token, "cinematic whoosh transition");

      if (sfxs && sfxs.length > 0) {

        console.log(`[SFX Auto-Fetch] Baixando ${sfxs[0].title} para transições...`);

        await downloadSoundEffect(token, sfxs[0].id, whooshPath, sfxs[0].previewUrl);

      }

    } catch (err) {

      console.error("[SFX Auto-Fetch] Falha ao baixar transição whoosh:", err.message);

    }

  }

  // Map whoosh transitions (peaks at start of each block transition, starting from block 2)

  if (fs.existsSync(whooshPath)) {

    let lastWhooshTime = -999.0;

    for (let i = 1; i < starts.length; i++) {

      const blockTime = starts[i];

      const targetTime = Math.max(0, blockTime - 1.0);

      // Enforce a minimum cooldown of 6.0 seconds between transitions

      if (targetTime - lastWhooshTime >= 6.0) {

        sfxEvents.push({

          time: targetTime,

          file: whooshFile,

          volume: 0.06 // Highly subtle volume (was 0.18)

        });

        lastWhooshTime = targetTime;

      } else {

        console.log(`[SFX Auto-Fetch] Ignorando transição do bloco ${i + 1} devido a proximidade temporal (cooldown de 6.0s)`);

      }

    }

  }

  // 2. Thematic SFX mapping rules with optimized low volumes (reduced by half/more)

  const sfxRules = [

    { keywords: ["terremoto", "tremor", "sismo", "chão tremer", "earthquake"], term: "earthquake rumble", file: "sfx_earthquake.mp3", volume: 0.08 },

    { keywords: ["vento", "sopro", "wind", "tempestade", "deserto", "oasis"], term: "desert wind loop", file: "sfx_wind.mp3", volume: 0.04 },

    { keywords: ["metal", "bronze", "vaso", "jarro", "dragões de bronze", "metal ball"], term: "metal resonance drop", file: "sfx_metal_drop.mp3", volume: 0.06 },

    { keywords: ["dragão", "dragao", "dragon"], term: "creature growl roar", file: "sfx_dragon.mp3", volume: 0.06 },

    { keywords: ["sapo", "toad", "frog"], term: "frog croak", file: "sfx_frog.mp3", volume: 0.05 },

    { keywords: ["cavalo", "horse", "galope", "mensageiro"], term: "horse gallop fast", file: "sfx_horse.mp3", volume: 0.05 },

    { keywords: ["rir", "riram", "oficiais riram", "laugh", "laughing"], term: "man chuckle laugh", file: "sfx_laugh.mp3", volume: 0.04 },

    { keywords: ["caiu", "queda", "queda da esfera", "impact", "fall", "impacto"], term: "heavy impact hit", file: "sfx_impact.mp3", volume: 0.07 }

  ];

  // Scan visual prompts for keywords

  let lastThematicSfxTime = -999.0;

  for (const vp of visualPrompts) {

    const blockNum = Number(vp.block || 1);

    if (blockNum > starts.length) continue;

    const blockStart = starts[blockNum - 1];

    const contextText = `${vp.narration_text || ""} ${vp.prompt || ""} ${vp.editor_notes || ""}`.toLowerCase();

    for (const rule of sfxRules) {

      const matches = rule.keywords.some(kw => contextText.includes(kw));

      if (matches) {

        const destPath = path.join(projDir, rule.file);

        if (!fs.existsSync(destPath)) {

          try {

            console.log(`[SFX Auto-Fetch] Bloco ${blockNum} combina com "${rule.term}". Buscando SFX...`);

            const sfxs = await searchSoundEffects(token, rule.term);

            if (sfxs && sfxs.length > 0) {

              console.log(`[SFX Auto-Fetch] Baixando ${sfxs[0].title} para ${rule.file}...`);

              await downloadSoundEffect(token, sfxs[0].id, destPath, sfxs[0].previewUrl);

            }

          } catch (err) {

            console.error(`[SFX Auto-Fetch] Falha ao baixar SFX para ${rule.term}:`, err.message);

          }

        }

        if (fs.existsSync(destPath)) {

          // Prevent overlapping: 8s cooldown with other thematic, and 3s distance from any whoosh

          const tooCloseToOtherThematic = Math.abs(blockStart - lastThematicSfxTime) < 8.0;

          const tooCloseToWhoosh = sfxEvents.some(evt => evt.file === whooshFile && Math.abs(evt.time - blockStart) < 3.0);

          if (!tooCloseToOtherThematic && !tooCloseToWhoosh) {

            sfxEvents.push({

              time: blockStart,

              file: rule.file,

              volume: rule.volume

            });

            lastThematicSfxTime = blockStart;

            console.log(`[SFX Auto-Fetch] Bloco ${blockNum} sonoplastia mapeada: ${rule.file} em ${blockStart}s (vol=${rule.volume})`);

          } else {

            console.log(`[SFX Auto-Fetch] Ignorando SFX temático ${rule.file} no bloco ${blockNum} para evitar sobreposição ou alta frequência (cooldown)`);

          }

        }

        break; // Max 1 thematic SFX per block

      }

    }

  }  // Write map to sfx_timeline.json

  const sfxTimelinePath = path.join(projDir, "sfx_timeline.json");

  fs.writeFileSync(sfxTimelinePath, JSON.stringify({ sfx_events: sfxEvents }, null, 2), "utf8");

  console.log(`[SFX Auto-Fetch] Timeline de sonoplastia salva em ${sfxTimelinePath} com ${sfxEvents.length} eventos.`);

}

// API: Render videos streaming logs via Server-Sent Events (SSE)

app.get("/api/render/:mode", async (req, res) => {

  const projDir = getProjectDir(req);

  const mode = req.params.mode; // 'standard' or 'highlighted'

  const withoutImpactTitles = req.query.withoutImpactTitles === "1";

  res.setHeader("Content-Type", "text/event-stream");

  res.setHeader("Cache-Control", "no-cache");

  res.setHeader("Connection", "keep-alive");

  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  // Heartbeat to keep connection alive during long renders/downloads

  const heartbeat = setInterval(() => {

    res.write(":\n\n");

  }, 15000);

  const cleanup = () => {

    clearInterval(heartbeat);

  };

  req.on("close", cleanup);

  const sendLog = (text) => {

    res.write(`data: ${JSON.stringify({ type: "log", text })}\n\n`);

  };

  const timingSanitization = sanitizeProjectBlockTimings(projDir);

  if (timingSanitization.message) {

    sendLog(`[Dashboard] ${timingSanitization.message}`);

  }

  // Pre-download missing BGM files from Epidemic Sound

  try {

    sendLog("[Dashboard] Verificando trilhas sonoras de fundo (BGM)...");

    await ensureProjectBgmTracks(projDir);

  } catch (err) {

    sendLog(`[BGM Auto-Fetch] Erro: ${err.message}`);

  }

  // Pre-download and map SFX

  try {

    sendLog("[Dashboard] Analisando roteiro para download de efeitos sonoros (SFX)...");

    await ensureProjectSfxTracks(projDir);

  } catch (err) {

    sendLog(`[SFX Auto-Fetch] Erro: ${err.message}`);

  }

  // Mix soundtrack

  try {

    sendLog("[Dashboard] Iniciando mixagem da trilha sonora (mix_bgm.py)...");

    await new Promise((resolve) => {

      const mixProcess = spawn(PYTHON_PATH, ["mix_bgm.py"], {

        cwd: projDir,

        shell: true

      });

      mixProcess.stdout.on("data", (data) => {

        const lines = data.toString().split("\n");

        for (const line of lines) {

          const cleanLine = line.trim();

          if (cleanLine) sendLog(`[BGM Mixer] ${cleanLine}`);

        }

      });

      mixProcess.on("close", (code) => {

        if (code === 0) {

          sendLog("[BGM Mixer] Trilha final trilha_documentario.mp3 gerada!");

        } else {

          sendLog("[BGM Mixer] Aviso: O mixador de BGM retornou código não-zero.");

        }

        resolve();

      });

    });

  } catch (err) {

    sendLog(`[BGM Mixer] Erro: ${err.message}`);

  }

  if (mode === "remotion" || mode === "remotion-pro") {

    let child = null;

    try {

      sendLog("[Remotion] Preparando linha do tempo, assets, narração e legendas...");

      const isProres = req.query.prores === "1" || req.query.transparent === "1";
      const useHyperframes = req.query.hyperframes !== "0";
      const renderPlan = await prepareRemotionRender(projDir, isProres, useHyperframes);

      sendLog(`[PROGRESSO] 10%`);

      sendLog(`[Remotion] ${renderPlan.sceneCount} cenas e ${renderPlan.captionCount} legendas prontas.`);

      sendLog(`[Remotion] ${renderPlan.sfxCount || 0} efeitos sonoros mapeados.`);

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

        isProres ? "prores" : "h264",

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

            const remotionMatch = line.match(/Rendered\s+(\d+)\/(\d+)/i);
            if (remotionMatch) {
              const renderedFrames = parseInt(remotionMatch[1], 10);
              const totalFrames = parseInt(remotionMatch[2], 10);
              if (totalFrames > 0) {
                const pct = Math.min(99, Math.max(10, Math.round((renderedFrames / totalFrames) * 100)));
                sendLog(`[PROGRESSO] ${pct}%`);
              }
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

            const progressMatch = line.match(/(\d+(?:\.\d+)?)%/);
            if (progressMatch) {
              const pct = Math.min(99, Math.max(10, Math.round(Number(progressMatch[1]))));
              sendLog(`[PROGRESSO] ${pct}%`);
            }

            const remotionMatch = line.match(/Rendered\s+(\d+)\/(\d+)/i);
            if (remotionMatch) {
              const renderedFrames = parseInt(remotionMatch[1], 10);
              const totalFrames = parseInt(remotionMatch[2], 10);
              if (totalFrames > 0) {
                const pct = Math.min(99, Math.max(10, Math.round((renderedFrames / totalFrames) * 100)));
                sendLog(`[PROGRESSO] ${pct}%`);
              }
            }
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
        cleanup();
        res.end();

      });

    } catch (err) {

      sendLog(`[ERRO] ${err.message}`);

      res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
      cleanup();
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

    sendLog(`[ERRO] ${scriptName} não encontrado no workspace`);

    res.write(`data: ${JSON.stringify({ type: "failed", code: 1 })}\n\n`);
    cleanup();
    res.end();

    return;

  }

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
    cleanup();
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

function sanitizeCaptionsForRemotion(captions, maxDurationSeconds) {

  const maxMs = Math.max(1000, Math.round((Number(maxDurationSeconds) || 0) * 1000));

  const sorted = (Array.isArray(captions) ? captions : [])

    .map((caption) => ({

      ...caption,

      text: String(caption?.text || "").trimStart(),

      startMs: Math.max(0, Number(caption?.startMs || 0)),

      endMs: Math.max(0, Number(caption?.endMs || 0)),

    }))

    .filter((caption) => caption.text.trim() && Number.isFinite(caption.startMs) && caption.startMs < maxMs)

    .sort((a, b) => a.startMs - b.startMs);

  return sorted.map((caption, index) => {

    const nextStart = sorted[index + 1]?.startMs;

    const naturalEnd = caption.endMs > caption.startMs ? caption.endMs : caption.startMs + 420;

    const maxWordEnd = caption.startMs + 900;

    const nextLimitedEnd = Number.isFinite(nextStart) ? Math.max(caption.startMs + 120, nextStart - 40) : maxMs;

    const endMs = Math.min(naturalEnd, maxWordEnd, nextLimitedEnd, maxMs);

    return {

      ...caption,

      startMs: Math.round(caption.startMs),

      endMs: Math.round(Math.max(caption.startMs + 120, endMs)),

      timestampMs: Math.round(caption.startMs),

    };

  });

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

function collectRemotionSfxTracks(projectDir, publicProjectDir, projectSlug, totalDuration) {

  const sfxTimeline = readProjectJson(projectDir, "sfx_timeline.json", { sfx_events: [] });

  const events = Array.isArray(sfxTimeline.sfx_events) ? sfxTimeline.sfx_events : [];

  const tracks = [];

  for (const [index, event] of events.entries()) {

    const start = Math.max(0, Number(event?.time || 0));

    if (!Number.isFinite(start) || start >= totalDuration) continue;

    const source = findProjectFile(projectDir, event?.file);

    const copied = copyRemotionAsset(source, publicProjectDir, `sfx_${index + 1}_`);

    if (!copied) continue;

    const rawVolume = Number(event?.volume);

    tracks.push({

      file: `projects/${projectSlug}/${copied}`,

      start,

      duration: Math.max(0.3, Math.min(6, totalDuration - start)),

      volume: Math.min(0.12, Math.max(0.025, Number.isFinite(rawVolume) ? rawVolume * 0.45 : 0.06)),

    });

  }

  return tracks;

}

function normalizeYoutubeChannelUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("@")) return `https://www.youtube.com/${trimmed}`;
  if (trimmed.includes("youtube.com")) return `https://${trimmed.replace(/^https?:\/\//, "")}`;
  return trimmed;
}

function readYoutubeChannelSettings(projectDir, globalConfig = {}) {
  const projectConfig = readProjectJson(projectDir, "config_qanat.json", {});
  const projectChannel = projectConfig.youtube_channel || projectConfig.youtubeChannel || {};
  const globalChannel = globalConfig.youtubeChannel || globalConfig.youtube_channel || {};

  const hasProjectOverride = Boolean(
    projectChannel.channel_url || projectChannel.channelUrl ||
    projectChannel.channel_name || projectChannel.channelName ||
    projectChannel.subscriber_count || projectChannel.subscriberCount
  );

  const source = hasProjectOverride ? projectChannel : globalChannel;

  return {
    channelUrl: normalizeYoutubeChannelUrl(source.channel_url || source.channelUrl || ""),
    channelName: String(source.channel_name || source.channelName || "").trim(),
    subscriberCount: String(source.subscriber_count || source.subscriberCount || "").trim(),
    scope: hasProjectOverride ? "project" : "global",
  };
}

async function scrapeYoutubeChannelFromUrl(channelUrl) {
  const url = normalizeYoutubeChannelUrl(channelUrl);
  if (!url) return null;

  const html = await new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
    }).on("error", (err) => reject(err));
  });

  let channelName = "";
  const titleMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/);
  if (titleMatch) channelName = titleMatch[1];

  let avatarUrl = "";
  const avatarMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/);
  if (avatarMatch) avatarUrl = avatarMatch[1];

  let subCount = "";
  const subMatch1 = html.match(/"accessibilityLabel"\s*:\s*"([^"]+ (?:inscritos|subscribers|seguidores))"/i);
  if (subMatch1) {
    subCount = subMatch1[1];
  } else {
    const subMatch2 = html.match(/"metadataParts"\s*:\s*\[\s*\{\s*"text"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"/);
    if (subMatch2) subCount = subMatch2[1];
  }

  return { channelName, subscriberCount: subCount, avatarUrl };
}

async function downloadChannelAvatar(avatarUrl, publicProjectDir, projectSlug) {
  if (!avatarUrl) return null;
  const avatarFileName = "youtube_avatar.jpg";
  const destPath = path.join(publicProjectDir, avatarFileName);
  await new Promise((resolve, reject) => {
    https.get(avatarUrl, (res) => {
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
      fileStream.on("error", reject);
    }).on("error", reject);
  });
  return `projects/${projectSlug}/${avatarFileName}`;
}

async function resolveYoutubeChannelInfo(projectDir, publicProjectDir, projectSlug, globalConfig = {}) {
  const settings = readYoutubeChannelSettings(projectDir, globalConfig);
  const fallbackUrl = "https://www.youtube.com/channel/UCYYcyky9A8fob3t6TlIENYA";
  const channelUrl = settings.channelUrl || fallbackUrl;

  let scraped = null;
  try {
    scraped = await scrapeYoutubeChannelFromUrl(channelUrl);
  } catch (e) {
    console.error("[YouTube Channel] Erro ao buscar dados do canal:", e);
  }

  const channelName = settings.channelName || scraped?.channelName || "Canal do YouTube";
  const subscriberCount = settings.subscriberCount || scraped?.subscriberCount || "";

  const localAvatarCandidates = [
    path.join(projectDir, "ASSETS", "youtube_avatar.png"),
    path.join(projectDir, "ASSETS", "youtube_avatar.jpg"),
    path.join(WORKSPACE_DIR, "ASSETS", "youtube_avatar.png"),
    path.join(WORKSPACE_DIR, "ASSETS", "youtube_avatar.jpg"),
  ];

  for (const localAvatar of localAvatarCandidates) {
    if (fs.existsSync(localAvatar)) {
      const copied = copyRemotionAsset(localAvatar, publicProjectDir, "yt_avatar_");
      if (copied) {
        return {
          channelName,
          subscriberCount,
          avatarUrl: `projects/${projectSlug}/${copied}`,
        };
      }
    }
  }

  try {
    if (scraped?.avatarUrl) {
      const localAvatarPath = await downloadChannelAvatar(scraped.avatarUrl, publicProjectDir, projectSlug);
      return {
        channelName,
        subscriberCount,
        avatarUrl: localAvatarPath || scraped.avatarUrl,
      };
    }
  } catch (e) {
    console.error("[YouTube Channel] Erro ao baixar avatar:", e);
  }

  return {
    channelName,
    subscriberCount,
    avatarUrl: scraped?.avatarUrl || null,
  };
}

async function prepareRemotionRender(projectDir, isProres = false, useHyperframes = false) {

  // Load global render config

  const globalConfigPath = path.join(__dirname, "render_config_global.json");

  let globalConfig = { fps: 30, blockGapSeconds: 1.0, musicVolume: 0.15, useRemotionByDefault: true, debugOverlay: false };

  if (fs.existsSync(globalConfigPath)) {

    try {

      globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));

    } catch (e) {}

  }

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

    const blockSceneStartIdx = scenes.length;

    if (mappedAssets.length > 0) {

      mappedAssets.forEach((item, index) => {

        const sourcePath = findProjectFile(projectDir, item?.asset);

        const copiedName = copyRemotionAsset(sourcePath, publicProjectDir, `b${block}_${index + 1}_`);

        if (!copiedName) return;

        const sceneDuration = Math.max(1, Number(item?.fixed) || autoDuration);

        const prompt = prompts[index] || prompts[0] || {};
        const sceneId = prompt?.scene ? String(prompt.scene).trim() : `${block}.${index + 1}`;

        scenes.push({

          block,

          scene_id: sceneId,

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
        const sceneId = prompt?.scene ? String(prompt.scene).trim() : `${block}.${index + 1}`;

        scenes.push({

          block,

          scene_id: sceneId,

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

    // Extend the last scene of this block if there is a gap before the next block

    const blockSceneEndIdx = scenes.length;

    let nextBlockStart = null;

    const currentBlockIdxInList = blockNumbers.indexOf(block);

    if (currentBlockIdxInList !== -1 && currentBlockIdxInList < blockNumbers.length - 1) {

      const nextBlock = blockNumbers[currentBlockIdxInList + 1];

      const nextBlockIndex = Math.max(0, nextBlock - 1);

      const nextBlockStartVal = Number(timings.starts?.[nextBlockIndex]);

      if (Number.isFinite(nextBlockStartVal)) {

        nextBlockStart = nextBlockStartVal;

      }

    }

    if (nextBlockStart !== null && blockSceneEndIdx > blockSceneStartIdx) {

      const lastSceneOfBlock = scenes[blockSceneEndIdx - 1];

      const sceneEndTime = lastSceneOfBlock.start + lastSceneOfBlock.duration;

      if (nextBlockStart > sceneEndTime) {

        const gap = nextBlockStart - sceneEndTime;

        lastSceneOfBlock.duration += gap;

      }

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

  // Also extend the last scene of the video (excluding logo) to cover any remaining narration duration

  if (scenes.length > 0 && narrationDuration > 0) {

    const lastSceneOfVideo = scenes[scenes.length - 1];

    const sceneEndTime = lastSceneOfVideo.start + lastSceneOfVideo.duration;

    if (narrationDuration > sceneEndTime) {

      lastSceneOfVideo.duration += (narrationDuration - sceneEndTime);

    }

  }

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

  const bgmTracks = [];  if (config.use_single_bgm && config.single_bgm) {

    const source = findProjectFile(projectDir, config.single_bgm);

    const copied = copyRemotionAsset(source, publicProjectDir, "bgm_single_");

    if (copied) {

      let startFrom = 0;

      try {

        const pythonPath = PYTHON_PATH || "python";

        const scriptPath = path.join(WORKSPACE_DIR, "mix_bgm.py");

        const detectCmd = `"${pythonPath}" "${scriptPath}" --detect-climax "${source}" ${totalDuration}`;

        const output = execSync(detectCmd, { encoding: "utf8" }).trim();

        const lines = output.split(/\r?\n/);

        const lastLine = lines[lines.length - 1].trim();

        const parsed = parseFloat(lastLine);

        if (Number.isFinite(parsed)) {

          startFrom = parsed;

          console.log(`[Remotion] Detected best BGM start offset: ${startFrom}s`);

        }

      } catch (e) {

        console.error("Error detecting BGM climax for Remotion:", e);

      }

      bgmTracks.push({ block: 0, file: `projects/${projectSlug}/${copied}`, start: 0, duration: totalDuration, startFrom });

    }

  } else if (Array.isArray(config.bgm_mappings)) {

    for (const mapping of config.bgm_mappings) {

      const block = Number(mapping?.block || 0);

      const range = blockRanges.find(item => item.block === block);

      const source = findProjectFile(projectDir, mapping?.file);

      const copied = copyRemotionAsset(source, publicProjectDir, `bgm_b${block}_`);

      if (copied && range) {

        let startFrom = 0;

        try {

          const pythonPath = PYTHON_PATH || "python";

          const scriptPath = path.join(WORKSPACE_DIR, "mix_bgm.py");

          const detectCmd = `"${pythonPath}" "${scriptPath}" --detect-climax "${source}" ${range.duration}`;

          const output = execSync(detectCmd, { encoding: "utf8" }).trim();

          const lines = output.split(/\r?\n/);

          const lastLine = lines[lines.length - 1].trim();

          const parsed = parseFloat(lastLine);

          if (Number.isFinite(parsed)) {

            startFrom = parsed;

            console.log(`[Remotion] Detected best BGM block ${block} start offset: ${startFrom}s`);

          }

        } catch (e) {

          console.error(`Error detecting climax for block ${block}:`, e);

        }

        bgmTracks.push({ block, file: `projects/${projectSlug}/${copied}`, start: range.start, duration: range.duration, startFrom });

      }

    }

  }

  // Keep the last BGM from running past its own block into unrelated narration.

  if (bgmTracks.length > 0) {

    const lastBgm = bgmTracks[bgmTracks.length - 1];

    lastBgm.duration = Math.max(0.5, Math.min(lastBgm.duration, totalDuration - lastBgm.start));

  }

  const captions = captionsFromWordTranscripts(wordTranscripts);

  const rawCaptions = captions.length > 0 ? captions : fallbackCaptionsFromScenes(validScenes);

  const finalCaptions = sanitizeCaptionsForRemotion(rawCaptions, narrationDuration || totalDuration);

  const sfxTracks = collectRemotionSfxTracks(projectDir, publicProjectDir, projectSlug, totalDuration);

  const format = config.aspect_ratio === "16:9" ? "16:9" : "9:16";

  // Generate overlays via AI (pass actual scene timeline for precise timing sync)
  const overlays = await generateOverlaysWithAI(projectDir, useHyperframes, validScenes, {
    totalDuration,
    projectName: path.basename(projectDir),
  });
  
  // Scrape YouTube channel info and save avatar locally
  const youtubeChannelInfo = await resolveYoutubeChannelInfo(projectDir, publicProjectDir, projectSlug, globalConfig);
  
  // Save overlays to storyboard
  storyboard.overlays = overlays;
  try {
    fs.writeFileSync(path.join(projectDir, "storyboard.json"), JSON.stringify(storyboard, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing storyboard overlays:", e);
  }

  const props = {
    projectName: path.basename(projectDir),
    format,
    totalDuration,
    scenes: validScenes,
    captions: finalCaptions,
    narration: narration ? `projects/${projectSlug}/${narration}` : null,
    narrationDuration: narrationDuration || 0,
    bgmTracks,
    sfxTracks,
    editingMap: storyboard.editing_map || storyboard.hyperframe_prompt || "",
    musicVolume: globalConfig.musicVolume,
    debugOverlay: globalConfig.debugOverlay,
    overlays,
    youtubeChannelInfo,
    transparent: isProres,
    captionStyle: format === "9:16" ? "shorts-viral" : "documentary",
  };

  const propsPath = path.join(publicProjectDir, "props.json");

  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf8");

  const outputDir = path.join(projectDir, "OUTPUT", "qanat_persa_video_final");

  fs.mkdirSync(outputDir, { recursive: true });

  const fileExt = isProres ? "mov" : "mp4";
  const outputPath = path.join(outputDir, `remotion_${Date.now()}.${fileExt}`);

  return { propsPath, outputPath, totalDuration, sceneCount: validScenes.length, captionCount: finalCaptions.length, sfxCount: sfxTracks.length };

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

        if (rel.toLowerCase() === "logo.png" || path.basename(rel).toLowerCase() === "logo.png") {

          continue;

        }

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
    console.log("[Timeline] Nenhum arquivo de mídia encontrado em ASSETS. Mapeando apenas os prompts visuais como placeholders.");
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

    for (let slot = 0; slot < expectedCount; slot++) {
      const promptObj = expectedScenes[slot];
      const hasAssetFile = assetIndex < assetFiles.length;
      const asset = hasAssetFile ? assetFiles[assetIndex++] : "";
      
      let resolvedType = "image";
      if (hasAssetFile) {
        resolvedType = getMediaTypeFromName(asset);
      } else if (promptObj && promptObj.type) {
        resolvedType = (promptObj.type.includes("video") || promptObj.type.includes("vídeo")) ? "video" : "image";
      }

      blockAssets.push({
        asset,
        type: resolvedType,
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

function getOpenRouterApiKey(projectDir = WORKSPACE_DIR) {

  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;

  const readConfigKey = (configPath) => {

    const config = readJsonFile(configPath);

    return config?.openrouter_api_key || null;

  };

  const projectKey = readConfigKey(path.join(projectDir, "config_qanat.json"));

  if (projectKey) return projectKey;

  if (projectDir !== WORKSPACE_DIR) {

    const rootKey = readConfigKey(path.join(WORKSPACE_DIR, "config_qanat.json"));

    if (rootKey) return rootKey;

  }

  return OPENROUTER_DEFAULT_KEY;

}

function convertGeminiToOpenRouterMessages(promptOrBody, bodyOverride) {

  const messages = [];

  if (bodyOverride?.systemInstruction?.parts?.[0]?.text) {

    messages.push({

      role: "system",

      content: bodyOverride.systemInstruction.parts[0].text

    });

  } else if (bodyOverride?.system_instruction?.parts?.[0]?.text) {

    messages.push({

      role: "system",

      content: bodyOverride.system_instruction.parts[0].text

    });

  }

  if (bodyOverride?.contents && Array.isArray(bodyOverride.contents)) {

    for (const item of bodyOverride.contents) {

      const role = item.role === "model" ? "assistant" : "user";

      const content = item.parts?.[0]?.text || "";

      messages.push({ role, content });

    }

  } else if (promptOrBody) {

    messages.push({

      role: "user",

      content: promptOrBody

    });

  }

  return messages;

}

async function callOpenRouterWithRetry(promptOrBody, { maxRetries = 2, bodyOverride = null, projectDir = WORKSPACE_DIR, temperature = null } = {}) {

  const apiKey = getOpenRouterApiKey(projectDir);

  const messages = convertGeminiToOpenRouterMessages(promptOrBody, bodyOverride);

  let lastError = null;

  for (const model of OPENROUTER_FREE_MODELS) {

    console.log("\n==================================================");

    console.log(`[OpenRouter] ATIVO - TENTANDO MODELO: ${model}`);

    console.log("==================================================");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

      try {

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

            "Authorization": `Bearer ${apiKey}`,

            "HTTP-Referer": "https://github.com/leonardosalves/BURACOS-NO-DESERTO",

            "X-Title": "Lumiera Cinematic Studio"

          },

          body: JSON.stringify({ model: model, messages: messages, ...(temperature !== null ? { temperature } : {}) })

        });

        if (response.ok) {

          const result = await response.json();

          let responseText = result.choices?.[0]?.message?.content || "";

          responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

          console.log("\n==================================================");

          console.log(`[OpenRouter] SUCESSO - MODELO EM USO: ${model}`);

          console.log(`[OpenRouter] Sucesso na tentativa ${attempt} do modelo ${model}`);

          console.log("==================================================");

          return responseText;

        }

        const errData = await response.json().catch(() => ({}));

        const errMsg = errData.error?.message || response.statusText;

        const status = response.status;

        console.warn(`[OpenRouter] Erro ${status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`);

        lastError = new Error(`OpenRouter [${model}]: ${errMsg}`);

        const isQuotaOrRateLimit = (status === 429 || status === 403 || status === 402 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("credit"));

        const isUnavailableOrNotFound = (status === 404 || status === 400 || status === 401 || errMsg.toLowerCase().includes("unavailable") || errMsg.toLowerCase().includes("no endpoints found"));

        if (isQuotaOrRateLimit || isUnavailableOrNotFound) {

          console.warn(`[OpenRouter] Erro crítico/limite/indisponibilidade detectado para ${model} (${status}: ${errMsg}). Rotacionando imediatamente...`);

          break;

        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);

        await new Promise(r => setTimeout(r, delay));

      } catch (err) {

        console.error(`[OpenRouter] Exceção na tentativa ${attempt} para ${model}:`, err.message);

        lastError = err;

      }

    }

    console.warn(`[OpenRouter] Todas as tentativas falharam para o modelo ${model}. Tentando o proximo...`);

  }

  throw lastError || new Error("Todos os modelos OpenRouter livres falharam após múltiplas tentativas.");

}

const XAI_MODELS = ["grok-2-1212", "grok-2-latest", "grok-beta", "grok-2", "grok-4.3"];

async function callXaiWithRetry(promptOrBody, { maxRetries = 3, bodyOverride = null, projectDir = WORKSPACE_DIR, temperature = null } = {}) {
  const apiKey = getXaiApiKey(projectDir);
  if (!apiKey) {
    throw new Error("Chave de API da xAI/Grok não configurada.");
  }
  
  const messages = convertGeminiToOpenRouterMessages(promptOrBody, bodyOverride);
  let lastError = null;
  
  for (const model of XAI_MODELS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[xAI/Grok] Tentando modelo: ${model} (Tentativa ${attempt}/${maxRetries})`);
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            ...(temperature !== null ? { temperature } : {})
          })
        });

        if (response.ok) {
          const result = await response.json();
          let responseText = result.choices?.[0]?.message?.content || "";
          responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          console.log(`[xAI/Grok] Sucesso com modelo=${model} na tentativa ${attempt}`);
          return responseText;
        }

        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;
        lastError = new Error(`${model}: ${errMsg}`);
        console.warn(`[xAI/Grok] ${response.status} de ${model} (tentativa ${attempt}/${maxRetries}): ${errMsg}`);
        
        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break; // Don't retry if it's a 400/401/403/etc. error
      } catch (err) {
        lastError = err;
        console.warn(`[xAI/Grok] Erro na tentativa ${attempt} para ${model}: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError || new Error("Falha ao chamar xAI/Grok após múltiplas tentativas.");
}

// Gemini API call with automatic retry and model fallback for 503/429 errors

const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-pro-latest"];

async function callGeminiWithRetry(apiKey, promptOrBody, { maxRetries = 4, models = GEMINI_MODELS, bodyOverride = null, temperature = null } = {}) {
  const projDir = global.lastActiveProjectDir || WORKSPACE_DIR;
  const provider = getAiProvider(projDir);
  if (provider === "openrouter") {
    return await callOpenRouterWithRetry(promptOrBody, { maxRetries, bodyOverride, projectDir: projDir, temperature });
  }
  if (provider === "xai") {
    return await callXaiWithRetry(promptOrBody, { maxRetries, bodyOverride, projectDir: projDir, temperature });
  }
  
  let lastError = null;
  const keys = [...new Set([apiKey, ...getApiKeys(projDir)].filter(Boolean))];
  
  if (keys.length === 0) {
    throw new Error("Nenhuma chave de API do Gemini configurada.");
  }

  for (const model of models) {
    for (const currentKey of keys) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const requestBody = bodyOverride || { contents: [{ role: "user", parts: [{ text: promptOrBody }] }], ...(temperature !== null ? { generationConfig: { temperature } } : {}) };
          console.log(`[Gemini] Tentando modelo: ${model} com chave: ${currentKey.substring(0, 10)}... (Tentativa ${attempt}/${maxRetries})`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
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
            console.log(`[Gemini] Sucesso com modelo=${model} usando chave=${currentKey.substring(0, 10)}... na tentativa ${attempt}`);
            return responseText;
          }

          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || response.statusText;
          const status = response.status;

          console.warn(`[Gemini] ${status} de ${model} (tentativa ${attempt}/${maxRetries}) usando chave ${currentKey.substring(0, 10)}...: ${errMsg}`);
          lastError = new Error(`${model}: ${errMsg}`);

          if (status === 429) {
            console.warn(`[Gemini] Quota/Limite excedido (429) na chave ${currentKey.substring(0, 10)}... pulando imediatamente para a próxima chave.`);
            break; // Go to next key for this model
          }

          if (status === 503) {
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          break; // Go to next key for this model
        } catch (err) {
          lastError = err;
          console.warn(`[Gemini] Erro na tentativa ${attempt} para ${model} usando chave ${currentKey.substring(0, 10)}...: ${err.message}`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    console.warn(`[Gemini] Todos os modelos/tentativas falharam para ${model}, tentando próximo modelo...`);
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

      const repairedText = await callGeminiWithRetry(apiKey, repairPrompt, { maxRetries: 2, models: ["gemini-1.5-flash", "gemini-2.0-flash"] });

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

  const provider = getAiProvider(projectDir);

  if (provider === "xai") {

    return getXaiApiKey(projectDir);

  }

  if (provider === "openrouter") {

    return getOpenRouterApiKey(projectDir);

  }

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

function getEpidemicSoundKey(projectDir = WORKSPACE_DIR) {

  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));

  if (config?.epidemic_sound_key && config.epidemic_sound_key.trim().length > 100) {

    return config.epidemic_sound_key.trim();

  }

  if (projectDir !== WORKSPACE_DIR) {

    const rootConfig = readJsonFile(path.join(WORKSPACE_DIR, "config_qanat.json"));

    if (rootConfig?.epidemic_sound_key && rootConfig.epidemic_sound_key.trim().length > 100) {

      return rootConfig.epidemic_sound_key.trim();

    }

  }

  if (process.env.EPIDEMIC_SOUND_API_KEY && process.env.EPIDEMIC_SOUND_API_KEY.trim().length > 100) {

    return process.env.EPIDEMIC_SOUND_API_KEY.trim();

  }

  return null;

}

async function generateMetadataWithXai(prompt, apiKey, format = "LONG") {

  const formatLabel = format === "SHORT" ? "YouTube Shorts" : "vídeos longos do YouTube";

  const response = await fetch("https://api.x.ai/v1/chat/completions", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      "Authorization": `Bearer ${apiKey}`

    },

    body: JSON.stringify({

      model: "grok-4.3",

      messages: [

        { role: "system", content: `Você é um especialista em SEO e CTR para ${formatLabel}. Retorne apenas o markdown solicitado, com headers exatos.` },

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

  const provider = getAiProvider(projDir);

  if (provider === "openrouter") {

    return res.json({ has_key: !!getOpenRouterApiKey(projDir), provider: "openrouter" });

  }

  if (provider === "xai") {

    return res.json({ has_key: !!getXaiApiKey(projDir), provider: "xai" });

  }

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

  const config = readJsonFile(path.join(projDir, "config_qanat.json")) || {};

  res.json({

    provider: getAiProvider(projDir),

    gemini_key_count: getApiKeys(projDir).length,

    has_xai_key: !!getXaiApiKey(projDir),

    has_openrouter_key: !!getOpenRouterApiKey(projDir),

    has_epidemic_key: true

  });

});

app.post("/api/ai/settings", (req, res) => {

  const projDir = getProjectDir(req);

  const configPath = path.join(projDir, "config_qanat.json");

  const { provider, gemini_key, gemini_keys, xai_key, openrouter_key, epidemic_sound_key } = req.body || {};

  try {

    let config = readJsonFile(configPath) || {};

    if (provider === "gemini" || provider === "xai" || provider === "openrouter") {

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

    if (typeof openrouter_key === "string" && openrouter_key.trim()) {

      config.openrouter_api_key = openrouter_key.trim();

    }

    if (typeof epidemic_sound_key === "string") {

      config.epidemic_sound_key = epidemic_sound_key.trim();

    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    res.json({

      success: true,

      provider: config.ai_provider || "gemini",

      gemini_key_count: getApiKeys(projDir).length,

      has_xai_key: !!getXaiApiKey(projDir),

      has_openrouter_key: !!getOpenRouterApiKey(projDir),

      has_epidemic_key: true

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

  const openrouterKey = getOpenRouterApiKey(projDir);

  if (apiKeys.length === 0 && !xaiKey && !(aiProvider === "openrouter" && openrouterKey)) {

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

    const projectName = path.basename(projDir);

    const metadataCtx = resolveYoutubeMetadataContext({
      config,
      timings,
      storyboard,
      projectName,
    });

    const { format, niche, totalDuration, chaptersText, category, profile, rpmHint } = metadataCtx;

    const prompt = buildYoutubeMetadataPrompt({
      transcript,
      chaptersText,
      storyboard,
      config,
      format,
      niche,
      totalDuration,
      category,
      profile,
      rpmHint,
    });

    const respondWithMetadata = (text, extra = {}) => {
      const parsed = parseYoutubeMetadataMarkdown(text);
      return res.json({
        text,
        format,
        niche,
        totalDuration,
        category,
        profile: { id: profile.id, label: profile.label },
        rpm: rpmHint.rpm,
        palette: rpmHint.palette,
        parsed,
        ...extra,
      });
    };

    const errors = [];

    if (aiProvider === "xai" && xaiKey) {

      const responseText = await generateMetadataWithXai(prompt, xaiKey, format);

      return respondWithMetadata(responseText, { provider: "xai" });

    }

    try {

      const apiKey = apiKeys[0];

      const responseText = await callGeminiWithRetry(apiKey, prompt);

      return respondWithMetadata(responseText || "Erro ao gerar metadados.", { tried_keys: 1 });

    } catch (geminiErr) {

      errors.push({ status: 503, message: geminiErr.message, quotaExceeded: true });

    }

    if (xaiKey) {

      try {

        const responseText = await generateMetadataWithXai(prompt, xaiKey, format);

        return respondWithMetadata(responseText, {

          provider: "xai",

          warning: `As ${apiKeys.length} chaves Gemini falharam. Usei Grok/xAI como fallback.`

        });

      } catch (err) {

        errors.push({ status: "xai", message: err.message, quotaExceeded: false });

      }

    }

    const fallbackText = buildFallbackYoutubeMetadata({
      transcript,
      chaptersText,
      storyboard,
      config,
      format,
      niche,
      category,
      profile,
      rpmHint,
    });

    const quotaErrors = errors.filter(error => error.quotaExceeded).length;

    return respondWithMetadata(fallbackText, {

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

          if (relPath.endsWith(".mp4") || relPath.endsWith(".mov") || relPath.endsWith(".webm")) {

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

    const activeProject = req.query.project;

    

    const localLogoAssets = path.join(projDir, "ASSETS", "logo.png");

    const localLogoRoot = path.join(projDir, "logo.png");

    let hasProjectLogo = false;

    let projectLogoPath = null;

    

    if (activeProject) {

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

      const globalAssetsDir = path.join(WORKSPACE_DIR, "ASSETS");

      if (!fs.existsSync(globalAssetsDir)) {

        fs.mkdirSync(globalAssetsDir, { recursive: true });

      }

      targetPath = path.join(globalAssetsDir, "logo.png");

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

    const activeProject = req.query.project;

    if (!activeProject) {

      return res.status(400).json({ error: "Projeto ativo não especificado." });

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

const SCRIPT_CREATIVE_REINFORCEMENT = `

REFORCO CRIATIVO NAO OBRIGATORIO:

Use estas ideias apenas como apoio de qualidade narrativa, sem mudar o formato de resposta, sem mudar a divisao em blocos e sem impor novas regras ao fluxo existente.

- HUMANIZAÇÃO EXTREMA E NATURALIDADE: A narração deve soar 100% como um contador de histórias humano, dinâmico e envolvente. Evite a todo custo frases robóticas, jargões frios, explicações prolixas ou transições mecânicas. Prefira português brasileiro natural, fluido e coloquial/cinematográfico.

- COERÊNCIA E SENTIDO ABSOLUTO DAS FRASES: Analise criticamente cada frase dentro de cada bloco. Certifique-se de que cada sentença tenha um fluxo perfeito, faça sentido lógico claro e esteja diretamente conectada à anterior e à próxima. Não permita frases vazias, soltas, incompletas, confusas ou sem sentido contextual.

- DAR VIDA AO VÍDEO: Injete energia, emoção e mistério no texto. Use ganchos intrigantes, perguntas retóricas que façam o espectador pensar, e crie contrastes dramáticos de ritmo e tom para manter o interesse no auge.

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

- A narração do roteiro deve soar extremamente humana, natural, direta, fluida e com ritmo de vídeo viral. Revise atentamente cada frase de cada bloco para garantir sentido lógico total e fluxo perfeito, eliminando explicações lentas, frases vagas ou robotizadas.

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

function getExistingProjectsMetadata() {

  const projects = [];

  try {

    const scanDir = (dir, format) => {

      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      for (const item of items) {

        const fullPath = path.join(dir, item);

        try {

          if (fs.statSync(fullPath).isDirectory() && !["ASSETS", "OUTPUT", "node_modules", "temp_clips", "temp_clips_destacado", ".git"].includes(item)) {

            if (fs.existsSync(path.join(fullPath, "build_video.py")) || item === "FINANCAS") {

              let title = item;

              const storyboardPath = path.join(fullPath, "storyboard.json");

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

    };

    scanDir(LONGS_DIR, "LONGO");

    scanDir(SHORTS_DIR, "SHORTS");

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

    // Creative sub-themes to inject variety and avoid repeating same topics
    const creativeSubThemes = [
      "Mecanismos mecânicos e engrenagens perdidas (ex: máquina de Antikythera, autômatos primitivos, relógios hidráulicos)",
      "Sistemas de saneamento revolucionários, esgotos monumentais e aquedutos subterrâneos esquecidos",
      "Arquitetura militar defensiva, fortes intrigantes e táticas de fortificação impenetráveis",
      "Navegação impossível e instrumentos astronômicos de orientação (ex: astrolábios, bússolas solares vikings)",
      "Cidades subterrâneas colossais e túneis misteriosos esculpidos sob rochas (ex: Derinkuyu)",
      "Técnicas metalúrgicas lendárias e materiais perdidos (ex: aço damasceno, pilares de ferro indestrutíveis)",
      "Sistemas antigos de comunicação em massa ultrarrápidos (ex: telégrafo hidráulico, espelhos e faróis sincronizados)",
      "Medicina e técnicas cirúrgicas milenares surpreendentes",
      "Astronomia monumental e alinhamentos celestes bizarros em templos esquecidos",
      "Desastres, falhas de projeto e colapsos estruturais na engenharia do passado"
    ];

    // Clichés to ban temporarily if niche is ancient engineering
    let nicheSpecificBan = "";
    if (niche.toLowerCase().includes("engenharia") || niche.toLowerCase().includes("antig")) {
      nicheSpecificBan = `\nIMPORTANTE: Evite os seguintes temas saturados/clichês de engenharia antiga nesta rodada, pois o público já os conhece muito bem:
- Cimento/concreto romano que se repara sozinho
- Bateria/pilha de Bagdá
- Rampas e construção clássica das pirâmides do Egito
- Linhas de Nazca
- Acústica do teatro de Epidauro / sussurro grego
- Cortes perfeitos em rochas egípcias/incas como manteiga (lâmina invisível)`;
    }

    // Select 2 random sub-themes to force variety
    const shuffledThemes = [...creativeSubThemes].sort(() => 0.5 - Math.random());
    const selectedThemes = shuffledThemes.slice(0, 2);
    const varietyInstruction = `\nDIRETRIZ DE VARIABILIDADE E INOVAÇÃO:
Para esta geração específica, force-se a explorar pelo menos 3 das 10 ideias baseadas nos seguintes subtemas/ângulos alternativos:
1. ${selectedThemes[0]}
2. ${selectedThemes[1]}
${nicheSpecificBan}
Busque mistérios, segredos e fatos históricos menos explorados na internet para que as sugestões pareçam totalmente frescas e originais para o usuário.`;

    const randomSeed = Math.floor(Math.random() * 1000000);
    const fullPrompt = `${promptSystem}

[ID da Geração: ${randomSeed}]

ENTRADAS:
NICHO: ${niche}
FORMATO: ${format}
${exclusionInstruction}
${varietyInstruction}`;
    const responseText = await callGeminiWithRetry(apiKey, fullPrompt, { temperature: 1.15 });

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

      recommendation: r.recommendation || r.recomendacao || r.indicacao || r.sugestao || "",

      search_theme: r.search_theme || r.searchTheme || r.tema_busca || ""

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

  const isShort = (format === "SHORTS");

  const targetParentDir = isShort ? SHORTS_DIR : LONGS_DIR;

  const projDir = path.join(targetParentDir, safeProjectName);

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

  let promptSystem = `Você é o "Lumiera Script Master" (Roteirista Profissional, Estrategista de Retenção, Diretor Criativo e Editor de Vídeos para YouTube).

O usuário selecionou a seguinte ideia de vídeo para o nicho "${niche}" (Formato: "${format}"):

Título: "${idea.title}"

Promessa: "${idea.promise}"

Emoção: "${idea.emotion}"`;

  const customHookVal = idea.hook || idea.hooks || "";
  if (customHookVal) {
    promptSystem += `\nGancho de Retenção Inicial (Hook) sugerido: "${customHookVal}"`;
  }

  if (idea.blocks) {
    let blocksStr = "";
    if (Array.isArray(idea.blocks)) {
      blocksStr = idea.blocks.map(b => `Block ${b.block || b.index || 1}: ${b.content}`).join("\n");
    } else {
      blocksStr = String(idea.blocks);
    }
    promptSystem += `\nEstrutura/Ganchos por Bloco recomendados pelo usuário:\n"${blocksStr}"`;
  }

  if (idea.isCustom) {
    promptSystem += `\n\nATENÇÃO: A ideia original, os ganchos e a estrutura fornecida pelo usuário podem estar em português ou inglês. O roteiro gerado e a narração devem ser obrigatoriamente em Português do Brasil (PT-BR) de forma extremamente natural, humanizada, fluida e cativante. No entanto, os ganchos visuais ("visual_prompts") e termos de busca ('prompt' e 'stock_query') devem permanecer em inglês para manter a compatibilidade com a geração de assets.`;
  }

  promptSystem += `\n\nSUA MISSÃO PRINCIPAL:

Crie um roteiro COMPLETO de narração para o vídeo e DIVIDA TODA a narração em segmentos sequenciais. Para CADA segmento da narração, gere um prompt visual correspondente (imagem 2K ou vídeo IA máx 10s). A narração inteira deve ser coberta — sem lacunas. Se precisar de 50, 80 ou 100 segmentos, gere todos. O array "visual_prompts" É o roteiro do vídeo.

${SCRIPT_CREATIVE_REINFORCEMENT}

Reforco especifico para montagem do roteiro:

- Use o reforco acima para melhorar promessa, ritmo, tensao, payoff e naturalidade da narracao.

- Preserve exatamente o formato JSON solicitado abaixo (com todas as chaves, incluindo 'technical_config').
- Se for uma ideia personalizada (isCustom: true), a 'Estrutura/Ganchos por Bloco' fornecida representa apenas um esboço inicial do usuário. Você DEVE expandi-la e detalhá-la para atingir exatamente 12 blocos lógicos (se o formato for LONGO) ou exatamente 5 blocos (se o formato for SHORTS) na narração completa e em 'technical_config.block_phrases'. Não limite o roteiro nem os blocos de configuração ao número de blocos informados pelo usuário; crie uma estrutura completa e equilibrada para o formato do vídeo.

- Nao reduza a cobertura visual: o array visual_prompts continua cobrindo toda a narracao, como o programa ja espera.

Regras do Roteiro:

1. Pesquise internamente o nicho (tendências, dores, desejos, medos, polêmicas, curiosidades).

2. Não repita temas de vídeos anteriores.

3. Prenda a atenção nos primeiros 3 segundos.

4. Use open loop, curiosidade progressiva, microcliffhangers e payoff final.

5. Narração em português brasileiro: deve ser extremamente humana, fluida, natural, carismática e cheia de vida. Revise cada frase de cada bloco para garantir um sentido lógico impecável e um fluxo narrativo harmonioso. Elimine totalmente sentenças robotizadas, vagas ou desconexas.

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

     "recommendation": "Descreva o tipo de trilha sonora ideal para este bloco em português.",

     "search_theme": "A short English search query for Epidemic Sound (ex: 'cinematic tension strings', 'epic ethnic percussion', 'sad duduk drone')"

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

    let timelineAssets = {};
    try {
      const mapped = buildTimelineFromStoryboard(projDir);
      timelineAssets = mapped.timelineAssets;
    } catch (e) {
      console.log("[Creator Script] Falha ao pré-mapear timeline_assets:", e.message);
    }

    const newConfig = {
      niche: niche || currentConfig.niche || "Geral",
      gemini_api_key: currentConfig.gemini_api_key,
      highlight_keywords: parsedData.technical_config?.highlight_keywords || [],
      bgm_mappings: [],
      impact_texts: parsedData.technical_config?.impact_texts || [],
      block_phrases: parsedData.technical_config?.block_phrases || [],
      timeline_assets: timelineAssets
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

            if (rel.endsWith(".mp4") || rel.endsWith(".mov") || rel.endsWith(".webm") || rel.endsWith(".png") || rel.endsWith(".jpg") || rel.endsWith(".jpeg")) {

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

res.setHeader("X-Accel-Buffering", "no");

res.flushHeaders();

// Heartbeat to keep connection alive during long sync runs

const heartbeat = setInterval(() => {

  res.write(":\n\n");

}, 15000);

let activeChild = null;

const cleanup = () => {

  clearInterval(heartbeat);

  if (activeChild) {

    try { activeChild.kill(); } catch (e) {}

  }

};

req.on("close", cleanup);

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

activeChild = child1;

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

    activeChild = child2;

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

      activeChild = null;

      if (code2 === 0) {

        res.write(`data: ${JSON.stringify({ type: "complete", code: code2 })}\n\n`);

      } else {

        res.write(`data: ${JSON.stringify({ type: "failed", code: code2 })}\n\n`);

      }

      cleanup();

      res.end();

    });

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

function buildSceneTimingMaps(actualScenes, storyboard, starts, durations) {
  const sceneStarts = {};
  const sceneDurations = {};
  const sceneNarration = {};

  if (Array.isArray(actualScenes)) {
    for (const scene of actualScenes) {
      const sceneId = String(scene.scene_id || `${scene.block}.1`).trim();
      if (!sceneId) continue;
      sceneStarts[sceneId] = Number(scene.start) || 0;
      sceneDurations[sceneId] = Number(scene.duration) || 4;
      sceneNarration[sceneId] = scene.narrationText || "";
    }
  }

  if (Object.keys(sceneStarts).length === 0 && Array.isArray(storyboard?.visual_prompts)) {
    let cumulativeTime = 0;
    for (const vp of storyboard.visual_prompts) {
      const sceneId = String(vp.scene || `${vp.block || 1}.1`).trim();
      const blockIdx = Math.max(0, Number(vp.block || 1) - 1);
      const blockStart = Number(starts[blockIdx]);
      const start = Number.isFinite(blockStart) ? blockStart : cumulativeTime;
      const dur = Number(vp.duration_seconds) || Number(String(vp.duration || "").replace(/[^\d.]/g, "")) || 5;
      sceneStarts[sceneId] = start;
      sceneDurations[sceneId] = dur;
      sceneNarration[sceneId] = vp.narration_text || "";
      cumulativeTime = start + dur;
    }
  }

  return { sceneStarts, sceneDurations, sceneNarration };
}

function extractOverlayKeywords(overlay) {
  const text = [
    overlay?.props?.title,
    overlay?.props?.subtitle,
    overlay?.props?.description,
  ].filter(Boolean).join(" ").toLowerCase();

  return text
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4)
    .slice(0, 6);
}

function findKeywordTimeInRange(wordTranscripts, keywords, rangeStart, rangeEnd) {
  if (!Array.isArray(wordTranscripts) || keywords.length === 0) return null;

  for (const segment of wordTranscripts) {
    const segStart = Number(segment.start_time || 0);
    const words = Array.isArray(segment.words) ? segment.words : [];

    for (const wordEntry of words) {
      const absStart = segStart + Number(wordEntry.start || 0);
      if (absStart < rangeStart || absStart > rangeEnd) continue;

      const cleanWord = String(wordEntry.word || "").toLowerCase().replace(/[^\wáàâãéèêíìîóòôõúùûç]/gi, "");
      if (!cleanWord) continue;

      for (const keyword of keywords) {
        if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
          return absStart;
        }
      }
    }
  }

  return null;
}

function resolveOverlaySceneId(overlay, sceneStarts, sceneDurations) {
  const rawStart = overlay.start ?? overlay.scene ?? overlay.block;
  const rawString = String(rawStart ?? "").trim();

  if (/^\d+\.\d+$/.test(rawString)) {
    return sceneStarts[rawString] !== undefined ? rawString : null;
  }

  const idBlockMatch = String(overlay.id || "").match(/(?:block|bloco)[_-]?(\d+)/i);
  if (idBlockMatch) {
    const blockNum = Number(idBlockMatch[1]);
    const blockScene = Object.keys(sceneStarts).find((sceneId) => sceneId.startsWith(`${blockNum}.`));
    if (blockScene) return blockScene;
  }

  if (Number.isFinite(Number(rawStart))) {
    const targetTime = Number(rawStart);
    let bestSceneId = null;
    let bestDistance = Infinity;

    for (const [sceneId, sceneStart] of Object.entries(sceneStarts)) {
      const sceneEnd = sceneStart + (Number(sceneDurations[sceneId]) || 4);
      if (targetTime >= sceneStart && targetTime <= sceneEnd) {
        return sceneId;
      }
      const distance = Math.abs(sceneStart - targetTime);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSceneId = sceneId;
      }
    }

    if (bestSceneId) return bestSceneId;
  }

  const blockFromOverlay = Number(overlay.block || overlay.props?.block || 0);
  if (blockFromOverlay > 0) {
    const blockScene = Object.keys(sceneStarts).find((sceneId) => sceneId.startsWith(`${blockFromOverlay}.`));
    if (blockScene) return blockScene;
  }

  return null;
}

function alignOverlayTimings(parsedOverlays, actualScenes, storyboard, starts, durations, wordTranscripts = []) {
  const { sceneStarts, sceneDurations, sceneNarration } = buildSceneTimingMaps(actualScenes, storyboard, starts, durations);

  for (let i = 0; i < parsedOverlays.length; i++) {
    const overlay = parsedOverlays[i];
    const rawSceneRef = String(overlay.start ?? overlay.scene ?? "").trim();
    const resolvedSceneId = resolveOverlaySceneId(overlay, sceneStarts, sceneDurations);

    if (!resolvedSceneId || sceneStarts[resolvedSceneId] === undefined) {
      const blockMatch = String(overlay.id || "").match(/(?:block|bloco)[_-]?(\d+)/i) || String(overlay.id || "").match(/(\d+)/);
      if (blockMatch) {
        const blockNum = Number(blockMatch[1]);
        const blockIdx = Math.max(0, blockNum - 1);
        const blockStart = Number(starts[blockIdx]);
        if (Number.isFinite(blockStart)) {
          overlay.start = blockStart + 0.5;
          overlay.duration = Math.min(Number(overlay.duration) || 4, Math.max(1, Number(durations[blockIdx]) || 4));
          console.log(`[Overlays Post-Process] Fallback por bloco ${blockNum}: start=${overlay.start}s`);
        }
      }
      continue;
    }

    const sceneStartSec = sceneStarts[resolvedSceneId];
    const sceneDur = sceneDurations[resolvedSceneId] || 4;
    const siblingCount = parsedOverlays.slice(0, i).filter((ov) => {
      const ovScene = String(ov.start ?? ov.scene ?? "").trim();
      return ovScene === rawSceneRef || ovScene === resolvedSceneId;
    }).length;

    let start = sceneStartSec + 0.5 + (siblingCount * 2.5);

    const keywords = extractOverlayKeywords(overlay);
    const narrationKeywords = String(sceneNarration[resolvedSceneId] || "")
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5)
      .slice(0, 4);

    const keywordTime = findKeywordTimeInRange(
      wordTranscripts,
      [...keywords, ...narrationKeywords],
      sceneStartSec,
      sceneStartSec + sceneDur
    );

    if (keywordTime !== null) {
      start = Math.min(keywordTime + 0.15, sceneStartSec + sceneDur - 1);
    }

    overlay.start = Math.max(sceneStartSec, start);
    overlay.duration = Math.min(Number(overlay.duration) || 4, Math.max(1, sceneDur - 0.5));

    console.log(`[Overlays Post-Process] Overlay ${overlay.id} → cena ${resolvedSceneId}: start=${overlay.start}s, duration=${overlay.duration}s`);
  }

  return parsedOverlays;
}

// AI-driven overlay planning for Remotion PRO using Gemini API
async function generateOverlaysWithAI(projectDir, useHyperframes = false, actualScenes = null, renderContext = {}) {
  const config = readProjectJson(projectDir, "config_qanat.json", {});
  const storyboard = readProjectJson(projectDir, "storyboard.json", {});
  const timings = readProjectJson(projectDir, "block_timings.json", { starts: [], durations: [] });
  const wordTranscripts = readProjectJson(projectDir, "word_transcripts.json", []);

  const blockPhrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const starts = Array.isArray(timings.starts) ? timings.starts : [];
  const durations = Array.isArray(timings.durations) ? timings.durations : [];
  const apiKey = getApiKey(projectDir);

  if (!apiKey || blockPhrases.length === 0) {
    console.log("[Overlays] Fallback: No API Key or empty phrases. Using rule-based generation.");
    return generateOverlaysRuleBased(config, storyboard, starts, durations);
  }

  const blockContexts = blockPhrases.map((bp) => {
    const idx = Number(bp.block || 1) - 1;
    return {
      block: bp.block,
      start: starts[idx] || (idx * 15),
      duration: durations[idx] || 15,
      narration: bp.phrase || "",
    };
  });

  const highlightKeywords = Array.isArray(config.highlight_keywords) ? config.highlight_keywords : [];
  const niche = config.niche || "Geral";
  const totalDuration = Number(renderContext.totalDuration) || Number(timings.total_duration) || 0;
  const projectName = renderContext.projectName || path.basename(projectDir);

  const orchestrationPlan = buildOverlayOrchestrationPlan({
    config,
    niche,
    totalDuration,
    projectName,
    sceneCount: Array.isArray(actualScenes) ? actualScenes.length : 0,
    blockCount: blockPhrases.length,
  });
  const orchestrationPrompt = buildOrchestrationPrompt(orchestrationPlan);
  console.log(`[Orchestration] Formato: ${orchestrationPlan.format} | Perfil: ${orchestrationPlan.varietyLabel} | Máx overlays: ${orchestrationPlan.limits.maxTotal}`);

  const scenesContext = Array.isArray(actualScenes) && actualScenes.length > 0
    ? actualScenes.map((scene) => ({
        scene_id: String(scene.scene_id || `${scene.block}.1`).trim(),
        block: scene.block,
        start_seconds: Number(scene.start) || 0,
        duration_seconds: Number(scene.duration) || 4,
        narration_text: scene.narrationText || "",
      }))
    : (storyboard.visual_prompts || []).map((vp) => ({
        scene_id: String(vp.scene || `${vp.block || 1}.1`).trim(),
        block: vp.block,
        duration_seconds: vp.duration_seconds || 5,
        visual_description: vp.prompt || "",
        narration_text: vp.narration_text || "",
      }));

  let skillPrompt = "";
  if (useHyperframes) {
    const skillPath = path.join(WORKSPACE_DIR, ".agents", "skills", "hyperframes", "SKILL.md");
    if (fs.existsSync(skillPath)) {
      try {
        const rawContent = fs.readFileSync(skillPath, "utf8");
        if (rawContent.startsWith("---")) {
          const parts = rawContent.split("---");
          if (parts.length >= 3) {
            skillPrompt = parts.slice(2).join("---").trim();
          } else {
            skillPrompt = rawContent;
          }
        } else {
          skillPrompt = rawContent;
        }
      } catch (e) {
        console.error("[Overlays] Erro ao ler SKILL.md do HyperFrames:", e);
      }
    }
  }

  let systemPrompt = `Você é um diretor cinematográfico e especialista em design de overlays para vídeos de alta retenção (estilo Shorts/TikTok/Reels e Documentários Longos).
Sua tarefa é analisar o roteiro (blocos de narração) de um vídeo e planejar minuciosamente uma lista de overlays informativos complementares de acordo com o assunto específico do vídeo.
O NICHO DO VÍDEO ATUAL É: "${niche}".

IMPORTANTE — SINCRONIZAÇÃO DE TEMPO:
Cada card informativo ou lower-third DEVE aparecer exatamente quando a cena visual correspondente está na tela.
Você é terminantemente PROIBIDO de adivinhar ou inventar segundos absolutos para o campo "start".
O campo "start" na sua resposta JSON deve ser OBRIGATORIAMENTE a string do "scene_id" da cena correta (ex: "1.1", "1.2", "2.1", "3.2").

Você DEVE realizar um planejamento sistemático e explícito de design e posicionamento das informações antes de gerar cada overlay.
Retorne um objeto JSON contendo exatamente esta estrutura:
{
  "planejamento": [
    "Sua primeira observação de planejamento aqui (ex: como dividiu as informações ao longo do vídeo de forma balanceada)",
    "Sua segunda observação (ex: como escolheu variar entre cards no topo e pílulas embaixo para não poluir visualmente)",
    "Sua terceira observação (ex: como sintetizou os dados do roteiro em textos explicativos curtos e complementares)"
  ],
  "overlays": [
    // Array contendo os objetos de overlay estruturados
  ]
}

${orchestrationPrompt}

${useHyperframes ? `ATENÇÃO - MODO ORQUESTRADOR HYPERFRAMES AI ATIVADO:
Você deve projetar os overlays usando as regras, templates e o catálogo de alta conversão do HyperFrames.
Utilize as especificações, formatos e exemplos descritos no manual de design a seguir para estruturar as "props" e os objetos de "customStyle" (incluindo cores, raios de borda, glows de sombra e fontes):

${skillPrompt || `1. Para "customStyle", você deve configurar as cores de fundo, bordas e sombras neon livremente de acordo com a variante e tema.
2. Diversifique ao máximo os 17 ícones animados ("iconType") conforme o contexto! Não repita os mesmos em sequência.
3. VOCÊ PODE E DEVE CRIAR DIVERSOS FORMATOS DO CATÁLOGO HYPERFRAMES:
   - "tiktok-comment", "reddit-post", "instagram-comment" (use o tipo "info-card" com variante "glass" ou "minimal", avatar e títulos de autor como "r/HojeEuAprendi • p/u/User" ou "@username").
   - "lt-soft-pill" (use o tipo "lower-third" com variante "glass" e cantos muito arredondados "40px", gradientes suaves, e o iconType do Lottie correspondente!).
   - "lt-accent-underline" (use o tipo "lower-third" com variante "accent-underline" para o título ser sublinhado por uma linha colorida neon grossa).
   - "step-by-step-sequence" (use o tipo "timeline" em modo horizontal ou vertical para ilustrar sequências de processos com realces).
   - "key-facts-highlights" (use o tipo "info-card" formatado com quebras de linha e bullets no texto).`}
` : ""}

REGRAS CRÍTICAS DE MODERAÇÃO E DESIGN:
1. SIGA O PLANO DE ORQUESTRAÇÃO ACIMA — ele define o orçamento exato de overlays para este vídeo. Não exceda os limites, mas USE TODOS os componentes disponíveis dentro do orçamento.
2. LIMITES POR FORMATO (definidos pelo orquestrador — respeite o orçamento):
   - Para vídeos curtos (SHORTS/REELS/TIKTOK): Use kinetic-text, counter, bar-chart, timeline e lower-third distribuídos nos atos do plano. Varie tipos e posições. Gap mínimo de 5s entre overlays.
   - Para vídeos LONGOS: Intervalo de pelo menos 18 segundos "limpo" entre overlays. Priorize dados visuais sobre texto.
3. COMPONENTES DISPONÍVEIS NO REMOTION (use todos conforme o contexto):
   - "kinetic-text": frases de impacto com animação slam/reveal/glitch (ideal para viradas narrativas em Shorts)
   - "lower-third": nomes, definições, contexto (variantes: glass, bild, accent-underline, bold-block, clean-bar)
   - "counter": números, estatísticas, datas (com suffix e formatNumber)
   - "bar-chart": comparações visuais (2-4 itens)
   - "timeline": sequências, processos, linha do tempo (horizontal em longos, vertical em shorts)
4. RELEVÂNCIA E RESTRIÇÃO DE NICHO ESTREITA:
   - Se o nicho do vídeo atual for diferente de "Tecnologia" ou "Programação" (como é o caso de "História", "Geografia", "Finanças", "Curiosidades", etc. e o atual é "${niche}"), VOCÊ É TERMINANTEMENTE PROIBIDO de gerar qualquer overlay que contenha códigos de programação, código fonte, terminais de comando, imports de bibliotecas (como 'geo-eng' ou '.js'), mockups do VS Code, syntax highlighting ou o tipo "macos-bash-terminal", "vscode-code-highlight", "git-diff-showcase", "hacker-matrix-terminal", "code-highlight-sweep". Esses layouts de código e programação irritam o usuário e quebram a imersão em vídeos comuns! Use apenas layouts de postagens comuns (Reddit, TikTok bubble, Instagram comment), pílulas, infográficos, fatos-chave, etc.
5. TEXTOS CURTOS E NÃO REPETITIVOS (SÍNTESE INTELIGENTE):
   - Os overlays NÃO devem transcrever a narração falada longa. Eles devem exibir dados complementares novos, definições curtas ou curiosidades surpreendentes de leitura ultra-rápida (no máximo 5 a 12 palavras). Nunca cole parágrafos inteiros de texto falado nos cards ou lower-thirds!
6. DIVERSIFICAÇÃO E PLANEJAMENTO DE POSIÇÕES:
   - Busque um equilíbrio dinâmico e agradável no posicionamento dos overlays ao longo do vídeo, alternando de forma fluida entre posições superiores (como info-card no topo) e inferiores (como lower-third ou counter na base). Não use o mesmo canto da tela ou o mesmo estilo de forma repetida em sequência. Escolha o posicionamento que melhor se encaixe visualmente com o conteúdo de cada bloco, sem forçar um formato rígido se não for necessário.
7. INTEGRAÇÃO RICA DE LOTTIE FILES NOS CARDS E LOWER THIRDS:
   - Certifique-se de associar animações Lottie variadas e temáticas a cada card moderno E a cada lower-third usando a propriedade "iconType". Use ícones adequados de forma diversificada (ex: "warning" para alertas, "compass" para geografia/localização, "history" para datas históricas, "earth" para assuntos mundiais, "shield" para proteção/guerras, "sparkles" para curiosidades, "money" para finanças/riqueza). Não repita o mesmo ícone!
8. VARIANTES DE LOWER-THIRD DO CATÁLOGO HYPERFRAMES:
   - Para o tipo "lower-third", você DEVE definir a propriedade "variant" escolhendo o estilo visual mais adequado ao trecho do vídeo:
     - "bild": Estilo jornalístico clássico com blocos de fundo sólidos e sombras coloridas projetadas.
     - "bold-block": Estilo podcast retangular sólido com título grosso e subtítulo em caixa menor em amarelo/accent.
     - "accent-underline": Estilo minimalista com título sublinhado por linha neon grossa e sem painel de fundo.
     - "clean-bar": Estilo corporativo limpo com barra lateral neon grossa e fundo de vidro translúcido.
     - "glass": Estilo padrão translúcido elegante e arredondado.

Estrutura JSON Exigida:
{
  "planejamento": [
    "Resumo da estratégia de planejamento visual"
  ],
  "overlays": [
    {
      "id": "lt-block-1",
      "type": "lower-third",
      "start": "1.1",
      "duration": 3.5,
      "props": {
        "title": "TECNOLOGIA PREMIUM",
        "subtitle": "Concreto romano com autocura inteligente.",
        "accentColor": "#00FF9D",
        "theme": "classic",
        "variant": "glass",
        "iconType": "sparkles",
        "position": "bottom-left",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(10, 15, 12, 0.85) 0%, rgba(20, 30, 25, 0.8) 100%)",
          "border": "1.5px solid rgba(0, 255, 157, 0.25)",
          "borderRadius": "40px",
          "boxShadow": "0 12px 36px rgba(0, 255, 157, 0.15)",
          "colorTitle": "#00FF9D",
          "colorSubtitle": "#E2E8F0"
        }
      }
    },
    {
      "id": "info-1",
      "type": "info-card",
      "start": "1.2",
      "duration": 5.0,
      "props": {
        "title": "AUTOCURA TÉRMICA",
        "description": "Cinza vulcânica reage com a água selando fissuras ativamente.",
        "iconType": "flame",
        "position": "top-right",
        "accentColor": "#FF3D00",
        "variant": "glass",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(15, 10, 10, 0.85) 0%, rgba(30, 15, 15, 0.8) 100%)",
          "border": "1.5px solid rgba(255, 61, 0, 0.25)",
          "borderRadius": "16px",
          "boxShadow": "0 12px 36px rgba(255, 61, 0, 0.15)"
        }
      }
    },
    {
      "id": "counter-1",
      "type": "counter",
      "start": "2.1",
      "duration": 4.5,
      "props": {
        "value": 2000,
        "label": "Resistência Estrutural",
        "suffix": "Anos",
        "formatNumber": true,
        "accentColor": "#00E5FF",
        "position": "bottom-right",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(8, 12, 16, 0.85) 0%, rgba(14, 20, 28, 0.8) 100%)",
          "border": "1.5px solid rgba(0, 229, 255, 0.25)",
          "borderRadius": "16px",
          "boxShadow": "0 12px 36px rgba(0, 229, 255, 0.15)",
          "colorValue": "#00E5FF"
        }
      }
    },
    {
      "id": "bar-1",
      "type": "bar-chart",
      "start": "2.2",
      "duration": 6.0,
      "props": {
        "title": "COMPARAÇÃO DE ALTURA",
        "items": [
          { "label": "Gizé", "value": 146, "displayValue": "146m", "color": "#D4AF37" },
          { "label": "Burj Khalifa", "value": 828, "displayValue": "828m", "color": "#00E5FF" }
        ],
        "accentColor": "#D4AF37",
        "position": "bottom-center",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(15, 12, 10, 0.85) 0%, rgba(25, 20, 15, 0.8) 100%)",
          "border": "1.5px solid rgba(212, 175, 55, 0.25)",
          "borderRadius": "16px"
        }
      }
    },
    {
      "id": "timeline-1",
      "type": "timeline",
      "start": "3.1",
      "duration": 7.0,
      "props": {
        "title": "LINHA DO TEMPO ROMANA",
        "events": [
          { "year": "753 a.C.", "description": "Fundação de Roma", "highlight": false },
          { "year": "27 a.C.", "description": "Início do Império", "highlight": false },
          { "year": "476 d.C.", "description": "Queda do Império", "highlight": true }
        ],
        "accentColor": "#FF3D00",
        "orientation": "horizontal",
        "theme": "classic",
        "customStyle": {
          "background": "linear-gradient(135deg, rgba(10, 10, 15, 0.85) 0%, rgba(18, 18, 25, 0.8) 100%)",
          "border": "1.5px solid rgba(255, 61, 0, 0.2)",
          "borderRadius": "16px",
          "colorTitle": "#FFD700"
        }
      }
    }
  ]
}
`;

  const userPrompt = `Aqui está a lista de CENAS do vídeo com tempos reais, narração e IDs de cena:
${JSON.stringify(scenesContext, null, 2)}

Contexto adicional por blocos de narração:
${JSON.stringify(blockContexts, null, 2)}

Gere o plano de planejamento e overlays seguindo rigorosamente as regras. Associe cada overlay ao "scene_id" da cena onde a informação é realmente ilustrada visualmente. Use APENAS scene_id no campo "start", nunca segundos absolutos.`;

  try {
    const requestBody = {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };
    const rawResponse = await callGeminiWithRetry(apiKey, null, { bodyOverride: requestBody });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    
    let parsedOverlays = [];
    try {
      const resultObj = JSON.parse(cleaned);
      if (Array.isArray(resultObj)) {
        parsedOverlays = resultObj;
      } else if (resultObj && Array.isArray(resultObj.overlays)) {
        parsedOverlays = resultObj.overlays;
        if (resultObj.planejamento) {
          console.log("[Overlays Planning] Plano detalhado executado pela IA para este vídeo:");
          resultObj.planejamento.forEach(p => console.log(`  - ${p}`));
        }
      } else {
        console.warn("[Overlays] Resposta do Gemini não possui formato esperado de planejamento. Tentando usar objeto bruto.");
        parsedOverlays = resultObj;
      }
    } catch (parseErr) {
      console.error("[Overlays] Erro ao parsear JSON principal, tentando regex de fallback:", parseErr);
      const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        parsedOverlays = JSON.parse(match[0]);
      } else {
        throw parseErr;
      }
    }
    if (Array.isArray(parsedOverlays)) {
      console.log(`[Overlays] IA gerou com sucesso ${parsedOverlays.length} overlays complementares.`);

      alignOverlayTimings(parsedOverlays, actualScenes, storyboard, starts, durations, wordTranscripts);

      const isTech = niche.toLowerCase().includes("tecnologia") || niche.toLowerCase().includes("programacao") || niche.toLowerCase().includes("computador") || niche.toLowerCase().includes("ciber") || niche.toLowerCase().includes("software");
      const orchProfile = VARIETY_PROFILES.find((p) => p.id === orchestrationPlan.varietyProfile) || VARIETY_PROFILES[0];
      const variants = ["glass", "minimal", "accent", "floating"];
      const positions = orchProfile.positions;
      const lotties = orchProfile.lotties;
      const ltVariants = orchProfile.lowerThirdVariants;
      
      let variantIdx = 0;
      let posIdx = 0;
      let lottieIdx = 0;

      for (let i = 0; i < parsedOverlays.length; i++) {
        const overlay = parsedOverlays[i];
        if (!overlay.props) overlay.props = {};

        // 0. Converte info-cards temáticos para lower-thirds (Tirar cards temáticos e colocar lower thirds)
        if (overlay.type === "info-card") {
          console.log(`[Overlays Post-Process] Convertendo info-card temático (${overlay.props.title}) para lower-third.`);
          overlay.type = "lower-third";
          overlay.props.subtitle = overlay.props.description || "";
          delete overlay.props.description;
          
          // Ajusta a posição para ser compatível com lower-third
          const pos = overlay.props.position || "bottom-left";
          if (pos.includes("right")) {
            overlay.props.position = "bottom-center"; 
          } else if (pos.includes("top")) {
            overlay.props.position = "top-left";
          } else {
            overlay.props.position = "bottom-left";
          }
        }

        // 1. Corrigir vazamento de código de programação em vídeos que não são de tecnologia
        if (!isTech) {
          let hasCodeContent = false;
          const codeKeywords = ["import", "const ", "let ", "var ", "console.log", "npm run", ".js", ".ts", ".py", ".json", ".cpp", ".h", ".cs", ".sh", "function ", "void ", "class ", "public ", "private ", "struct ", "def ", "return ", "import {", "<pre", "<code>"];
          
          const textToCheck = ((overlay.props.title || "") + " " + (overlay.props.description || "") + " " + (overlay.props.subtitle || "")).toLowerCase();
          for (const kw of codeKeywords) {
            if (textToCheck.includes(kw)) {
              hasCodeContent = true;
              break;
            }
          }

          if (hasCodeContent || overlay.props.theme === "tech") {
            console.log(`[Overlays Post-Process] Convertendo card de código detectado incorretamente para o nicho ${niche}`);
            overlay.props.theme = "classic";
            overlay.props.variant = "glass";
            
            let title = overlay.props.title || "";
            title = title.replace(/\.(js|ts|py|sh|json|cpp|h|cs)$/i, "");
            title = title.replace(/[📄⚡⚙️📡🔴🟡🟢~#$]+/g, "");
            title = title.trim();
            if (!title || title.toLowerCase().includes("bash") || title.toLowerCase().includes("git") || title.toLowerCase().includes("terminal") || title.toLowerCase().includes("code") || title.toLowerCase().includes("sweep")) {
              title = "INFORMAÇÃO";
            }
            overlay.props.title = title.toUpperCase();

            // Recupera e limpa a descrição original ou subtítulo
            let desc = overlay.props.description || overlay.props.subtitle || "";
            desc = desc.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "$1");
            desc = desc.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "$1");
            desc = desc.replace(/const\s+\w+\s*=[\s\S]*?;/g, "");
            desc = desc.replace(/import\s+[\s\S]*?;/g, "");
            desc = desc.replace(/console\.log\([\s\S]*?\);?/g, "");
            desc = desc.replace(/\s+/g, " ").trim();

            if (!desc || desc.length < 5) {
              // Usa uma descrição complementar limpa de alta conversão sem nenhuma relação com o roteiro falado
              if (overlay.props.theme === "ancient") {
                desc = "Detalhes e engenharia antiga com curiosidades importantes.";
              } else if (overlay.props.theme === "nature") {
                desc = "Aspectos geográficos e dados sobre a região analisada.";
              } else if (overlay.props.theme === "industrial") {
                desc = "Propriedades físicas dos materiais e técnicas estruturais.";
              } else if (overlay.props.theme === "mysterious") {
                desc = "Teorias, enigmas e hipóteses do período histórico.";
              } else {
                desc = "Informações técnicas adicionais sobre este segmento.";
              }
            } else {
              // Trunca a própria descrição para no máximo 12 palavras
              const words = desc.split(/\s+/);
              if (words.length > 12) {
                desc = words.slice(0, 12).join(" ") + "...";
              }
            }
            
            if (overlay.type === "lower-third") {
              overlay.props.subtitle = desc;
            } else {
              overlay.props.description = desc;
            }
            
            if (overlay.props.customStyle) {
              delete overlay.props.customStyle.fontFamilyTitle;
              delete overlay.props.customStyle.fontFamilyDesc;
              delete overlay.props.customStyle.fontFamilyValue;
            }
          }
        }

        // 2. Randomização e Diversificação obrigatória de layouts, variantes e posições por vídeo
        if (overlay.type === "lower-third") {
          overlay.props.variant = ltVariants[variantIdx % ltVariants.length];
          variantIdx++;
        } else if (overlay.type === "info-card") {
          const cardVariants = ["glass", "minimal", "accent", "floating"];
          overlay.props.variant = cardVariants[variantIdx % cardVariants.length];
          variantIdx++;
        } else {
          overlay.props.variant = variants[variantIdx % variants.length];
          variantIdx++;
        }
        
        overlay.props.position = positions[posIdx % positions.length];
        posIdx++;
        
        if (overlay.type === "info-card" || overlay.type === "counter" || overlay.type === "bar-chart" || overlay.type === "lower-third") {
          overlay.props.iconType = lotties[lottieIdx % lotties.length];
          lottieIdx++;
        }

        // Mapeia temas baseados no nicho
        const cleanNiche = niche.toLowerCase();
        if (!overlay.props.theme || (overlay.props.theme === "tech" && !isTech)) {
          if (cleanNiche.includes("historia") || cleanNiche.includes("arqueologia") || cleanNiche.includes("inca") || cleanNiche.includes("egito") || cleanNiche.includes("antigo") || cleanNiche.includes("castelo")) {
            overlay.props.theme = "ancient";
          } else if (cleanNiche.includes("deserto") || cleanNiche.includes("natureza") || cleanNiche.includes("geografia") || cleanNiche.includes("amazonia")) {
            overlay.props.theme = "nature";
          } else if (cleanNiche.includes("militar") || cleanNiche.includes("guerra") || cleanNiche.includes("industrial")) {
            overlay.props.theme = "industrial";
          } else {
            overlay.props.theme = "classic";
          }
        }

        // Injeta customStyle decorativo e vibrante correspondente ao tema
        if (!overlay.props.customStyle) overlay.props.customStyle = {};
        const accent = overlay.props.accentColor || "#D4AF37";
        
        if (overlay.props.theme === "ancient") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "linear-gradient(135deg, rgba(22, 14, 8, 0.97) 0%, rgba(42, 28, 16, 0.94) 100%)",
            border: `2px double ${accent}`,
            borderRadius: "16px 2px",
            boxShadow: `0 10px 40px ${accent}30`,
            fontFamilyTitle: "Cinzel",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "nature") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "linear-gradient(135deg, rgba(8, 20, 12, 0.96) 0%, rgba(16, 40, 24, 0.92) 100%)",
            border: `1.5px solid ${accent}60`,
            borderRadius: "24px 4px",
            boxShadow: `0 10px 30px ${accent}25`,
            fontFamilyTitle: "Montserrat",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "industrial") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "linear-gradient(135deg, rgba(12, 12, 14, 0.98) 0%, rgba(26, 26, 30, 0.95) 100%)",
            borderLeft: `5px solid ${accent}`,
            borderRadius: "0px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
            fontFamilyTitle: "Oswald",
            fontFamilyDesc: "Inter",
          };
        } else if (overlay.props.theme === "mysterious") {
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "linear-gradient(135deg, rgba(10, 5, 18, 0.97) 0%, rgba(24, 12, 40, 0.94) 100%)",
            border: `1px solid ${accent}40`,
            borderRadius: "14px",
            boxShadow: `0 12px 36px ${accent}35, inset 0 0 15px rgba(255,255,255,0.02)`,
            fontFamilyTitle: "Cinzel",
            fontFamilyDesc: "Inter",
          };
        } else {
          // Classic / default
          overlay.props.customStyle = {
            ...overlay.props.customStyle,
            background: "rgba(18, 18, 20, 0.92)",
            border: `1.5px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            fontFamilyTitle: "Inter",
            fontFamilyDesc: "Inter",
          };
        }

        // Detect if the AI duplicated the narration script inside the overlay text, and rewrite/remove it
        const currentBlockNum = Number(overlay.id.replace(/[^\d]/g, "")) || i + 1;
        const currentBlockCtx = blockContexts.find(bc => Number(bc.block) === currentBlockNum) || blockContexts[i] || blockContexts[0];
        if (currentBlockCtx && currentBlockCtx.narration) {
          const cleanNarr = currentBlockCtx.narration.toLowerCase().replace(/[^\w\s]/g, "").trim();
          
          if (overlay.props.description) {
            const cleanDesc = overlay.props.description.toLowerCase().replace(/[^\w\s]/g, "").trim();
            if (cleanNarr.includes(cleanDesc) || cleanDesc.includes(cleanNarr) || (cleanDesc.length > 30 && cleanNarr.substring(0, 30) === cleanDesc.substring(0, 30))) {
              console.log(`[Overlays Post-Process] Duplicação de narração detectada na descrição do overlay ${overlay.id}. Substituindo por curiosidade complementar.`);
              if (overlay.props.theme === "ancient") {
                overlay.props.description = "Aspectos históricos e engenharia clássica do período.";
              } else if (overlay.props.theme === "nature") {
                overlay.props.description = "Fatores ambientais e especificações da geografia local.";
              } else if (overlay.props.theme === "industrial") {
                overlay.props.description = "Propriedades físicas dos materiais e técnicas estruturais.";
              } else if (overlay.props.theme === "mysterious") {
                overlay.props.description = "Mistérios intrigantes, segredos e teorias propostas.";
              } else {
                overlay.props.description = "Dados de engenharia e informações técnicas adicionais.";
              }
            }
          }
          
          if (overlay.props.subtitle) {
            const cleanSub = overlay.props.subtitle.toLowerCase().replace(/[^\w\s]/g, "").trim();
            if (cleanNarr.includes(cleanSub) || cleanSub.includes(cleanNarr)) {
              console.log(`[Overlays Post-Process] Duplicação de narração detectada no subtítulo do overlay ${overlay.id}. Removendo subtítulo.`);
              overlay.props.subtitle = "";
            }
          }
        }

        // Enforce maximum length of 12 words on descriptions and subtitles to prevent raw script leaking
        if (overlay.props.description) {
          const words = overlay.props.description.trim().split(/\s+/);
          if (words.length > 12) {
            overlay.props.description = words.slice(0, 12).join(" ") + "...";
          }
        }
        if (overlay.props.subtitle) {
          const words = overlay.props.subtitle.trim().split(/\s+/);
          if (words.length > 12) {
            overlay.props.subtitle = words.slice(0, 12).join(" ") + "...";
          }
        }

      }

      parsedOverlays = enforceOverlayOrchestration(parsedOverlays, orchestrationPlan);

      return parsedOverlays;
    }
  } catch (err) {
    console.error("[Overlays] Erro ao chamar IA para overlays:", err);
  }

  // Fallback to rule-based
  return generateOverlaysRuleBased(config, storyboard, starts, durations);
}

function generateOverlaysRuleBased(config, storyboard, starts, durations) {
  const blockPhrases = Array.isArray(config.block_phrases) ? config.block_phrases : [];
  const startsList = Array.isArray(starts) ? starts : [];
  const overlays = [];
  let overlayIndex = 0;

  for (const bp of blockPhrases) {
    const blockNum = Number(bp.block || 0);
    if (blockNum <= 0) continue;
    const blockIdx = blockNum - 1;
    const blockStart = Number(startsList[blockIdx]);
    if (!Number.isFinite(blockStart)) continue;

    const phrase = (bp.phrase || "").trim();
    const words = phrase.split(/\s+/);
    const title = words.slice(0, 5).join(" ").toUpperCase();
    if (!title) continue;

    const ltStart = blockNum === 1 ? blockStart + 0.5 : blockStart + 0.3;

    overlays.push({
      id: `lt-block-${blockNum}`,
      type: "lower-third",
      start: ltStart,
      duration: 3.5,
      props: {
        title: title,
        subtitle: "",
        accentColor: "#D4AF37",
        position: "bottom-left"
      }
    });
    overlayIndex++;
  }
  return overlays;
}
