import fs from "fs";
import path from "path";
import pg from "pg";
import { exec, execSync, spawn } from "child_process";
import { synthesizeFishSpeech, loadFishSpeechConfig } from "./fishSpeechTts.js";
import { buildPythonSpawnEnv, getFfmpegStatus } from "./pythonEnv.js";

const pool = new pg.Pool({
  connectionString:
    process.env.LUMIERA_DATABASE_URL ||
    "postgresql://lumiera@127.0.0.1:5432/lumiera",
});

export async function ensureWhiteboardDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS whiteboard_runs (
        id SERIAL PRIMARY KEY,
        topic TEXT NOT NULL,
        folder_path TEXT NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL,
        duration_sec INTEGER DEFAULT 45,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error(
      "[WhiteboardDb] Erro ao assegurar tabela no PostgreSQL:",
      err
    );
  } finally {
    client.release();
  }
}

export function resolvePythonPath(workspaceDir) {
  const checkFile = path.join(workspaceDir, "graphify-out", ".graphify_python");
  if (fs.existsSync(checkFile)) {
    const p = fs.readFileSync(checkFile, "utf8").trim();
    if (p && fs.existsSync(p)) return p;
  }
  return process.platform === "win32" ? "python.exe" : "python3";
}

export function getSkillPaths(workspaceDir) {
  const skillRoot = path.join(
    workspaceDir,
    ".agents",
    "skills",
    "whiteboard-video"
  );
  const runtime = path.join(skillRoot, "runtime");
  return {
    skillRoot,
    runtime,
    generateBoardImages: path.join(
      runtime,
      "whiteboard-infographic-pipeline-orchestrator",
      "scripts",
      "generate_board_images.py"
    ),
    writeBoardAssetManifest: path.join(
      runtime,
      "whiteboard-infographic-pipeline-orchestrator",
      "scripts",
      "write_board_asset_manifest.py"
    ),
    autoCalibrate: path.join(
      runtime,
      "hand-drawn-infographic-video-board",
      "scripts",
      "auto_calibrate.py"
    ),
    generateBoardPackage: path.join(
      runtime,
      "hand-drawn-infographic-video-board",
      "scripts",
      "generate_board_package.py"
    ),
    renderMultiBoardProject: path.join(
      runtime,
      "whiteboard-infographic-video-renderer",
      "scripts",
      "render_multi_board_project.mjs"
    ),
    checkAssetIdentity: path.join(
      runtime,
      "whiteboard-infographic-pipeline-orchestrator",
      "scripts",
      "check_asset_identity.py"
    ),
    validateReleaseCandidate: path.join(
      runtime,
      "whiteboard-infographic-pipeline-orchestrator",
      "scripts",
      "validate_release_candidate.py"
    ),
  };
}

