import React, { useMemo } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { OverlayAnimatedIcon } from './OverlayAnimatedIcon';
import { OverlayIconPicker } from './OverlayIconPicker';
import { iconLabel, resolveIconStyle, type OverlayIconStyle } from './overlayIconCatalog';
import { SettingLabel } from './SettingHelpTip';

export type BlockProgressMarkerDraft = {
  block: number;
  start: number;
  duration: number;
  label?: string;
  iconType: string;
  iconStyle?: OverlayIconStyle;
  iconSize?: number;
};

export type BlockProgressBarDraft = {
  enabled: boolean;
  design: 'cinematic' | 'neon' | 'minimal' | 'documentary' | 'tech';
  iconSize: number;
  defaultIconStyle: OverlayIconStyle;
  blocks: BlockProgressMarkerDraft[];
};

const DESIGN_OPTIONS: { id: BlockProgressBarDraft['design']; label: string; hint: string }[] = [
  { id: 'cinematic', label: 'Cinematográfico', hint: 'Dourado com glow suave — documentários premium.' },
  { id: 'neon', label: 'Neon', hint: 'Ciano + acento neon — tech e futurismo.' },
  { id: 'minimal', label: 'Minimal', hint: 'Linha fina branca — discreto.' },
  { id: 'documentary', label: 'Documentário', hint: 'Dupla linha sépia — história e narrativa.' },
  { id: 'tech', label: 'Tech', hint: 'Trilho pontilhado — engenharia e dados.' },
];

type BlockPhrase = { block?: number; phrase?: string; text?: string };

type Props = {
  draft: BlockProgressBarDraft;
  blockPhrases?: BlockPhrase[];
  blockStarts?: number[];
  blockDurations?: number[];
  isShortFormat: boolean;
  accentColor?: string;
  niche?: string;
  onChange: (next: BlockProgressBarDraft) => void;
};

function suggestIcon(narration: string, niche: string): string {
  const text = `${niche} ${narration}`.toLowerCase();
  if (/espaço|espacial|foguete|nasa|órbita|orbita/i.test(text)) return 'science';
  if (/inteligência artificial|\bia\b|tech|digital/i.test(text)) return 'gear';
  if (/dinheiro|economia|financ/i.test(text)) return 'money';
  if (/históri|histori|antig|guerra/i.test(text)) return 'history';
  if (/natureza|oceano|animal|clima/i.test(text)) return 'nature';
  if (/geograf|mapa|país|pais/i.test(text)) return 'compass';
  if (/militar|defesa|tanque/i.test(text)) return 'shield';
  if (/energia|elétric|eletric|nuclear/i.test(text)) return 'lightning';
  return 'info';
}

export function buildBlockProgressDraftFromProject(
  config: Record<string, unknown> = {},
  timings: { starts?: number[]; durations?: number[] } = {},
): BlockProgressBarDraft {
  const raw = (config.block_progress_bar || {}) as Partial<BlockProgressBarDraft>;
  const phrases = Array.isArray(config.block_phrases) ? config.block_phrases as BlockPhrase[] : [];
  const starts = timings.starts || [];
  const durations = timings.durations || [];
  const niche = String(config.niche || 'Geral');
  const existing = new Map((raw.blocks || []).map((b) => [b.block, b]));

  const blocks = phrases.map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existing.get(block);
    const narration = String(bp.phrase || bp.text || '').trim();
    return {
      block,
      start: Number(starts[idx]) || 0,
      duration: Number(durations[idx]) || 10,
      label: narration.slice(0, 56) || `Bloco ${block}`,
      iconType: saved?.iconType || suggestIcon(narration, niche),
      iconStyle: saved?.iconStyle || raw.defaultIconStyle || 'lottie',
      iconSize: saved?.iconSize,
    };
  });

  return {
    enabled: raw.enabled === true,
    design: raw.design || 'cinematic',
    iconSize: Number(raw.iconSize) || (config.aspect_ratio === '9:16' ? 16 : 22),
    defaultIconStyle: raw.defaultIconStyle === 'svg' ? 'svg' : 'lottie',
    blocks,
  };
}

