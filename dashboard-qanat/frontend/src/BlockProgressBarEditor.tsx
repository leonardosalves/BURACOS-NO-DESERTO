import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { OverlayAnimatedIcon } from "./OverlayAnimatedIcon";
import { OverlayIconPicker } from "./OverlayIconPicker";
import { BlockProgressBarPreview } from "./BlockProgressBarPreview";
import {
  iconLabel,
  resolveIconStyle,
  type OverlayIconStyle,
} from "./overlayIconCatalog";
import { SettingLabel } from "./SettingHelpTip";
import {
  BLOCK_PROGRESS_TITLE_FONTS,
  buildBlockTitlesForProgressBar,
  collectBlockNarrationsByBlock,
  forceApplyChapterTitlesFromMetadata,
  resolveBlockDisplayTitle,
  type BlockProgressTitleFontId,
} from "./blockProgressBarTitles";
import {
  collectUsedIconVisualKeys,
  dedupeBlockProgressIcons,
  resolveIconVisualKey,
  suggestBlockProgressIcon,
  swapBlockProgressIcons,
} from "./blockProgressBarIcons";
import {
  normalizeBlockProgressDesign,
  type BlockProgressDesign,
} from "./blockProgressBarDesign";

export type BlockProgressMarkerDraft = {
  block: number;
  start: number;
  duration: number;
  /** Resumo/título exibido na barra (editável). */
  title?: string;
  label?: string;
  iconType: string;
  iconStyle?: OverlayIconStyle;
  iconSize?: number;
  aiReason?: string | null;
};

export type BlockProgressBarDraft = {
  enabled: boolean;
  design: BlockProgressDesign;
  iconSize: number;
  defaultIconStyle: OverlayIconStyle;
  showBlockTitles?: boolean;
  titleFont?: BlockProgressTitleFontId;
  titleFontSize?: number;
  titleColor?: string;
  /** Logo do canal na ponta da linha de progressão (marca). */
  showChannelLogo?: boolean;
  channelLogoSize?: number;
  blocks: BlockProgressMarkerDraft[];
};

const DESIGN_OPTIONS: {
  id: BlockProgressDesign;
  label: string;
  hint: string;
  group: string;
}[] = [
  {
    id: "cinematic",
    label: "Cinematográfico",
    hint: "Gradiente dourado com glow suave.",
    group: "Clássico",
  },
  {
    id: "documentary",
    label: "Documentário",
    hint: "Dupla linha sépia — narrativa histórica.",
    group: "Clássico",
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Linha fina branca — discreta.",
    group: "Clássico",
  },
  {
    id: "elegant",
    label: "Elegante",
    hint: "Linha dupla fina e sóbria.",
    group: "Clássico",
  },
  {
    id: "neon",
    label: "Neon",
    hint: "Ciano + acento — futurismo.",
    group: "Moderno",
  },
  {
    id: "tech",
    label: "Tech",
    hint: "Trilho segmentado — engenharia.",
    group: "Moderno",
  },
  {
    id: "glass",
    label: "Vidro",
    hint: "Frosted glass translúcido.",
    group: "Moderno",
  },
  {
    id: "gradient",
    label: "Arco-íris",
    hint: "Preenchimento multicolor.",
    group: "Moderno",
  },
  {
    id: "glow",
    label: "Brilho intenso",
    hint: "Tubo luminoso com halo forte.",
    group: "Moderno",
  },
  {
    id: "dashed",
    label: "Tracejada",
    hint: "Trilho tracejado, fill sólido.",
    group: "Linha",
  },
  {
    id: "dotted",
    label: "Pontilhada",
    hint: "Trilho em pontos.",
    group: "Linha",
  },
  {
    id: "bold",
    label: "Grossa",
    hint: "Barra espessa e sólida.",
    group: "Linha",
  },
  {
    id: "outline",
    label: "Contorno",
    hint: "Só bordas — hollow fill.",
    group: "Linha",
  },
  {
    id: "retro",
    label: "Retrô",
    hint: "Scanlines e blocos pixelados.",
    group: "Linha",
  },
];

type BlockPhrase = { block?: number; phrase?: string; text?: string };

type StoryboardLike = {
  visual_prompts?: Array<{ block?: number; narration_text?: string }>;
  list_items?: Array<{
    block?: number;
    rank?: number;
    title?: string;
    name?: string;
  }>;
  listicle?: {
    content_mode?: string;
    rank_count?: number;
    rank_order?: string;
  };
};

