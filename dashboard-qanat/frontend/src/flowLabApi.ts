import { createProgressJobId, waitForAiJobDone } from "./aiJobProgressClient";
import { fetchCreatorScriptAi, fetchGeminiAi } from "./geminiAiFetch";
import type { ConfigData, WorkspaceStatus } from "./appTypes";
import {
  FLOW_LAB_FISH_VOICE_HINT,
  FLOW_LAB_FISH_VOICE_STORAGE_KEY,
  FLOW_LAB_PROJECT,
} from "./flowLabConstants";

export type FlowLabAiContext = {
  geminiBrowserMode: boolean;
  aiProvider: string;
  resolveBrowserResponse: (response: unknown) => unknown;
};

function projectUrl(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}project=${encodeURIComponent(FLOW_LAB_PROJECT)}`;
}

export type FlowLabVpeMeta = {
  qualityScore?: number;
  nicheDetected?: string;
  enhanced: boolean;
};

export type FlowLabIdea = {
  title?: string;
  promise?: string;
  emotion?: string;
  hook?: string;
  hooks?: string;
  blocks?: Array<{ block?: number; content?: string }>;
  best_format?: string;
};

export type FlowLabIdeasResult = {
  ideas: FlowLabIdea[];
  best_idea_index: number;
  best_idea_reason?: string;
  diagnostic?: {
    looking_for?: string;
    pain_points?: string;
    strong_angle?: string;
  };
  _ideas_meta?: {
    usedDeepResearch?: boolean;
    excludedCount?: number;
  };
};

export async function deleteFlowLabSandbox(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/projects/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: FLOW_LAB_PROJECT }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true };
    if (res.status === 404) return { ok: true };
    return { ok: false, error: data.error || "Erro ao excluir sandbox" };
  } catch {
    return { ok: false, error: "Falha de conexao ao excluir sandbox." };
  }
}

export async function generateFlowLabIdeas(
  ctx: FlowLabAiContext,
  opts: {
    niche: string;
    format: "LONGO" | "SHORTS";
    excludeTitles?: string[];
    forceVariety?: boolean;
    useNotebooklm?: boolean;
  }
): Promise<{ ok: boolean; data?: FlowLabIdeasResult; error?: string }> {
  const niche = opts.niche.trim();
  const excludeIdeas = (opts.excludeTitles || [])
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ title }));

  const res = await fetchGeminiAi(
    projectUrl("/api/ai/creator/ideas"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niche,
        format: opts.format,
        project: FLOW_LAB_PROJECT,
        useNotebooklm: opts.useNotebooklm !== false,
        useDeepResearch: true,
        forceVariety: Boolean(opts.forceVariety),
        excludeIdeas,
      }),
    },
    ctx
  );

  if (!res.ok || res.data.needs_browser) {
    return {
      ok: false,
      error:
        (res.data.error as string) ||
        "Geracao de ideias pendente no Gemini ou falhou.",
    };
  }

  const ideas = Array.isArray(res.data.ideas)
    ? (res.data.ideas as FlowLabIdea[])
    : [];
  if (!ideas.length) {
    return { ok: false, error: "Nenhuma ideia retornada — tente outro tema." };
  }

  return {
    ok: true,
    data: {
      ideas,
      best_idea_index: Number(res.data.best_idea_index ?? 0),
      best_idea_reason: res.data.best_idea_reason as string | undefined,
      diagnostic: res.data.diagnostic as FlowLabIdeasResult["diagnostic"],
      _ideas_meta: res.data._ideas_meta as FlowLabIdeasResult["_ideas_meta"],
    },
  };
}

export async function saveFlowLabStoryboard(
  storyboard: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(projectUrl("/api/projects/storyboard"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storyboard),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function syncFlowLabFormat(
  format: "LONGO" | "SHORTS",
  niche: string
): Promise<void> {
  try {
    await fetch(projectUrl("/api/config"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aspect_ratio: format === "SHORTS" ? "9:16" : "16:9",
        video_format: format,
        niche: niche.trim() || "Geral",
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function ensureFlowLabProject(
  format: "LONGO" | "SHORTS",
  niche: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: FLOW_LAB_PROJECT,
        format,
        niche: niche.trim() || "Geral",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await syncFlowLabFormat(format, niche);
      return { ok: true };
    }
    if (res.status === 400 && String(data.error || "").includes("Já existe")) {
      await syncFlowLabFormat(format, niche);
      return { ok: true };
    }
    return { ok: false, error: data.error || "Erro ao preparar sandbox" };
  } catch {
    return { ok: false, error: "Falha de conexao ao criar sandbox." };
  }
}

/** Engenharia Visual PRO — le storyboard do disco e reprocessa todos os prompts. */
export async function runFlowLabVisualPro(
  ctx: FlowLabAiContext
): Promise<{
  ok: boolean;
  storyboard?: Record<string, unknown>;
  meta?: FlowLabVpeMeta;
  error?: string;
}> {
  const { createProgressJobId } = await import("./aiJobProgressClient");
  const { fetchAsyncAiJob } = await import("./geminiAiFetch");
  const progressJobId = createProgressJobId();
  const vpe = await fetchAsyncAiJob(
    projectUrl("/api/ai/creator/enhance-visual-prompts"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: FLOW_LAB_PROJECT,
        progress_job_id: progressJobId,
      }),
    },
    { ...ctx, progressJobId, timeoutMs: 480_000 }
  );

  if (!vpe.ok || vpe.data.needs_browser) {
    return {
      ok: false,
      error:
        (vpe.data.error as string) ||
        "Engenharia Visual PRO pendente no Gemini ou falhou.",
    };
  }

  const storyboard = vpe.data as Record<string, unknown>;
  const checklist = storyboard._vpe_checklist as
    { quality_score?: number; nicho_detectado?: string } | undefined;
  return {
    ok: true,
    storyboard,
    meta: {
      enhanced: true,
      qualityScore: checklist?.quality_score,
      nicheDetected: checklist?.nicho_detectado,
    },
  };
}

type FishVoiceOption = { id: string; label?: string };

/** Resolve voz Fish Speech — prioridade: localStorage > Valentino > default do config/API. */
export async function resolveFlowLabFishVoice(): Promise<{
  voiceId: string;
  label: string;
}> {
  const stored =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(FLOW_LAB_FISH_VOICE_STORAGE_KEY)?.trim()
      : "";
  if (stored) return { voiceId: stored, label: stored };

  try {
    const res = await fetch("/api/tts/voices");
    if (res.ok) {
      const data = await res.json();
      const fish = (data.engines || []).find(
        (e: { id?: string }) => e.id === "fish"
      );
      const voices: FishVoiceOption[] = Array.isArray(fish?.voices)
        ? fish.voices
        : [];
      const hint = FLOW_LAB_FISH_VOICE_HINT.toLowerCase();
      const valentino = voices.find((v) => {
        const blob = `${v.label || ""} ${v.id || ""}`.toLowerCase();
        return blob.includes(hint);
      });
      if (valentino?.id) {
        return {
          voiceId: valentino.id,
          label: valentino.label || valentino.id,
        };
      }
      if (fish?.defaultVoice) {
        return {
          voiceId: String(fish.defaultVoice),
          label: String(fish.defaultVoice),
        };
      }
      if (voices[0]?.id) {
        return {
          voiceId: voices[0].id,
          label: voices[0].label || voices[0].id,
        };
      }
    }
  } catch {
    /* fallback abaixo */
  }

  return { voiceId: "__default__", label: "Fish Speech S2 (padrao)" };
}

export function setFlowLabFishVoicePreference(voiceId: string) {
  const id = voiceId.trim();
  if (!id) {
    localStorage.removeItem(FLOW_LAB_FISH_VOICE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(FLOW_LAB_FISH_VOICE_STORAGE_KEY, id);
}

export async function fetchFlowLabStatus(): Promise<WorkspaceStatus | null> {
  try {
    const res = await fetch(projectUrl("/api/status"));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchFlowLabWordTranscripts(): Promise<unknown[]> {
  try {
    const url = `/api/projects-media/${encodeURIComponent(FLOW_LAB_PROJECT)}/word_transcripts.json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function planFlowLabNarrationChunks(
  fishVoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(projectUrl("/api/ai/plan-narration-chunks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        useHeuristic: true,
        defaultVoice: { engine: "fish", voice: fishVoiceId },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      return {
        ok: false,
        error: data.error || "Falha ao planejar trechos de narração.",
      };
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha de conexao ao planejar trechos." };
  }
}

async function runFlowLabNarrationTtsAndWhisper(
  fishVoiceId: string,
  onStep?: (step: string) => void
): Promise<{
  ok: boolean;
  whisperSynced?: boolean;
  whisperError?: string;
  error?: string;
}> {
  const progressJobId = createProgressJobId();
  onStep?.("Narração Fish Speech S2 (Valentino)...");

  try {
    const res = await fetch(projectUrl("/api/tts/generate-narration-chunks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chunk_ids: null,
        default_voice: { engine: "fish", voice: fishVoiceId },
        engine: "fish",
        voice: fishVoiceId,
        use_tagged: true,
        sync_whisper: true,
        assemble_master: true,
        progress_job_id: progressJobId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "TTS Fish Speech falhou." };
    }

    if (data.started && data.jobId) {
      onStep?.("Whisper: medindo segundos por cena...");
      const result = (await waitForAiJobDone(String(data.jobId))) as {
        error?: string;
        whisper_synced?: boolean;
        whisper_error?: string | null;
      };
      if (result.error) {
        return { ok: false, error: result.error };
      }
      return {
        ok: true,
        whisperSynced: Boolean(result.whisper_synced),
        whisperError: result.whisper_error || undefined,
      };
    }

    return {
      ok: true,
      whisperSynced: Boolean(data.whisper_synced),
      whisperError: data.whisper_error || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Falha na narração Fish Speech.",
    };
  }
}

export async function generateFlowLabPipeline(
  ctx: FlowLabAiContext,
  opts: {
    idea: FlowLabIdea;
    format: "LONGO" | "SHORTS";
    niche: string;
    useNotebooklm?: boolean;
  },
  onStep?: (step: string) => void
): Promise<{
  ok: boolean;
  storyboard?: Record<string, unknown>;
  vpe?: FlowLabVpeMeta;
  narration?: {
    fishVoice: string;
    whisperSynced?: boolean;
    whisperError?: string;
  };
  error?: string;
}> {
  const formatApi = opts.format;
  const niche = opts.niche.trim() || "Geral";
  const ideaTitle = String(opts.idea.title || "").trim();
  if (!ideaTitle) {
    return { ok: false, error: "Ideia sem titulo — selecione ou gere outra." };
  }

  onStep?.("Preparando sandbox...");
  const proj = await ensureFlowLabProject(opts.format, niche);
  if (!proj.ok) return { ok: false, error: proj.error };

  const baseBody = {
    niche,
    format: formatApi,
    idea: opts.idea,
    project: FLOW_LAB_PROJECT,
    useNotebooklm: opts.useNotebooklm !== false,
  };

  onStep?.(
    opts.useNotebooklm !== false
      ? "Gerando narracao (NotebookLM)..."
      : "Gerando narracao..."
  );
  const narr = await fetchCreatorScriptAi(
    projectUrl("/api/ai/creator/script"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baseBody, phase: "narration" }),
    },
    ctx
  );
  if (!narr.ok || narr.data.needs_browser) {
    return {
      ok: false,
      error:
        (narr.data.error as string) ||
        "Narracao pendente no Gemini Chrome ou falhou.",
    };
  }
  const narrative = String(narr.data.narrative_script || "").trim();
  if (narrative.length < 80) {
    return { ok: false, error: "Narracao muito curta — tente de novo." };
  }

  onStep?.(
    opts.useNotebooklm !== false
      ? "Gerando roteiro e cenas (NotebookLM)..."
      : "Gerando roteiro e cenas..."
  );
  const full = await fetchCreatorScriptAi(
    projectUrl("/api/ai/creator/script"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...baseBody,
        phase: "full",
        approvedNarration: narrative,
        approvedNarrationTagged: narr.data.narrative_script_tagged || undefined,
      }),
    },
    ctx
  );
  if (!full.ok || full.data.needs_browser) {
    return {
      ok: false,
      error:
        (full.data.error as string) ||
        "Roteiro pendente no Gemini Chrome ou falhou.",
    };
  }

  const draftStoryboard = full.data as Record<string, unknown>;
  await saveFlowLabStoryboard(draftStoryboard);

  const fishVoice = await resolveFlowLabFishVoice();
  if (fishVoice.voiceId && fishVoice.voiceId !== "__default__") {
    setFlowLabFishVoicePreference(fishVoice.voiceId);
  }

  onStep?.("Planejando trechos por cena...");
  const chunkPlan = await planFlowLabNarrationChunks(fishVoice.voiceId);
  if (!chunkPlan.ok) {
    return {
      ok: false,
      error: chunkPlan.error || "Falha ao planejar narração por cena.",
    };
  }

  const narrAudio = await runFlowLabNarrationTtsAndWhisper(
    fishVoice.voiceId,
    onStep
  );
  if (!narrAudio.ok) {
    return {
      ok: false,
      error:
        narrAudio.error ||
        "Narração Fish Speech falhou. Verifique fish_speech.api_key no config.",
    };
  }
  if (!narrAudio.whisperSynced && narrAudio.whisperError) {
    onStep?.(`Whisper incompleto: ${narrAudio.whisperError}`);
  }

  onStep?.("Engenharia Visual PRO...");
  const vpeResult = await runFlowLabVisualPro(ctx);
  if (!vpeResult.ok || !vpeResult.storyboard) {
    return {
      ok: false,
      error:
        vpeResult.error ||
        "Engenharia Visual PRO falhou. Os prompts brutos nao foram liberados.",
    };
  }

  const storyboard = await fetchFlowLabStoryboard();
  return {
    ok: true,
    storyboard: storyboard || vpeResult.storyboard,
    vpe: vpeResult.meta,
    narration: {
      fishVoice: fishVoice.label,
      whisperSynced: narrAudio.whisperSynced,
      whisperError: narrAudio.whisperError,
    },
  };
}

