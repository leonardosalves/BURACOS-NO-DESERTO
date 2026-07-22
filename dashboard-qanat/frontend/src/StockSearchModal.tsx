import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Film, Image, Loader2, ExternalLink, Sparkles } from "lucide-react";

export interface StockItem {
  id: string;
  sourceId: string;
  provider: string;
  type: "video" | "image";
  previewUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  photographer?: string;
  query?: string;
}

interface StockSearchModalProps {
  open: boolean;
  onClose: () => void;
  query: string;
  mediaType: "video" | "image";
  aspectRatio?: string;
  projectName: string;
  sceneContext?: {
    narration_text?: string;
    visual_description?: string;
    prompt?: string;
    video_theme?: string;
  };
  onSelect: (item: StockItem) => void;
}

type Provider = "pexels" | "pixabay" | "bing";

export function StockSearchModal({
  open,
  onClose,
  query: initialQuery,
  mediaType,
  aspectRatio,
  projectName,
  sceneContext,
  onSelect,
}: StockSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [provider, setProvider] = useState<Provider>("pexels");
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingAi, setResolvingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StockItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(
    async (q: string, prov: Provider) => {
      const term = q.trim();
      if (!term) return;
      setLoading(true);
      setError(null);
      setItems([]);
      try {
        if (prov === "bing") {
          const res = await fetch(
            `/api/workflow/bing-${mediaType}-search?q=${encodeURIComponent(term)}`
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro na busca Bing");
          const mapped: StockItem[] = (data.hits || []).map(
            (hit: any, idx: number) => ({
              id: `bing-${mediaType}-${idx}`,
              sourceId: hit.sourceId || `bing-${mediaType}:${idx}`,
              provider: "bing",
              type: mediaType,
              previewUrl: hit.thumbnailUrl || hit.murl || hit.mediaUrl,
              downloadUrl: hit.mediaUrl || hit.murl,
              duration: hit.duration,
              photographer: hit.title || "Bing",
              query: term,
            })
          );
          setItems(mapped);
          if (!mapped.length) setError("Nenhum resultado encontrado.");
        } else {
          const projParam = projectName
            ? `&project=${encodeURIComponent(projectName)}`
            : "";
          const res = await fetch(
            `/api/timeline-studio/stock/search?q=${encodeURIComponent(term)}&type=${mediaType}&provider=${prov}&per_page=18${projParam}`
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro na busca");
          if (data.error && !data.items?.length) {
            setError(data.error);
          }
          setItems(data.items || []);
          if (!data.items?.length && !data.error)
            setError("Nenhum resultado encontrado.");
        }
      } catch (err: any) {
        setError(err.message || "Erro na busca");
      } finally {
        setLoading(false);
      }
    },
    [mediaType, projectName]
  );

  const resolveAiContextQuery = useCallback(async () => {
    if (!sceneContext || (!sceneContext.narration_text && !sceneContext.prompt)) return;
    setResolvingAi(true);
    try {
      const res = await fetch("/api/timeline-studio/stock/ai-context-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sceneContext,
          project: projectName,
        }),
      });
      const data = await res.json();
      if (data.ok && data.ai_query) {
        setSearchQuery(data.ai_query);
        doSearch(data.ai_query, provider);
      }
    } catch {
      /* ignore */
    } finally {
      setResolvingAi(false);
    }
  }, [sceneContext, projectName, provider, doSearch]);

  useEffect(() => {
    if (open) {
      setSearchQuery(initialQuery);
      setItems([]);
      setError(null);
      // Auto-search on open
      setTimeout(() => doSearch(initialQuery, provider), 100);
    }
  }, [open, initialQuery, provider, doSearch]);

  const handleImport = useCallback(
    async (item: StockItem) => {
      setImporting(item.id);
      try {
        const projParam = projectName
          ? `?project=${encodeURIComponent(projectName)}`
          : "";
        const res = await fetch(
          `/api/timeline-studio/stock/import${projParam}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item, query: searchQuery }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao importar");
        // Pass the imported filename back
        onSelect({
          ...item,
          downloadUrl: data.import?.filename || item.downloadUrl,
        });
        onClose();
      } catch (err: any) {
        setError(err.message || "Erro ao importar asset");
      } finally {
        setImporting(null);
      }
    },
    [searchQuery, projectName, onSelect, onClose]
  );

  if (!open) return null;

  const providers: { id: Provider; label: string }[] = [
    { id: "pexels", label: "Pexels" },
    { id: "pixabay", label: "Pixabay" },
    { id: "bing", label: "Bing" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            {mediaType === "video" ? (
              <Film className="h-4 w-4 text-blue-400" />
            ) : (
              <Image className="h-4 w-4 text-cyan-400" />
            )}
            <span className="text-sm font-bold text-white">
              Buscar {mediaType === "video" ? "Vídeo" : "Imagem"}
            </span>
            {aspectRatio && (
              <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                {aspectRatio}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search bar + provider tabs */}
        <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch(searchQuery, provider);
              }}
              placeholder="Buscar stock..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          {sceneContext && (
            <button
              onClick={resolveAiContextQuery}
              disabled={resolvingAi}
              title="A IA analisa todo o contexto semântico da narração e visual e deduz as palavras de busca perfeitas em inglês"
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-200 transition hover:bg-purple-500/20 disabled:opacity-50"
            >
              {resolvingAi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              )}
              IA Contexto
            </button>
          )}
          <button
            onClick={() => doSearch(searchQuery, provider)}
            disabled={loading}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
          </button>
          <div className="flex gap-1">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  doSearch(searchQuery, p.id);
                }}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
                  provider === p.id
                    ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          )}

          {error && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <p className="text-xs text-red-400">{error}</p>
              <p className="text-[10px] text-zinc-600">
                Verifique se as chaves API estão configuradas (Pexels/Pixabay).
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === "video") {
                      setPreviewItem(item);
                    } else {
                      handleImport(item);
                    }
                  }}
                  disabled={importing === item.id}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-cyan-500/50 hover:ring-1 hover:ring-cyan-500/30 disabled:opacity-50"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.previewUrl}
                    className="h-full w-full object-cover"
                    alt=""
                    loading="lazy"
                  />
                  {/* Video hover playback overlay */}
                  {item.type === "video" && item.provider !== "bing" && item.downloadUrl && (
                    <video
                      src={item.downloadUrl}
                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      muted
                      playsInline
                      preload="none"
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        const v = e.target as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                    />
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                    {importing === item.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : item.type === "video" ? (
                      <span className="rounded-lg bg-black/70 px-2.5 py-1 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                        ▶ Preview
                      </span>
                    ) : (
                      <span className="rounded-lg bg-cyan-600/90 px-2.5 py-1 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                        Selecionar
                      </span>
                    )}
                  </div>
                  {/* Provider badge */}
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-bold text-zinc-300">
                    {item.provider}
                    {item.duration ? ` · ${item.duration}s` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-600">
                Digite um termo e clique em Buscar ou use IA Contexto.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Player */}
      {previewItem && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm rounded-2xl">
          <div className="w-full max-w-2xl px-6 space-y-4">
            {previewItem.provider === "bing" ? (
              <div className="relative overflow-hidden rounded-xl bg-black">
                <img
                  src={previewItem.previewUrl}
                  className="max-h-[55vh] w-full object-contain"
                  alt={previewItem.photographer || "Preview Bing"}
                />
                <a
                  href={previewItem.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/80 px-3 py-2 text-[10px] font-bold text-white hover:bg-black"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir vídeo original
                </a>
              </div>
            ) : (
              <video
                src={previewItem.downloadUrl}
                className="w-full max-h-[55vh] rounded-xl bg-black"
                controls
                autoPlay
                muted
                playsInline
              />
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-400">
                <span className="font-bold text-white">{previewItem.provider}</span>
                {previewItem.duration ? ` · ${previewItem.duration}s` : ""}
                {previewItem.photographer ? ` · ${previewItem.photographer}` : ""}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => {
                    handleImport(previewItem);
                    setPreviewItem(null);
                  }}
                  disabled={importing === previewItem.id}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                >
                  {importing === previewItem.id ? "Importando..." : "✓ Selecionar este"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
