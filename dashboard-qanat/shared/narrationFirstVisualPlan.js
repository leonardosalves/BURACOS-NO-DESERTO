const TEMPORAL_MARKER = "[LUMIERA TEMPORAL DIRECTOR]";
const DEFAULT_MAX_CLIP_SECONDS = 8;

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function isVideoScene(scene = {}) {
  const label = String(
    scene.type ||
      scene.media_type ||
      scene.asset?.type ||
      scene.media_mode ||
      ""
  ).toLowerCase();
  return /video|vídeo|t2v|seedance|kling|runway/.test(label);
}

function cleanTemporalInstruction(prompt = "") {
  return String(prompt || "")
    .split(`\n${TEMPORAL_MARKER}`)[0]
    .trim();
}

function splitClipDurations(totalSeconds, maxClipSeconds) {
  const total = Math.max(0.5, Number(totalSeconds) || 0.5);
  const count = Math.max(1, Math.ceil(total / maxClipSeconds));
  const base = total / count;
  const clips = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    const remaining = total - cursor;
    const duration = index === count - 1 ? remaining : base;
    clips.push({
      index: index + 1,
      start_s: round(cursor),
      end_s: round(cursor + duration),
      duration_seconds: round(duration),
      role:
        count === 1
          ? "complete_action"
          : index === 0
            ? "establish_and_begin"
            : index === count - 1
              ? "complete_and_hold"
              : "continue_action",
    });
    cursor += duration;
  }
  return clips;
}

function buildTemporalInstruction(plan) {
  const clips = plan.clips
    .map(
      (clip) =>
        `Shot ${clip.index}: ${clip.start_s}-${clip.end_s}s (${clip.duration_seconds}s), ${clip.role.replaceAll("_", " ")}`
    )
    .join("; ");
  return `${TEMPORAL_MARKER}
Exact visual coverage: ${plan.target_duration_seconds} seconds, measured from the approved TTS and Whisper alignment. Speech ends at ${plan.speech_duration_seconds}s; preserve the final state for the ${plan.post_roll_seconds}s post-roll pause. ${clips}. The important action must be fully visible and completed before ${plan.critical_action_deadline_seconds}s. Do not cut mid-action, do not restart the same action, and maintain subject, wardrobe, geography, lighting and screen direction across shots.`;
}

function scenePauseSeconds(sceneRef, chunkPlan = {}) {
  const chunks = (chunkPlan?.chunks || []).filter(
    (chunk) => String(chunk?.scene_ref || "").trim() === sceneRef
  );
  const last = chunks[chunks.length - 1];
  if (!last) return 0;
  const observed = Number(last.observed_pause_after_ms);
  const planned = Number(last.pause_after_ms);
  return round(
    Math.max(0, Number.isFinite(observed) ? observed : planned) / 1000
  );
}

export function buildNarrationFirstScenePlan(
  scene = {},
  { chunkPlan = {}, maxClipSeconds = DEFAULT_MAX_CLIP_SECONDS } = {}
) {
  const speechStart = Number(scene.speech_start);
  const speechEnd = Number(scene.speech_end);
  const durationField = Number(scene.duration_seconds);
  const speechDuration =
    Number.isFinite(speechStart) &&
    Number.isFinite(speechEnd) &&
    speechEnd > speechStart
      ? speechEnd - speechStart
      : durationField;
  if (!Number.isFinite(speechDuration) || speechDuration <= 0) return null;

  const sceneRef = String(scene.scene || scene.scene_ref || "").trim();
  const postRoll = scenePauseSeconds(sceneRef, chunkPlan);
  const targetDuration = round(Math.max(0.5, speechDuration + postRoll));
  const video = isVideoScene(scene);
  const clips = video
    ? splitClipDurations(
        targetDuration,
        Math.max(3, Number(maxClipSeconds) || 8)
      )
    : [
        {
          index: 1,
          start_s: 0,
          end_s: targetDuration,
          duration_seconds: targetDuration,
          role: "hold_visual",
        },
      ];
  const actionDeadline = round(
    Math.max(
      0.5,
      Math.min(speechDuration, targetDuration - Math.min(0.35, postRoll))
    )
  );
  return {
    version: 1,
    source: "approved_tts_whisper",
    scene_ref: sceneRef,
    speech_duration_seconds: round(speechDuration),
    post_roll_seconds: postRoll,
    target_duration_seconds: targetDuration,
    max_clip_seconds: maxClipSeconds,
    clip_count_required: clips.length,
    coverage_strategy: video
      ? clips.length > 1
        ? "multi_clip_continuity"
        : "single_complete_clip"
      : "still_with_motion",
    critical_action_deadline_seconds: actionDeadline,
    clips,
  };
}

