import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";
import { ToolShell, TierBadge } from "./pecas";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";
const ALERTA: Record<string, string> = { decolando: "🔥", estagnado: "📉" };

interface MonitoredVideo {
  video_id: string;
  title: string;
  views: number;
  velocidade: number;
  dias: number;
  tier: string;
  alerta: string | null;
}

interface Pattern {
  tipo: string;
  insight: string;
  acao: string;
}

export default function MonitorVideos() {
  const canal = useActiveChannel();
  const [videos, setVideos] = useState<MonitoredVideo[]>([]);
  const [padroes, setPadroes] = useState<Pattern[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  if (!canal.channelId) {
    return (
      <div className="tool-vazio font-sans p-8 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
        <span className="text-2xl block mb-2">🔥</span>
        <strong className="text-zinc-300 font-bold block mb-1">Selecione um canal</strong>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Por favor, selecione um canal no seletor do topo da tela para acessar o monitoramento e ferramentas de crescimento.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (!canal.channelId) return;
    setCarregando(true);
    Promise.all([
      fetch(`${API}/api/tools/${canal.channelId}/video-monitor`).then((r) => r.json()),
      fetch(`${API}/api/tools/${canal.channelId}/patterns`).then((r) => r.json()),
    ])
      .then(([vm, pt]) => {
        setVideos(vm.videos || []);
        setPadroes(pt.padroes || []);
      })
      .catch((e) => console.error("Erro ao carregar monitor de vídeos:", e))
      .finally(() => setCarregando(false));
  }, [canal.channelId]);

  return (
    <ToolShell
      icone="🔥"
      titulo="Monitor de Vídeos"
      cor="#f5a623"
      subtitulo="Performance ao vivo + padrões"
      canal={canal}
    >
      <div className="space-y-6">
        {/* 🔥 Extração de padrões (feedback loop) */}
        {padroes.length > 0 && (
          <div className="tool-bloco space-y-3">
            <h4 className="tool-bloco__titulo text-xs uppercase tracking-wider font-bold text-zinc-400">
              🧠 O que está funcionando (padrões extraídos)
            </h4>
            <div className="padroes-lista grid gap-3">
              {padroes.map((p, i) => (
                <div
                  key={i}
                  className="padrao flex items-start gap-3 bg-amber-500/5 p-4 border border-amber-500/20 rounded-xl"
                >
                  <span className="padrao__tipo font-mono bg-zinc-950 text-amber-400 border border-zinc-900 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold select-none shrink-0">
                    {p.tipo}
                  </span>
                  <div>
                    <div className="padrao__insight text-xs font-bold text-zinc-200">
                      {p.insight}
                    </div>
                    <div className="padrao__acao text-[11px] text-zinc-400 mt-1 font-mono">
                      → {p.acao}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {carregando ? (
          <div className="tool-loading font-mono text-zinc-400">Carregando vídeos…</div>
        ) : (
          <div className="monitor-tabela-wrapper overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/20 font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-wider text-zinc-500 font-mono font-bold select-none bg-zinc-950/40">
                  <th className="p-3">Vídeo</th>
                  <th className="p-3 text-right">Views</th>
                  <th className="p-3 text-right">Velocidade</th>
                  <th className="p-3 text-center">Dias</th>
                  <th className="p-3 text-center">Tier</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs">
                {videos.map((v) => (
                  <tr
                    key={v.video_id}
                    className={`hover:bg-zinc-900/10 transition-colors ${
                      v.alerta === "decolando"
                        ? "border-l-2 border-l-emerald-500"
                        : v.alerta === "estagnado"
                          ? "border-l-2 border-l-rose-500"
                          : ""
                    }`}
                  >
                    <td className="p-3 font-semibold text-zinc-200 max-w-[240px] truncate" title={v.title}>
                      {v.title}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-400">
                      {v.views?.toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-400">
                      {v.velocidade}/dia
                    </td>
                    <td className="p-3 text-center font-mono text-zinc-400">{v.dias}d</td>
                    <td className="p-3 text-center">
                      <TierBadge tier={v.tier} />
                    </td>
                    <td className="p-3 text-center text-[10px] font-bold select-none">
                      {v.alerta ? (
                        <span className={v.alerta === "decolando" ? "text-emerald-400" : "text-rose-500"}>
                          {ALERTA[v.alerta]} {v.alerta}
                        </span>
                      ) : (
                        <span className="text-zinc-500">— estável</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {videos.length === 0 && (
              <div className="tool-vazio text-sm text-zinc-500 py-6 text-center">
                Nenhum vídeo no histórico ainda.
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
