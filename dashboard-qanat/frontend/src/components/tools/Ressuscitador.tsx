import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";
import { ToolShell } from "./pecas";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

interface DeadVideo {
  video_id: string;
  title: string;
  views: number;
  media_canal: number;
  published_at: string;
  thumbnail?: string;
  sub_nicho?: string;
  duration_seconds?: number;
  drop_30s?: number;
}

interface Plano {
  autopsia: string[];
  resgate: Array<{
    tipo: string;
    sugestao: string;
    prompt?: string;
  }>;
}

export default function Ressuscitador() {
  const canal = useActiveChannel();
  const [mortos, setMortos] = useState<DeadVideo[]>([]);
  const [media, setMedia] = useState<number>(0);
  const [planos, setPlanos] = useState<Record<string, Plano>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);

  if (!canal.channelId) {
    return (
      <div className="tool-vazio font-sans p-8 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
        <span className="text-2xl block mb-2">⚰️</span>
        <strong className="text-zinc-300 font-bold block mb-1">Selecione um canal</strong>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Por favor, selecione um canal no seletor do topo da tela para acessar o monitoramento e ferramentas de crescimento.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (!canal.channelId) return;
    fetch(`${API}/api/tools/${canal.channelId}/dead-videos`)
      .then((r) => r.json())
      .then((d) => {
        setMortos(d.mortos || []);
        setMedia(d.media_canal || 0);
      })
      .catch((e) => console.error("Erro ao carregar vídeos mortos:", e));
  }, [canal.channelId]);

  const gerarPlano = async (video: DeadVideo) => {
    setGerando(video.video_id);
    try {
      const res = await fetch(`${API}/api/tools/${canal.channelId}/revive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video }),
      });
      const data = await res.json();
      setPlanos((p) => ({ ...p, [video.video_id]: data }));
      setAberto(video.video_id);
    } catch (e) {
      console.error("Erro ao gerar plano de resgate:", e);
    } finally {
      setGerando(null);
    }
  };

  return (
    <ToolShell
      icone="⚰️"
      titulo="Ressuscitador"
      cor="#2ecc71"
      subtitulo="Vídeos abaixo de 40% da média"
      canal={canal}
    >
      <div className="space-y-4">
        <div className="revive-resumo text-xs text-zinc-400 font-sans">
          Média do canal: <strong className="text-zinc-100 font-bold font-mono">{media} views</strong> ·{" "}
          <strong className="text-zinc-100 font-bold font-mono">{mortos.length}</strong> vídeo(s) para ressuscitar
        </div>

        {mortos.length === 0 && (
          <div className="tool-vazio text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
            🎉 Nenhum vídeo morto — tudo acima de 40% da média.
          </div>
        )}

        <div className="revive-lista grid gap-3">
          {mortos.map((v) => {
            const plano = planos[v.video_id];
            const estaAberto = aberto === v.video_id;
            return (
              <div
                key={v.video_id}
                className={`revive-card bg-zinc-950/40 border border-zinc-900 rounded-xl overflow-hidden transition-all duration-200 ${
                  estaAberto ? "border-emerald-500/50 shadow-lg shadow-emerald-500/5" : ""
                }`}
              >
                <div
                  className="revive-card__linha flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-zinc-900/40"
                  onClick={() => setAberto(estaAberto ? null : v.video_id)}
                >
                  <div className="revive-card__info flex-1 min-w-0">
                    <div className="revive-card__titulo font-bold text-zinc-100 text-xs truncate">
                      {v.title}
                    </div>
                    <div className="revive-card__meta text-[10px] text-zinc-500 font-mono mt-1">
                      {v.views} views · média {v.media_canal} ·{" "}
                      {Math.round((v.views / Math.max(v.media_canal, 1)) * 100)}% da média
                    </div>
                  </div>
                  <button
                    className="ch-btn ch-btn--primary px-3 py-1.5 text-[11px] font-bold rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      gerarPlano(v);
                    }}
                    disabled={gerando === v.video_id}
                  >
                    {gerando === v.video_id ? "Analisando…" : plano ? "↻ Reanalisar" : "⚡ Ressuscitar"}
                  </button>
                </div>

                {plano && estaAberto && (
                  <div className="revive-plano grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border-t border-zinc-900 bg-zinc-950/80">
                    <div className="revive-col space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        ⚰️ Autópsia — por que morreu
                      </h5>
                      {plano.autopsia.map((a, i) => (
                        <div
                          key={i}
                          className="revive-item revive-item--ruim bg-red-500/10 text-red-300 border border-red-500/20 text-xs p-3 rounded-lg leading-relaxed"
                        >
                          ✗ {a}
                        </div>
                      ))}
                    </div>
                    <div className="revive-col space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        ⚡ Plano de resgate
                      </h5>
                      {plano.resgate.map((r, i) => (
                        <div
                          key={i}
                          className="revive-item revive-item--bom bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs p-3 rounded-lg leading-relaxed"
                        >
                          <div>
                            <strong>{r.tipo.replace(/_/g, " ")}:</strong> {r.sugestao}
                          </div>
                          {r.prompt && (
                            <code className="revive-prompt block bg-zinc-900 text-zinc-400 font-mono text-[9px] mt-2 p-2 rounded border border-zinc-800 break-words select-all">
                              {r.prompt}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ToolShell>
  );
}