/**
 * Contrato temporal compartilhado por todos os Criadores. Só é aplicado
 * depois do Whisper da narração por trechos aprovada.
 */
export function applyNarrationFirstVisualPlan({
  storyboard = {},
  timelineAssets = {},
  chunkPlan = {},
  maxClipSeconds = DEFAULT_MAX_CLIP_SECONDS,
} = {}) {
  if (chunkPlan?.timing_source !== "whisper") {
    return { storyboard, timelineAssets, applied: false, diagnostics: [] };
  }

  const prompts = Array.isArray(storyboard.visual_prompts)
    ? storyboard.visual_prompts
    : [];
  const blockOrdinals = new Map();
  const nextTimeline = Object.fromEntries(
    Object.entries(timelineAssets || {}).map(([key, slots]) => [
      key,
      Array.isArray(slots) ? slots.map((slot) => ({ ...slot })) : [],
    ])
  );
  const diagnostics = [];

  const nextPrompts = prompts.map((scene) => {
    const plan = buildNarrationFirstScenePlan(scene, {
      chunkPlan,
      maxClipSeconds,
    });
    if (!plan) return scene;
    const video = isVideoScene(scene);
    const basePrompt = cleanTemporalInstruction(
      scene.prompt || scene.visual_prompt || ""
    );
    const resolvedPlan = video
      ? {
          ...plan,
          clips: plan.clips.map((clip) => ({
            ...clip,
            generation_prompt: `${basePrompt}${basePrompt ? "\n" : ""}${TEMPORAL_MARKER} Generate only shot ${clip.index} of ${plan.clip_count_required}: exact duration ${clip.duration_seconds}s; role ${clip.role.replaceAll("_", " ")}; action window ${clip.start_s}-${clip.end_s}s. Preserve continuity with adjacent shots.`,
          })),
        }
      : plan;
    const blockKey = String(Number(scene?.block) || 1);
    const ordinal = blockOrdinals.get(blockKey) || 0;
    blockOrdinals.set(blockKey, ordinal + 1);
    const slot = nextTimeline[blockKey]?.[ordinal];
    if (slot && !slot.fixed_locked) {
      slot.fixed = resolvedPlan.target_duration_seconds;
      slot.visual_target_duration = resolvedPlan.target_duration_seconds;
      slot.temporal_plan = resolvedPlan;
      slot.synced_to_speech = true;
    }

    const temporalInstruction = video
      ? buildTemporalInstruction(resolvedPlan)
      : "";
    if (resolvedPlan.clip_count_required > 1) {
      diagnostics.push({
        scene_ref: resolvedPlan.scene_ref,
        level: "info",
        code: "MULTI_CLIP_REQUIRED",
        message: `${resolvedPlan.clip_count_required} clipes para cobrir ${resolvedPlan.target_duration_seconds}s sem cortar a ação.`,
      });
    }
    return {
      ...scene,
      duration: `${resolvedPlan.target_duration_seconds} segundos`,
      duration_seconds: resolvedPlan.target_duration_seconds,
      duration_from_whisper: true,
      temporal_plan: resolvedPlan,
      ...(video
        ? {
            prompt: `${basePrompt}${basePrompt ? "\n" : ""}${temporalInstruction}`,
            video_prompt_temporal: temporalInstruction,
            video_prompt_variants: resolvedPlan.clips.map(
              (clip) => clip.generation_prompt
            ),
          }
        : {}),
    };
  });

  return {
    applied: nextPrompts.some((scene) => scene.temporal_plan),
    storyboard: {
      ...storyboard,
      visual_prompts: nextPrompts,
      temporal_direction: {
        version: 1,
        source: "approved_tts_whisper",
        planned_at: new Date().toISOString(),
        scene_count: nextPrompts.filter((scene) => scene.temporal_plan).length,
        diagnostics,
      },
    },
    timelineAssets: nextTimeline,
    diagnostics,
  };
}

export { TEMPORAL_MARKER };
