import os from "os";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveScriptPath() {
  const candidates = [
    path.resolve(__dirname, "../../scripts/gemini_watermark_remover.py"),
    path.resolve(__dirname, "../scripts/gemini_watermark_remover.py"),
    path.resolve(process.cwd(), "scripts/gemini_watermark_remover.py"),
    path.resolve(process.cwd(), "../scripts/gemini_watermark_remover.py"),
    "C:\\Users\\Leo\\Documents\\VIDEOS PROFISSIONAIS\\LONGOS\\LUMIERA\\scripts\\gemini_watermark_remover.py",
    "C:\\Lumiera\\scripts\\gemini_watermark_remover.py",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function resolvePythonBinary() {
  const envPy = process.env.PYTHON_BINARY;
  if (envPy && fs.existsSync(envPy)) return envPy;
  const candidates = [
    "C:\\Users\\Leo\\AppData\\Local\\Python\\bin\\python.exe",
    "C:\\Users\\Leo\\AppData\\Local\\Programs\\Python\\Python311\\python.exe",
    "C:\\Users\\Leo\\AppData\\Local\\Programs\\Python\\Python310\\python.exe",
    "python",
  ];
  for (const c of candidates) {
    if (c === "python") return c;
    if (fs.existsSync(c)) return c;
  }
  return "python";
}

/**
 * Localiza todos os vídeos do projeto (.mp4, .webm, .mov)
 * varrendo subpastas como broll/, videos/, public/videos/ e a raiz do projeto.
 */
export function findProjectVideoFiles(projDir) {
  if (!projDir || !fs.existsSync(projDir)) return [];

  const videoFiles = new Set();
  const validExts = new Set([".mp4", ".webm", ".mov", ".mkv"]);

  const scanDir = (dir, depth = 0) => {
    if (depth > 3 || !fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        // Não escnear node_modules ou .git ou .lumiera-worktrees
        if (
          lowerName === "node_modules" ||
          lowerName === ".git" ||
          lowerName.startsWith(".lumiera")
        ) {
          continue;
        }
        scanDir(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Ignorar backups e arquivos temporários
        if (
          validExts.has(ext) &&
          !entry.name.endsWith(".bak") &&
          !entry.name.includes("_cleaned") &&
          !entry.name.includes("_tmp")
        ) {
          videoFiles.add(fullPath);
        }
      }
    }
  };

  scanDir(projDir);

  // Verificar se há timeline_studio.json e pegar mídia referenciada
  const studioJsonPath = path.join(projDir, "timeline_studio.json");
  if (fs.existsSync(studioJsonPath)) {
    try {
      const studioData = JSON.parse(fs.readFileSync(studioJsonPath, "utf-8"));
      const clips = studioData.clips || studioData.timeline_assets || [];
      if (Array.isArray(clips)) {
        for (const clip of clips) {
          const mediaPath = clip.src || clip.path || clip.broll_file;
          if (mediaPath && typeof mediaPath === "string") {
            const resolved = path.isAbsolute(mediaPath)
              ? mediaPath
              : path.join(projDir, mediaPath);
            if (
              fs.existsSync(resolved) &&
              validExts.has(path.extname(resolved).toLowerCase()) &&
              !path.basename(resolved).endsWith(".bak")
            ) {
              videoFiles.add(resolved);
            }
          }
        }
      }
    } catch (e) {
      // Ignorar erros de parse do JSON
    }
  }

  return Array.from(videoFiles);
}

/**
 * Processa todos os vídeos do projeto executando o script python gemini_watermark_remover.py
 * com substituição automática e backups .bak.
 */
export async function processProjectWatermark(
  projDir,
  options = {},
  onLog = () => {},
  onProgress = () => {}
) {
  const scriptPath = resolveScriptPath();

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script Python não encontrado em: ${scriptPath}`);
  }

  const videos = findProjectVideoFiles(projDir);
  const totalVideos = videos.length;

  if (totalVideos === 0) {
    onLog("[WATERMARK] Nenhum vídeo de B-roll ou mídia encontrado no projeto.");
    onProgress(100, "Nenhum vídeo para processar.");
    return {
      totalVideos: 0,
      processedVideos: 0,
      failedVideos: 0,
      replacedFiles: [],
    };
  }

  onLog(
    `[WATERMARK] Encontrados ${totalVideos} vídeo(s) para remoção de watermark Gemini.`
  );
  onProgress(0, `Iniciando processamento de ${totalVideos} vídeo(s)...`);

  const replacedFiles = [];
  let processedVideos = 0;
  let failedVideos = 0;

  for (let i = 0; i < totalVideos; i++) {
    const videoPath = videos[i];
    const videoName = path.basename(videoPath);
    const videoIdx = i + 1;
    const basePct = Math.floor((i / totalVideos) * 100);

    onLog(`\n--------------------------------------------------`);
    onLog(
      `[WATERMARK] [Vídeo ${videoIdx}/${totalVideos}] Analisando: ${videoName}`
    );
    onProgress(
      basePct,
      `Processando vídeo ${videoIdx}/${totalVideos}: ${videoName}`
    );

    // Criar backup .bak se ainda não existir
    const bakPath = `${videoPath}.bak`;
    if (!fs.existsSync(bakPath)) {
      try {
        fs.copyFileSync(videoPath, bakPath);
        onLog(
          `[WATERMARK] Backup de segurança criado: ${path.basename(bakPath)}`
        );
      } catch (err) {
        onLog(
          `[WATERMARK] AVISO: Não foi possível criar backup para ${videoName}: ${err.message}`
        );
      }
    } else {
      onLog(
        `[WATERMARK] Backup existente reutilizado: ${path.basename(bakPath)}`
      );
    }

    const tempOutputPath = `${videoPath}_cleaned.mp4`;

    // Executar script Python
    const pythonExe = resolvePythonBinary();
    const spawnCwd = path.dirname(scriptPath);
    const args = [
      scriptPath,
      "--input",
      videoPath,
      "--output",
      tempOutputPath,
      "--pos",
      options.watermarkPos || "bottom_right",
      "--size",
      String(options.watermarkSize || 64),
    ];

    onLog(
      `[WATERMARK] Executando Reverse Alpha Blending Python com ${path.basename(pythonExe)}...`
    );

    const code = await new Promise((resolve) => {
      const proc = spawn(pythonExe, args, { cwd: spawnCwd });

      proc.stdout.on("data", (data) => {
        const text = data.toString("utf-8");
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith("[PROGRESSO]")) {
            const match = line.match(/\[PROGRESSO\] (\d+)%/);
            if (match) {
              const filePct = parseInt(match[1], 10);
              const totalPct = Math.min(
                99,
                Math.floor(basePct + (filePct / 100) * (100 / totalVideos))
              );
              onProgress(
                totalPct,
                `Vídeo ${videoIdx}/${totalVideos} (${filePct}%): ${videoName}`
              );
            }
          }
          onLog(`  ${line}`);
        }
      });

      proc.stderr.on("data", (data) => {
        onLog(`  [STDERR] ${data.toString("utf-8").trim()}`);
      });

      proc.on("error", (err) => {
        onLog(`[WATERMARK] Erro ao iniciar processo Python: ${err.message}`);
        resolve(1);
      });

      proc.on("close", (exitCode) => {
        resolve(exitCode);
      });
    });

    if (
      code === 0 &&
      fs.existsSync(tempOutputPath) &&
      fs.statSync(tempOutputPath).size > 0
    ) {
      try {
        // Substituir o vídeo original atomicamente
        fs.unlinkSync(videoPath);
        fs.renameSync(tempOutputPath, videoPath);
        onLog(
          `[WATERMARK] SUCESSO! Vídeo original substituído por versão sem watermark: ${videoName}`
        );
        replacedFiles.push(videoPath);
        processedVideos++;
      } catch (err) {
        onLog(
          `[WATERMARK] ERRO ao substituir arquivo original ${videoName}: ${err.message}`
        );
        failedVideos++;
      }
    } else {
      onLog(
        `[WATERMARK] ERRO: Falha no processamento do vídeo ${videoName}. Mantido vídeo original.`
      );
      if (fs.existsSync(tempOutputPath)) {
        try {
          fs.unlinkSync(tempOutputPath);
        } catch (e) {}
      }
      failedVideos++;
    }
  }

  onProgress(
    100,
    `Concluído! ${processedVideos} substituído(s), ${failedVideos} falha(s).`
  );
  onLog(`\n==================================================`);
  onLog(`[WATERMARK] RESUMO FINAL:`);
  onLog(` - Total de vídeos: ${totalVideos}`);
  onLog(` - Vídeos substituídos sem watermark: ${processedVideos}`);
  onLog(` - Falhas: ${failedVideos}`);
  onLog(`==================================================`);

  return { totalVideos, processedVideos, failedVideos, replacedFiles };
}