function cleanLlmJson(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\r?\n/i, "");
  cleaned = cleaned.replace(/\r?\n```$/i, "");
  return cleaned.trim();
}

export async function createWhiteboardRun(deps, { topic, durationSec }) {
  const { WORKSPACE_DIR, getApiKey, callGeminiWithRetry } = deps;
  const apiKey = getApiKey(WORKSPACE_DIR);

  await ensureWhiteboardDatabase();

  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const slug =
    topic
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 30) || "whiteboard-run";

  const folderName = `${timestamp}-${slug}`;
  const runDir = path.join(WORKSPACE_DIR, "whiteboard-runs", folderName);

  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "topic_input.txt"), topic, "utf8");

  // Step 1: Polish Script (Stage B)
  const scriptPrompt = `
Você é o IP Cognition Script Polisher de Lumiera.
Sua missão é polir o tema "${topic}" em um pacote de roteiro para vídeo explicativo em quadro branco de cerca de ${durationSec} segundos.
Você deve produzir EXATAMENTE seis segmentos na seguinte ordem: "hook", "反常识", "例子", "转折", "方法", "结论".
Todo o conteúdo falado (text/caption), intenção visual (visualIntent) e descrições devem ser em PORTUGUÊS.
Cada segmento deve ter spokenAnchors (frases que aparecem literalmente no text ou caption).
O tempo total estimado do roteiro deve ser próximo de ${durationSec} segundos.

Responda EXCLUSIVAMENTE com um único objeto JSON contendo:
- "polished_voiceover_md": String (arquivo Markdown human-readable)
- "voiceover_segments_json": Objeto (JSON estruturado correspondente ao schema do voiceover_segments.json com as chaves topic, style, targetDurationSec, estimatedDurationSec, segments)
- "visual_beats_json": Objeto (JSON estruturado correspondente ao schema do visual_beats.json com as chaves topic, visualStyle, beats)

Não coloque nenhuma explicação ou introdução fora do JSON.
`;

  const scriptResRaw = await callGeminiWithRetry(apiKey, scriptPrompt, {
    projectDir: WORKSPACE_DIR,
    temperature: 0.3,
  });

  const scriptData = JSON.parse(cleanLlmJson(scriptResRaw));

  fs.mkdirSync(path.join(runDir, "script"), { recursive: true });
  fs.writeFileSync(
    path.join(runDir, "script", "polished_voiceover.md"),
    scriptData.polished_voiceover_md,
    "utf8"
  );
  fs.writeFileSync(
    path.join(runDir, "script", "voiceover_segments.json"),
    JSON.stringify(scriptData.voiceover_segments_json, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(runDir, "script", "visual_beats.json"),
    JSON.stringify(scriptData.visual_beats_json, null, 2),
    "utf8"
  );

  // Step 2: Infographic Plan (Stage C)
  const planPrompt = `
Você é o Infographic Planner do Lumiera Whiteboard.
Com base no roteiro e visual beats abaixo, monte o plano infográfico em PORTUGUÊS.
Roteiro e Beats:
${JSON.stringify(scriptData.voiceover_segments_json, null, 2)}
${JSON.stringify(scriptData.visual_beats_json, null, 2)}

Regras de Layout:
- Determine os quadros (boards) necessários (normalmente 1 ou 2 quadros para vídeos curtos).
- Use os tipos de diagrama: process_flow, comparison, two_panel_comparison, timeline, knowledge_map, checklist_flow, ou flywheel.
- Escreva títulos e labels de diagramas em PORTUGUÊS.
- IMPORTANTE: As prompts de imagem geradas em "image_prompts" devem ser em INGLÊS. Elas devem incluir: continuous line art, engineer's notebook sketch, whiteboard explanation aesthetic, parchment background '#faf8f3', charcoal line color '#1a2332', ocean-blue annotations '#2d5a7b', e no máximo 1-2 cores de destaque semântico. Adicione prompt negativo para evitar photorealistic, 3D render e stock photo. Adicione a frase "内容简洁一点，不要逐字写满口播" (Mantenha o conteúdo simples, não escreva a narração palavra por palavra).

Retorne EXCLUSIVAMENTE um único objeto JSON contendo:
- "infographic_plan_json": Objeto correspondente ao infographic_plan.json. Deve seguir rigorosamente esta estrutura:
  {
    "version": "0.1",
    "source": {
      "polishedVoiceoverPath": "script/polished_voiceover.md",
      "voiceoverSegmentsPath": "script/voiceover_segments.json",
      "visualBeatsPath": "script/visual_beats.json"
    },
    "boardDecision": {
      "boardCount": 2, // Quantidade de quadros (geralmente 1 ou 2)
      "reason": "Razão da escolha da quantidade de quadros",
      "splitRule": "Regra de divisão do conteúdo entre os quadros"
    },
    "styleBridge": {
      "creator": "hand-drawn-infographic-creator",
      "rules": "Regras visuais e de estilo"
    },
    "boards": [
      {
        "id": "board-01", // ID estável: board-01, board-02, etc.
        "title": "Título do quadro",
        "purpose": "Propósito visual do quadro em uma frase",
        "contentDensity": "simple",
        "maxKeyObjects": 4, // Inteiro entre 3 e 5
        "sourceSegments": ["seg-01", "seg-02", "seg-03"], // Segmentos de voz mapeados
        "diagramType": "process_flow", // process_flow, comparison, two_panel_comparison, timeline, knowledge_map, checklist_flow, ou flywheel
        "keyObjects": [
          {
            "id": "obj-01",
            "label": "Rótulo curto do objeto/elemento gráfico",
            "role": "Papel/função do objeto"
          }
        ],
        "imagePromptPath": "infographic/image_prompts/board-01.prompt.md",
        "boardSpecPath": "infographic/board_specs/board-01.board_spec.json"
      }
    ]
  }

- "board_specs": Objeto chaveando boardId (ex: "board-01") para seu respectivo JSON do board spec. Cada especificação de quadro no board_specs deve seguir rigorosamente esta estrutura:
  {
    "id": "board-01", // Mesmo ID do board no plano
    "title": "Mesmo título do board no plano",
    "diagramType": "process_flow", // Mesmo tipo de diagrama do plano
    "canvas": {
      "width": 3400,
      "height": 1900,
      "aspectRatio": "16:9"
    },
    "style": {
      "palette": "hand-drawn",
      "colors": ["charcoal", "ocean-blue"]
    },
    "layout": {
      "zone": "Zonas semânticas e hierarquia descrita textualmente"
    },
    "keyObjects": [
      {
        "id": "obj-01",
        "label": "Rótulo curto",
        "role": "Papel",
        "visualForm": "Descrição visual do elemento",
        "sourceSegments": ["seg-01"]
      }
    ],
    "relationships": [
      {
        "from": "obj-01",
        "to": "obj-02",
        "type": "flow" // flow, contrast, dependency
      }
    ],
    "imagePromptPath": "infographic/image_prompts/board-01.prompt.md",
    "handoff": "hand-drawn-infographic-creator"
  }

- "image_prompts": Objeto chaveando boardId para a string do Markdown da prompt (ex: "board-01.prompt.md" content).

Não coloque nenhuma explicação ou introdução fora do JSON.
`;

  const planResRaw = await callGeminiWithRetry(apiKey, planPrompt, {
    projectDir: WORKSPACE_DIR,
    temperature: 0.3,
  });

  const planData = JSON.parse(cleanLlmJson(planResRaw));

  fs.mkdirSync(path.join(runDir, "infographic"), { recursive: true });
  fs.mkdirSync(path.join(runDir, "infographic", "board_specs"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(runDir, "infographic", "image_prompts"), {
    recursive: true,
  });

  fs.writeFileSync(
    path.join(runDir, "infographic", "infographic_plan.json"),
    JSON.stringify(planData.infographic_plan_json, null, 2),
    "utf8"
  );
  for (const [boardId, spec] of Object.entries(planData.board_specs)) {
    fs.writeFileSync(
      path.join(
        runDir,
        "infographic",
        "board_specs",
        `${boardId}.board_spec.json`
      ),
      JSON.stringify(spec, null, 2),
      "utf8"
    );
  }
  for (const [boardId, pmd] of Object.entries(planData.image_prompts)) {
    fs.writeFileSync(
      path.join(runDir, "infographic", "image_prompts", `${boardId}.prompt.md`),
      String(pmd),
      "utf8"
    );
  }

  // Step 3: Creator Output and prompts
  const creatorPrompt = `
Você é o Hand-drawn Infographic Creator do Lumiera Whiteboard.
Com base nas prompts dos quadros abaixo, gere as prompts finais limpas para geradores de imagens (como Midjourney/DALL-E) em INGLÊS.
Prompts originais do planejador:
${JSON.stringify(planData.image_prompts, null, 2)}

Retorne EXCLUSIVAMENTE um único objeto JSON contendo:
- "creator_outputs": Objeto chaveando boardId (ex: "board-01") para o markdown do creator output.
- "imagegen_prompts": Objeto chaveando boardId para a string limpa final da prompt da imagem em INGLÊS.

Não coloque nenhuma explicação fora do JSON.
`;

  const creatorResRaw = await callGeminiWithRetry(apiKey, creatorPrompt, {
    projectDir: WORKSPACE_DIR,
    temperature: 0.2,
  });

  const creatorData = JSON.parse(cleanLlmJson(creatorResRaw));

  fs.mkdirSync(path.join(runDir, "creator_outputs"), { recursive: true });
  fs.mkdirSync(path.join(runDir, "imagegen_prompts"), { recursive: true });

  for (const [boardId, cout] of Object.entries(creatorData.creator_outputs)) {
    fs.writeFileSync(
      path.join(runDir, "creator_outputs", `${boardId}.creator_output.md`),
      String(cout),
      "utf8"
    );
  }
  for (const [boardId, iprompt] of Object.entries(
    creatorData.imagegen_prompts
  )) {
    fs.writeFileSync(
      path.join(runDir, "imagegen_prompts", `${boardId}.imagegen_prompt.txt`),
      String(iprompt),
      "utf8"
    );
  }

  // Execute interactive image generation script to populate image_generation_report.json
  const python = resolvePythonPath(WORKSPACE_DIR);
  const sPaths = getSkillPaths(WORKSPACE_DIR);

  try {
    execSync(
      `"${python}" "${sPaths.generateBoardImages}" --project-dir "${runDir}" --provider interactive`,
      {
        cwd: WORKSPACE_DIR,
        env: buildPythonSpawnEnv(),
        windowsHide: true,
      }
    );
  } catch (err) {
    // Código de status 3 significa "handoff_required" (interativo), o que é esperado
    // e perfeitamente válido. Outros códigos de erro devem ser relançados.
    if (err.status !== 3) {
      throw err;
    }
  }

  // Save run to Postgres
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO whiteboard_runs (topic, folder_path, status, duration_sec) VALUES ($1, $2, $3, $4)`,
      [topic, runDir, "waiting_for_images", durationSec]
    );
  } finally {
    client.release();
  }

  return {
    folderName,
    runDir,
    prompts: creatorData.imagegen_prompts,
  };
}

