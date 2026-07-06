import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Compass,
  LineChart,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  Youtube,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import type { CreatorApplyIdeaOptions } from "./creatorEditorialImport";
import { resolvePioneerCreatorSeed } from "./creatorEditorialImport";
import {
  TrendRadarNicheDetailView,
  TrendRadarSavedList,
  type TrendRadarSavedItem,
} from "./TrendRadarNicheDetail";

type TimesfmStatus = {
  timesfmInstalled?: boolean;
  venvReady?: boolean;
  engine?: string;
  python?: string;
  probeError?: string | null;
  setupScript?: string;
  repo?: string;
};

type TrendVideo = {
  videoId?: string;
  title?: string;
  thumbnailUrl?: string;
  format?: string;
  growthPct?: number;
  forecastSum?: number;
  metrics?: { views?: number };
};

type TrendNiche = {
  niche?: string;
  videoCount?: number;
  growthPct?: number;
  sampleTitles?: string[];
};

type TrendIdea = {
  title?: string;
  hookPt?: string;
  format?: string;
  growthPct?: number;
};

type PioneerNiche = {
  label?: string;
  macroNiche?: string;
  angle?: string;
  formatPattern?: string;
  youtubeSearchQuery?: string;
  pioneerScore?: number;
  saturationPct?: number;
  macroSaturationPct?: number;
  gapScore?: number;
  dedicatedChannels?: number;
  interestScore?: number;
  status?: "virgem" | "pioneiro" | "emergente" | "saturado";
  whyPioneer?: string;
  firstVideoIdea?: string;
  risk?: string;
  format?: string;
  youtube?: {
    query?: string;
    channelCount?: number;
    videoCount?: number;
    dedicatedChannels?: number;
    avgTopViews?: number;
    sampleChannels?: { title?: string }[];
  };
};

type PioneerDiscovery = {
  ok?: boolean;
  discoveryMode?: "virgin" | "chosen";
  baseNiche?: string | null;
  pioneerNiches?: PioneerNiche[];
  pioneerIdeas?: TrendIdea[];
  summary?: {
    scanned?: number;
    virginCount?: number;
    pioneerCount?: number;
    topPick?: string;
  };
  exaAvailable?: boolean;
};

type RadarView = "radar" | "saved" | "detail";

type ForecastResult = {
  ok?: boolean;
  engine?: string;
  horizon?: number;
  channelTitle?: string;
  risingNiches?: TrendNiche[];
  shortTrends?: TrendVideo[];
  longTrends?: TrendVideo[];
  derivedIdeas?: TrendIdea[];
  pioneerDiscovery?: PioneerDiscovery;
  editorialQueue?: { enqueued?: number; total?: number };
};

type TrendForecastPanelProps = {
  niche?: string;
  onApplyCreatorIdea?: (
    title: string,
    hookPt: string,
    options?: CreatorApplyIdeaOptions
  ) => void;
  onGoToIntegrations?: () => void;
  embedded?: boolean;
};

function PioneerStatusBadge({ status }: { status?: PioneerNiche["status"] }) {
  const map = {
    virgem: "bg-violet-500/20 text-violet-200 border-violet-500/40",
    pioneiro: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
    emergente: "bg-amber-500/10 text-amber-200 border-amber-500/25",
    saturado: "bg-zinc-600/20 text-zinc-400 border-zinc-600/40",
  } as const;
  const labels = {
    virgem: "Virgem",
    pioneiro: "Pioneiro",
    emergente: "Emergente",
    saturado: "Saturado",
  } as const;
  const key = status && status in map ? status : "emergente";
  return (
    <span
      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${map[key]}`}
    >
      {labels[key]}
    </span>
  );
}

function GrowthBadge({ pct }: { pct?: number }) {
  const v = Number(pct || 0);
  const positive = v > 5;
  const neutral = v >= -5 && v <= 5;
  const cls = positive
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : neutral
      ? "bg-zinc-500/10 text-zinc-400 border-zinc-700/50"
      : "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${cls}`}
    >
      {v > 0 ? "+" : ""}
      {v.toFixed(1)}%
    </span>
  );
}

