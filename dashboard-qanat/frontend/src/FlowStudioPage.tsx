import React, { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Circle,
  ClipboardCopy,
  ExternalLink,
  Film,
  Loader2,
  Upload,
  Sparkles,
} from "lucide-react";
import type { ConfigData, WorkspaceStatus } from "./appTypes";
import { TimelineClipPreview } from "./TimelineClipPreview";
import { SCENE_VIDEO_ACCEPT, detectUploadMediaType } from "./assetPreviewUtils";
import {
  buildFlowSceneRows,
  flowCopyPayload,
  flowSceneKey,
  loadFlowChecks,
  saveFlowChecks,
  type FlowQualityChecks,
  type FlowSceneRow,
} from "./flowStudioUtils";

const FLOW_URL = "https://labs.google/fx/tools/flow";

type FilterMode = "all" | "pending" | "done";

type Props = {
  activeProject: string;
  config: ConfigData | null;
  storyboardData: {
    visual_prompts?: any[];
    narration_chunk_plan?: unknown;
    _vpe_checklist?: { quality_score?: number };
  } | null;
  status: WorkspaceStatus | null;
  wordTranscripts: unknown[];
  getAssetUrl: (fileName: string) => string;
  onUpload: (
    blockNum: number,
    type: "video" | "image",
    file: File,
    assetIdx: number
  ) => void | Promise<void>;
  onOpenCreator?: () => void;
  /** Modo global Flow Lab — sem exigir projeto na barra lateral */
  standalone?: boolean;
};

function QualityToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border transition ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-[var(--dash-border)] text-[var(--dash-muted)] hover:text-white"
      }`}
    >
      {checked ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <Circle className="w-3.5 h-3.5 opacity-50" />
      )}
      {label}
    </button>
  );
}

function SceneCard({
  row,
  checks,
  onChecksChange,
  copiedId,
  onCopy,
  onUpload,
  getAssetUrl,
  uploading,
  aspectRatio,
  justUploaded,
  pendingPreviewUrl,
}: {
  row: FlowSceneRow;
  checks: FlowQualityChecks;
  onChecksChange: (next: FlowQualityChecks) => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onUpload: (file: File) => void;
  getAssetUrl: (fileName: string) => string;
  uploading: boolean;
  aspectRatio: string;
  justUploaded?: boolean;
  pendingPreviewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const copyId = `flow-${row.index}`;
  const allChecks = checks.composition && checks.ratio && checks.noArtifacts;
  const canUpload = !row.hasAsset && (row.hasAsset || allChecks || true);
  const showSent = row.hasAsset && !uploading;

  const previewAsset =
    row.hasAsset && row.asset
      ? row.asset
      : pendingPreviewUrl
        ? {
            asset: pendingPreviewUrl,
            type: row.isVideo ? "video" : "image",
          }
        : null;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <article
      id={`flow-scene-${row.index}`}
      className={`glass-panel rounded-2xl border transition ${
        showSent
          ? "border-emerald-500/40 bg-emerald-500/[0.04] shadow-lg shadow-emerald-500/5"
          : uploading
            ? "border-violet-500/35"
            : "border-[var(--dash-border)]"
      } ${justUploaded ? "ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-[var(--dash-bg)]" : ""}`}
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {showSent && (
                <CheckCircle2
                  className="w-4 h-4 text-emerald-400 shrink-0"
                  aria-hidden
                />
              )}
              <span
                className={`font-mono text-sm font-bold ${showSent ? "text-emerald-100" : "text-white"}`}
              >
                Cena {row.sceneNum}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--dash-border)] text-[var(--dash-muted)]">
                Bloco {row.blockNum}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  row.isVideo
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {row.isVideo ? "Vídeo" : "Imagem"}
              </span>
              {row.durationSeconds != null ? (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                  {row.durationSeconds}s no Flow
                </span>
              ) : row.isVideo ? (
                <span className="text-[10px] text-amber-400/80">
                  duracao apos Whisper
                </span>
              ) : null}
            </div>
            <p
              className="text-[10px] text-[var(--dash-muted)] font-mono truncate"
              title={row.suggestedFilename}
            >
              Salvar no Flow como:{" "}
              <span className="text-zinc-300">{row.suggestedFilename}</span>
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              uploading
                ? "bg-violet-500/15 text-violet-200 border border-violet-500/30"
                : showSent
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                  : "bg-zinc-800/80 text-zinc-500 border border-zinc-700"
            }`}
          >
            {uploading ? "Enviando…" : showSent ? "Asset enviado" : "Pendente"}
          </span>
        </div>

        {row.narrationText && (
          <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-[var(--dash-primary)]/40 pl-3">
            {row.narrationText}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCopy(copyId, flowCopyPayload(row))}
            className="dash-btn-secondary text-[11px] px-3 py-2 flex items-center gap-1.5"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            {copiedId === copyId ? "Copiado!" : "Copiar briefing"}
          </button>
          {row.prompt && (
            <button
              type="button"
              onClick={() => onCopy(`prompt-${row.index}`, row.prompt)}
              className="dash-btn-secondary text-[11px] px-3 py-2 flex items-center gap-1.5"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              {copiedId === `prompt-${row.index}` ? "Copiado!" : "Só o prompt"}
            </button>
          )}
          <a
            href={FLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-btn-secondary text-[11px] px-3 py-2 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir Google Flow
          </a>
        </div>

        {row.prompt && (
          <div className="rounded-xl bg-zinc-950/60 border border-[var(--dash-border)] p-3">
            <p className="text-[9px] uppercase tracking-wider text-[var(--dash-muted)] mb-1.5">
              Prompt visual
            </p>
            <p className="text-[11px] text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
              {row.prompt}
            </p>
          </div>
        )}

        {!row.hasAsset && (
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--dash-muted)]">
              Checklist antes de subir (opcional, só para você)
            </p>
            <div className="flex flex-wrap gap-2">
              <QualityToggle
                label="Enquadramento ok"
                checked={checks.composition}
                onChange={(v) => onChecksChange({ ...checks, composition: v })}
              />
              <QualityToggle
                label="Proporção certa"
                checked={checks.ratio}
                onChange={(v) => onChecksChange({ ...checks, ratio: v })}
              />
              <QualityToggle
                label="Sem artefatos"
                checked={checks.noArtifacts}
                onChange={(v) => onChecksChange({ ...checks, noArtifacts: v })}
              />
            </div>
          </div>
        )}

        {(showSent || uploading || pendingPreviewUrl) && previewAsset ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Enviando asset…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Asset enviado — preview
                  </>
                )}
              </p>
              {showSent && row.asset?.asset && (
                <p
                  className="text-[10px] text-zinc-400 font-mono truncate max-w-[220px]"
                  title={row.asset.asset}
                >
                  {row.asset.asset}
                </p>
              )}
            </div>
            <div className="max-w-md mx-auto w-full">
              <TimelineClipPreview
                asset={previewAsset}
                getAssetUrl={(path) =>
                  path.startsWith("blob:") ? path : getAssetUrl(path)
                }
                aspectRatio={aspectRatio}
                clipDuration={row.durationSeconds ?? 4}
              />
            </div>
            {showSent && (
              <>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept={
                    row.isVideo
                      ? SCENE_VIDEO_ACCEPT
                      : "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  className="dash-btn-secondary text-[10px] px-3 py-1.5 w-full sm:w-auto"
                >
                  Trocar arquivo desta cena
                </button>
              </>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-xl border-2 border-dashed border-zinc-700 hover:border-[var(--dash-primary)]/50 bg-zinc-950/40 p-6 text-center transition"
          >
            <input
              ref={inputRef}
              type="file"
              accept={
                row.isVideo
                  ? SCENE_VIDEO_ACCEPT
                  : "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              }
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <Upload className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-300 mb-1">
              Arraste o arquivo do Flow aqui
            </p>
            <p className="text-[10px] text-[var(--dash-muted)] mb-3">
              ou clique para escolher ·{" "}
              {row.isVideo ? "MP4, MOV, WebM" : "PNG, JPG, WebP"}
            </p>
            <button
              type="button"
              disabled={uploading || !canUpload}
              onClick={() => inputRef.current?.click()}
              className="dash-btn-primary text-xs px-4 py-2"
            >
              Enviar para esta cena
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function FlowStudioPage({
  activeProject,
  config,
  storyboardData,
  status,
  wordTranscripts,
  getAssetUrl,
  onUpload,
  onOpenCreator,
  standalone = false,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [lastUploadedKey, setLastUploadedKey] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<
    Record<string, string>
  >({});
  const [checksMap, setChecksMap] = useState<Record<string, FlowQualityChecks>>(
    () => loadFlowChecks(activeProject)
  );

  const aspectRatio = config?.aspect_ratio === "9:16" ? "9:16" : "16:9";

  const scenes = useMemo(
    () =>
      buildFlowSceneRows(storyboardData, config, {
        projectName: activeProject,
        status,
        wordTranscripts,
      }),
    [storyboardData, config, activeProject, status, wordTranscripts]
  );

  const filtered = useMemo(() => {
    if (filter === "pending") return scenes.filter((s) => !s.hasAsset);
    if (filter === "done") return scenes.filter((s) => s.hasAsset);
    return scenes;
  }, [scenes, filter]);

  const doneCount = scenes.filter((s) => s.hasAsset).length;

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copiado — cole no Google Flow");
      setTimeout(
        () => setCopiedId((prev) => (prev === id ? null : prev)),
        2000
      );
    } catch {
      toast.error("Não foi possível copiar");
    }
  }, []);

  const updateChecks = useCallback(
    (key: string, next: FlowQualityChecks) => {
      setChecksMap((prev) => {
        const merged = { ...prev, [key]: next };
        saveFlowChecks(activeProject, merged);
        return merged;
      });
    },
    [activeProject]
  );

  const handleUpload = async (row: FlowSceneRow, file: File) => {
    const key = flowSceneKey(row);
    const blobUrl = URL.createObjectURL(file);
    setPendingPreviews((prev) => ({ ...prev, [key]: blobUrl }));
    setUploadingKey(key);
    try {
      const type = detectUploadMediaType(file, row.isVideo);
      await onUpload(row.blockNum, type, file, row.assetIdx);
      setFilter("all");
      setLastUploadedKey(key);
      window.setTimeout(() => {
        document
          .getElementById(`flow-scene-${row.index}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      window.setTimeout(
        () => setLastUploadedKey((prev) => (prev === key ? null : prev)),
        6000
      );
      toast.success(
        `Cena ${row.sceneNum} · Bloco ${row.blockNum} — asset enviado e marcado.`
      );
    } finally {
      setUploadingKey(null);
      setPendingPreviews((prev) => {
        const next = { ...prev };
        if (next[key]) {
          URL.revokeObjectURL(next[key]);
          delete next[key];
        }
        return next;
      });
    }
  };

  if (!storyboardData?.visual_prompts?.length) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center max-w-lg mx-auto space-y-4">
        <Film className="w-10 h-10 mx-auto text-[var(--dash-muted)]" />
        <h3 className="text-lg font-bold text-white">Nenhuma cena ainda</h3>
        <p className="text-sm text-[var(--dash-muted)] leading-relaxed">
          {standalone
            ? "Use o botao acima para a IA gerar roteiro e prompts. Depois copie cada cena no Google Flow e suba os arquivos aqui."
            : "Gere o roteiro no Creator primeiro, ou use o Flow Lab global no menu Estudio."}
        </p>
        {!standalone && onOpenCreator && (
          <button
            type="button"
            onClick={onOpenCreator}
            className="dash-btn-primary text-sm px-5 py-2.5"
          >
            Ir para o Creator
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {storyboardData?._vpe_checklist?.quality_score != null && (
        <p className="text-[10px] text-violet-300/90 px-3 py-2 rounded-xl border border-violet-500/25 bg-violet-500/10">
          Prompts refinados pela Engenharia Visual PRO (score{" "}
          {storyboardData._vpe_checklist.quality_score}) — seguros para copiar
          no Flow.
        </p>
      )}
      {(() => {
        const withDur = scenes.filter((s) => s.durationSeconds != null).length;
        if (!scenes.length) return null;
        if (withDur > 0) {
          return (
            <p className="text-[10px] text-emerald-300/90 px-3 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10">
              Whisper mediu a voz: {withDur}/{scenes.length} cenas com segundos
              exatos — use o badge verde ao gerar cada clip no Flow.
            </p>
          );
        }
        if (standalone) {
          return (
            <p className="text-[10px] text-amber-300/90 px-3 py-2 rounded-xl border border-amber-500/25 bg-amber-500/10">
              Sem segundos por cena ainda. Aprove uma ideia e aguarde o pipeline
              (Fish Speech + Whisper) terminar.
            </p>
          );
        }
        return null;
      })()}

      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-[var(--dash-border)] overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--dash-primary)]/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[var(--dash-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Fluxo Google Flow → Lumiera
              </h3>
              <p className="text-xs text-[var(--dash-muted)]">
                Teste: copiar, gerar fora, revisar, subir por cena
              </p>
            </div>
          </div>

          <ol className="grid sm:grid-cols-3 gap-3 text-[11px]">
            {[
              {
                step: "1",
                title: "Copiar",
                body: "Prompt + duração em segundos (~Xs no Flow)",
              },
              {
                step: "2",
                title: "Gerar no Flow",
                body: "Clip com a duração da voz (Whisper)",
              },
              {
                step: "3",
                title: "Subir aqui",
                body: "Arraste o arquivo na cena certa",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-xl border border-[var(--dash-border)] bg-zinc-950/50 px-3 py-2.5"
              >
                <span className="text-[var(--dash-primary)] font-mono font-bold">
                  {item.step}.
                </span>{" "}
                <span className="text-white font-semibold">{item.title}</span>
                <span className="text-[var(--dash-muted)] block mt-0.5">
                  {item.body}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-[10px] text-[var(--dash-muted)] mb-1">
                <span>Assets enviados</span>
                <span className="font-mono text-white">
                  {doneCount}/{scenes.length} cenas
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                  style={{
                    width: scenes.length
                      ? `${(doneCount / scenes.length) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-zinc-950/80 border border-[var(--dash-border)]">
              {(
                [
                  ["all", "Todas"],
                  ["pending", "Pendentes"],
                  ["done", "Enviadas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg transition ${
                    filter === id
                      ? "bg-[var(--dash-primary)]/20 text-white"
                      : "text-[var(--dash-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((row) => {
          const key = flowSceneKey(row);
          const defaultChecks: FlowQualityChecks = {
            composition: false,
            ratio: false,
            noArtifacts: false,
          };
          return (
            <SceneCard
              key={`${row.index}-${key}-${row.hasAsset ? "ok" : "pending"}`}
              row={row}
              checks={checksMap[key] || defaultChecks}
              onChecksChange={(next) => updateChecks(key, next)}
              copiedId={copiedId}
              onCopy={handleCopy}
              onUpload={(file) => handleUpload(row, file)}
              getAssetUrl={getAssetUrl}
              uploading={uploadingKey === key}
              aspectRatio={aspectRatio}
              justUploaded={lastUploadedKey === key}
              pendingPreviewUrl={pendingPreviews[key]}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-[var(--dash-muted)] py-8">
          {filter === "pending"
            ? "Todas as cenas já têm asset — ótimo!"
            : "Nenhuma cena neste filtro."}
        </p>
      )}

      {doneCount === scenes.length && scenes.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 text-center text-sm text-emerald-200">
          Todas as cenas têm mídia. Próximo passo: abra o{" "}
          <strong>Editor</strong> ou <strong>Render</strong>.
        </div>
      )}
    </div>
  );
}
