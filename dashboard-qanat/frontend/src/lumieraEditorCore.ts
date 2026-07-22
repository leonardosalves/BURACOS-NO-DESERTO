export const LUMIERA_EDITOR_VERSION = 2;
export const DEFAULT_EDITOR_FPS = 30;

export type LumieraTrackType =
  | "video"
  | "audio"
  | "text"
  | "caption"
  | "image"
  | "lottie"
  | "effect"
  | "background"
  | "motion-template";

export type LumieraAsset = {
  id: string;
  name: string;
  kind: "video" | "audio" | "image" | "lottie";
  originalSource: string;
  proxySource?: string;
  waveformSource?: string;
  thumbnailSources?: string[];
  durationInFrames?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  status?: "processing" | "ready" | "failed";
};

export type LumieraClip = {
  id: string;
  trackId: string;
  type: LumieraTrackType;
  startFrame: number;
  durationInFrames: number;
  sourceStartFrame?: number;
  sourceEndFrame?: number;
  assetId?: string;
  label?: string;
  source?: string;
  templateId?: string;
  props?: Record<string, unknown>;
  locked?: boolean;
};

export type LumieraTrack = {
  id: string;
  type: LumieraTrackType;
  label: string;
  color: string;
  locked?: boolean;
  clips: LumieraClip[];
};

export type LumieraAuditEntry = {
  id: string;
  at: string;
  actor: "manual" | "ai" | "system";
  commandType: LumieraEditCommand["type"];
  summary: string;
};

export type LumieraEditorProject = {
  version: number;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  background: string;
  tracks: LumieraTrack[];
  assets: LumieraAsset[];
  auditLog: LumieraAuditEntry[];
};

export type LumieraEditCommand =
  | { type: "ADD_ASSET"; asset: LumieraAsset }
  | { type: "REMOVE_ASSET"; assetId: string }
  | { type: "ADD_CLIP"; clip: LumieraClip }
  | { type: "REMOVE_CLIP"; clipId: string }
  | { type: "MOVE_CLIP"; clipId: string; startFrame: number }
  | {
      type: "TRIM_CLIP";
      clipId: string;
      startFrame?: number;
      durationInFrames: number;
      sourceStartFrame?: number;
      sourceEndFrame?: number;
    }
  | { type: "SPLIT_CLIP"; clipId: string; frame: number }
  | {
      type: "UPDATE_CLIP";
      clipId: string;
      patch: Partial<Omit<LumieraClip, "id" | "trackId">>;
    }
  | { type: "SET_BACKGROUND"; background: string }
  | { type: "SET_FORMAT"; width: number; height: number }
  | { type: "BATCH"; commands: LumieraEditCommand[] }
  | { type: "RESTORE_PROJECT"; project: LumieraEditorProject };

export type LumieraCommandEnvelope = {
  id: string;
  actor: "manual" | "ai" | "system";
  command: LumieraEditCommand;
  createdAt: string;
  summary?: string;
};

export type AIEditPlan = {
  version: "1.0";
  summary: string;
  targetFormat?: { width: number; height: number; fps: number };
  operations: Array<
    | { operation: "move_clip"; clipId: string; startFrame: number }
    | { operation: "remove_clip"; clipId: string }
    | {
        operation: "trim_clip";
        clipId: string;
        startFrame?: number;
        durationInFrames: number;
      }
    | { operation: "split_clip"; clipId: string; frame: number }
    | { operation: "add_clip"; clip: LumieraClip }
    | {
        operation: "update_clip";
        clipId: string;
        patch: Partial<Omit<LumieraClip, "id" | "trackId">>;
      }
  >;
  warnings?: string[];
};

export function secondsToFrames(seconds: number, fps = DEFAULT_EDITOR_FPS) {
  return Math.max(0, Math.round((Number(seconds) || 0) * fps));
}

export function framesToSeconds(frames: number, fps = DEFAULT_EDITOR_FPS) {
  return Math.max(0, Math.round((Math.max(0, frames) / fps) * 1000) / 1000);
}

export function createEmptyLumieraProject(
  format: "16:9" | "9:16" = "16:9",
  fps = DEFAULT_EDITOR_FPS
): LumieraEditorProject {
  const vertical = format === "9:16";
  return {
    version: LUMIERA_EDITOR_VERSION,
    fps,
    width: vertical ? 1080 : 1920,
    height: vertical ? 1920 : 1080,
    durationInFrames: fps * 30,
    background: "#0f0f18",
    assets: [],
    auditLog: [],
    tracks: [
      { id: "text", type: "text", label: "Texto", color: "#3b82f6", clips: [] },
      { id: "captions", type: "caption", label: "Legendas", color: "#8b5cf6", clips: [] },
      { id: "motion", type: "motion-template", label: "Motion Templates", color: "#6366f1", clips: [] },
      { id: "video", type: "video", label: "Vídeo", color: "#2563eb", clips: [] },
      { id: "images", type: "image", label: "Imagens", color: "#14b8a6", clips: [] },
      { id: "lottie", type: "lottie", label: "Lottie", color: "#ec4899", clips: [] },
      { id: "effects", type: "effect", label: "Efeitos", color: "#f97316", clips: [] },
      { id: "audio", type: "audio", label: "Áudio", color: "#f59e0b", clips: [] },
    ],
  };
}