export function TrendForecastPanel({
  niche = "",
  onApplyCreatorIdea,
  onGoToIntegrations,
  embedded = false,
}: TrendForecastPanelProps) {
  const [status, setStatus] = useState<TimesfmStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<"all" | "SHORTS" | "LONGO">("all");
  const [horizon, setHorizon] = useState(7);
  const [enqueueIdeas, setEnqueueIdeas] = useState(true);
  const [discoverPioneers, setDiscoverPioneers] = useState(true);
  const [pioneerOnly, setPioneerOnly] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<"virgin" | "chosen">(
    "virgin"
  );
  const [chosenNiche, setChosenNiche] = useState(niche || "");
  const [pioneerResult, setPioneerResult] = useState<PioneerDiscovery | null>(
    null
  );
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [view, setView] = useState<RadarView>("radar");
  const [savedItems, setSavedItems] = useState<TrendRadarSavedItem[]>([]);
  const [detailItem, setDetailItem] = useState<TrendRadarSavedItem | null>(
    null
  );
  const [parentScanItem, setParentScanItem] =
    useState<TrendRadarSavedItem | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (niche && !chosenNiche) setChosenNiche(niche);
  }, [niche, chosenNiche]);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch("/api/trends/saved");
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setSavedItems(data.items);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void fetchSaved();
  }, [fetchSaved]);

  const effectiveNiche = discoveryMode === "chosen" ? chosenNiche.trim() : "";

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/trends/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar status");
      setStatus(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runPioneerScan = async () => {
    setBusy(true);
    setPioneerResult(null);
    setResult(null);
    const toastId = "pioneer-scan";
    try {
      toast.loading("Varrendo nichos pioneiros no YouTube…", { id: toastId });
      const res = await fetch("/api/trends/pioneer-niches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format:
            format === "LONGO"
              ? "LONGO"
              : format === "SHORTS"
                ? "SHORTS"
                : "SHORTS",
          niche: effectiveNiche,
          discoveryMode,
          useAi: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          String(data.error || data.details || "Falha na varredura")
        );
      setPioneerResult(data);
      const top = data.summary?.topPick;
      toast.success(
        `${data.summary?.pioneerCount ?? 0} nicho(s) pioneiro(s)${top ? ` · destaque: ${top.slice(0, 40)}` : ""}`,
        { id: toastId }
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na varredura", {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  };

  const runForecast = async () => {
    if (pioneerOnly) {
      await runPioneerScan();
      return;
    }
    setBusy(true);
    setResult(null);
    setPioneerResult(null);
    const toastId = "trend-forecast";
    try {
      toast.loading(
        discoverPioneers
          ? "TimesFM + varredura de nichos pioneiros…"
          : "Previsão TimesFM em andamento…",
        { id: toastId }
      );
      const res = await fetch("/api/trends/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          horizon,
          enqueueIdeas,
          discoverPioneers,
          niche: effectiveNiche,
          discoveryMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          String(data.error || data.details || "Falha na previsão")
        );
      setResult(data);
      if (data.pioneerDiscovery?.ok) setPioneerResult(data.pioneerDiscovery);
      const engine =
        data.engine === "timesfm-2.5" ? "TimesFM 2.5" : "fallback estatístico";
      const queue = data.editorialQueue?.enqueued;
      const pioneers = data.pioneerDiscovery?.summary?.pioneerCount;
      toast.success(
        `Previsão pronta (${engine})${pioneers ? ` · ${pioneers} pioneiro(s)` : ""}${queue ? ` · ${queue} na fila` : ""}`,
        { id: toastId }
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na previsão", {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  };

  const saveScan = async () => {
    const discovery = pioneerResult || result?.pioneerDiscovery;
    if (!discovery?.pioneerNiches?.length) {
      toast.error("Rode uma varredura antes de salvar.");
      return;
    }
    setSavingId("scan");
    try {
      const res = await fetch("/api/trends/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "scan",
          discovery,
          discoveryMode,
          nicheFilter: effectiveNiche,
          format:
            format === "LONGO"
              ? "LONGO"
              : format === "SHORTS"
                ? "SHORTS"
                : "SHORTS",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      toast.success("Varredura salva!");
      await fetchSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const saveNiche = async (n: PioneerNiche) => {
    const key = `${n.macroNiche}-${n.youtubeSearchQuery || n.label}`;
    setSavingId(key);
    try {
      const res = await fetch("/api/trends/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "niche",
          niche: n,
          discoveryMode,
          nicheFilter: effectiveNiche,
          format: n.format || (format === "LONGO" ? "LONGO" : "SHORTS"),
          scanSummary:
            pioneerResult?.summary || result?.pioneerDiscovery?.summary || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      toast.success(`Salvo: ${n.label?.slice(0, 40) || "nicho"}`);
      await fetchSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const openSavedDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/trends/saved/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não encontrado");
      setDetailItem(data.item as TrendRadarSavedItem);
      setView("detail");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir");
    }
  };

  const deleteSaved = async (id: string) => {
    try {
      const res = await fetch(`/api/trends/saved/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao excluir");
      toast.success("Removido dos salvos");
      if (detailItem?.id === id) {
        setDetailItem(null);
        setView("saved");
      }
      await fetchSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const timesfmReady = status?.timesfmInstalled;

  if (view === "detail" && detailItem) {
    return (
      <TrendRadarNicheDetailView
        item={detailItem}
        onBack={() => {
          if (parentScanItem) {
            setDetailItem(parentScanItem);
            setParentScanItem(null);
            return;
          }
          setDetailItem(null);
          setView("saved");
        }}
        onDelete={deleteSaved}
        onOpenNicheFromScan={(entry) => {
          setParentScanItem(detailItem);
          setDetailItem({
            id: detailItem.id,
            type: "niche",
            label: entry.label,
            savedAt: detailItem.savedAt,
            discoveryMode: detailItem.discoveryMode,
            nicheFilter: detailItem.nicheFilter,
            format: entry.format || detailItem.format,
            status: entry.status,
            pioneerScore: entry.pioneerScore,
            macroNiche: entry.aspects?.macroNiche?.value,
            detail: entry,
            niche: entry.raw,
          });
        }}
        onApplyCreatorIdea={onApplyCreatorIdea}
      />
    );
  }

  if (view === "saved") {
    return (
      <TrendRadarSavedList
        items={savedItems}
        onOpen={openSavedDetail}
        onDelete={deleteSaved}
        onBack={() => setView("radar")}
      />
    );
  }

  return (
    <div className="lumiera-panel-stack animate-fade-in font-sans min-w-0 space-y-4">
      {!embedded && (
        <SectionHeader
          title="Radar de Tendências"
          helpId="tab-trend-forecast"
          size="lg"
          icon={<LineChart className="w-6 h-6 text-amber-400 shrink-0" />}
          subtitle="Previsão TimesFM + descoberta de nichos virgens/pioneiros (pouca concorrência no YouTube)"
        />
      )}

      <div className="glass-panel p-5 rounded-3xl space-y-4 border border-amber-500/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            {loadingStatus ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : timesfmReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {loadingStatus
                ? "Verificando TimesFM…"
                : timesfmReady
                  ? "TimesFM 2.5 instalado"
                  : "Modo fallback (instale TimesFM para previsão neural)"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar status
          </button>
          {!timesfmReady && !loadingStatus && (
            <p className="text-[10px] text-zinc-500 w-full">
              Execute{" "}
              <code className="text-amber-300/90">
                .\scripts\setup-timesfm.ps1
              </code>{" "}
              no repositório Lumiera.
              {status?.probeError ? ` (${status.probeError})` : ""}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-[10px] text-zinc-500 space-y-1">
            Formato
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-200"
            >
              <option value="all">Todos</option>
              <option value="SHORTS">Shorts</option>
              <option value="LONGO">Longos</option>
            </select>
          </label>
          <label className="text-[10px] text-zinc-500 space-y-1">
            Horizonte (dias)
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-zinc-200"
            >
              <option value={7}>7 dias</option>
              <option value={10}>10 dias</option>
              <option value={14}>14 dias</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-[10px] text-zinc-400 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={enqueueIdeas}
              onChange={(e) => setEnqueueIdeas(e.target.checked)}
              className="rounded border-zinc-700"
            />
            Enfileirar ideias na fila editorial
          </label>
        </div>

        <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Compass className="w-4 h-4 text-violet-300" />
            <p className="text-[11px] font-bold text-violet-100">
              Modo de descoberta
            </p>
            <button
              type="button"
              onClick={() => setView("saved")}
              className="ml-auto text-[10px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Salvos ({savedItems.length})
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDiscoveryMode("virgin")}
              className={`p-3 rounded-xl border text-left transition ${
                discoveryMode === "virgin"
                  ? "border-violet-500/50 bg-violet-500/15"
                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-violet-300" />
                <span className="text-[11px] font-bold text-zinc-100">
                  Nicho virgem
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                Descobre{" "}
                <strong className="text-zinc-300">qualquer categoria</strong> —
                finanças, pets, filosofia, viagens… Ignora o nicho do projeto.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDiscoveryMode("chosen")}
              className={`p-3 rounded-xl border text-left transition ${
                discoveryMode === "chosen"
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-amber-300" />
                <span className="text-[11px] font-bold text-zinc-100">
                  Nicho escolhido
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                Explora ângulos pioneiros{" "}
                <strong className="text-zinc-300">dentro de um nicho</strong>{" "}
                que você define abaixo.
              </p>
            </button>
          </div>
          {discoveryMode === "chosen" && (
            <label className="text-[10px] text-zinc-500 space-y-1 block">
              Nicho para explorar
              <input
                type="text"
                value={chosenNiche}
                onChange={(e) => setChosenNiche(e.target.value)}
                placeholder="Ex: gastronomia regional, true crime Brasil, filosofia estoica…"
                className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
              />
            </label>
          )}
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            <strong className="text-cyan-300">Virgem</strong> = poucos canais
            dedicados naquele ângulo no YouTube BR.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={discoverPioneers}
                onChange={(e) => {
                  setDiscoverPioneers(e.target.checked);
                  if (e.target.checked) setPioneerOnly(false);
                }}
                className="rounded border-zinc-700"
              />
              Incluir na previsão completa
            </label>
            <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={pioneerOnly}
                onChange={(e) => {
                  setPioneerOnly(e.target.checked);
                  if (e.target.checked) setDiscoverPioneers(false);
                }}
                className="rounded border-zinc-700"
              />
              Só varredura pioneira (mais rápido)
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void runForecast()}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : pioneerOnly ? (
            <Compass className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {pioneerOnly
            ? "Varrer nichos pioneiros"
            : discoverPioneers
              ? "Previsão + nichos pioneiros"
              : "Gerar previsão de tendências"}
        </button>
      </div>

      {(pioneerResult?.pioneerNiches?.length ?? 0) > 0 && (
        <PioneerNicheList
          discovery={pioneerResult}
          onApply={onApplyCreatorIdea}
          onSaveNiche={saveNiche}
          onSaveScan={saveScan}
          savingId={savingId}
        />
      )}

      {result && (
        <>
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-300" />
              <p className="text-xs font-bold text-zinc-200">
                Nichos em alta
                {result.channelTitle ? ` · ${result.channelTitle}` : ""}
              </p>
              <span className="text-[9px] text-zinc-500 ml-auto">
                {result.engine} · {result.horizon}d
              </span>
            </div>
            {(result.risingNiches || []).length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">
                Nenhum cluster de nicho com dados suficientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {(result.risingNiches || []).slice(0, 8).map((n) => (
                  <li
                    key={n.niche}
                    className="flex items-start gap-2 p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-zinc-200 capitalize">
                        {n.niche}
                      </p>
                      <p className="text-[9px] text-zinc-500">
                        {n.videoCount} vídeo(s)
                        {n.sampleTitles?.[0]
                          ? ` · ex: ${n.sampleTitles[0].slice(0, 48)}…`
                          : ""}
                      </p>
                    </div>
                    <GrowthBadge pct={n.growthPct} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendVideoList
              title="Shorts em tendência"
              icon={Youtube}
              videos={result.shortTrends || []}
              onApply={onApplyCreatorIdea}
            />
            <TrendVideoList
              title="Longos em tendência"
              icon={Video}
              videos={result.longTrends || []}
              onApply={onApplyCreatorIdea}
            />
          </div>

          {(result.derivedIdeas || []).length > 0 && (
            <div className="glass-panel p-5 rounded-3xl space-y-3">
              <p className="text-xs font-bold text-zinc-200">
                Ideias derivadas da previsão
              </p>
              <ul className="space-y-2">
                {(result.derivedIdeas || []).map((idea, i) => (
                  <li
                    key={`${idea.title}-${i}`}
                    className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <p className="text-[11px] text-zinc-200 flex-1">
                        {idea.title}
                      </p>
                      <GrowthBadge pct={idea.growthPct} />
                    </div>
                    {idea.hookPt && (
                      <p className="text-[9px] text-zinc-500 leading-relaxed">
                        {idea.hookPt}
                      </p>
                    )}
                    {onApplyCreatorIdea && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyCreatorIdea(
                            idea.title || "",
                            idea.hookPt || "",
                            {
                              format: idea.format as
                                "LONGO" | "SHORTS" | undefined,
                            }
                          )
                        }
                        className="text-[10px] text-amber-300 hover:text-amber-200"
                      >
                        Abrir no Creator
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {onGoToIntegrations && (
        <p className="text-[10px] text-zinc-600 text-center">
          Dados do YouTube Analytics exigem canal vinculado.{" "}
          <button
            type="button"
            onClick={onGoToIntegrations}
            className="text-amber-400/80 hover:text-amber-300"
          >
            Integrações
          </button>
        </p>
      )}
    </div>
  );
}

function PioneerNicheList({
  discovery,
  onApply,
  onSaveNiche,
  onSaveScan,
  savingId,
}: {
  discovery: PioneerDiscovery | null;
  onApply?: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void;
  onSaveNiche?: (niche: PioneerNiche) => void | Promise<void>;
  onSaveScan?: () => void | Promise<void>;
  savingId?: string | null;
}) {
  const niches = discovery?.pioneerNiches || [];
  const summary = discovery?.summary;
  const modeLabel =
    discovery?.discoveryMode === "chosen"
      ? `focado em ${discovery?.baseNiche || "nicho escolhido"}`
      : "descoberta aberta";

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-3 border border-violet-500/15">
      <div className="flex items-center gap-2 flex-wrap">
        <Compass className="w-4 h-4 text-violet-300" />
        <p className="text-xs font-bold text-zinc-200">
          Nichos pioneiros para desbravar
        </p>
        <span className="text-[8px] text-violet-400/80 uppercase tracking-wide">
          {modeLabel}
        </span>
        {summary && (
          <span className="text-[9px] text-zinc-500 ml-auto">
            {summary.scanned} analisados · {summary.virginCount ?? 0} virgens ·{" "}
            {summary.pioneerCount ?? 0} pioneiros
            {discovery?.exaAvailable ? " · Exa" : " · heurística"}
          </span>
        )}
        {onSaveScan && (
          <button
            type="button"
            disabled={savingId === "scan"}
            onClick={() => void onSaveScan()}
            className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 disabled:opacity-50"
          >
            {savingId === "scan" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Salvar varredura
          </button>
        )}
      </div>
      <p className="text-[9px] text-zinc-600 leading-relaxed">
        Cada card = <span className="text-zinc-400">macro-nicho</span> +{" "}
        <span className="text-zinc-400">ângulo/formato</span>. Gap alto =
        categoria existe (ex.: história), mas o recorte específico está vazio.
      </p>
      <ul className="space-y-2">
        {niches.slice(0, 10).map((n) => (
          <li
            key={`${n.macroNiche}-${n.youtubeSearchQuery || n.label}`}
            className="p-3 rounded-xl bg-zinc-950/50 border border-violet-900/30 space-y-2"
          >
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0 space-y-1">
                {n.macroNiche && (
                  <span className="text-[8px] font-bold uppercase tracking-wide text-amber-400/90">
                    {n.macroNiche}
                  </span>
                )}
                <p className="text-[11px] font-semibold text-zinc-100">
                  {n.label || n.angle}
                </p>
              </div>
              <PioneerStatusBadge status={n.status} />
              <span className="text-[9px] font-bold text-violet-300 tabular-nums">
                {Number(n.pioneerScore || 0).toFixed(0)} pts
              </span>
            </div>
            {n.formatPattern && (
              <p className="text-[9px] text-violet-300/80">
                Formato: {n.formatPattern}
              </p>
            )}
            {n.angle && n.angle !== n.label && (
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                {n.angle}
              </p>
            )}
            {n.whyPioneer && (
              <p className="text-[9px] text-zinc-400 leading-relaxed">
                {n.whyPioneer}
              </p>
            )}
            {(n.youtube || n.gapScore != null) && (
              <p className="text-[9px] text-zinc-600">
                Busca:{" "}
                <code className="text-zinc-500">
                  {n.youtubeSearchQuery || n.youtube?.query}
                </code>
                {n.dedicatedChannels != null
                  ? ` · ${n.dedicatedChannels} canal(is) dedicado(s)`
                  : ""}
                {n.saturationPct != null
                  ? ` · saturação ângulo ${n.saturationPct}%`
                  : ""}
                {n.macroSaturationPct != null
                  ? ` · macro ${n.macroSaturationPct}%`
                  : ""}
                {n.gapScore != null ? ` · gap ${n.gapScore}` : ""}
              </p>
            )}
            {n.firstVideoIdea && (
              <p className="text-[9px] text-cyan-400/90">
                1º vídeo: {n.firstVideoIdea}
              </p>
            )}
            {n.risk && (
              <p className="text-[9px] text-amber-500/80">Risco: {n.risk}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {onSaveNiche && (
                <button
                  type="button"
                  disabled={
                    savingId ===
                    `${n.macroNiche}-${n.youtubeSearchQuery || n.label}`
                  }
                  onClick={() => void onSaveNiche(n)}
                  className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1 disabled:opacity-50"
                >
                  {savingId ===
                  `${n.macroNiche}-${n.youtubeSearchQuery || n.label}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bookmark className="w-3 h-3" />
                  )}
                  Salvar
                </button>
              )}
              {onApply && (
                <button
                  type="button"
                  onClick={() => {
                    const pioneerMeta = {
                      macroNiche: n.macroNiche,
                      angle: n.angle,
                      formatPattern: n.formatPattern,
                      youtubeSearchQuery: n.youtubeSearchQuery,
                    };
                    const seed = resolvePioneerCreatorSeed(
                      n.firstVideoIdea || n.label || "",
                      n.angle || n.firstVideoIdea || n.label || "",
                      pioneerMeta,
                      n.whyPioneer
                    );
                    onApply(
                      seed.title || n.label || `Pioneiro: ${n.macroNiche}`,
                      seed.hook || seed.title,
                      {
                        format: (n.format === "LONGO" ? "LONGO" : "SHORTS") as
                          "LONGO" | "SHORTS",
                        mechanic: "pioneer-niche",
                        whyWorks: n.whyPioneer,
                        pioneerMeta,
                      }
                    );
                  }}
                  className="text-[10px] text-violet-300 hover:text-violet-200"
                >
                  Abrir no Creator
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendVideoList({
  title,
  icon: Icon,
  videos,
  onApply,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  videos: TrendVideo[];
  onApply?: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void;
}) {
  return (
    <div className="glass-panel p-5 rounded-3xl space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-red-300/80" />
        <p className="text-xs font-bold text-zinc-200">{title}</p>
      </div>
      {videos.length === 0 ? (
        <p className="text-[10px] text-zinc-500 italic">
          Sem vídeos neste formato no período.
        </p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li
              key={v.videoId || v.title}
              className="flex gap-2 p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60"
            >
              {v.thumbnailUrl && (
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="w-14 h-8 object-cover rounded border border-zinc-800"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-200 line-clamp-2">
                  {v.title}
                </p>
                <p className="text-[9px] text-zinc-500">
                  {(v.metrics?.views ?? 0).toLocaleString("pt-BR")} views
                </p>
              </div>
              <GrowthBadge pct={v.growthPct} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
