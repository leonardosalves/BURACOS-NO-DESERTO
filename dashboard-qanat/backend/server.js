import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Workspace is the parent of dashboard-qanat
const WORKSPACE_DIR = path.resolve(__dirname, "../..");
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
          modifiedAt: stats.mtime
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

  sendLog(`[Dashboard] Iniciando script de renderização: ${scriptName}...`);

  const child = spawn(PYTHON_PATH, [scriptName], {
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
function getApiKey(projectDir = WORKSPACE_DIR) {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  
  // Try current project dir first
  const configPath = path.join(projectDir, "config_qanat.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.gemini_api_key) return config.gemini_api_key;
    } catch (e) {}
  }
  
  // Fallback to workspace root
  if (projectDir !== WORKSPACE_DIR) {
    const rootConfigPath = path.join(WORKSPACE_DIR, "config_qanat.json");
    if (fs.existsSync(rootConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(rootConfigPath, "utf8"));
        if (config.gemini_api_key) return config.gemini_api_key;
      } catch (e) {}
    }
  }
  return null;
}

// API: Check if Gemini API key exists
app.get("/api/ai/key-status", (req, res) => {
  const projDir = getProjectDir(req);
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
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: formattedContents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        })
      }
    );
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }
    
    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui obter uma resposta.";
    
    res.json({ text: responseText });
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
app.post("/api/ai/optimize-youtube", async (req, res) => {
  const projDir = getProjectDir(req);
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
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
    
    const prompt = `Analise o roteiro do documentário e as configurações do projeto para gerar o seguinte pacote de metadados para postagem no YouTube Studio:

1. 5 Opções de Títulos (Formato de Teste A/B: Emocionais, Curiosidade e Focados em Números/Listas)
2. Descrição Otimizada para SEO (as duas primeiras linhas devem ser extremamente impactantes e diretas, contendo palavras-chave essenciais para engajar o usuário sem precisar clicar em "Mostrar mais")
3. 15 Tags ordenadas por volume de pesquisa estimado (do maior para o menor)
4. Lista de Capítulos com Timestamps reais do projeto (veja abaixo a lista com as marcas de tempo calculadas do projeto).

Roteiro do Vídeo:
${transcript}

Marcadores com tempos exatos do projeto:
${chaptersText}

Retorne a resposta em formato Markdown muito bem estruturado, limpo, pronto para copiar e colar diretamente. Organize em seções claras: "TÍTULOS", "DESCRIÇÃO", "TAGS" e "CAPÍTULOS".`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }
    
    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar metadados.";
    
    res.json({ text: responseText });
  } catch (err) {
    res.status(500).json({ error: "Erro ao otimizar metadados", details: err.message });
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
        config.timeline_assets[String(scene)] = [assetItem];
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

// API: Generate complete custom video script & JSON configurations
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptSystem }] }]
        })
      }
    );
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }
    
    const result = await response.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up codeblocks if present
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedData = JSON.parse(responseText);
    
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

  const promptSystem = `Você é o "Lumiera Ideas Engine" (Gerador de Roteiros Virais para YouTube + Hyperframe), um estrategista de retenção e pesquisador de tendências do YouTube.
O usuário fornecerá um Nicho de Vídeo e um Formato (Longo ou Shorts).
Faça uma análise rápida, objetiva e estratégica do nicho e gere exatamente 10 ideias de vídeo virais exclusivas (evitando temas genéricos, sem focar em projetos passados de Qanat para evitar repetições).

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `${promptSystem}\n\nENTRADAS:\nNICHO: ${niche}\nFORMATO: ${format}` }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }

    const result = await response.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsedData = JSON.parse(responseText);
    res.json(parsedData);
  } catch (err) {
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: promptSystem }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }

    const result = await response.json();
    responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    const rawData = JSON.parse(responseText);
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
      bgm_mappings: parsedData.technical_config?.bgm_mappings || [],
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
  const apiKey = getApiKey(projDir);
  if (!apiKey) {
    return res.status(401).json({ error: "Chave de API do Google AI Studio não configurada." });
  }
  
  try {
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Erro do Gemini: ${response.statusText}`);
    }
    
    const result = await response.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedData = JSON.parse(responseText);
    
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
