import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const PROJECT = "lingua_cabos_submarinos";
const SHORTS_DIR = path.join(
  "C:",
  "Users",
  "Leo",
  "Desktop",
  "Lumiera Videos",
  "videos curtos shorts"
);
const PROJ_DIR = path.join(SHORTS_DIR, PROJECT);

const vpeJob = JSON.parse(
  fs.readFileSync(
    path.join(REPO, ".lumiera-logs/ai-jobs/job_1783632636241_p0ep597.json"),
    "utf8"
  )
);
const narrJob = JSON.parse(
  fs.readFileSync(
    path.join(REPO, ".lumiera-logs/ai-jobs/job_1783633143364_ir6bvag.json"),
    "utf8"
  )
);

const result = vpeJob.result;
const narrPlan = narrJob.result?.plan || result.narration_chunk_plan;
const chunkByScene = new Map(
  (narrPlan?.chunks || []).map((c) => [String(c.scene_ref), c])
);

function assetType(vp) {
  const t = String(vp.type || "").toLowerCase();
  if (t.includes("vídeo") || t.includes("video")) return "video";
  return "image";
}

function placeholderAsset(vp, index) {
  const scene = String(vp.scene || `scene-${index}`).replace(/\./g, "_");
  const ext = assetType(vp) === "video" ? "mp4" : "jpeg";
  return `pending_${scene}_${index}.${ext}`;
}

function buildTimelineAssets() {
  const timeline = {};
  for (const [index, vp] of (result.visual_prompts || []).entries()) {
    const block = String(vp.block || 1);
    const chunk = chunkByScene.get(String(vp.scene));
    const isVideo = assetType(vp) === "video";
    const assetName =
      String(vp.scene) === "2.4"
        ? "Shark_mouthing_submarine_cable_1080p_202607091848.mp4"
        : placeholderAsset(vp, index + 1);
    const entry = {
      asset: assetName,
      type: assetType(vp),
      fixed: isVideo ? 10 : 8,
      narration_segment: vp.narration_text || chunk?.text || "",
      generation_prompt: vp.prompt || vp.production?.generate_from_prompt || "",
      chunk_id: chunk?.id || "",
      scene_ref: vp.scene,
      production: vp.production || null,
      media_mode: vp.media_mode || null,
      motion_scene_id: vp.motion_scene_id || null,
      motion_template_id: vp.motion_template_id || null,
    };
    if (chunk) {
      entry.audio_start = chunk.start_s ?? 0;
      entry.speech_end = chunk.end_s ?? 0;
      entry.synced_to_speech = Boolean(narrJob.result?.whisper_synced);
      entry.duration_from_whisper = Boolean(narrJob.result?.whisper_synced);
    }
    if (!timeline[block]) timeline[block] = [];
    timeline[block].push(entry);
  }
  return timeline;
}

function buildBlockPhrases() {
  const lines = String(result.narrative_script || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const blocks = new Map();
  for (const vp of result.visual_prompts || []) {
    const b = Number(vp.block || 1);
    if (!blocks.has(b)) blocks.set(b, []);
    const text = String(vp.narration_text || "").trim();
    if (text && !blocks.get(b).includes(text)) blocks.get(b).push(text);
  }
  return [...blocks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([block, phrases]) => ({
      block,
      phrase: phrases.join(" "),
    }));
}

function copyTemplates() {
  const files = [
    "build_video.py",
    "build_video_destacado.py",
    "mix_bgm.py",
    "find_block_timings.py",
    "align_transcripts.py",
  ];
  for (const file of files) {
    const src = path.join(REPO, file);
    const dest = path.join(PROJ_DIR, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
  const logoSrc = path.join(REPO, "ASSETS", "logo.png");
  const logoDest = path.join(PROJ_DIR, "ASSETS", "logo.png");
  if (fs.existsSync(logoSrc)) fs.copyFileSync(logoSrc, logoDest);
}

function copySharkAsset() {
  const src = path.join(
    process.env.USERPROFILE || "C:\\Users\\Leo",
    "Downloads",
    "Shark_mouthing_submarine_cable_1080p_202607091848.mp4"
  );
  const dest = path.join(PROJ_DIR, "ASSETS", path.basename(src));
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return dest;
  }
  return null;
}

function main() {
  if (fs.existsSync(PROJ_DIR)) {
    console.log(`Projeto ja existe em ${PROJ_DIR} — atualizando config.`);
  } else {
    fs.mkdirSync(path.join(PROJ_DIR, "ASSETS"), { recursive: true });
    fs.mkdirSync(path.join(PROJ_DIR, "OUTPUT"), { recursive: true });
    fs.mkdirSync(path.join(PROJ_DIR, "narration_chunks"), { recursive: true });
    copyTemplates();
  }

  const base = JSON.parse(
    fs.readFileSync(path.join(REPO, "config_qanat.json"), "utf8")
  );
  const strategy = result.strategy || {};
  const config = {
    ...base,
    project_name: PROJECT,
    niche: "Engenharia",
    format: "SHORTS",
    video_format: "9:16",
    design_preset: "documentary-history",
    caption_style: "shorts-viral",
    accent_color: "#22d3ee",
    highlight_keywords: [
      "cabos submarinos",
      "internet",
      "google",
      "kevlar",
      "tubarões",
      "fibra óptica",
      "engenharia",
    ],
    creator_strategy: strategy,
    narrative_script: result.narrative_script,
    narrative_script_tagged: result.narrative_script_tagged || null,
    block_phrases: buildBlockPhrases(),
    technical_config: result.technical_config || {},
    research_sources: result.research_sources || [],
    research_facts: result.research_facts || [],
    motion_scenes: result.motion_scenes || [],
    motion_scenes_meta: result.motion_scenes_meta || null,
    production_orchestration: result.production_orchestration || null,
    narration_chunk_plan: narrPlan,
    timeline_assets: buildTimelineAssets(),
    upload_metadata: {
      title: strategy.title_main || "A língua dos cabos submarinos",
      description: `${strategy.hook || ""}\n\n${result.narrative_script || ""}`,
      tags: "cabos submarinos, internet, google, engenharia, fibra otica, tubaroes, kevlar",
    },
    recovered_at: new Date().toISOString(),
    recovered_from: [
      "job_1783632636241_p0ep597.json",
      "job_1783633143364_ir6bvag.json",
      "legacy SYSTEM profile (pending audio/assets copy)",
    ],
  };

  fs.writeFileSync(
    path.join(PROJ_DIR, "config_qanat.json"),
    JSON.stringify(config, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(PROJ_DIR, "storyboard.json"),
    JSON.stringify(
      {
        project: PROJECT,
        title: strategy.title_main,
        visual_prompts: result.visual_prompts,
        motion_scenes: result.motion_scenes,
        recovered_at: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  const shark = copySharkAsset();

  console.log("OK — projeto recuperado:");
  console.log(PROJ_DIR);
  console.log(`Cenas: ${(result.visual_prompts || []).length}`);
  console.log(`Chunks narracao: ${(narrPlan?.chunks || []).length}`);
  if (shark) console.log(`Asset tubarao: ${shark}`);
  console.log(
    "\nAbra no Lumiera: Biblioteca -> lingua_cabos_submarinos (Engenharia)"
  );
}

main();
