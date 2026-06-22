import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { EdgeTTS } from "edge-tts-universal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, "youtube_credentials.json");
const TOKENS_PATH = path.join(__dirname, "youtube_tokens.json");

// Helper para obter oauth2Client
function getOAuth2Client(credentials) {
  const { client_id, client_secret, redirect_uri } = credentials;
  const redirectUrl = redirect_uri || "http://localhost:3002/api/youtube/callback";
  return new google.auth.OAuth2(client_id, client_secret, redirectUrl);
}

// O diretório raiz dos projetos é fixado na pasta timelapse
const TIMELAPSE_ROOT = "c:\\Users\\Leo\\Documents\\timelapse";

const app = express();
app.use(cors());
app.use(express.json());

// Helper para obter o caminho absoluto de um projeto
const getProjectPath = (projectId) => {
  return path.join(TIMELAPSE_ROOT, projectId);
};

// Determinar o tipo do projeto com base na presença do arquivo hyperframes.json
const getProjectType = (projectPath) => {
  if (fs.existsSync(path.join(projectPath, "hyperframes.json"))) {
    return "hyperframe";
  }
  return "remotion";
};

// Helper para descobrir o nome do arquivo renderizado
const getRenderedFilename = (projectPath, type) => {
  if (type === "hyperframe") {
    try {
      const files = fs.readdirSync(projectPath);
      const mp4File = files.find(f => f.toLowerCase().endsWith(".mp4"));
      if (mp4File) return mp4File;
    } catch (e) {}
    return "render.mp4";
  }

  try {
    const pkgPath = path.join(projectPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const renderScript = pkg.scripts?.render || "";
      const parts = renderScript.split(/\s+/);
      const filename = parts.find(p => p.startsWith("final_shorts_") && p.endsWith(".mp4"));
      if (filename) return filename;
    }
  } catch (e) {}
  
  const folderName = path.basename(projectPath);
  return `final_shorts_${folderName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}.mp4`;
};

// Encontrar o vídeo final renderizado no projeto
const findRenderedVideo = (projectPath, type) => {
  try {
    if (type === "hyperframe") {
      const files = fs.readdirSync(projectPath);
      const mp4File = files.find(f => f.toLowerCase().endsWith(".mp4") && !f.startsWith("raw_temp_"));
      if (mp4File) {
        const stats = fs.statSync(path.join(projectPath, mp4File));
        return {
          filename: mp4File,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime
        };
      }
      return null;
    }

    // Remotion
    const files = fs.readdirSync(projectPath);
    const mp4File = files.find(f => f.startsWith("final_shorts_") && f.endsWith(".mp4"));
    if (mp4File) {
      const stats = fs.statSync(path.join(projectPath, mp4File));
      return {
        filename: mp4File,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime
      };
    }
  } catch (e) {}
  return null;
};

// Helper para escanear a pasta de vídeos (Remotion) ou imagens (Hyperframe)
const getAssetsList = (projectPath, type) => {
  if (type === "hyperframe") {
    const assetsDir = path.join(projectPath, "assets");
    if (!fs.existsSync(assetsDir)) return [];
    try {
      return fs.readdirSync(assetsDir)
        .filter(f => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".jpeg") || f.toLowerCase().endsWith(".png"))
        .sort();
    } catch (err) {
      return [];
    }
  }

  // Remotion
  const videosDir = path.join(projectPath, "public", "ASSETS", "videos");
  if (!fs.existsSync(videosDir)) return [];
  try {
    return fs.readdirSync(videosDir)
      .filter(f => f.toLowerCase().endsWith(".mp4") || f.toLowerCase().endsWith(".mov"))
      .sort();
  } catch (err) {
    return [];
  }
};

const checkLogoExists = (projectPath) => {
  const logoPath = path.join(projectPath, "public", "ASSETS", "images", "logo.png");
  return fs.existsSync(logoPath);
};

const checkMusicExists = (projectPath, type) => {
  if (type === "hyperframe") {
    return fs.existsSync(path.join(projectPath, "assets", "music.mp3"));
  }
  const musicPath = path.join(projectPath, "public", "ASSETS", "music", "ambient.mp3");
  return fs.existsSync(musicPath);
};

