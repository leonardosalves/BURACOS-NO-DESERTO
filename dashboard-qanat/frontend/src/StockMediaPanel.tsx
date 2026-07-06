import React, { useMemo, useState } from "react";
import { Film, Image as ImageIcon, Search } from "lucide-react";
import type { StudioClip } from "./timelineStudioTypes";

type Props = {
  videoClips: StudioClip[];
  getAssetUrl: (fileName: string) => string;
};

export function StockMediaPanel({ videoClips, getAssetUrl }: Props) {
  const [tab, setTab] = useState<"videos" | "images">("videos");
  const [query, setQuery] = useState("");

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
      if (tab === "videos" && !isVideo) continue;
      if (tab === "images" && isVideo) continue;
      items.push({
        id: clip.id,
        label: clip.label || src.split("/").pop() || src,
        source: src,
        isVideo,
      });
    }
    return items.filter(
      (it) =>
        !query.trim() || it.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [videoClips, tab, query]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden">
      <div className="flex border-b border-zinc-800/60">
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
            tab === "videos"
              ? "text-gold-400 border-b-2 border-gold-500 bg-zinc-900/50"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Film className="w-3.5 h-3.5" /> Videos
        </button>
        <button
          type="button"
          onClick={() => setTab("images")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
            tab === "images"
              ? "text-gold-400 border-b-2 border-gold-500 bg-zinc-900/50"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Images
        </button>
      </div>

      <div className="p-2 border-b border-zinc-800/40">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no projeto… (Pexels Fase 3)"
            className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
          />
        </div>
        <p className="text-[9px] text-zinc-600 mt-1.5 px-1">
          Stock Pexels/Pixabay na timeline — Fase 3
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {projectMedia.length === 0 ? (
          <p className="text-[10px] text-zinc-600 text-center py-8 px-2">
            Nenhuma mídia {tab === "videos" ? "de vídeo" : "de imagem"} no
            projeto ainda.
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
