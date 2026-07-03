import React, { useEffect, useRef, useState } from 'react';
import { FolderOpen, Save } from 'lucide-react';
import {
  BlockProgressBarEditor,
  buildBlockProgressDraftFromProject,
  type BlockProgressBarDraft,
  type BlockProgressMarkerDraft,
} from './BlockProgressBarEditor';

type BlockTimingsLike = { starts?: number[]; durations?: number[] };

type Props = {
  projectKey: string;
  config: Record<string, unknown>;
  blockTimings?: BlockTimingsLike;
  isShortFormat: boolean;
  accentColor?: string;
  saving?: boolean;
  onSave: (draft: BlockProgressBarDraft) => void | Promise<void>;
  onSuggestIconsWithAi?: () => Promise<BlockProgressMarkerDraft[] | null>;
  onSuggestTitlesWithAi?: () => Promise<BlockProgressMarkerDraft[] | null>;
  storyboard?: { visual_prompts?: Array<{ block?: number; narration_text?: string }> } | null;
};

function blockTimingsKey(timings?: BlockTimingsLike): string {
  if (!timings?.starts?.length && !timings?.durations?.length) return '';
  return `${(timings.starts || []).join(',')}|${(timings.durations || []).join(',')}`;
}

function mergeBlockTimingsIntoDraft(
  prev: BlockProgressBarDraft,
  timings: BlockTimingsLike,
): BlockProgressBarDraft {
  const starts = timings.starts || [];
  const durations = timings.durations || [];
  if (!starts.length && !durations.length) return prev;
  const blocks = prev.blocks.map((b, idx) => ({
    ...b,
    start: starts[idx] !== undefined ? Number(starts[idx]) : b.start,
    duration: durations[idx] !== undefined ? Number(durations[idx]) : b.duration,
  }));
  return { ...prev, blocks };
}

export function BlockProgressBarProjectPanel({
  projectKey,
  config,
  blockTimings,
  isShortFormat,
  accentColor = '#D4AF37',
  saving = false,
  onSave,
  onSuggestIconsWithAi,
  onSuggestTitlesWithAi,
  storyboard,
}: Props) {
  const [draft, setDraft] = useState<BlockProgressBarDraft>(() =>
    buildBlockProgressDraftFromProject(config, blockTimings || {}, storyboard),
  );

  const timingsKey = blockTimingsKey(blockTimings);
  const prevProjectKey = useRef<string | null>(null);
  const prevTimingsKey = useRef<string | null>(null);

  useEffect(() => {
    const projectChanged = prevProjectKey.current !== projectKey;
    if (projectChanged) {
      prevProjectKey.current = projectKey;
      prevTimingsKey.current = timingsKey;
      setDraft(buildBlockProgressDraftFromProject(config, blockTimings || {}, storyboard));
      return;
    }

    if (timingsKey && timingsKey !== prevTimingsKey.current) {
      prevTimingsKey.current = timingsKey;
      setDraft((prev) => mergeBlockTimingsIntoDraft(prev, blockTimings || {}));
    }
  }, [projectKey, timingsKey, config, blockTimings, storyboard]);

  const totalDuration = Number(
    blockTimings?.starts?.length && blockTimings?.durations?.length
      ? (blockTimings.starts[blockTimings.starts.length - 1] || 0)
        + (blockTimings.durations[blockTimings.durations.length - 1] || 0)
      : 0,
  ) || undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[9px] text-zinc-500 flex items-center gap-1.5 min-w-0">
          <FolderOpen className="w-3 h-3 shrink-0 text-[var(--dash-primary)]" />
          <span>
            Configuração exclusiva do projeto{' '}
            <span className="text-zinc-300 font-semibold">{projectKey}</span>
            {' '}— salva em <code className="text-violet-300/90">config_qanat.json</code>
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
        isShortFormat={isShortFormat}
        accentColor={accentColor}
        niche={String(config.niche || 'Geral')}
        totalDuration={totalDuration}
        storyboard={storyboard}
        onChange={setDraft}
        onSuggestIconsWithAi={onSuggestIconsWithAi}
        onSuggestTitlesWithAi={onSuggestTitlesWithAi}
      />
    </div>
  );
}