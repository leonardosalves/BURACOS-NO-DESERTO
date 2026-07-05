import { fetchCreatorScriptAi, fetchGeminiAi } from './geminiAiFetch';
import type { ConfigData } from './appTypes';
import { FLOW_LAB_PROJECT } from './flowLabConstants';

export type FlowLabAiContext = {
  geminiBrowserMode: boolean;
  aiProvider: string;
  resolveBrowserResponse: (response: unknown) => unknown;
};

function projectUrl(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}project=${encodeURIComponent(FLOW_LAB_PROJECT)}`;
}

export type FlowLabVpeMeta = {
  qualityScore?: number;
  nicheDetected?: string;
  enhanced: boolean;
};

export async function saveFlowLabStoryboard(storyboard: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(projectUrl('/api/projects/storyboard'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyboard),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function syncFlowLabFormat(format: 'LONGO' | 'SHORTS', niche: string): Promise<void> {
  try {
    await fetch(projectUrl('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aspect_ratio: format === 'SHORTS' ? '9:16' : '16:9',
        video_format: format,
        niche: niche.trim() || 'Geral',
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function ensureFlowLabProject(
  format: 'LONGO' | 'SHORTS',
  niche: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: FLOW_LAB_PROJECT,
        format,
        niche: niche.trim() || 'Geral',
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await syncFlowLabFormat(format, niche);
      return { ok: true };
    }
    if (res.status === 400 && String(data.error || '').includes('Já existe')) {
      await syncFlowLabFormat(format, niche);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Erro ao preparar sandbox' };
  } catch {
    return { ok: false, error: 'Falha de conexao ao criar sandbox.' };
  }
}

/** Engenharia Visual PRO — le storyboard do disco e reprocessa todos os prompts. */
export async function runFlowLabVisualPro(
  ctx: FlowLabAiContext,
): Promise<{ ok: boolean; storyboard?: Record<string, unknown>; meta?: FlowLabVpeMeta; error?: string }> {
  const vpe = await fetchGeminiAi(
    projectUrl('/api/ai/creator/enhance-visual-prompts'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: FLOW_LAB_PROJECT }),
    },
    ctx,
  );

  if (!vpe.ok || vpe.data.needs_browser) {
    return {
      ok: false,
      error: (vpe.data.error as string) || 'Engenharia Visual PRO pendente no Gemini ou falhou.',
    };
  }

  const storyboard = vpe.data as Record<string, unknown>;
  const checklist = storyboard._vpe_checklist as { quality_score?: number; nicho_detectado?: string } | undefined;
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

function buildIdeaPayload(title: string) {
  const t = title.trim();
  return {
    title: t,
    promise: t,
    emotion: 'Curiosity / Wonder',
    hook: t,
    hooks: t,
    blocks: [{ block: 1, content: t }],
    isCustom: true,
  };
}

export async function generateFlowLabPipeline(
  ctx: FlowLabAiContext,
  opts: { title: string; format: 'LONGO' | 'SHORTS'; niche: string },
  onStep?: (step: string) => void,
): Promise<{ ok: boolean; storyboard?: Record<string, unknown>; vpe?: FlowLabVpeMeta; error?: string }> {
  const formatApi = opts.format;
  const niche = opts.niche.trim() || 'Geral';

  onStep?.('Preparando sandbox...');
  const proj = await ensureFlowLabProject(opts.format, niche);
  if (!proj.ok) return { ok: false, error: proj.error };

  const baseBody = {
    niche,
    format: formatApi,
    idea: buildIdeaPayload(opts.title),
    project: FLOW_LAB_PROJECT,
    useNotebooklm: false,
  };

  onStep?.('Gerando narracao...');
  const narr = await fetchCreatorScriptAi(
    projectUrl('/api/ai/creator/script'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...baseBody, phase: 'narration' }),
    },
    ctx,
  );
  if (!narr.ok || narr.data.needs_browser) {
    return { ok: false, error: narr.data.error as string || 'Narracao pendente no Gemini Chrome ou falhou.' };
  }
  const narrative = String(narr.data.narrative_script || '').trim();
  if (narrative.length < 80) {
    return { ok: false, error: 'Narracao muito curta — tente de novo.' };
  }

  onStep?.('Gerando roteiro e cenas...');
  const full = await fetchCreatorScriptAi(
    projectUrl('/api/ai/creator/script'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseBody,
        phase: 'full',
        approvedNarration: narrative,
        approvedNarrationTagged: narr.data.narrative_script_tagged || undefined,
      }),
    },
    ctx,
  );
  if (!full.ok || full.data.needs_browser) {
    return { ok: false, error: full.data.error as string || 'Roteiro pendente no Gemini Chrome ou falhou.' };
  }

  const draftStoryboard = full.data as Record<string, unknown>;
  await saveFlowLabStoryboard(draftStoryboard);

  onStep?.('Engenharia Visual PRO...');
  const vpeResult = await runFlowLabVisualPro(ctx);
  if (!vpeResult.ok || !vpeResult.storyboard) {
    return {
      ok: false,
      error: vpeResult.error || 'Engenharia Visual PRO falhou. Os prompts brutos nao foram liberados.',
    };
  }

  return { ok: true, storyboard: vpeResult.storyboard, vpe: vpeResult.meta };
}

export async function fetchFlowLabStoryboard(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(projectUrl('/api/projects/storyboard'));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchFlowLabConfig(): Promise<ConfigData | null> {
  try {
    const res = await fetch(projectUrl('/api/config'));
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
  type: 'video' | 'image',
  file: File,
  assetIdx: number,
  storyboard: { visual_prompts?: any[] },
): Promise<{ ok: boolean; storyboard?: Record<string, unknown>; error?: string }> {
  const idxParam = `&idx=${assetIdx}`;
  const res = await fetch(
    projectUrl(
      `/api/upload-scene-asset?scene=${blockNum}&type=${type}&filename=${encodeURIComponent(file.name)}${idxParam}`,
    ),
    {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    },
  );
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || 'Upload falhou' };

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
    nextPrompts[targetSceneIndex] = {
      ...nextPrompts[targetSceneIndex],
      asset: {
        asset: data.asset,
        type,
        user_locked: true,
        manual_asset: true,
        ...(type === 'video' ? { fixed: 8.0 } : {}),
      },
    };
  }
  const nextStoryboard = { ...storyboard, visual_prompts: nextPrompts };
  await fetch(projectUrl('/api/projects/storyboard'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nextStoryboard),
  });
  return { ok: true, storyboard: nextStoryboard };
}