export function findLumieraClip(project: LumieraEditorProject, clipId: string) {
  for (const track of project.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) return { track, clip };
  }
  return null;
}

function normalizeClip(clip: LumieraClip): LumieraClip {
  const startFrame = Math.max(0, Math.round(Number(clip.startFrame) || 0));
  const durationInFrames = Math.max(
    1,
    Math.round(Number(clip.durationInFrames) || 1)
  );
  return {
    ...clip,
    startFrame,
    durationInFrames,
    sourceStartFrame: Math.max(0, Math.round(Number(clip.sourceStartFrame) || 0)),
    sourceEndFrame: Math.max(
      Math.max(0, Math.round(Number(clip.sourceStartFrame) || 0)) + 1,
      Math.round(
        Number(clip.sourceEndFrame) ||
          Math.max(0, Math.round(Number(clip.sourceStartFrame) || 0)) +
            durationInFrames
      )
    ),
  };
}

export function validateLumieraCommand(
  project: LumieraEditorProject,
  command: LumieraEditCommand
): string[] {
  const errors: string[] = [];
  const requireClip = (clipId: string) => {
    if (!findLumieraClip(project, clipId)) errors.push(`Clip inexistente: ${clipId}`);
  };
  if (command.type === "ADD_CLIP") {
    if (findLumieraClip(project, command.clip.id)) errors.push(`Clip duplicado: ${command.clip.id}`);
    if (!project.tracks.some((track) => track.id === command.clip.trackId)) errors.push(`Trilha inexistente: ${command.clip.trackId}`);
    if (command.clip.durationInFrames <= 0) errors.push("A duração do clip deve ser positiva");
  } else if (command.type === "ADD_ASSET") {
    if (project.assets.some((asset) => asset.id === command.asset.id)) errors.push(`Asset duplicado: ${command.asset.id}`);
    if (!command.asset.originalSource) errors.push("O asset precisa de uma fonte original");
  } else if (command.type === "REMOVE_ASSET") {
    if (!project.assets.some((asset) => asset.id === command.assetId)) errors.push(`Asset inexistente: ${command.assetId}`);
    if (project.tracks.some((track) => track.clips.some((clip) => clip.assetId === command.assetId))) errors.push("O asset ainda esta em uso na timeline");
  } else if (command.type === "REMOVE_CLIP") requireClip(command.clipId);
  else if (command.type === "MOVE_CLIP") {
    requireClip(command.clipId);
    if (!Number.isFinite(command.startFrame) || command.startFrame < 0) errors.push("startFrame inválido");
  } else if (command.type === "TRIM_CLIP") {
    requireClip(command.clipId);
    if (!Number.isFinite(command.durationInFrames) || command.durationInFrames < 1) errors.push("durationInFrames inválido");
  } else if (command.type === "SPLIT_CLIP") {
    const found = findLumieraClip(project, command.clipId);
    requireClip(command.clipId);
    if (found && (command.frame <= found.clip.startFrame || command.frame >= found.clip.startFrame + found.clip.durationInFrames)) errors.push("O corte deve ficar dentro do clip");
  } else if (command.type === "UPDATE_CLIP") requireClip(command.clipId);
  else if (command.type === "SET_FORMAT") {
    if (!Number.isFinite(command.width) || !Number.isFinite(command.height) || command.width < 1 || command.height < 1) errors.push("Formato de video invalido");
  }
  else if (command.type === "BATCH") {
    let cursor = project;
    for (const nested of command.commands) {
      const nestedErrors = validateLumieraCommand(cursor, nested);
      if (nestedErrors.length) errors.push(...nestedErrors);
      else cursor = applyLumieraCommand(cursor, nested, { audit: false }).project;
    }
  }
  return errors;
}

function replaceClip(project: LumieraEditorProject, clipId: string, next: LumieraClip[]) {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.some((clip) => clip.id === clipId)
        ? track.clips.flatMap((clip) => (clip.id === clipId ? next : [clip]))
        : track.clips,
    })),
  };
}

function withoutAudit(project: LumieraEditorProject) {
  return { ...project, auditLog: [] };
}

