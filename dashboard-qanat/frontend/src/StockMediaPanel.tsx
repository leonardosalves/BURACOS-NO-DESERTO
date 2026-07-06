import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Download,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import type { StudioClip } from "./timelineStudioTypes";
import type { StockSearchTrigger } from "./timelineStudioAskTypes";
import type { StockKeysStatus, StockSearchItem } from "./stockMediaTypes";

type PanelMode = "project" | "stock";

type Props = {
  videoClips: StudioClip[];
  getAssetUrl: (fileName: string) => string;
  getProjectUrl: (path: string) => string;
  playhead: number;
  onStockClipAdded: (clip: StudioClip) => void;
  stockSearchTrigger?: StockSearchTrigger | null;
};

export function StockMediaPanel({
  videoClips,
  getAssetUrl,
  getProjectUrl,
  playhead,
  onStockClipAdded,
  stockSearchTrigger,
}: Props) {
  const [mode, setMode] = useState<PanelMode>("stock");
  const [mediaTab, setMediaTab] = useState<"videos" | "images">("videos");
  const [provider, setProvider] = useState<"all" | "pexels" | "pixabay">("all");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [stockResults, setStockResults] = useState<StockSearchItem[]>([]);
  const [stockKeys, setStockKeys] = useState<StockKeysStatus>({
    pexels: false,
    pixabay: false,
  });
  const [stockError, setStockError] = useState<string | null>(null);

  const projectMedia = useMemo(() => {
    const seen = new Set<string>();
    const items: {
      id: string;
      label: string;
      source: string;
      isVideo: boolean;
    }[] = [];
    for (const clip of videoClips) {
      const src = String(clip.source || "").trim();
      if (!src || seen.has(src)) continue;
      seen.add(src);
      const isVideo =
        clip.props?.type === "video" || /\.(mp4|webm|mov)$/i.test(src);
      if (mediaTab === "videos" && !isVideo) continue;
      if (mediaTab === "images" && isVideo) continue;
      items.push({
        id: clip.id,
        label: clip.label || src.split("/").pop() || src,
        source: src,
        isVideo,
      });
    }
    return items.filter(
      (it) =>
        !projectFilter.trim() ||
        it.label.toLowerCase().includes(projectFilter.toLowerCase())
    );
  }, [videoClips, mediaTab, projectFilter]);

  const runStockSearch = useCallback(
    async (override?: { q?: string; mediaType?: "video" | "image" }) => {
      const q = (override?.q ?? query).trim();
      const tab =
        override?.mediaType === "image"
          ? "images"
          : override?.mediaType === "video"
            ? "videos"
            : mediaTab;
      if (!q) {
        toast.error("Digite um termo de busca");
        return;
      }
      setSearching(true);
      setStockError(null);
      try {
        const params = new URLSearchParams({
          q,
          type: tab === "videos" ? "video" : "image",
          provider,
          per_page: "12",
        });
        const res = await fetch(
          getProjectUrl(`/api/timeline-studio/stock/search?${params}`)
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStockResults((data.items || []) as StockSearchItem[]);
        setStockKeys(data.keys || { pexels: false, pixabay: false });
        if (data.error && !(data.items || []).length) {
          setStockError(data.error);
        }
      } catch (err) {
        setStockError((err as Error).message);
        toast.error(`Busca falhou: ${(err as Error).message}`);
      } finally {
        setSearching(false);
      }
    },
    [getProjectUrl, mediaTab, provider, query]
  );

  useEffect(() => {
    if (!stockSearchTrigger?.query) return;
    setMode("stock");
    setMediaTab(stockSearchTrigger.mediaType === "image" ? "images" : "videos");
    setQuery(stockSearchTrigger.query);
    void runStockSearch({
      q: stockSearchTrigger.query,
      mediaType: stockSearchTrigger.mediaType,
    });
  }, [
    stockSearchTrigger?.nonce,
    runStockSearch,
    stockSearchTrigger?.query,
    stockSearchTrigger?.mediaType,
  ]);

  const importStockItem = async (item: StockSearchItem) => {
    setImportingId(item.id);
    try {
      const res = await fetch(
        getProjectUrl("/api/timeline-studio/stock/import"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item,
            query: query.trim() || item.query,
            playhead,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onStockClipAdded(data.clip as StudioClip);
      toast.success(
        `Adicionado na timeline em ${formatShortTime(playhead)} (${item.provider})`
      );
    } catch (err) {
      toast.error(`Importação falhou: ${(err as Error).message}`);
    } finally {
      setImportingId(null);
    }
  };

  const addProjectMediaToTimeline = (
    source: string,
    label: string,
    isVideo: boolean
  ) => {
    const clip: StudioClip = {
      id: `video-reuse-${Date.now()}`,
      trackId: "video",
      start: playhead,
      duration: isVideo ? 6 : 4,
      label,
      source,
      props: { type: isVideo ? "video" : "image", reused: true },
      color: "#1565C0",
    };
    onStockClipAdded(clip);
    toast.success(`Clip reutilizado em ${formatShortTime(playhead)}`);
  };

  const keysHint =
    !stockKeys.pexels && !stockKeys.pixabay
      ? "Configure Pexels/Pixabay em Configurações → API Keys"
      : [
          stockKeys.pexels ? "Pexels" : null,
          stockKeys.pixabay ? "Pixabay" : null,
        ]
          .filter(Boolean)
          .join(" + ");

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex border-b border-zinc-800/60">
        <button
          type="button"
          onClick={() => setMode("stock")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
            mode === "stock"
              ? "text-gold-400 border-b-2 border-gold-500 bg-zinc-900/50"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Download className="w-3.5 h-3.5" /> Stock
        </button>
        <button
          type="button"
          onClick={() => setMode("project")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
            mode === "project"
              ? "text-gold-400 border-b-2 border-gold-500 bg-zinc-900/50"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" /> Projeto
        </button>
      </div>

      <div className="flex border-b border-zinc-800/40">
        <button
          type="button"
          onClick={() => setMediaTab("videos")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
            mediaTab === "videos"
              ? "text-white bg-zinc-800/60"
              : "text-zinc-500"
          }`}
        >
          <Film className="w-3 h-3" /> Vídeos
        </button>
        <button
          type="button"
          onClick={() => setMediaTab("images")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
            mediaTab === "images"
              ? "text-white bg-zinc-800/60"
              : "text-zinc-500"
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Imagens
        </button>
      </div>

      {mode === "stock" ? (
        <>
          <div className="p-2 border-b border-zinc-800/40 space-y-2">
            <div className="flex gap-1">
              {(["all", "pexels", "pixabay"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase cursor-pointer transition ${
                    provider === p
                      ? "bg-gold-500/20 text-gold-300 border border-gold-500/40"
                      : "text-zinc-500 border border-transparent hover:border-zinc-700"
                  }`}
                >
                  {p === "all" ? "Ambos" : p}
                </button>
              ))}
            </div>
            <div className="relative flex gap-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void runStockSearch()}
                  placeholder="forest aerial, city night…"
                  className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
                />
              </div>
              <button
                type="button"
                onClick={() => void runStockSearch(undefined)}
                disabled={searching}
                className="shrink-0 px-3 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-300 text-[10px] font-bold cursor-pointer disabled:opacity-50"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </button>
            </div>
            <p className="text-[9px] text-zinc-600 px-1">{keysHint}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {stockError && !stockResults.length ? (
              <p className="text-[10px] text-amber-400/90 text-center py-6 px-2">
                {stockError}
              </p>
            ) : stockResults.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-8 px-2">
                Busque stock em inglês e clique + para inserir no playhead (
                {formatShortTime(playhead)}).
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {stockResults.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden hover:border-gold-500/40 transition"
                  >
                    <div className="aspect-video bg-zinc-800 relative">
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/70 text-zinc-300">
                        {item.provider}
                      </span>
                      {item.duration ? (
                        <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.5 rounded bg-black/70 text-zinc-300">
                          {Math.round(item.duration)}s
                        </span>
                      ) : null}
                    </div>
                    <div className="p-1.5 flex items-center justify-between gap-1">
                      <p className="text-[8px] text-zinc-500 truncate flex-1">
                        {item.photographer || item.sourceId}
                      </p>
                      <button
                        type="button"
                        onClick={() => void importStockItem(item)}
                        disabled={importingId === item.id}
                        className="shrink-0 p-1 rounded-lg bg-gold-500 text-zinc-950 hover:bg-gold-400 transition cursor-pointer disabled:opacity-50"
                        title={`Adicionar em ${formatShortTime(playhead)}`}
                      >
                        {importingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="p-2 border-b border-zinc-800/40">
            <input
              type="text"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              placeholder="Filtrar mídia do projeto…"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {projectMedia.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-8 px-2">
                Nenhuma mídia {mediaTab === "videos" ? "de vídeo" : "de imagem"}{" "}
                na timeline ainda.
              </p>
            ) : (
              projectMedia.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-2 p-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 transition"
                >
                  <div className="w-14 h-10 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                    {item.isVideo ? (
                      <video
                        src={getAssetUrl(item.source)}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={getAssetUrl(item.source)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-zinc-200 truncate">
                      {item.label}
                    </p>
                    <p className="text-[9px] text-zinc-600 truncate">
                      {item.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addProjectMediaToTimeline(
                        item.source,
                        item.label,
                        item.isVideo
                      )
                    }
                    className="shrink-0 self-center p-1.5 rounded-lg border border-zinc-700 text-gold-400 hover:bg-gold-500/10 cursor-pointer"
                    title={`Reutilizar em ${formatShortTime(playhead)}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatShortTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