// API: Listar todos os projetos
app.get("/api/projects", (req, res) => {
  try {
    const items = fs.readdirSync(TIMELAPSE_ROOT);
    const projects = [];

    for (const item of items) {
      const itemPath = path.join(TIMELAPSE_ROOT, item);
      const isDir = fs.statSync(itemPath).isDirectory();

      // Ignorar pastas do dashboard e node_modules
      if (isDir && 
          item !== "dashboard-app" && 
          item !== "dashboard-premium" && 
          item !== "node_modules" && 
          !item.startsWith(".")) {
            
        const type = getProjectType(itemPath);
        
        let hasConfig = false;
        let stagesCount = 0;

        if (type === "hyperframe") {
          const transPath = path.join(itemPath, "transcript.json");
          hasConfig = fs.existsSync(transPath);
          if (hasConfig) {
            try {
              const data = JSON.parse(fs.readFileSync(transPath, "utf8"));
              stagesCount = Array.isArray(data) ? data.length : 0;
            } catch (e) {}
          }
        } else {
          // Remotion
          const configPath = path.join(itemPath, "src", "config.json");
          hasConfig = fs.existsSync(configPath);
          if (hasConfig) {
            try {
              const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
              stagesCount = Array.isArray(data) ? data.length : 0;
            } catch (e) {}
          }
        }

        const assets = getAssetsList(itemPath, type);
        const hasMusic = checkMusicExists(itemPath, type);
        const renderedVideo = findRenderedVideo(itemPath, type);

        projects.push({
          id: item,
          name: item.replace(/\s*\(Hyperframe\)$/i, ""),
          path: itemPath,
          projectType: type,
          hasConfig,
          stagesCount,
          videosCount: type === "remotion" ? assets.length : 0,
          imagesCount: type === "hyperframe" ? assets.length : 0,
          hasLogo: type === "remotion" ? checkLogoExists(itemPath) : false,
          hasMusic,
          isReadyToRender: type === "hyperframe" ? assets.length >= 5 : (assets.length === 5 && checkLogoExists(itemPath)),
          renderedVideo
        });
      }
    }

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar projetos", details: err.message });
  }
});

// API: Detalhes de um projeto
app.get("/api/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const type = getProjectType(projectPath);
    const assets = getAssetsList(projectPath, type);
    const hasMusic = checkMusicExists(projectPath, type);
    const renderedVideo = findRenderedVideo(projectPath, type);

    // Carregar prompt_vimax.txt
    const promptPath = path.join(projectPath, "prompt_vimax.txt");
    let promptContent = "";
    if (fs.existsSync(promptPath)) {
      promptContent = fs.readFileSync(promptPath, "utf8");
    }

    if (type === "hyperframe") {
      // Carregar arquivos de código
      const htmlPath = path.join(projectPath, "index.html");
      const cssPath = path.join(projectPath, "style.css");
      const jsPath = path.join(projectPath, "animation.js");
      const transPath = path.join(projectPath, "transcript.json");

      let htmlContent = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
      let cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
      let jsContent = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, "utf8") : "";
      let transcriptData = [];
      if (fs.existsSync(transPath)) {
        try {
          transcriptData = JSON.parse(fs.readFileSync(transPath, "utf8"));
        } catch (e) {}
      }

      return res.json({
        id: projectId,
        name: projectId.replace(/\s*\(Hyperframe\)$/i, ""),
        path: projectPath,
        projectType: type,
        prompt: promptContent,
        htmlContent,
        cssContent,
        jsContent,
        config: transcriptData, // transcript.json mapeado como config
        images: assets,
        hasMusic,
        isReadyToRender: assets.length >= 5,
        renderedVideo
      });
    }

    // Remotion
    const configPath = path.join(projectPath, "src", "config.json");
    let configData = [];
    if (fs.existsSync(configPath)) {
      configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    const themePath = path.join(projectPath, "src", "theme.json");
    let themeData = { theme: "gold", hasNarration: true, hasCompare: true, hasMusicSetting: true, hasVideoSound: true };
    if (fs.existsSync(themePath)) {
      try {
        themeData = JSON.parse(fs.readFileSync(themePath, "utf8"));
      } catch (e) {}
    }

    res.json({
      id: projectId,
      name: projectId,
      path: projectPath,
      projectType: type,
      config: configData,
      theme: themeData.theme || "gold",
      hasNarration: themeData.hasNarration !== false,
      hasCompare: themeData.hasCompare !== false,
      hasMusicSetting: themeData.hasMusicSetting !== false && themeData.hasMusic !== false,
      hasVideoSound: themeData.hasVideoSound !== false,
      prompt: promptContent,
      videos: assets,
      hasLogo: checkLogoExists(projectPath),
      hasMusic,
      isReadyToRender: assets.length === 5 && checkLogoExists(projectPath),
      renderedVideo
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar detalhes", details: err.message });
  }
});

// API: Salvar modificações do config (Remotion ou Hyperframe)
app.post("/api/projects/:id/config", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const newConfig = req.body;

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const type = getProjectType(projectPath);
    if (type === "hyperframe") {
      const transPath = path.join(projectPath, "transcript.json");
      fs.writeFileSync(transPath, JSON.stringify(newConfig, null, 2), "utf8");
    } else {
      const configPath = path.join(projectPath, "src", "config.json");
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
    }
    res.json({ success: true, message: "Configuração atualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar configuração", details: err.message });
  }
});

// API: Salvar arquivos Hyperframe diretamente
app.post("/api/projects/:id/hyperframe/save", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const { htmlContent, cssContent, jsContent, config } = req.body;

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    if (htmlContent !== undefined) {
      fs.writeFileSync(path.join(projectPath, "index.html"), htmlContent, "utf8");
    }
    if (cssContent !== undefined) {
      fs.writeFileSync(path.join(projectPath, "style.css"), cssContent, "utf8");
    }
    if (jsContent !== undefined) {
      fs.writeFileSync(path.join(projectPath, "animation.js"), jsContent, "utf8");
    }
    if (config !== undefined) {
      fs.writeFileSync(path.join(projectPath, "transcript.json"), JSON.stringify(config, null, 2), "utf8");
    }
    res.json({ success: true, message: "Arquivos do Hyperframe salvos com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar arquivos", details: err.message });
  }
});

