import React, { useEffect, useRef, useState } from 'react';
import { FolderOpen, Lock, Save, Sparkles } from 'lucide-react';
import {
  BlockProgressBarEditor,
  buildBlockProgressDraftFromProject,
  type BlockProgressBarDraft,
  type BlockProgressMarkerDraft,
} from './BlockProgressBarEditor';
import {
  buildBlockTitlesForProgressBar,
  isListicleProject,
  resolveBlockDisplayTitle,
} from './blockProgressBarTitles';

type BlockTimingsLike = { starts?: number[]; durations?: number[] };

type StoryboardLike = {
  visual_prompts?: Array<{ block?: number; narration_text?: string }>;
  list_items?: Array<{ block?: number; rank?: number; title?: string; name?: string }>;
  listicle?: { content_mode?: string; rank_count?: number; rank_order?: string };
};

type Props = {
  projectKey: string;
  config: Record<string, unknown>;
  storyboard?: StoryboardLike | null;
  blockTimings?: BlockTimingsLike;
  chaptersText?: string;
  metadataReady?: boolean;
  isShortFormat: boolean;
  accentColor?: string;
  saving?: boolean;
  channelLogoUrl?: string | null;
  onGoToMetadata?: () => void;
  onSave: (draft: BlockProgressBarDraft) => void | Promise<void>;
  onSuggestIconsWithAi?: () => Promise<BlockProgressMarkerDraft[] | null>;
  onSyncTitlesFromChapters?: () => Promise<{
    blocks: BlockProgressMarkerDraft[];
    updatedCount: number;
  } | null>;
};

function blockTimingsKey(timings?: BlockTimingsLike): string {
  if (!timings?.starts?.length && !timings?.durations?.length) return '';
  return `${(timings.starts || []).join(',')}|${(timings.durations || []).join(',')}`;
}

function mergeBlockTimingsAndChapterTitles(
  prev: BlockProgressBarDraft,
  timings: BlockTimingsLike,
  chaptersText: string,
  storyboard?: StoryboardLike | null,
  config: Record<string, unknown> = {},
): BlockProgressBarDraft {
  const starts = timings.starts || [];
  const durations = timings.durations || [];
  if (!starts.length && !durations.length) return prev;

  const metadataTitles = buildBlockTitlesForProgressBar({
    chaptersText,
    blockStarts: starts,
    storyboard,
    config,
  });

  const phrases = Array.isArray(config.block_phrases)
    ? config.block_phrases as Array<{ block?: number; phrase?: string; text?: string }>
    : [];

  const blocks = prev.blocks.map((b, idx) => {
    const bp = phrases.find((p) => Number(p.block) === b.block) || phrases[idx];
    const phraseStart = String(bp?.phrase || bp?.text || '').trim();
    const title = resolveBlockDisplayTitle(
      b,
      metadataTitles.get(b.block),
      b.block,
      phraseStart,
    );
    return {
      ...b,
      start: starts[idx] !== undefined ? Number(starts[idx]) : b.start,
      duration: durations[idx] !== undefined ? Number(durations[idx]) : b.duration,
      title,
      label: title,
    };
  });

  return { ...prev, blocks };
}

export function BlockProgressBarProjectPanel({
  projectKey,
  config,
  storyboard,
  blockTimings,
  chaptersText = '',
  metadataReady = false,
  isShortFormat,
  accentColor = '#D4AF37',
  saving = false,
  channelLogoUrl = null,
  onGoToMetadata,
  onSave,
  onSuggestIconsWithAi,
  onSyncTitlesFromChapters,
}: Props) {
  const [draft, setDraft] = useState<BlockProgressBarDraft>(() =>
    buildBlockProgressDraftFromProject(config, blockTimings || {}, storyboard, chaptersText),
  );

  const timingsKey = blockTimingsKey(blockTimings);
  const prevProjectKey = useRef<string | null>(null);
  const prevTimingsKey = useRef<string | null>(null);
  const prevChaptersKey = useRef<string | null>(null);

  useEffect(() => {
    if (!metadataReady) return;

    const projectChanged = prevProjectKey.current !== projectKey;
    const chaptersChanged = prevChaptersKey.current !== chaptersText;

    if (projectChanged || chaptersChanged) {
      prevProjectKey.current = projectKey;
      prevTimingsKey.current = timingsKey;
      prevChaptersKey.current = chaptersText;
      setDraft(buildBlockProgressDraftFromProject(config, blockTimings || {}, storyboard, chaptersText));
      return;
    }

    if (timingsKey && timingsKey !== prevTimingsKey.current) {
      prevTimingsKey.current = timingsKey;
      setDraft((prev) => mergeBlockTimingsAndChapterTitles(
        prev,
        blockTimings || {},
        chaptersText,
        storyboard,
        config,
      ));
    }
  }, [projectKey, timingsKey, config, blockTimings, storyboard, chaptersText, metadataReady]);

  const totalDuration = Number(
    blockTimings?.starts?.length && blockTimings?.durations?.length
      ? (blockTimings.starts[blockTimings.starts.length - 1] || 0)
        + (blockTimings.durations[blockTimings.durations.length - 1] || 0)
      : 0,
  ) || undefined;

  const listicle = isListicleProject(config, storyboard);

  if (!metadataReady) {
    return (
      <div className="dash-layer-card space-y-3 border border-amber-500/25 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-bold text-zinc-200">Barra de progresso por blocos</p>
            <p className="text-[9px] text-zinc-400 leading-relaxed">
              Disponível após gerar os metadados em <strong className="text-zinc-200">IA · Metadados</strong>.
              Os títulos vêm da seção <strong className="text-zinc-200">CAPÍTULOS</strong>
              {listicle ? ' ou dos nomes dos itens do Top no caso de listicles.' : '.'}
            </p>
            {onGoToMetadata && (
              <button
                type="button"
                onClick={onGoToMetadata}
                className="dash-btn-primary text-[10px] px-3 py-1.5 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                Ir para IA · Metadados
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[9px] text-zinc-500 flex items-center gap-1.5 min-w-0">
          <FolderOpen className="w-3 h-3 shrink-0 text-[var(--dash-primary)]" />
          <span>
            Configuração exclusiva do projeto{' '}
            <span className="text-zinc-300 font-semibold">{projectKey}</span>
            {' '}— títulos dos capítulos dos metadados
            {listicle ? ' / itens do Top' : ''}
          </span>
        </p>
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="dash-btn-primary text-[10px] px-3 py-1.5 flex items-center gap-1.5 shrink-0"
        >
          <Save className="w-3 h-3" />
          {saving ? 'Salvando…' : 'Salvar barra no projeto'}
        </button>
      </div>

      <BlockProgressBarEditor
        draft={draft}
        blockPhrases={(config.block_phrases || []) as Array<{ block?: number; phrase?: string; text?: string }>}
        blockStarts={blockTimings?.starts || []}
        blockDurations={blockTimings?.durations || []}
        storyboard={storyboard}
        projectConfig={config}
        isShortFormat={isShortFormat}
        accentColor={accentColor}
        niche={String(config.niche || 'Geral')}
        totalDuration={totalDuration}
        chaptersText={chaptersText}
        channelLogoUrl={channelLogoUrl}
        onChange={setDraft}
        onSuggestIconsWithAi={onSuggestIconsWithAi}
        onSyncTitlesFromChapters={onSyncTitlesFromChapters}
      />
    </div>
  );
}