type Props = {
  draft: BlockProgressBarDraft;
  blockPhrases?: BlockPhrase[];
  blockStarts?: number[];
  blockDurations?: number[];
  storyboard?: StoryboardLike | null;
  projectConfig?: Record<string, unknown>;
  isShortFormat: boolean;
  accentColor?: string;
  niche?: string;
  totalDuration?: number;
  channelLogoUrl?: string | null;
  onChange: (next: BlockProgressBarDraft) => void;
  onSuggestIconsWithAi?: () => Promise<BlockProgressMarkerDraft[] | null>;
  onSyncTitlesFromChapters?: () => Promise<{
    blocks: BlockProgressMarkerDraft[];
    updatedCount: number;
  } | null>;
  chaptersText?: string;
};

export function buildBlockProgressDraftFromProject(
  config: Record<string, unknown> = {},
  timings: { starts?: number[]; durations?: number[] } = {},
  storyboard?: StoryboardLike | null,
  chaptersText = ""
): BlockProgressBarDraft {
  const raw = (config.block_progress_bar ||
    {}) as Partial<BlockProgressBarDraft>;
  const phrases = Array.isArray(config.block_phrases)
    ? (config.block_phrases as BlockPhrase[])
    : [];
  const visualPrompts = storyboard?.visual_prompts || [];
  const narrations = collectBlockNarrationsByBlock(visualPrompts, phrases);
  const starts = timings.starts || [];
  const durations = timings.durations || [];
  const niche = String(config.niche || "Geral");
  const existing = new Map((raw.blocks || []).map((b) => [b.block, b]));
  const isShort = config.aspect_ratio === "9:16";
  const metadataTitles = buildBlockTitlesForProgressBar({
    chaptersText,
    blockStarts: starts,
    storyboard,
    config,
  });

  const usedIconIds = new Set<string>();
  const usedIconVisuals = new Set<string>();
  const blocks = phrases.map((bp, idx) => {
    const block = Number(bp.block || idx + 1);
    const saved = existing.get(block);
    const phraseStart = String(bp.phrase || bp.text || "").trim();
    const fullNarration = narrations.get(block) || phraseStart;
    const title = resolveBlockDisplayTitle(
      saved,
      metadataTitles.get(block),
      block,
      phraseStart
    );
    const iconStyle = (saved?.iconStyle || raw.defaultIconStyle || "lottie") as
      "lottie" | "svg";
    const iconType =
      saved?.iconType ||
      suggestBlockProgressIcon(
        fullNarration,
        niche,
        usedIconIds,
        usedIconVisuals
      );
    if (!saved?.iconType) {
      usedIconIds.add(iconType);
      usedIconVisuals.add(resolveIconVisualKey(iconType, iconStyle));
    }
    return {
      block,
      start: Number(starts[idx]) || 0,
      duration: Number(durations[idx]) || 10,
      title,
      label: title,
      iconType,
      iconStyle,
      iconSize: saved?.iconSize,
    };
  });
  const allSavedIcons =
    blocks.length > 0 &&
    blocks.every((b) => {
      const saved = existing.get(b.block);
      return Boolean(saved?.iconType);
    });
  const dedupedBlocks = allSavedIcons
    ? blocks
    : dedupeBlockProgressIcons(blocks, { niche });

  const titleFont = BLOCK_PROGRESS_TITLE_FONTS.some(
    (f) => f.id === raw.titleFont
  )
    ? raw.titleFont
    : "inter";

  return {
    enabled: raw.enabled === true,
    design: normalizeBlockProgressDesign(raw.design),
    iconSize: Number(raw.iconSize) || (isShort ? 16 : 22),
    defaultIconStyle: raw.defaultIconStyle === "svg" ? "svg" : "lottie",
    showBlockTitles: raw.showBlockTitles === true,
    titleFont: titleFont as BlockProgressTitleFontId,
    titleFontSize: Number(raw.titleFontSize) || (isShort ? 9 : 10),
    titleColor: String(raw.titleColor || "#FFFFFF"),
    showChannelLogo: raw.showChannelLogo === true,
    channelLogoSize: Number(raw.channelLogoSize) || (isShort ? 22 : 28),
    blocks: dedupedBlocks,
  };
}