export function applyLumieraCommand(
  project: LumieraEditorProject,
  command: LumieraEditCommand,
  options: { actor?: LumieraCommandEnvelope["actor"]; summary?: string; audit?: boolean } = {}
): { project: LumieraEditorProject; inverse: LumieraEditCommand; errors: string[] } {
  const errors = validateLumieraCommand(project, command);
  if (errors.length) return { project, inverse: { type: "RESTORE_PROJECT", project }, errors };
  const before = structuredClone(project);
  let next = structuredClone(project);
  if (command.type === "RESTORE_PROJECT") next = structuredClone(command.project);
  else if (command.type === "ADD_ASSET") next.assets = [...next.assets, structuredClone(command.asset)];
  else if (command.type === "REMOVE_ASSET") next.assets = next.assets.filter((asset) => asset.id !== command.assetId);
  else if (command.type === "ADD_CLIP") {
    const clip = normalizeClip(command.clip);
    next.tracks = next.tracks.map((track) => track.id === clip.trackId ? { ...track, clips: [...track.clips, clip] } : track);
  } else if (command.type === "REMOVE_CLIP") {
    next.tracks = next.tracks.map((track) => ({ ...track, clips: track.clips.filter((clip) => clip.id !== command.clipId) }));
  } else if (command.type === "MOVE_CLIP") {
    const found = findLumieraClip(next, command.clipId)!;
    next = replaceClip(next, command.clipId, [{ ...found.clip, startFrame: Math.round(command.startFrame) }]);
  } else if (command.type === "TRIM_CLIP") {
    const found = findLumieraClip(next, command.clipId)!;
    next = replaceClip(next, command.clipId, [normalizeClip({
      ...found.clip,
      startFrame: command.startFrame ?? found.clip.startFrame,
      durationInFrames: command.durationInFrames,
      sourceStartFrame: command.sourceStartFrame ?? found.clip.sourceStartFrame,
      sourceEndFrame: command.sourceEndFrame ??
        ((command.sourceStartFrame ?? found.clip.sourceStartFrame ?? 0) + command.durationInFrames),
    })]);
  } else if (command.type === "SPLIT_CLIP") {
    const found = findLumieraClip(next, command.clipId)!;
    const leftDuration = command.frame - found.clip.startFrame;
    const rightDuration = found.clip.durationInFrames - leftDuration;
    next = replaceClip(next, command.clipId, [
      normalizeClip({
        ...found.clip,
        durationInFrames: leftDuration,
        sourceEndFrame: (found.clip.sourceStartFrame || 0) + leftDuration,
      }),
      normalizeClip({
        ...found.clip,
        id: `${found.clip.id}-split-${command.frame}`,
        startFrame: command.frame,
        durationInFrames: rightDuration,
        sourceStartFrame: (found.clip.sourceStartFrame || 0) + leftDuration,
        sourceEndFrame: found.clip.sourceEndFrame,
      }),
    ]);
  } else if (command.type === "UPDATE_CLIP") {
    const found = findLumieraClip(next, command.clipId)!;
    next = replaceClip(next, command.clipId, [normalizeClip({ ...found.clip, ...command.patch })]);
  } else if (command.type === "SET_BACKGROUND") next.background = command.background;
  else if (command.type === "SET_FORMAT") {
    next.width = Math.round(command.width);
    next.height = Math.round(command.height);
  }
  else if (command.type === "BATCH") {
    for (const nested of command.commands) next = applyLumieraCommand(next, nested, { audit: false }).project;
  }
  const maxEnd = Math.max(1, ...next.tracks.flatMap((track) => track.clips.map((clip) => clip.startFrame + clip.durationInFrames)));
  next.durationInFrames = Math.max(next.durationInFrames, maxEnd);
  if (options.audit !== false) {
    next.auditLog = [...project.auditLog, {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      actor: options.actor || "manual",
      commandType: command.type,
      summary: options.summary || command.type,
    }].slice(-200);
  }
  return { project: next, inverse: { type: "RESTORE_PROJECT", project: withoutAudit(before) }, errors: [] };
}

export function validateAIEditPlan(project: LumieraEditorProject, plan: AIEditPlan) {
  const errors: string[] = [];
  if (!plan || plan.version !== "1.0") errors.push("Versão do plano da IA inválida");
  if (!Array.isArray(plan?.operations) || !plan.operations.length) errors.push("O plano da IA não contém operações");
  const commands: LumieraEditCommand[] = [];
  for (const operation of plan?.operations || []) {
    let command: LumieraEditCommand | null = null;
    if (operation.operation === "move_clip") command = { type: "MOVE_CLIP", clipId: operation.clipId, startFrame: operation.startFrame };
    else if (operation.operation === "remove_clip") command = { type: "REMOVE_CLIP", clipId: operation.clipId };
    else if (operation.operation === "trim_clip") command = { type: "TRIM_CLIP", clipId: operation.clipId, startFrame: operation.startFrame, durationInFrames: operation.durationInFrames };
    else if (operation.operation === "split_clip") command = { type: "SPLIT_CLIP", clipId: operation.clipId, frame: operation.frame };
    else if (operation.operation === "add_clip") command = { type: "ADD_CLIP", clip: operation.clip };
    else if (operation.operation === "update_clip") command = { type: "UPDATE_CLIP", clipId: operation.clipId, patch: operation.patch };
    if (!command) errors.push("Operação da IA não suportada");
    else commands.push(command);
  }
  if (!errors.length) errors.push(...validateLumieraCommand(project, { type: "BATCH", commands }));
  return { ok: errors.length === 0, errors, command: { type: "BATCH", commands } as LumieraEditCommand };
}

export function resolveAssetSource(asset: LumieraAsset | undefined, mode: "preview" | "render") {
  if (!asset) return "";
  return mode === "preview" ? asset.proxySource || asset.originalSource : asset.originalSource;
}