export function BlockProgressBarEditor({
  draft,
  blockPhrases = [],
  blockStarts = [],
  blockDurations = [],
  isShortFormat,
  accentColor = '#D4AF37',
  niche = 'Geral',
  onChange,
}: Props) {
  const [expandedBlock, setExpandedBlock] = React.useState<number | null>(draft.blocks[0]?.block ?? null);

  const markers = useMemo(() => {
    if (draft.blocks.length) return draft.blocks;
    return (blockPhrases || []).map((bp, idx) => {
      const block = Number(bp.block || idx + 1);
      const narration = String(bp.phrase || bp.text || '').trim();
      return {
        block,
        start: Number(blockStarts[idx]) || 0,
        duration: Number(blockDurations[idx]) || 10,
        label: narration.slice(0, 56),
        iconType: suggestIcon(narration, niche),
        iconStyle: draft.defaultIconStyle,
      };
    });
  }, [draft.blocks, blockPhrases, blockStarts, blockDurations, draft.defaultIconStyle, niche]);

  const patch = (partial: Partial<BlockProgressBarDraft>) => onChange({ ...draft, ...partial, blocks: draft.blocks.length ? draft.blocks : markers });

  const patchBlock = (block: number, partial: Partial<BlockProgressMarkerDraft>) => {
    const base = draft.blocks.length ? draft.blocks : markers;
    onChange({
      ...draft,
      blocks: base.map((b) => (b.block === block ? { ...b, ...partial } : b)),
    });
  };

  const previewBlocks = draft.blocks.length ? draft.blocks : markers;
  const orientation = isShortFormat ? 'vertical (Shorts)' : 'horizontal (16:9)';

  return (
    <div className="dash-layer-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[var(--dash-primary)]" />
            Barra de progresso por blocos
          </p>
          <p className="text-[9px] text-[var(--dash-muted)] mt-1">
            {orientation} · linha de progresso + ícone Lottie/SVG abaixo de cada bloco do roteiro.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="rounded border-[var(--dash-border)]"
          />
          <span className="text-[10px] font-semibold text-zinc-300">Ativar</span>
        </label>
      </div>

      {draft.enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Design" help="Estilo visual da barra." align="start">
                Design da barra
              </SettingLabel>
              <select
                value={draft.design}
                onChange={(e) => patch({ design: e.target.value as BlockProgressBarDraft['design'] })}
                className="dash-select text-[10px]"
              >
                {DESIGN_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <p className="text-[8px] text-zinc-500">
                {DESIGN_OPTIONS.find((d) => d.id === draft.design)?.hint}
              </p>
            </div>
            <div className="space-y-1.5">
              <SettingLabel helpTitle="Tamanho" help="Tamanho base dos ícones (px)." align="start">
                Tamanho dos ícones ({draft.iconSize}px)
              </SettingLabel>
              <input
                type="range"
                min={12}
                max={36}
                step={1}
                value={draft.iconSize}
                onChange={(e) => patch({ iconSize: Number(e.target.value) })}
                className="w-full accent-[var(--dash-primary)]"
              />
              <div className="flex gap-2 items-center">
                <span className="text-[8px] text-zinc-500">Padrão:</span>
                <div className="flex gap-1 p-0.5 rounded-lg border border-[var(--dash-border)]">
                  {(['lottie', 'svg'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ defaultIconStyle: t })}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        draft.defaultIconStyle === t
                          ? 'bg-[rgba(130,128,253,0.2)] text-[var(--dash-primary-light)]'
                          : 'text-zinc-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 space-y-2">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Ícones por bloco ({previewBlocks.length})
            </p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {previewBlocks.map((marker) => {
                const expanded = expandedBlock === marker.block;
                const size = marker.iconSize || draft.iconSize;
                return (
                  <div
                    key={marker.block}
                    className={`rounded-lg border transition ${
                      expanded
                        ? 'border-[rgba(130,128,253,0.45)] bg-[rgba(130,128,253,0.08)]'
                        : 'border-[var(--dash-border)] bg-black/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedBlock(expanded ? null : marker.block)}
                      className="w-full flex items-center gap-2 p-2 text-left"
                    >
                      <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                        <OverlayAnimatedIcon
                          iconId={marker.iconType}
                          iconStyle={marker.iconStyle || draft.defaultIconStyle}
                          fill
                          color={accentColor}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-zinc-200">Bloco {marker.block}</p>
                        <p className="text-[8px] text-zinc-500 truncate">{marker.label}</p>
                      </div>
                      <span className="text-[8px] text-zinc-600 font-mono shrink-0">
                        {marker.start.toFixed(0)}s · {size}px
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-2 pb-2 space-y-2 border-t border-[var(--dash-border)]/60 pt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400">Tamanho deste bloco ({size}px)</span>
                          <input
                            type="range"
                            min={12}
                            max={40}
                            value={size}
                            onChange={(e) => patchBlock(marker.block, { iconSize: Number(e.target.value) })}
                            className="w-full accent-[var(--dash-primary)]"
                          />
                        </div>
                        <OverlayIconPicker
                          iconId={marker.iconType}
                          iconStyle={marker.iconStyle || draft.defaultIconStyle}
                          accentColor={accentColor}
                          onChange={(id, style) => patchBlock(marker.block, {
                            iconType: id || marker.iconType,
                            iconStyle: style,
                          })}
                        />
                        <p className="text-[8px] text-zinc-600">
                          {iconLabel(marker.iconType, resolveIconStyle({ iconStyle: marker.iconStyle }))}
                          {' · '}
                          {marker.iconStyle || draft.defaultIconStyle}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={`relative rounded-xl border border-[var(--dash-border)] overflow-hidden bg-zinc-950 ${
              isShortFormat ? 'aspect-[9/16] max-w-[140px]' : 'aspect-video max-w-full'
            }`}
          >
            <div className="absolute inset-0 opacity-80 bg-gradient-to-b from-zinc-900 to-black" />
            {isShortFormat ? (
              <>
                <div className="absolute left-2 top-8 bottom-16 w-0.5 bg-white/10 rounded" />
                <div className="absolute left-2 top-8 h-1/3 w-0.5 bg-[var(--dash-primary)] rounded" />
                {previewBlocks.slice(0, 6).map((m, i) => (
                  <div
                    key={m.block}
                    className="absolute left-5"
                    style={{ top: `${12 + i * 14}%` }}
                  >
                    <OverlayAnimatedIcon iconId={m.iconType} iconStyle={m.iconStyle || draft.defaultIconStyle} color={accentColor} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="absolute top-2 left-3 right-3 h-0.5 bg-white/10 rounded" />
                <div className="absolute top-2 left-3 w-1/3 h-0.5 bg-[var(--dash-primary)] rounded" />
                <div className="absolute top-4 left-0 right-0 flex justify-between px-4">
                  {previewBlocks.slice(0, 8).map((m) => (
                    <OverlayAnimatedIcon
                      key={m.block}
                      iconId={m.iconType}
                      iconStyle={m.iconStyle || draft.defaultIconStyle}
                      color={accentColor}
                    />
                  ))}
                </div>
              </>
            )}
            <span className="absolute bottom-1 right-2 text-[7px] text-zinc-600 uppercase">{draft.design}</span>
          </div>
        </>
      )}
    </div>
  );
}