// API: Salvar prompt_vimax.txt
app.post("/api/projects/:id/prompt", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const { prompt } = req.body;

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const promptPath = path.join(projectPath, "prompt_vimax.txt");
    fs.writeFileSync(promptPath, prompt || "", "utf8");
    res.json({ success: true, message: "Prompt atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar o prompt", details: err.message });
  }
});

// API: Salvar configurações de tema/estilo
app.post("/api/projects/:id/theme", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const { theme, hasNarration, hasCompare, hasMusic, hasMusicSetting, hasVideoSound } = req.body;

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const themePath = path.join(projectPath, "src", "theme.json");
    let currentData = { theme: "gold", hasNarration: true, hasCompare: true, hasMusicSetting: true, hasVideoSound: true };
    if (fs.existsSync(themePath)) {
      try {
        currentData = JSON.parse(fs.readFileSync(themePath, "utf8"));
      } catch (e) {}
    }

    if (theme !== undefined) currentData.theme = theme;
    if (hasNarration !== undefined) currentData.hasNarration = hasNarration;
    if (hasCompare !== undefined) currentData.hasCompare = hasCompare;
    if (hasMusicSetting !== undefined) currentData.hasMusicSetting = hasMusicSetting;
    if (hasMusic !== undefined) currentData.hasMusic = hasMusic;
    if (hasVideoSound !== undefined) currentData.hasVideoSound = hasVideoSound;

    fs.writeFileSync(themePath, JSON.stringify(currentData, null, 2), "utf8");
    res.json({ success: true, message: "Configurações atualizadas com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar configurações", details: err.message });
  }
});

// API: Excluir um projeto
app.delete("/api/projects/:id", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);

  if (projectId === "dashboard-app" || projectId === "dashboard-premium" || projectId.startsWith(".") || !projectId) {
    return res.status(400).json({ error: "Nome de projeto inválido" });
  }

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
    res.json({ success: true, message: "Projeto excluído com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir projeto", details: err.message });
  }
});

// API: Analisar durações de vídeos via Python (Remotion)
app.post("/api/projects/:id/analyze", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  const scriptPath = path.join(projectPath, "build_shorts_remotion.py");
  if (!fs.existsSync(scriptPath)) {
    return res.status(400).json({ error: "Script build_shorts_remotion.py não encontrado no projeto" });
  }

  const pythonExe = "C:\\Users\\Leo\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe";

  const child = spawn(pythonExe, ["build_shorts_remotion.py"], {
    cwd: projectPath,
    shell: true
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
      const configPath = path.join(projectPath, "src", "config.json");
      let configData = [];
      if (fs.existsSync(configPath)) {
        try {
          configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {}
      }
      res.json({ success: true, output: stdout, config: configData });
    } else {
      res.status(500).json({ error: "Falha na análise dos vídeos", details: stderr, output: stdout });
    }
  });
});

