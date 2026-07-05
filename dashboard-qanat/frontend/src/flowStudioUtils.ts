import type { SceneAssetPreview } from './assetPreviewUtils';
import { inferAssetMediaType, resolveScenePreviewAsset } from './assetPreviewUtils';
import type { ConfigData } from './appTypes';
import { getSceneDurationSeconds } from './sceneSpeechDuration';

export type FlowQualityChecks = {
  composition: boolean;
  ratio: boolean;
  noArtifacts: boolean;
};

export type FlowSceneRow = {
  index: number;
  sceneNum: string | number;
  blockNum: number;
  blockKey: string;
  assetIdx: number;
  isVideo: boolean;
  prompt: string;
  directingText: string;
  narrationText: string;
  durationSeconds: number | null;
  durationFromWhisper: boolean;
  suggestedFilename: string;
  hasAsset: boolean;
  asset: SceneAssetPreview | null;
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'projeto';
}

export function buildFlowSceneRows(
  storyboard: { visual_prompts?: any[]; narration_chunk_plan?: unknown } | null | undefined,
  config: ConfigData | null,
  opts: {
    projectName: string;
    status?: { block_timings?: unknown } | null;
    wordTranscripts?: unknown[];
  } = { projectName: 'projeto' },
): FlowSceneRow[] {
  const prompts = storyboard?.visual_prompts;
  if (!Array.isArray(prompts) || prompts.length === 0) return [];

  const blockAssetCounters: Record<string, number> = {};
  const projectSlug = slugify(opts.projectName);

  return prompts.map((vp, index) => {
    const blockNum = Number(vp?.block || 1);
    const blockKey = String(blockNum);
    if (blockAssetCounters[blockKey] === undefined) blockAssetCounters[blockKey] = 0;
    const assetIdx = blockAssetCounters[blockKey]++;
    const sceneNum = vp?.scene ?? index + 1;

    const typeRaw = String(vp?.type || '').toLowerCase();
    const isVideo =
      typeRaw.includes('vídeo') ||
      typeRaw.includes('video') ||
      typeRaw.includes('clip');

    const blockPrompts = prompts.filter((p) => Number(p?.block || 1) === blockNum);
    const localIdx = blockPrompts.indexOf(vp);

    const durationSeconds = getSceneDurationSeconds(
      vp,
      opts.wordTranscripts || [],
      blockNum,
      localIdx,
      opts.status || null,
      blockPrompts,
      storyboard?.narration_chunk_plan,
    );
    const durationFromWhisper = durationSeconds != null;

    const asset = resolveScenePreviewAsset(
      vp?.asset,
      config?.timeline_assets?.[blockKey]?.[assetIdx],
    );
    const hasAsset = Boolean(asset?.asset);

    const ext = isVideo ? 'mp4' : 'png';
    const sceneLabel = String(sceneNum).replace(/\./g, '-');
    const suggestedFilename = `${projectSlug}_cena-${sceneLabel}_bloco${blockNum}.${ext}`;

    const brief = vp?.directing_brief;
    const directingText = brief && typeof brief === 'object'
      ? [
          brief.dramatic_function && `Drama: ${brief.dramatic_function}`,
          brief.camera_intent && `Câmera: ${brief.camera_intent}`,
          brief.lighting_intent && `Luz: ${brief.lighting_intent}`,
          brief.performance_intent && `Performance: ${brief.performance_intent}`,
          brief.sound_intent && `Som: ${brief.sound_intent}`,
        ].filter(Boolean).join('\n')
      : '';

    return {
      index,
      sceneNum,
      blockNum,
      blockKey,
      assetIdx,
      isVideo,
      prompt: String(vp?.prompt || '').trim(),
      directingText,
      narrationText: String(vp?.narration_text || vp?.narration_excerpt || '').trim(),
      durationSeconds: durationFromWhisper ? durationSeconds : null,
      durationFromWhisper,
      suggestedFilename,
      hasAsset,
      asset,
    };
  });
}

export function flowCopyPayload(row: FlowSceneRow): string {
  const parts = [
    `Cena ${row.sceneNum} · Bloco ${row.blockNum}`,
    row.durationSeconds != null ? `Duração alvo: ~${row.durationSeconds}s` : null,
    row.isVideo ? 'Tipo: vídeo' : 'Tipo: imagem',
    row.narrationText ? `\nNarração:\n${row.narrationText}` : null,
    row.directingText ? `\nDireção:\n${row.directingText}` : null,
    row.prompt ? `\nPrompt visual:\n${row.prompt}` : null,
    `\nSalvar como: ${row.suggestedFilename}`,
  ].filter(Boolean);
  return parts.join('\n');
}

export function flowChecksStorageKey(projectName: string): string {
  return `lumiera_flow_checks_${slugify(projectName)}`;
}

export function loadFlowChecks(projectName: string): Record<string, FlowQualityChecks> {
  try {
    const raw = localStorage.getItem(flowChecksStorageKey(projectName));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFlowChecks(projectName: string, checks: Record<string, FlowQualityChecks>) {
  localStorage.setItem(flowChecksStorageKey(projectName), JSON.stringify(checks));
}

export function flowSceneKey(row: FlowSceneRow): string {
  return `${row.blockKey}:${row.assetIdx}`;
}

export function sceneMediaLabel(asset: SceneAssetPreview | null): string {
  if (!asset?.asset) return 'Pendente';
  return inferAssetMediaType(asset) === 'video' ? 'Vídeo' : 'Imagem';
}