export function BlockProgressBarEditor({
  draft,
  blockPhrases = [],
  blockStarts = [],
  blockDurations = [],
  storyboard,
  projectConfig = {},
  isShortFormat,
  accentColor = "#D4AF37",
  niche = "Geral",
  totalDuration,
  channelLogoUrl = null,
  onChange,
  onSuggestIconsWithAi,
  onSyncTitlesFromChapters,
  chaptersText = "",
}: Props) {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(
    draft.blocks[0]?.block ?? null
  );
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [syncingTitles, setSyncingTitles] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);

  const metadataTitles = useMemo(
    () =>
      buildBlockTitlesForProgressBar({
        chaptersText,
        blockStarts,
        storyboard,
        config: projectConfig,
      }),
    [chaptersText, blockStarts, storyboard, projectConfig]
  );

  const hasMetadataTitles = metadataTitles.size > 0;

  const markers = useMemo(() => {
    if (draft.blocks.length) return draft.blocks;
    return (blockPhrases || []).map((bp, idx) => {
      const block = Number(bp.block || idx + 1);
      const narration = String(bp.phrase || bp.text || "").trim();
      return {
        block,
        start: Number(blockStarts[idx]) || 0,
        duration: Number(blockDurations[idx]) || 10,
        label: narration.slice(0, 56),
        iconType: suggestBlockProgressIcon(narration, niche),
        iconStyle: draft.defaultIconStyle,
      };
    });
  }, [
    draft.blocks,
    blockPhrases,
    blockStarts,
    blockDurations,
    draft.defaultIconStyle,
    niche,
  ]);

  const patch = (partial: Partial<BlockProgressBarDraft>) =>
    onChange({
      ...draft,
      ...partial,
      blocks: draft.blocks.length ? draft.blocks : markers,
    });

  const patchBlock = (
    block: number,
    partial: Partial<BlockProgressMarkerDraft>
  ) => {
    const base = draft.blocks.length ? draft.blocks : markers;
    onChange({
      ...draft,
      blocks: base.map((b) => {
        if (b.block !== block) return b;
        const next = { ...b, ...partial };
        if (partial.title !== undefined) {
          next.label = partial.title;
        }
        return next;
      }),
    });
  };

  const previewBlocks = draft.blocks.length ? draft.blocks : markers;
  const orientation = isShortFormat ? "vertical (Shorts)" : "horizontal (16:9)";
  const resolvedTotalDuration =
    totalDuration ||
    previewBlocks.reduce((max, b) => Math.max(max, b.start + b.duration), 0) ||
    120;

  const handleSuggestAi = async () => {
    if (!onSuggestIconsWithAi) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const suggested = await onSuggestIconsWithAi();
      if (!suggested?.length) {
        setSuggestError("A IA não retornou sugestões válidas.");
        return;
      }
      onChange({
        ...draft,
        blocks: dedupeBlockProgressIcons(
          suggested.map((b) => ({
            ...b,
            iconStyle: b.iconStyle || draft.defaultIconStyle,
          })),
          { niche }
        ),
      });
    } catch (err) {
      setSuggestError(
        err instanceof Error ? err.message : "Falha ao sugerir ícones."
      );
    } finally {
      setSuggesting(false);
    }
  };

  const handleSyncTitlesFromMetadata = async () => {
    if (!hasMetadataTitles) {
      const msg = "Nenhum capítulo encontrado nos metadados.";
      setSyncError(msg);
      toast.error(msg);
      return;
    }

    setSyncingTitles(true);
    setSyncError(null);
    setLastSyncCount(null);

    try {
      if (onSyncTitlesFromChapters) {
        const result = await onSyncTitlesFromChapters();
        if (!result?.blocks?.length) return;

        onChange({
          ...draft,
          blocks: result.blocks.map((b) => ({
            start: Number(b.start) || 0,
            duration: Number(b.duration) || 0,
            iconType: b.iconType || "default",
            ...b,
            iconStyle: b.iconStyle || draft.defaultIconStyle,
          })) as BlockProgressMarkerDraft[],
        });
        setLastSyncCount(result.updatedCount);
        return;
      }

      const base = draft.blocks.length ? draft.blocks : markers;
      const { blocks: nextBlocks, updatedCount } =
        forceApplyChapterTitlesFromMetadata(base, metadataTitles);
      onChange({
        ...draft,
        blocks: nextBlocks.map((b) => ({
          start: Number(b.start) || 0,
          duration: Number(b.duration) || 0,
          iconType: b.iconType || "default",
          ...b,
        })) as BlockProgressMarkerDraft[],
      });
      setLastSyncCount(updatedCount);
      if (updatedCount > 0) {
        toast.success(
          `${updatedCount} título(s) sincronizado(s) dos capítulos.`
        );
      } else {
        toast.success("Títulos já estavam sincronizados com os capítulos.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Falha ao sincronizar títulos.";
      setSyncError(msg);
      toast.error(msg);
    } finally {
      setSyncingTitles(false);
    }
  };

  const displayTitle = (marker: BlockProgressMarkerDraft) =>
    marker.title || marker.label || `Bloco ${marker.block}`;

  const swapIconsWith = (block: number, otherBlock: number) => {
    const base = draft.blocks.length ? draft.blocks : markers;
    onChange({
      ...draft,
      blocks: swapBlockProgressIcons(base, block, otherBlock),
    });
  };

  return (
    <div className="dash-layer-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[var(--dash-primary)]" />
            Barra de progresso por blocos
          </p>
          <p className="text-[9px] text-[var(--dash-muted)] mt-1">
            {orientation} · linha de progresso + ícone Lottie/SVG abaixo de cada
            bloco do roteiro.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="rounded border-[var(--dash-border)]"
          />
          <span className="text-[10px] font-semibold text-zinc-300">
            Ativar
          </span>
        </label>
      </div>

      {draft.enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <SettingLabel
                helpTitle="Design"
                help="Estilo visual da barra."
                align="start"
              >
                Design da barra
              </SettingLabel>
              <select
                value={draft.design}
                onChange={(e) =>
                  patch({
                    design: normalizeBlockProgressDesign(e.target.value),
                  })
                }
                className="dash-select text-[10px]"
              >
                {["Clássico", "Moderno", "Linha"].map((group) => (
                  <optgroup key={group} label={group}>
                    {DESIGN_OPTIONS.filter((d) => d.group === group).map(
                      (d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>
              <p className="text-[8px] text-zinc-500">
                {DESIGN_OPTIONS.find((d) => d.id === draft.design)?.hint}
              </p>
            </div>
            <div className="space-y-1.5">
              <SettingLabel
                helpTitle="Tamanho"
                help="Tamanho base dos ícones (px)."
                align="start"
              >
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
                  {(["lottie", "svg"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ defaultIconStyle: t })}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        draft.defaultIconStyle === t
                          ? "bg-[rgba(130,128,253,0.2)] text-[var(--dash-primary-light)]"
                          : "text-zinc-500"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2">
            <input
              type="checkbox"
              checked={draft.showBlockTitles === true}
              onChange={(e) => patch({ showBlockTitles: e.target.checked })}
              className="rounded border-[var(--dash-border)] mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-zinc-200 block">
                Exibir título do bloco
              </span>
              <span className="text-[8px] text-zinc-500 leading-relaxed block mt-0.5">
                Exibe o capítulo inteiro abaixo do ícone. Fonte: IA · Metadados;
                em listicles Top 3/5, os itens do ranking.
              </span>
            </div>
          </label>

          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <SettingLabel
                  helpTitle="Logo na barra"
                  help="Exibe o logo do canal na ponta da linha de progressão (Marca · Logos)."
                  align="start"
                >
                  Logo na ponta da barra
                </SettingLabel>
                <p className="text-[8px] text-zinc-500 leading-relaxed">
                  Acompanha o avanço da progressão. Desative se preferir só
                  ícones dos blocos.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {channelLogoUrl && (
                  <img
                    src={channelLogoUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-contain bg-zinc-900 border border-zinc-800"
                  />
                )}
                <div className="flex gap-1 p-0.5 rounded-lg border border-[var(--dash-border)]">
                  {([false, true] as const).map((on) => (
                    <button
                      key={on ? "sim" : "nao"}
                      type="button"
                      onClick={() => patch({ showChannelLogo: on })}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition ${
                        (draft.showChannelLogo === true) === on
                          ? "bg-[rgba(130,128,253,0.2)] text-[var(--dash-primary-light)]"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {on ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {draft.showChannelLogo === true && channelLogoUrl && (
              <div className="space-y-1 pt-1 border-t border-[var(--dash-border)]/60">
                <SettingLabel
                  helpTitle="Tamanho do logo"
                  help="Diâmetro do logo na ponta da barra (px)."
                  align="start"
                >
                  Tamanho do logo (
                  {draft.channelLogoSize || (isShortFormat ? 22 : 28)}px)
                </SettingLabel>
                <input
                  type="range"
                  min={14}
                  max={56}
                  step={1}
                  value={draft.channelLogoSize || (isShortFormat ? 22 : 28)}
                  onChange={(e) =>
                    patch({ channelLogoSize: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--dash-primary)]"
                />
              </div>
            )}
            {draft.showChannelLogo === true && !channelLogoUrl && (
              <p className="text-[8px] text-amber-400/90 pt-1 border-t border-[var(--dash-border)]/60">
                Ative um logo em Configurações → Marca · Logos para exibir na
                barra.
              </p>
            )}
          </div>

          {draft.showBlockTitles && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
              <div className="space-y-1">
                <SettingLabel
                  helpTitle="Fonte"
                  help="Família tipográfica dos títulos na barra."
                  align="start"
                >
                  Fonte
                </SettingLabel>
                <select
                  value={draft.titleFont || "inter"}
                  onChange={(e) =>
                    patch({
                      titleFont: e.target.value as BlockProgressTitleFontId,
                    })
                  }
                  className="dash-select text-[10px]"
                >
                  {BLOCK_PROGRESS_TITLE_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <SettingLabel
                  helpTitle="Tamanho"
                  help="Tamanho da fonte em pixels."
                  align="start"
                >
                  Tamanho ({draft.titleFontSize || (isShortFormat ? 9 : 10)}px)
                </SettingLabel>
                <input
                  type="range"
                  min={7}
                  max={16}
                  step={1}
                  value={draft.titleFontSize || (isShortFormat ? 9 : 10)}
                  onChange={(e) =>
                    patch({ titleFontSize: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--dash-primary)]"
                />
              </div>
              <div className="space-y-1">
                <SettingLabel
                  helpTitle="Cor"
                  help="Cor do texto dos títulos."
                  align="start"
                >
                  Cor do texto
                </SettingLabel>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={draft.titleColor || "#FFFFFF"}
                    onChange={(e) => patch({ titleColor: e.target.value })}
                    className="w-9 h-9 rounded border cursor-pointer shrink-0"
                    style={{
                      borderColor: "var(--dash-border)",
                      background: "var(--dash-bg)",
                    }}
                  />
                  <input
                    type="text"
                    value={draft.titleColor || "#FFFFFF"}
                    onChange={(e) =>
                      patch({ titleColor: e.target.value.trim() || "#FFFFFF" })
                    }
                    className="dash-input flex-1 font-mono text-[10px]"
                  />
                </div>
              </div>
            </div>
          )}

          <BlockProgressBarPreview
            blocks={previewBlocks}
            design={draft.design}
            iconSize={draft.iconSize}
            defaultIconStyle={draft.defaultIconStyle}
            showBlockTitles={draft.showBlockTitles === true}
            titleFont={draft.titleFont}
            titleFontSize={draft.titleFontSize}
            titleColor={draft.titleColor}
            accentColor={accentColor}
            isShortFormat={isShortFormat}
            totalDuration={resolvedTotalDuration}
            showChannelLogo={draft.showChannelLogo === true}
            channelLogoSize={draft.channelLogoSize}
            channelLogoUrl={channelLogoUrl}
          />

          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Ícones por bloco (
                {previewBlocks.length})
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {hasMetadataTitles && (
                  <button
                    type="button"
                    onClick={handleSyncTitlesFromMetadata}
                    disabled={syncingTitles}
                    className="border border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-50 text-violet-100 text-[9px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    {syncingTitles ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : lastSyncCount !== null ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {syncingTitles
                      ? "Sincronizando…"
                      : lastSyncCount !== null
                        ? `Sincronizado (${lastSyncCount})`
                        : "Sincronizar capítulos"}
                  </button>
                )}
                {onSuggestIconsWithAi && (
                  <button
                    type="button"
                    onClick={handleSuggestAi}
                    disabled={suggesting}
                    className="bg-gold-500/90 hover:bg-gold-500 disabled:opacity-50 text-zinc-950 text-[9px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    {suggesting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    {suggesting ? "Analisando…" : "Sugerir ícones (IA)"}
                  </button>
                )}
              </div>
            </div>
            {(suggestError || syncError) && (
              <p className="text-[8px] text-red-400/90">
                {suggestError || syncError}
              </p>
            )}
            {lastSyncCount !== null && !syncError && !syncingTitles && (
              <p className="text-[8px] text-emerald-400/90 flex items-center gap-1">
                <Check className="w-3 h-3 shrink-0" />
                {lastSyncCount > 0
                  ? `${lastSyncCount} título(s) atualizado(s) a partir dos capítulos dos metadados.`
                  : "Títulos já coincidiam com os capítulos dos metadados."}
              </p>
            )}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {previewBlocks.map((marker, idx) => {
                const expanded = expandedBlock === marker.block;
                const size = marker.iconSize || draft.iconSize;
                const prevBlock = previewBlocks[idx - 1]?.block;
                const nextBlock = previewBlocks[idx + 1]?.block;
                const usedElsewhere = collectUsedIconVisualKeys(
                  previewBlocks,
                  marker.block
                );
                return (
                  <div
                    key={marker.block}
                    className={`rounded-lg border transition ${
                      expanded
                        ? "border-[rgba(130,128,253,0.45)] bg-[rgba(130,128,253,0.08)]"
                        : "border-[var(--dash-border)] bg-black/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBlock(expanded ? null : marker.block)
                      }
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
                        <p className="text-[10px] font-bold text-zinc-200">
                          Bloco {marker.block}
                        </p>
                        <p className="text-[8px] text-zinc-500 truncate">
                          {displayTitle(marker)}
                        </p>
                      </div>
                      <span className="text-[8px] text-zinc-600 font-mono shrink-0">
                        {marker.start.toFixed(0)}s · {size}px
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-2 pb-2 space-y-2 border-t border-[var(--dash-border)]/60 pt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400">
                            Título do capítulo
                          </span>
                          <input
                            type="text"
                            value={displayTitle(marker)}
                            maxLength={48}
                            onChange={(e) =>
                              patchBlock(marker.block, {
                                title: e.target.value,
                              })
                            }
                            className="dash-input text-[10px] w-full"
                            placeholder="Ex: Cura química do concreto"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400">
                            Tamanho deste bloco ({size}px)
                          </span>
                          <input
                            type="range"
                            min={12}
                            max={40}
                            value={size}
                            onChange={(e) =>
                              patchBlock(marker.block, {
                                iconSize: Number(e.target.value),
                              })
                            }
                            className="w-full accent-[var(--dash-primary)]"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {prevBlock != null && (
                            <button
                              type="button"
                              onClick={() =>
                                swapIconsWith(marker.block, prevBlock)
                              }
                              className="dash-btn-ghost text-[8px] px-2 py-1 flex items-center gap-1"
                              title={`Trocar ícone com bloco ${prevBlock}`}
                            >
                              <ChevronLeft className="w-3 h-3" />
                              Trocar c/ {prevBlock}
                            </button>
                          )}
                          {nextBlock != null && (
                            <button
                              type="button"
                              onClick={() =>
                                swapIconsWith(marker.block, nextBlock)
                              }
                              className="dash-btn-ghost text-[8px] px-2 py-1 flex items-center gap-1"
                              title={`Trocar ícone com bloco ${nextBlock}`}
                            >
                              Trocar c/ {nextBlock}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <OverlayIconPicker
                          iconId={marker.iconType}
                          iconStyle={marker.iconStyle || draft.defaultIconStyle}
                          accentColor={accentColor}
                          usedIconIds={usedElsewhere}
                          resolveUsedVisualKey={resolveIconVisualKey}
                          onChange={(id, style) =>
                            patchBlock(marker.block, {
                              iconType: id || marker.iconType,
                              iconStyle: style,
                            })
                          }
                        />
                        <p className="text-[8px] text-zinc-600">
                          {iconLabel(
                            marker.iconType,
                            resolveIconStyle({ iconStyle: marker.iconStyle })
                          )}
                          {" · "}
                          {marker.iconStyle || draft.defaultIconStyle}
                        </p>
                        {marker.aiReason && (
                          <p className="text-[8px] text-violet-400/80 italic leading-snug">
                            IA: {marker.aiReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