// API: Criar novo projeto (Remotion ou Hyperframe)
app.post("/api/projects", (req, res) => {
  const { name, prompt, category, projectType } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Nome do projeto é obrigatório" });
  }

  const isHyperframe = projectType === "hyperframe";
  const suffix = isHyperframe ? " (Hyperframe)" : "";
  const folderName = name.replace(/[\\/:*?"<>|]/g, "").trim() + suffix;
  const newProjectPath = path.join(TIMELAPSE_ROOT, folderName);

  if (fs.existsSync(newProjectPath)) {
    return res.status(400).json({ error: "Já existe uma pasta de projeto com este nome" });
  }

  try {
    if (isHyperframe) {
      // 1. Criar pastas básicas do Hyperframe
      fs.mkdirSync(newProjectPath, { recursive: true });
      fs.mkdirSync(path.join(newProjectPath, "assets"), { recursive: true });
      fs.mkdirSync(path.join(newProjectPath, "renders"), { recursive: true });

      // 2. Escrever package.json do Hyperframe
      const hyperframePkg = {
        name: folderName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        private: true,
        type: "module",
        scripts: {
          "dev": "npx --yes hyperframes@0.6.97 preview",
          "render": "npx --yes hyperframes@0.6.97 render"
        }
      };
      fs.writeFileSync(path.join(newProjectPath, "package.json"), JSON.stringify(hyperframePkg, null, 2), "utf8");

      // 3. Escrever hyperframes.json
      const hyperframesConfig = {
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        "paths": {
          "blocks": "compositions",
          "components": "compositions/components",
          "assets": "assets"
        }
      };
      fs.writeFileSync(path.join(newProjectPath, "hyperframes.json"), JSON.stringify(hyperframesConfig, null, 2), "utf8");

      // 4. Escrever index.html padrão com 5 cenas
      const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Timelapse Hyperframe - ${name}</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@500;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="stage" id="stage" data-composition-id="main-comp" data-width="1080" data-height="1920" data-duration="25">
    <audio id="narration" src="assets/narration.mp3" data-start="0" data-duration="25" data-track-index="0" data-volume="1"></audio>
    
    <div id="scenes-container">
      <div class="scene" id="scene-01">
        <div class="bg-layer" style="background-image: url('assets/1.jpg');"></div>
      </div>
      <div class="scene" id="scene-02">
        <div class="bg-layer" style="background-image: url('assets/2.jpg');"></div>
      </div>
      <div class="scene" id="scene-03">
        <div class="bg-layer" style="background-image: url('assets/3.jpg');"></div>
      </div>
      <div class="scene" id="scene-04">
        <div class="bg-layer" style="background-image: url('assets/4.jpg');"></div>
      </div>
      <div class="scene" id="scene-05">
        <div class="bg-layer" style="background-image: url('assets/5.jpg');"></div>
      </div>
    </div>
    
    <div class="overlay-ui">
      <div class="page-border"></div>
      
      <div class="top-title-container">
        <h1 class="main-title">${name.toUpperCase().split("—")[0].trim()}<br><span>TIMELAPSE</span></h1>
        <div class="subtitle"><span class="ornament">🏛️</span> Evolução de Construção <span class="ornament">🏛️</span></div>
      </div>
      
      <div class="caption-wrapper">
        <div class="caption-box">
          <div class="caption-inner" id="caption-text">
            Iniciando fundações...
          </div>
          <div class="gold-seal">
            <div class="gold-seal-inner">🏛️</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="animation.js"></script>
</body>
</html>`;
      fs.writeFileSync(path.join(newProjectPath, "index.html"), indexHtml, "utf8");

      // 5. Escrever style.css padrão com design premium
      const styleCss = `@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@500;700;800&display=swap");

:root {
  --color-sand: #e6d5b8;
  --color-gold: #d4af37;
  --color-dark-gold: #a67c00;
  --color-black: #08080a;
  --color-ivory: #fffff0;
  --color-parchment: #e8dcc4;
  --color-dark-text: #2c1e11;
  --font-title: "Cinzel", serif;
  --font-text: "Montserrat", sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body, html {
  width: 1080px; height: 1920px;
  background-color: var(--color-black);
  overflow: hidden;
  font-family: var(--font-text);
  color: var(--color-ivory);
}

.stage {
  position: relative; width: 1080px; height: 1920px; overflow: hidden;
}

#scenes-container {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
}

.scene {
  position: absolute; top: 0; left: 0; width: 1080px; height: 1920px;
  opacity: 0; overflow: hidden;
}

.bg-layer {
  position: absolute; top: -5%; left: -5%; width: 110%; height: 110%;
  background-size: cover; background-position: center;
}

.overlay-ui {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 10; pointer-events: none;
}

.page-border {
  position: absolute;
  top: 30px; left: 30px; right: 30px; bottom: 30px;
  border: 3px solid rgba(212, 175, 55, 0.35);
  box-shadow: inset 0 0 50px rgba(0,0,0,0.85);
}

.page-border::before, .page-border::after {
  content: "";
  position: absolute;
  width: 40px; height: 40px;
  border: 4px solid var(--color-gold);
}

.page-border::before { top: -4px; left: -4px; border-right: none; border-bottom: none; }
.page-border::after { top: -4px; right: -4px; border-left: none; border-bottom: none; }

.top-title-container {
  position: absolute;
  top: 100px;
  width: 100%;
  text-align: center;
  text-shadow: 0 5px 25px rgba(0,0,0,0.9);
}

.main-title {
  font-family: var(--font-title);
  font-size: 90px;
  font-weight: 900;
  color: var(--color-sand);
  line-height: 0.95;
  letter-spacing: 4px;
}

.main-title span {
  font-size: 130px;
  color: #fff;
  background: linear-gradient(to bottom, #fff, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin-top: 15px;
  font-family: var(--font-text);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--color-ivory);
}

.caption-wrapper {
  position: absolute;
  bottom: 150px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.caption-box {
  position: relative;
  width: 920px;
  min-height: 240px;
  background: linear-gradient(135deg, rgba(250,245,230,0.45), rgba(230,215,180,0.45));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 4px solid rgba(212,175,55,0.45);
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 60px;
}

.caption-inner {
  font-family: var(--font-text);
  font-size: 44px;
  font-weight: 700;
  color: var(--color-dark-text);
  text-align: center;
  line-height: 1.35;
}

.caption-inner .highlight {
  color: #8c2a1c;
  font-weight: 800;
}

.gold-seal {
  position: absolute;
  bottom: -45px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 90px;
  background: radial-gradient(circle, #e6c25a, #a67c00);
  border-radius: 50%;
  border: 4px solid #5a4010;
  box-shadow: 0 8px 16px rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gold-seal-inner {
  font-size: 38px;
}
`;
      fs.writeFileSync(path.join(newProjectPath, "style.css"), styleCss, "utf8");

      // 6. Escrever animation.js padrão com GSAP
      const animJs = `const tl = gsap.timeline();
gsap.set(".scene", { opacity: 0 });

function setCaption(text, start, duration) {
  tl.call(() => {
    document.getElementById("caption-text").innerHTML = text;
  }, null, start);
  
  tl.fromTo("#caption-text", 
    { opacity: 0, y: 12 }, 
    { opacity: 1, y: 0, duration: 0.5 }, 
    start
  );
  
  tl.to("#caption-text", 
    { opacity: 0, duration: 0.4 }, 
    start + duration - 0.4
  );
}

// Configuração de animações e tempos das 5 cenas (5 segundos cada)
// Cena 1
tl.to("#scene-01", { opacity: 1, duration: 0.8 }, 0);
tl.to("#scene-01 .bg-layer", { scale: 1.08, duration: 5, ease: "none" }, 0);
setCaption("Fase 1: Preparação do terreno e fundação sólida.", 0, 5);

// Cena 2
tl.to("#scene-02", { opacity: 1, duration: 0.8 }, 5);
tl.to("#scene-02 .bg-layer", { y: -30, scale: 1.05, duration: 5, ease: "none" }, 5);
setCaption("Fase 2: Elevação das paredes e colunas de sustentação.", 5, 5);

// Cena 3
tl.to("#scene-03", { opacity: 1, duration: 0.8 }, 10);
tl.to("#scene-03 .bg-layer", { scale: 1.08, duration: 5, ease: "none" }, 10);
setCaption("Fase 3: Detalhamento de arcos, torres e abóbadas.", 10, 5);

// Cena 4
tl.to("#scene-04", { opacity: 1, duration: 0.8 }, 15);
tl.to("#scene-04 .bg-layer", { y: 30, scale: 1.05, duration: 5, ease: "none" }, 15);
setCaption("Fase 4: Cobertura final, telhados e acabamento externo.", 15, 5);

// Cena 5
tl.to("#scene-05", { opacity: 1, duration: 0.8 }, 20);
tl.to("#scene-05 .bg-layer", { scale: 1.1, duration: 5, ease: "none" }, 20);
setCaption("Fase 5: O monumento concluído em toda sua excelência.", 20, 5);

window.__timelines = { "main-comp": tl };
`;
      fs.writeFileSync(path.join(newProjectPath, "animation.js"), animJs, "utf8");

      // 7. Escrever transcript.json inicial correspondente às 5 cenas
      const transcriptData = [
        { id: "scene-1", title: "1. Fundação e Terraplenagem", text: "Fase 1: Preparação do terreno e fundação sólida.", start: 0, duration: 5 },
        { id: "scene-2", title: "2. Estrutura e Paredes", text: "Fase 2: Elevação das paredes e colunas de sustentação.", start: 5, duration: 5 },
        { id: "scene-3", title: "3. Detalhes e Elevações", text: "Fase 3: Detalhamento de arcos, torres e abóbadas.", start: 10, duration: 5 },
        { id: "scene-4", title: "4. Cobertura e Acabamento", text: "Fase 4: Cobertura final, telhados e acabamento externo.", start: 15, duration: 5 },
        { id: "scene-5", title: "5. Monumento Concluído", text: "Fase 5: O monumento concluído em toda sua excelência.", start: 20, duration: 5 }
      ];
      fs.writeFileSync(path.join(newProjectPath, "transcript.json"), JSON.stringify(transcriptData, null, 2), "utf8");

      // 8. Escrever prompt_vimax.txt
      fs.writeFileSync(path.join(newProjectPath, "prompt_vimax.txt"), prompt || `Prompts do Hyperframe para ${name}`, "utf8");

      return res.json({ success: true, message: "Projeto Hyperframe criado com sucesso!", id: folderName });
    }

    // Remotion - Encontrar projeto molde existente
    const items = fs.readdirSync(TIMELAPSE_ROOT);
    const templateProject = items.find(item => {
      const itemPath = path.join(TIMELAPSE_ROOT, item);
      return fs.statSync(itemPath).isDirectory() && 
             item !== "dashboard-app" && 
             item !== "dashboard-premium" &&
             item !== "node_modules" &&
             !item.startsWith(".") && 
             fs.existsSync(path.join(itemPath, "package.json")) &&
             !fs.existsSync(path.join(itemPath, "hyperframes.json"));
    });

    if (!templateProject) {
      return res.status(500).json({ error: "Nenhum projeto molde Remotion encontrado no de timelapse" });
    }

    const templatePath = path.join(TIMELAPSE_ROOT, templateProject);

    // Criar pastas
    fs.mkdirSync(newProjectPath, { recursive: true });
    fs.mkdirSync(path.join(newProjectPath, "src"), { recursive: true });
    fs.mkdirSync(path.join(newProjectPath, "public", "ASSETS", "videos"), { recursive: true });
    fs.mkdirSync(path.join(newProjectPath, "public", "ASSETS", "images"), { recursive: true });

    // Vincular node_modules local ao global
    const globalNodeModules = path.join(TIMELAPSE_ROOT, "node_modules");
    const localNodeModules = path.join(newProjectPath, "node_modules");
    try {
      if (!fs.existsSync(localNodeModules)) {
        fs.symlinkSync(globalNodeModules, localNodeModules, "junction");
      }
    } catch (symlinkErr) {
      console.error(symlinkErr);
    }

    // Copiar arquivos base
    const filesToCopy = [
      "package.json", "tsconfig.json", "remotion.config.ts", 
      "eslint.config.mjs", ".gitignore", ".prettierrc", "build_shorts_remotion.py"
    ];

    for (const f of filesToCopy) {
      const srcFile = path.join(templatePath, f);
      const dstFile = path.join(newProjectPath, f);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, dstFile);
      }
    }

    // Copiar código fonte
    const srcFiles = ["Composition.tsx", "index.css", "index.ts", "Root.tsx"];
    for (const f of srcFiles) {
      const srcFile = path.join(templatePath, "src", f);
      const dstFile = path.join(newProjectPath, "src", f);
      if (fs.existsSync(srcFile)) {
        if (f === "Composition.tsx") {
          let code = fs.readFileSync(srcFile, "utf8");
          const templateNameUpper = templateProject.includes("Château") ? "LOIRE VALLEY CHÂTEAU" : "NOTRE-DAME DE PARIS";
          const newNameUpper = name.toUpperCase().trim();
          code = code.replace(templateNameUpper, newNameUpper);
          fs.writeFileSync(dstFile, code, "utf8");
        } else {
          fs.copyFileSync(srcFile, dstFile);
        }
      }
    }

    // Copiar logo e músicas
    const srcLogo = path.join(templatePath, "public", "ASSETS", "images", "logo.png");
    if (fs.existsSync(srcLogo)) {
      fs.copyFileSync(srcLogo, path.join(newProjectPath, "public", "ASSETS", "images", "logo.png"));
    }

    const srcMusicDir = path.join(templatePath, "public", "ASSETS", "music");
    if (fs.existsSync(srcMusicDir)) {
      const dstMusicDir = path.join(newProjectPath, "public", "ASSETS", "music");
      fs.mkdirSync(dstMusicDir, { recursive: true });
      fs.readdirSync(srcMusicDir).forEach(file => {
        fs.copyFileSync(path.join(srcMusicDir, file), path.join(dstMusicDir, file));
      });
    }

    // Personalizar package.json
    const pkgPath = path.join(newProjectPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.name = folderName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const videoFilename = `final_shorts_${folderName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}.mp4`;
      
      let compositionId = "NotreDameShort";
      try {
        const rootContent = fs.readFileSync(path.join(templatePath, "src", "Root.tsx"), "utf8");
        const match = rootContent.match(/id\s*=\s*["']([^"']+)["']/);
        if (match && match[1]) compositionId = match[1];
      } catch (e) {}
      
      pkg.scripts.render = `npx remotion render ${compositionId} ${videoFilename}`;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
    }

    // Escrever prompt_vimax.txt
    fs.writeFileSync(path.join(newProjectPath, "prompt_vimax.txt"), prompt || `Prompts do Remotion para ${name}`, "utf8");

    // Escrever config.json inicial
    const configData = [];
    for (let i = 0; i < 5; i++) {
      configData.push({
        id: `media-${i}`,
        src: `ASSETS/videos/${i + 1}.mp4`,
        title: `Etapa ${i + 1}`,
        year: "",
        durationInSeconds: 0,
        startInSeconds: 0
      });
    }
    fs.writeFileSync(path.join(newProjectPath, "src", "config.json"), JSON.stringify(configData, null, 2), "utf8");

    // Escrever theme.json inicial
    fs.writeFileSync(path.join(newProjectPath, "src", "theme.json"), JSON.stringify({
      theme: "gold",
      hasNarration: true,
      hasCompare: true,
      hasMusicSetting: true,
      hasMusic: true,
      hasVideoSound: true
    }, null, 2), "utf8");

    res.json({ success: true, message: "Projeto Remotion criado com sucesso!", id: folderName });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar estrutura do projeto", details: err.message });
  }
});

// API: Upload de arquivos de mídia (imagens para Hyperframe e vídeos para Remotion)
app.post("/api/projects/:id/upload/:filename", express.raw({ type: "*/*", limit: "100mb" }), (req, res) => {
  const { id, filename } = req.params;
  const projectPath = getProjectPath(id);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const type = getProjectType(projectPath);
    let targetPath = "";

    if (type === "hyperframe") {
      const targetDir = path.join(projectPath, "assets");
      fs.mkdirSync(targetDir, { recursive: true });
      targetPath = path.join(targetDir, filename);
    } else {
      const targetDir = path.join(projectPath, "public", "ASSETS", "videos");
      fs.mkdirSync(targetDir, { recursive: true });
      targetPath = path.join(targetDir, filename);
    }

    fs.writeFileSync(targetPath, req.body);
    res.json({ success: true, message: `Upload de ${filename} concluído` });
  } catch (err) {
    res.status(500).json({ error: `Erro ao salvar o arquivo ${filename}`, details: err.message });
  }
});

// API: Upload de música
app.post("/api/projects/:id/upload-music", express.raw({ type: "audio/mpeg", limit: "50mb" }), (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  try {
    const type = getProjectType(projectPath);
    let targetPath = "";
    if (type === "hyperframe") {
      targetPath = path.join(projectPath, "assets", "music.mp3");
    } else {
      const targetDir = path.join(projectPath, "public", "ASSETS", "music");
      fs.mkdirSync(targetDir, { recursive: true });
      targetPath = path.join(targetDir, "ambient.mp3");
    }
    fs.writeFileSync(targetPath, req.body);
    res.json({ success: true, message: "Upload de música concluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar a música", details: err.message });
  }
});

// API: Servir música
app.get("/api/projects/:id/music", (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);
  const type = getProjectType(projectPath);

  let musicPath = type === "hyperframe"
    ? path.join(projectPath, "assets", "music.mp3")
    : path.join(projectPath, "public", "ASSETS", "music", "ambient.mp3");

  if (fs.existsSync(musicPath)) {
    res.sendFile(musicPath);
  } else {
    res.status(404).json({ error: "Música não encontrada" });
  }
});

// API: Geração de Narração TTS (Edge-TTS ou Premium)
app.post("/api/projects/:id/narration", async (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const { voice, rate, narrations, engine, apiKey, serverUrl } = req.body;

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  if (!narrations || !Array.isArray(narrations) || narrations.length !== 5) {
    return res.status(400).json({ error: "Os 5 roteiros de narração devem ser enviados" });
  }

  const type = getProjectType(projectPath);
  const selectedEngine = engine || "edge";
  const selectedVoice = voice || (selectedEngine === "edge" ? "pt-BR-AntonioNeural" : "");
  const selectedRate = rate || "+0%";

  try {
    if (type === "hyperframe") {
      // Para Hyperframe, combinamos os textos das etapas e criamos uma narração única
      const fullText = narrations.filter(t => t?.trim()).join(". ");
      const targetFile = path.join(projectPath, "assets", "narration.mp3");

      if (selectedEngine === "edge") {
        const tts = new EdgeTTS(fullText, selectedVoice, { rate: selectedRate });
        const result = await tts.synthesize();
        const arrayBuffer = await result.audio.arrayBuffer();
        fs.writeFileSync(targetFile, Buffer.from(arrayBuffer));
      } else {
        throw new Error(`Engine ${selectedEngine} para Hyperframe não suportada de forma autônoma. Use o motor Edge.`);
      }

      // Atualizar transcript.json
      const transPath = path.join(projectPath, "transcript.json");
      let transData = [];
      if (fs.existsSync(transPath)) {
        transData = JSON.parse(fs.readFileSync(transPath, "utf8"));
      }
      for (let i = 0; i < transData.length; i++) {
        if (narrations[i]) transData[i].text = narrations[i];
      }
      fs.writeFileSync(transPath, JSON.stringify(transData, null, 2), "utf8");

    } else {
      // Para Remotion, mantemos a geração dos 5 arquivos individuais
      const targetDir = path.join(projectPath, "public", "ASSETS", "narration");
      fs.mkdirSync(targetDir, { recursive: true });

      for (let i = 0; i < 5; i++) {
        const text = narrations[i]?.trim();
        if (!text) continue;

        const targetFile = path.join(targetDir, `${i + 1}.mp3`);
        const subtitlesFile = path.join(targetDir, `${i + 1}.json`);

        if (selectedEngine === "edge") {
          const tts = new EdgeTTS(text, selectedVoice, { rate: selectedRate });
          const result = await tts.synthesize();
          const arrayBuffer = await result.audio.arrayBuffer();
          fs.writeFileSync(targetFile, Buffer.from(arrayBuffer));
          fs.writeFileSync(subtitlesFile, JSON.stringify(result.subtitle, null, 2));
        }
      }

      // Atualizar config.json do Remotion
      const configPath = path.join(projectPath, "src", "config.json");
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
        for (let i = 0; i < configData.length; i++) {
          configData[i].narrationText = narrations[i];
          configData[i].audioSrc = `ASSETS/narration/${i + 1}.mp3`;
          configData[i].subtitlesSrc = `ASSETS/narration/${i + 1}.json`;
        }
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
      }
    }

    res.json({ success: true, message: "Narração gerada com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar narração", details: err.message });
  }
});

// API: Servir áudio de narração contínuo (Hyperframe)
app.get("/api/projects/:id/narration.mp3", (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);
  const audioPath = path.join(projectPath, "assets", "narration.mp3");
  if (fs.existsSync(audioPath)) {
    res.sendFile(audioPath);
  } else {
    res.status(404).json({ error: "Áudio de narração não encontrado" });
  }
});

// API: Servir áudios segmentados (Remotion)
app.get("/api/projects/:id/narration/:index.mp3", (req, res) => {
  const { id, index } = req.params;
  const projectPath = getProjectPath(id);
  const audioPath = path.join(projectPath, "public", "ASSETS", "narration", `${index}.mp3`);
  if (fs.existsSync(audioPath)) {
    res.sendFile(audioPath);
  } else {
    res.status(404).json({ error: "Áudio não encontrado" });
  }
});

// API: Obter arquivos estáticos de imagem do Hyperframe
app.get("/api/projects/:id/assets/:filename", (req, res) => {
  const { id, filename } = req.params;
  const projectPath = getProjectPath(id);
  const assetPath = path.join(projectPath, "assets", filename);
  if (fs.existsSync(assetPath)) {
    res.sendFile(assetPath);
  } else {
    res.status(404).end();
  }
});

// API: SSE Renderizador
app.get("/api/projects/:id/render", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const type = getProjectType(projectPath);

  res.write(`data: ${JSON.stringify({ type: "log", text: `Iniciando renderização no ${type.toUpperCase()}...` })}\n\n`);

  let renderProc;

  if (type === "hyperframe") {
    res.write(`data: ${JSON.stringify({ type: "log", text: "Executando renderização via Hyperframe CLI..." })}\n\n`);
    renderProc = spawn("npx", ["--yes", "hyperframes@0.6.97", "render"], {
      cwd: projectPath,
      shell: true
    });
  } else {
    res.write(`data: ${JSON.stringify({ type: "log", text: "Executando 'npm run render' via Remotion..." })}\n\n`);
    renderProc = spawn("npm", ["run", "render"], {
      cwd: projectPath,
      shell: true
    });
  }

  req.on("close", () => {
    console.log("Conexão cancelada pelo usuário. Encerrando processo.");
    renderProc.kill("SIGINT");
  });

  renderProc.stdout.on("data", (data) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({ type: "log", text: line.trim() })}\n\n`);
        
        // Match progresso
        const match = line.match(/(?:Rendered|Encoded|Progress)\s+(\d+)\/(\d+)/i) || line.match(/(\d+)%/);
        if (match) {
          let percent = 0;
          if (match[2]) {
            percent = Math.round((parseInt(match[1]) / parseInt(match[2])) * 100);
          } else {
            percent = parseInt(match[1]);
          }
          res.write(`data: ${JSON.stringify({ type: "progress", percent, step: "render" })}\n\n`);
        }
      }
    }
  });

  renderProc.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      res.write(`data: ${JSON.stringify({ type: "log", text: `[stderr] ${text}` })}\n\n`);
    }
  });

  renderProc.on("close", (code) => {
    if (code === 0) {
      res.write(`data: ${JSON.stringify({ type: "done", success: true, message: "Renderização finalizada com sucesso!" })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "done", success: false, message: `Renderização falhou com código ${code}` })}\n\n`);
    }
    res.end();
  });
});

