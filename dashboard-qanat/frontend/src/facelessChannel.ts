import type { ConfigData, WorkspaceStatus } from './appTypes';
import { isWhisperTimelineReady } from './sceneSpeechDuration';

export type FacelessNichePreset = {
  id: string;
  label: string;
  niche: string;
  format: 'LONGO' | 'SHORTS';
  cpmHint: string;
  description: string;
};

/** Nichos faceless de alto CPM citados em playbooks virais (finanças, true crime, etc.). */
export const FACELESS_NICHE_PRESETS: FacelessNichePreset[] = [
  {
    id: 'curiosidades',
    label: 'Curiosidades & fatos',
    niche: 'curiosidades e fatos surpreendentes da história e ciência',
    format: 'LONGO',
    cpmHint: 'CPM médio-alto',
    description: 'Documentário narrado, imagem IA 2K + stock. Sem câmera.',
  },
  {
    id: 'financas',
    label: 'Finanças & investimentos',
    niche: 'finanças pessoais, investimentos e economia para iniciantes',
    format: 'LONGO',
    cpmHint: 'CPM alto',
    description: 'Explicadores com dados, gráficos e narração clara.',
  },
  {
    id: 'motivacao',
    label: 'Motivação & mindset',
    niche: 'motivação, disciplina e histórias de superação',
    format: 'SHORTS',
    cpmHint: 'Volume alto',
    description: 'Shorts verticais, hook forte nos 3 primeiros segundos.',
  },
  {
    id: 'truecrime',
    label: 'True crime & mistérios',
    niche: 'casos reais de crime, mistérios e investigações históricas',
    format: 'LONGO',
    cpmHint: 'Retenção longa',
    description: 'Narração tensa + visuais de arquivo e reconstrução IA.',
  },
  {
    id: 'natureza',
    label: 'Natureza & vida selvagem',
    niche: 'vida selvagem, natureza e curiosidades sobre animais',
    format: 'LONGO',
    cpmHint: 'CPM estável',
    description: 'Footage stock cinematográfico + narração calma.',
  },
  {
    id: 'idiomas',
    label: 'Idiomas & educação',
    niche: 'aprender inglês ou espanhol com histórias curtas e diálogos',
    format: 'SHORTS',
    cpmHint: 'Audiência recorrente',
    description: 'Lições em Shorts, repetição e clareza na voz.',
  },
];

export type ComplianceStatus = 'pass' | 'warn' | 'fail' | 'info';

export type FacelessComplianceItem = {
  id: string;
  label: string;
  detail: string;
  status: ComplianceStatus;
  policyRef?: string;
};

export type FacelessComplianceInput = {
  storyboardData: unknown;
  config: ConfigData | null;
  status: WorkspaceStatus | null;
  wordTranscripts: unknown;
  timelineAssets: Record<string, unknown[]> | null | undefined;
  nicheInput: string;
};

function countTimelineAssets(assets: Record<string, unknown[]> | null | undefined): number {
  if (!assets || typeof assets !== 'object') return 0;
  return Object.values(assets).reduce((sum, block) => sum + (Array.isArray(block) ? block.length : 0), 0);
}

function narrativeLength(storyboardData: unknown): number {
  const script = (storyboardData as { narrative_script?: string } | null)?.narrative_script;
  return typeof script === 'string' ? script.trim().length : 0;
}

function visualPromptCount(storyboardData: unknown): number {
  const prompts = (storyboardData as { visual_prompts?: unknown[] } | null)?.visual_prompts;
  return Array.isArray(prompts) ? prompts.length : 0;
}

function hasDuplicateVisualPrompts(storyboardData: unknown): boolean {
  const prompts = (storyboardData as { visual_prompts?: Array<{ prompt?: string }> } | null)?.visual_prompts;
  if (!Array.isArray(prompts) || prompts.length < 3) return false;
  const texts = prompts.map((p) => (p.prompt || '').trim().toLowerCase()).filter(Boolean);
  return new Set(texts).size < Math.ceil(texts.length * 0.6);
}

function hasStrategyHook(storyboardData: unknown): boolean {
  const strategy = (storyboardData as { strategy?: { hook?: string; title_main?: string } } | null)?.strategy;
  const hook = strategy?.hook?.trim() || '';
  const title = strategy?.title_main?.trim() || '';
  return hook.length >= 20 || title.length >= 10;
}