export async function fetchFlowLabStoryboard(): Promise<Record<
  string,
  unknown
> | null> {
  try {
    const res = await fetch(projectUrl("/api/projects/storyboard"));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchFlowLabConfig(): Promise<ConfigData | null> {
  try {
    const res = await fetch(projectUrl("/api/config"));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function flowLabAssetUrl(fileName: string): string {
  return `/api/projects-media/${encodeURIComponent(FLOW_LAB_PROJECT)}/ASSETS/${encodeURIComponent(fileName)}`;
}

export async function uploadFlowLabSceneAsset(
  blockNum: number,
  type: "video" | "image",
  file: File,
  assetIdx: number,
  storyboard: { visual_prompts?: any[] }
): Promise<{
  ok: boolean;
  storyboard?: Record<string, unknown>;
  error?: string;
}> {
  const idxParam = `&idx=${assetIdx}`;
  const res = await fetch(
    projectUrl(
      `/api/upload-scene-asset?scene=${blockNum}&type=${type}&filename=${encodeURIComponent(file.name)}${idxParam}`
    ),
    {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }
  );
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || "Upload falhou" };

  const nextPrompts = [...(storyboard.visual_prompts || [])];
  let targetSceneIndex = -1;
  let currentAssetIdx = 0;
  for (let j = 0; j < nextPrompts.length; j++) {
    if (Number(nextPrompts[j].block || 1) === Number(blockNum)) {
      if (currentAssetIdx === assetIdx) {
        targetSceneIndex = j;
        break;
      }
      currentAssetIdx++;
    }
  }
  if (targetSceneIndex !== -1) {
    const scene = nextPrompts[targetSceneIndex];
    const durRaw = scene?.duration_seconds ?? scene?.duration;
    const durNum =
      typeof durRaw === "number"
        ? durRaw
        : Number.parseFloat(String(durRaw || ""));
    const videoFixed = Number.isFinite(durNum) && durNum > 0 ? durNum : 8.0;
    nextPrompts[targetSceneIndex] = {
      ...scene,
      asset: {
        asset: data.asset,
        type,
        user_locked: true,
        manual_asset: true,
        ...(type === "video" ? { fixed: videoFixed } : {}),
      },
    };
  }
  const nextStoryboard = { ...storyboard, visual_prompts: nextPrompts };
  await fetch(projectUrl("/api/projects/storyboard"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextStoryboard),
  });
  return { ok: true, storyboard: nextStoryboard };
}