// API: Servir arquivo de vídeo final
app.get("/api/projects/:id/video", (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const type = getProjectType(projectPath);

  const rendered = findRenderedVideo(projectPath, type);
  if (!rendered) {
    return res.status(404).json({ error: "Vídeo renderizado não encontrado" });
  }

  const videoPath = path.join(projectPath, rendered.filename);
  res.sendFile(videoPath);
});

// API YouTube: Status
app.get("/api/youtube/status", async (req, res) => {
  const hasCredentials = fs.existsSync(CREDENTIALS_PATH);
  const hasTokens = fs.existsSync(TOKENS_PATH);
  
  if (!hasCredentials) {
    return res.json({ authenticated: false, hasCredentials: false, channel: null });
  }
  
  if (!hasTokens) {
    return res.json({ authenticated: false, hasCredentials: true, channel: null });
  }
  
  try {
    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
    const oauth2Client = getOAuth2Client(creds);
    oauth2Client.setCredentials(tokens);
    
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const response = await youtube.channels.list({
      part: "snippet",
      mine: true
    });
    
    const channelName = response.data.items?.[0]?.snippet?.title || "Canal Desconhecido";
    res.json({
      authenticated: true,
      hasCredentials: true,
      channel: channelName
    });
  } catch (err) {
    res.json({ authenticated: false, hasCredentials: true, channel: null, error: err.message });
  }
});

// API YouTube: Publicar
app.post("/api/projects/:id/publish", async (req, res) => {
  const projectId = req.params.id;
  const projectPath = getProjectPath(projectId);
  const { title, description, tags, privacyStatus } = req.body;
  
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }
  
  const type = getProjectType(projectPath);
  const rendered = findRenderedVideo(projectPath, type);
  if (!rendered) {
    return res.status(400).json({ error: "Nenhum vídeo renderizado encontrado" });
  }
  
  const videoPath = path.join(projectPath, rendered.filename);
  
  if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKENS_PATH)) {
    return res.status(401).json({ error: "YouTube não autenticado" });
  }
  
  try {
    const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
    const oauth2Client = getOAuth2Client(creds);
    oauth2Client.setCredentials(tokens);
    
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    
    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: title || `${projectId} Timelapse`,
          description: description || `Timelapse de construção de ${projectId}`,
          tags: tags || [],
          categoryId: "22",
        },
        status: {
          privacyStatus: privacyStatus || "private",
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });
    
    res.json({
      success: true,
      videoId: response.data.id,
      url: `https://youtube.com/shorts/${response.data.id}`
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao publicar no YouTube", details: err.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Servidor Premium de automação rodando em http://localhost:${PORT}`);
});