/** Checklist anti-desmonetização (política YouTube IA 2025+) + prontidão faceless. */
export function evaluateFacelessCompliance(input: FacelessComplianceInput): FacelessComplianceItem[] {
  const items: FacelessComplianceItem[] = [];
  const narrLen = narrativeLength(input.storyboardData);
  const sceneCount = visualPromptCount(input.storyboardData);
  const assetCount = countTimelineAssets(input.timelineAssets);
  const whisperReady = isWhisperTimelineReady(input.wordTranscripts, input.status);

  items.push({
    id: 'niche',
    label: 'Nicho definido',
    detail: input.nicheInput.trim()
      ? `Nicho: ${input.nicheInput.trim().slice(0, 80)}`
      : 'Informe o nicho no passo 1 antes de publicar.',
    status: input.nicheInput.trim().length >= 8 ? 'pass' : 'warn',
  });

  items.push({
    id: 'original_script',
    label: 'Roteiro original (não genérico)',
    detail: narrLen >= 400
      ? `Narração com ${narrLen} caracteres — conteúdo substantivo.`
      : narrLen >= 120
        ? 'Roteiro curto — enriqueça com pesquisa e fatos verificáveis.'
        : 'Sem roteiro ou muito curto — risco de conteúdo IA de baixo valor.',
    status: narrLen >= 400 ? 'pass' : narrLen >= 120 ? 'warn' : 'fail',
    policyRef: 'YouTube monetização — originalidade',
  });

  items.push({
    id: 'hook',
    label: 'Gancho e estratégia editorial',
    detail: hasStrategyHook(input.storyboardData)
      ? 'Hook ou título principal definidos no storyboard.'
      : 'Adicione gancho e título na estratégia — evita vídeo “slideshow genérico”.',
    status: hasStrategyHook(input.storyboardData) ? 'pass' : 'warn',
  });

  items.push({
    id: 'scenes',
    label: 'Cenas visuais estruturadas',
    detail: sceneCount >= 3
      ? `${sceneCount} cenas no storyboard.`
      : 'Poucas cenas — monte roteiro completo antes do render.',
    status: sceneCount >= 3 ? 'pass' : sceneCount >= 1 ? 'warn' : 'fail',
  });

  items.push({
    id: 'visual_variety',
    label: 'Variedade visual (anti-massa)',
    detail: hasDuplicateVisualPrompts(input.storyboardData)
      ? 'Muitos prompts repetidos — personalize cada cena.'
      : 'Prompts visuais diversificados.',
    status: hasDuplicateVisualPrompts(input.storyboardData) ? 'warn' : sceneCount >= 1 ? 'pass' : 'info',
    policyRef: 'Conteúdo produzido em massa',
  });

  items.push({
    id: 'narration',
    label: 'Narração master (sem rosto)',
    detail: input.status?.has_narration
      ? 'MP3 de narração presente no projeto.'
      : 'Gere ou envie a narração no passo 2.',
    status: input.status?.has_narration ? 'pass' : 'fail',
  });

  items.push({
    id: 'sync',
    label: 'Sincronização Whisper',
    detail: whisperReady
      ? 'Timings por palavra/bloco prontos.'
      : 'Execute Sincronizar no passo 3.',
    status: whisperReady ? 'pass' : 'fail',
  });

  items.push({
    id: 'broll',
    label: 'B-roll mapeado na timeline',
    detail: assetCount >= sceneCount && sceneCount > 0
      ? `${assetCount} assets na timeline.`
      : assetCount > 0
        ? `${assetCount} assets — revise se todas as cenas têm mídia.`
        : 'Use Pipeline 90% ou monte B-roll manualmente.',
    status: assetCount >= Math.max(1, sceneCount) ? 'pass' : assetCount > 0 ? 'warn' : 'fail',
  });

  items.push({
    id: 'ai_disclosure',
    label: 'Divulgação de conteúdo sintético',
    detail: 'Ao publicar, marque no YouTube Studio se usou voz/visuais gerados por IA (quando aplicável).',
    status: 'info',
    policyRef: 'Transparência IA',
  });

  items.push({
    id: 'human_review',
    label: 'Revisão humana antes do upload',
    detail: 'Ouça a narração, confira fatos e personalize metadados — IA acelera, você valida.',
    status: 'info',
    policyRef: 'Autenticidade',
  });

  return items;
}

export function complianceScore(items: FacelessComplianceItem[]): { pass: number; warn: number; fail: number } {
  return items.reduce(
    (acc, item) => {
      if (item.status === 'pass') acc.pass += 1;
      else if (item.status === 'warn') acc.warn += 1;
      else if (item.status === 'fail') acc.fail += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );
}

export function canRunFacelessPipeline90(
  wordTranscripts: unknown,
  status: WorkspaceStatus | null,
): boolean {
  return isWhisperTimelineReady(wordTranscripts, status);
}