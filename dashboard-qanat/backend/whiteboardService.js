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

/**
 * DNA visual do quadro branco — trava de consistência injetada em TODOS os
 * prompts de imagem para que todos os quadros compartilhem o mesmo estilo.
 */
export function buildWhiteboardVisualDna() {
  return {
    materials: {
      background: "papel marfim (#faf8f3)",
      mainLine: "carvão escuro (#1a2332)",
      technicalLine: "azul oceano (#2d5a7b)",
      alert: "vermelho de alerta (máx. 1 destaque)",
      fill: "preenchimento mínimo",
    },
    rules: [
      "mesma espessura de linha em todos os quadros",
      "mesma perspectiva",
      "mesma textura de papel",
      "sem fotografia",
      "sem sombras realistas",
      "sem textos complexos (não escrever a narração palavra por palavra)",
      "sem elementos 3D",
      "mesma proporção e margem segura",
    ],
    persistentElements: [
      "estilo continuous line art / engineer's notebook sketch",
      "estética de explicação em quadro branco",
      "máximo 1-2 cores de destaque semântico",
    ],
    negativePrompt:
      "photorealistic, 3D render, stock photo, realistic shadows, complex text",
  };
}

/** Bloco de prompt com o DNA visual, para injetar no Stage C. */
export function visualDnaPromptBlock() {
  const dna = buildWhiteboardVisualDna();
  return `
DNA VISUAL (trava de consistência — TODOS os quadros devem seguir exatamente):
- Materiais: fundo ${dna.materials.background}; linha principal ${dna.materials.mainLine}; linha técnica ${dna.materials.technicalLine}; alerta ${dna.materials.alert}; ${dna.materials.fill}.
- Regras: ${dna.rules.join("; ")}.
- Elementos persistentes: ${dna.persistentElements.join("; ")}.
- Prompt negativo obrigatório em cada imagem: ${dna.negativePrompt}.
- IMPORTANTE: As prompts de imagem em "image_prompts" devem ser em INGLÊS e incluir TODO o DNA visual acima, garantindo que todos os quadros tenham aparência idêntica em estilo, cor e textura. Adicione a frase "内容简洁一点，不要逐字写满口播" (Mantenha o conteúdo simples, não escreva a narração palavra por palavra).`;
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

REGRAS DE TÍTULO (importante):
- Produza um campo "title" separado: um título curto e chamativo (máx. ~8 palavras), SEM ponto final.
- O título NÃO deve aparecer dentro do texto do primeiro segmento (hook). O hook começa direto com a narração, sem repetir o título.
- No "polished_voiceover_md", a primeira linha deve ser o título como cabeçalho "# <title>", seguido de uma linha em branco e então o corpo do roteiro (sem repetir o título no corpo).

Responda EXCLUSIVAMENTE com um único objeto JSON contendo:
- "title": String (título curto e separado do roteiro)
- "polished_voiceover_md": String (arquivo Markdown human-readable começando com "# <title>")
- "voiceover_segments_json": Objeto (JSON estruturado correspondente ao schema do voiceover_segments.json com as chaves topic, style, targetDurationSec, estimatedDurationSec, segments)
- "visual_beats_json": Objeto (JSON estruturado correspondente ao schema do visual_beats.json com as chaves topic, visualStyle, beats)

Não coloque nenhuma explicação ou introdução fora do JSON.
`;

  const scriptResRaw = await callGeminiWithRetry(apiKey, scriptPrompt, {
    projectDir: WORKSPACE_DIR,
    temperature: 0.3,
  });

  const scriptData = JSON.parse(cleanLlmJson(scriptResRaw));

  if (scriptData.voiceover_segments_json?.segments) {
    scriptData.voiceover_segments_json.segments =
      scriptData.voiceover_segments_json.segments.map((seg, i) => {
        const segId = String(seg.id || seg.segmentId || `s${i + 1}`);
        return { ...seg, id: segId, segmentId: segId };
      });
  }

  fs.mkdirSync(path.join(runDir, "script"), { recursive: true });
  // Título separado do corpo do roteiro (não fundido ao primeiro segmento).
  const scriptTitle = String(scriptData.title || "").trim();
  if (scriptTitle) {
    fs.writeFileSync(
      path.join(runDir, "script", "title.txt"),
      scriptTitle,
      "utf8"
    );
    if (
      scriptData.voiceover_segments_json &&
      typeof scriptData.voiceover_segments_json === "object"
    ) {
      scriptData.voiceover_segments_json.title = scriptTitle;
    }
  }
  fs.writeFileSync(
    path.join(runDir, "script", "polished_voiceover.md"),
    scriptData.polished_voiceover_md,
    "utf8"
  );
  // DNA visual — trava de consistência compartilhada por todos os quadros.
  fs.writeFileSync(
    path.join(runDir, "visual_dna.json"),
    JSON.stringify(buildWhiteboardVisualDna(), null, 2),
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
${visualDnaPromptBlock()}

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
    "animationPlan": {
      "entrada": "Como o quadro/elementos entram (ex: desenhar a torre esquerda e avançar para a direita)",
      "construcao": "O que é revelado/construído em sequência (ex: revelar o tabuleiro, adicionar cabos, desenhar setas)",
      "enfase": "O que é destacado/circulado (ex: circular a região central)",
      "saida": "Como o quadro sai/transiciona (ex: manter a ponte e apagar apenas as setas)",
      "continuidade": "O que permanece no quadro seguinte (ex: a ponte deve permanecer no mesmo lugar)"
    },
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

    const segId = String(segment.id || segment.segmentId || `s${idx + 1}`);
    timedSegments.push({
      id: segId,
      segmentId: segId,
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

/**
 * Erro estruturado de render — carrega a etapa que falhou e o log real do
 * script (stdout/stderr), permitindo um diagnóstico acionável no frontend.
 */
export class WhiteboardRenderError extends Error {
  constructor(stage, command, detail) {
    super(detail.message || `Falha na etapa: ${stage}`);
    this.name = "WhiteboardRenderError";
    this.stage = stage;
    this.command = command;
    this.stdout = detail.stdout || "";
    this.stderr = detail.stderr || "";
    this.reportPath = detail.reportPath || null;
    this.reportExcerpt = detail.reportExcerpt || null;
    this.failedStep = detail.failedStep || null;
  }
}

/** Extrai o "Failed Step" e o "Error Log" do render_acceptance_report.md. */
function readRenderFailureReport(runDir) {
  try {
    const reportPath = path.join(runDir, "render_acceptance_report.md");
    if (!fs.existsSync(reportPath))
      return { reportPath: null, reportExcerpt: null, failedStep: null };
    const content = fs.readFileSync(reportPath, "utf8");
    const stepMatch = content.match(/Failed Step:\s*(.+)/i);
    const failedStep = stepMatch ? stepMatch[1].trim() : null;
    const logMatch = content.match(
      /##?\s*Error Log[\s\S]*?\n([\s\S]{0,4000})/i
    );
    const reportExcerpt = logMatch
      ? logMatch[1].trim()
      : content.slice(0, 4000);
    return { reportPath, reportExcerpt, failedStep };
  } catch {
    return { reportPath: null, reportExcerpt: null, failedStep: null };
  }
}

/** Roda uma etapa do render capturando saída; lança WhiteboardRenderError com o log real. */
function runRenderStage(stage, command, opts, runDir) {
  try {
    const stdout = execSync(command, {
      ...opts,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return stdout || "";
  } catch (err) {
    const stdout =
      typeof err.stdout === "string"
        ? err.stdout
        : err.stdout?.toString?.() || "";
    const stderr =
      typeof err.stderr === "string"
        ? err.stderr
        : err.stderr?.toString?.() || "";
    const report = readRenderFailureReport(runDir);
    const tail = (stderr || stdout || err.message || "").slice(-3000);
    throw new WhiteboardRenderError(stage, command, {
      message: tail || `Falha na etapa: ${stage}`,
      stdout,
      stderr,
      reportPath: report.reportPath,
      reportExcerpt: report.reportExcerpt,
      failedStep: report.failedStep,
    });
  }
}

export function runWhiteboardRender(
  workspaceDir,
  runDir,
  { onLog = () => {}, quality = "standard", preview = false } = {}
) {
  const python = resolvePythonPath(workspaceDir);
  const sPaths = getSkillPaths(workspaceDir);
  const baseOpts = {
    cwd: workspaceDir,
    env: buildPythonSpawnEnv(),
    windowsHide: true,
  };
  const renderQuality = preview ? "draft" : quality;

  onLog("1. Gerando o manifesto de assets de imagem...");
  runRenderStage(
    "Manifesto de assets",
    `"${python}" "${sPaths.writeBoardAssetManifest}" --project-dir "${runDir}" --overwrite`,
    baseOpts,
    runDir
  );

  onLog("2. Executando calibração automática de delimitadores (bboxes)...");
  runRenderStage(
    "Calibração de bboxes",
    `"${python}" "${sPaths.autoCalibrate}" --project-dir "${runDir}" --provider mock --write-tool-on-partial --json`,
    baseOpts,
    runDir
  );

  onLog("3. Gerando o pacote de controle do quadro (Stage D)...");
  runRenderStage(
    "Pacote de controle (Stage D)",
    `"${python}" "${sPaths.generateBoardPackage}" --project "${runDir}" --asset-manifest "${path.join(runDir, "board_asset_manifest.json")}" --voiceover "${path.join(runDir, "script", "voiceover_segments.json")}" --calibration-dir "${path.join(runDir, "calibration")}" --output "${path.join(runDir, "board_source_for_e")}"`,
    baseOpts,
    runDir
  );

  onLog(
    preview
      ? "4. Renderizando PRÉVIA de baixa resolução (draft)..."
      : "4. Renderizando composição de vídeo do quadro (Stage E)..."
  );
  runRenderStage(
    "Render da composição (Stage E)",
    `node "${sPaths.renderMultiBoardProject}" --project-dir "${runDir}" --board-root "${path.join(runDir, "board_source_for_e")}" --voiceover "${path.join(runDir, "script", "voiceover_segments.json")}" --skip-tts --quality ${renderQuality}`,
    baseOpts,
    runDir
  );

  onLog("5. Verificando integridade e identidade dos assets...");
  runRenderStage(
    "Verificação de integridade",
    `"${python}" "${sPaths.checkAssetIdentity}" --project-dir "${runDir}"`,
    baseOpts,
    runDir
  );

  // No modo prévia (draft), pula o Quality Gate final para acelerar.
  if (preview) {
    onLog("6. Prévia concluída (Quality Gate final pulado no modo rascunho).");
    return;
  }

  onLog("6. Validando empacotamento final (Quality Gate)...");
  runRenderStage(
    "Quality Gate final",
    `"${python}" "${sPaths.validateReleaseCandidate}" --project-dir "${runDir}"`,
    baseOpts,
    runDir
  );
}

/**
 * Regeneração localizada: regenera o prompt de imagem de UM único quadro,
 * preservando os demais. Usa o DNA visual para manter a consistência.
 */
export async function regenerateBoardPrompt(
  deps,
  { runId, boardId, instruction }
) {
  const { getApiKey, callGeminiWithRetry, WORKSPACE_DIR } = deps;
  const apiKey = getApiKey(WORKSPACE_DIR);

  const client = await deps.pool.connect();
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
  if (!run) throw new Error("Projeto não encontrado.");

  const runDir = run.folder_path;
  const boardSpecPath = path.join(
    runDir,
    "infographic",
    "board_specs",
    `${boardId}.board_spec.json`
  );
  let boardSpec = null;
  if (fs.existsSync(boardSpecPath)) {
    try {
      boardSpec = JSON.parse(fs.readFileSync(boardSpecPath, "utf8"));
    } catch {}
  }

  const prompt = `
Você é o Infographic Planner do Lumiera Whiteboard. Regenerate APENAS o prompt de imagem do quadro "${boardId}".
${boardSpec ? `Especificação do quadro:\n${JSON.stringify(boardSpec, null, 2)}` : ""}
${instruction ? `Instrução adicional do usuário: ${instruction}` : ""}
${visualDnaPromptBlock()}

Retorne EXCLUSIVAMENTE um único objeto JSON: { "image_prompt": "o prompt de imagem em INGLÊS, completo, seguindo o DNA visual" }
`;

  const resRaw = await callGeminiWithRetry(apiKey, prompt, {
    projectDir: WORKSPACE_DIR,
    temperature: 0.7,
  });
  let parsed = {};
  try {
    const match = String(resRaw).match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  } catch {}
  const newPrompt = String(parsed.image_prompt || "").trim();
  if (!newPrompt) throw new Error("Falha ao regenerar o prompt do quadro.");

  // Grava o novo prompt, preservando os demais quadros.
  const promptPath = path.join(
    runDir,
    "infographic",
    "image_prompts",
    `${boardId}.prompt.md`
  );
  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(promptPath, newPrompt, "utf8");

  return { boardId, imagePrompt: newPrompt };
}