export async function synthesizePortugueseFishSpeech(workspaceDir, runDir) {
  const segmentsPath = path.join(runDir, "script", "voiceover_segments.json");
  if (!fs.existsSync(segmentsPath)) {
    throw new Error("Roteiro voiceover_segments.json ausente no projeto.");
  }

  const source = JSON.parse(fs.readFileSync(segmentsPath, "utf8"));
  const audioDir = path.join(runDir, "audio");
  const segmentDir = path.join(audioDir, "segments");
  fs.mkdirSync(segmentDir, { recursive: true });

  const fishConfig = loadFishSpeechConfig({ workspaceDir, projectDir: runDir });
  const fishVoice =
    fishConfig.fish_speech?.default_reference_id || "__default__";

  const spawnEnv = buildPythonSpawnEnv();
  const ffmpegBin = getFfmpegStatus().binary || "ffmpeg";
  const ffmpegDir = getFfmpegStatus().dir;
  const ffprobeBin = ffmpegDir
    ? path.join(
        ffmpegDir,
        process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
      )
    : "ffprobe";

  const generated = [];
  let index = 0;

  for (const segment of source.segments) {
    const rawId = segment.id || `seg-${index + 1}`;
    const cleanId =
      String(rawId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `seg-${index + 1}`;
    const base = `${String(index + 1).padStart(2, "0")}-${cleanId}`;
    const mp3Path = path.join(segmentDir, `${base}.mp3`);
    const wavPath = path.join(segmentDir, `${base}.wav`);
    const vttPath = path.join(segmentDir, `${base}.vtt`);

    const text = segment.text || segment.caption;

    // Call synthesis
    await synthesizeFishSpeech(text, {
      outputPath: mp3Path,
      referenceId: fishVoice,
      config: fishConfig,
    });

    // Convert MP3 to WAV (48000 Hz, mono)
    execSync(
      `"${ffmpegBin}" -y -i "${mp3Path}" -ar 48000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
      { env: spawnEnv, windowsHide: true }
    );

    // Read WAV duration using ffprobe
    const durationStdout = execSync(
      `"${ffprobeBin}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`,
      { encoding: "utf8", env: spawnEnv, windowsHide: true }
    ).trim();
    const duration = parseFloat(durationStdout) || 1.0;

    // Generate segment subtitles file (.vtt)
    const vttContent = `WEBVTT

00:00:00.000 --> ${formatSecondsToVttTime(duration)}
${segment.caption || text}
`;
    fs.writeFileSync(vttPath, vttContent, "utf8");

    generated.push({
      ...segment,
      media: {
        mp3: `audio/segments/${base}.mp3`,
        wav: `audio/segments/${base}.wav`,
        subtitles: `audio/segments/${base}.vtt`,
      },
      speechDuration: duration,
    });

    index++;
  }

  // Concatenate WAVs and silences
  const concatListPath = path.join(segmentDir, "concat.txt");
  let concatFileContent = "";
  const pauseCache = new Map();
  const timedSegments = [];
  let cursor = 0;

  for (const [idx, segment] of generated.entries()) {
    const pauseAfter = idx === generated.length - 1 ? 0.0 : 0.12;
    const start = cursor;
    const speechEnd = start + segment.speechDuration;
    const end = speechEnd + pauseAfter;

    // WAV line
    const localWav = path.join(segmentDir, path.basename(segment.media.wav));
    concatFileContent += `file '${localWav.replace(/\\/g, "/")}'\n`;

    if (pauseAfter > 0) {
      const silenceWav = makeSilenceWav(
        pauseAfter,
        segmentDir,
        pauseCache,
        ffmpegBin,
        spawnEnv
      );
      concatFileContent += `file '${silenceWav.replace(/\\/g, "/")}'\n`;
    }

    timedSegments.push({
      id: segment.id,
      text: segment.text,
      caption: segment.caption,
      visualIntent: segment.visualIntent,
      spokenAnchors: segment.spokenAnchors,
      boardId: segment.boardId,
      targetElement: segment.targetElement,
      actions: segment.actions,
      start,
      speechEnd,
      end,
      speechDuration: segment.speechDuration,
      media: segment.media,
    });

    cursor = end;
  }

  fs.writeFileSync(concatListPath, concatFileContent, "utf8");

  // Run FFMPEG concat
  const outputWav = path.join(audioDir, "narration.wav");
  execSync(
    `"${ffmpegBin}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputWav}"`,
    { env: spawnEnv, windowsHide: true }
  );

  const timing = {
    engine: "fish",
    voice: {
      name: "Portuguese (Fish Speech)",
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%",
    },
    totalDuration: cursor,
    generatedAt: new Date().toISOString(),
    source: "voiceover_segments.json",
    output: "audio/narration.wav",
    segments: timedSegments,
  };

  fs.writeFileSync(
    path.join(audioDir, "voiceover_timing.json"),
    JSON.stringify(timing, null, 2),
    "utf8"
  );
}

function makeSilenceWav(
  duration,
  segmentDir,
  cache,
  ffmpegBin = "ffmpeg",
  spawnEnv = process.env
) {
  const key = String(duration.toFixed(3));
  if (cache.has(key)) return cache.get(key);

  const silenceWav = path.join(segmentDir, `silence-${key}.wav`);
  execSync(
    `"${ffmpegBin}" -y -f lavfi -i anullsrc=r=48000:cl=mono -t ${duration} -c:a pcm_s16le "${silenceWav}"`,
    { stdio: "ignore", env: spawnEnv, windowsHide: true }
  );

  cache.set(key, silenceWav);
  return silenceWav;
}

function formatSecondsToVttTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function runWhiteboardRender(
  workspaceDir,
  runDir,
  { onLog = () => {} } = {}
) {
  const python = resolvePythonPath(workspaceDir);
  const sPaths = getSkillPaths(workspaceDir);

  onLog("1. Gerando o manifesto de assets de imagem...");
  execSync(
    `"${python}" "${sPaths.writeBoardAssetManifest}" --project-dir "${runDir}" --overwrite`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );

  onLog("2. Executando calibração automática de delimitadores (bboxes)...");
  execSync(
    `"${python}" "${sPaths.autoCalibrate}" --project-dir "${runDir}" --provider mock --write-tool-on-partial --json`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );

  onLog("3. Gerando o pacote de controle do quadro (Stage D)...");
  execSync(
    `"${python}" "${sPaths.generateBoardPackage}" --project "${runDir}" --asset-manifest "${path.join(runDir, "board_asset_manifest.json")}" --voiceover "${path.join(runDir, "script", "voiceover_segments.json")}" --calibration-dir "${path.join(runDir, "calibration")}" --output "${path.join(runDir, "board_source_for_e")}"`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );

  onLog("4. Renderizando composição de vídeo do quadro (Stage E)...");
  execSync(
    `node "${sPaths.renderMultiBoardProject}" --project-dir "${runDir}" --board-root "${path.join(runDir, "board_source_for_e")}" --voiceover "${path.join(runDir, "script", "voiceover_segments.json")}" --skip-tts --quality standard`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );

  onLog("5. Verificando integridade e identidade dos assets...");
  execSync(
    `"${python}" "${sPaths.checkAssetIdentity}" --project-dir "${runDir}"`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );

  onLog("6. Validando empacotamento final (Quality Gate)...");
  execSync(
    `"${python}" "${sPaths.validateReleaseCandidate}" --project-dir "${runDir}"`,
    {
      cwd: workspaceDir,
      env: buildPythonSpawnEnv(),
      windowsHide: true,
    }
  );
}
