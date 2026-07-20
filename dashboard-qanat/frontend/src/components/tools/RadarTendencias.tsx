import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";
import { ToolShell } from "./pecas";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

interface Tendencia {
  tema: string;
  sub_nicho: string;
  palavras_chave: string[];
  competicao: string;
  urgencia: string;
  fit: {
    score: number;
    motivos: string[];
    bloqueado: boolean;
  };
}

interface RadarTendenciasProps {
  aoVirarVideo?: (opts: { tema: string; sub_nicho: string }) => void;
}

export default function RadarTendencias({ aoVirarVideo }: RadarTendenciasProps) {
  const canal = useActiveChannel();
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  if (!canal.channelId) {
    return (
      <div className="tool-vazio font-sans p-8 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
        <span className="text-2xl block mb-2">🎯</span>
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
    fetch(`${API}/api/tools/${canal.channelId}/trends`)
      .then((r) => r.json())
      .then((d) => setTendencias(d.tendencias || []))
      .catch((e) => console.error("Erro ao carregar tendências do canal:", e))
      .finally(() => setCarregando(false));
  }, [canal.channelId]);

  const corFit = (s: number) => (s >= 70 ? "#2ecc71" : s >= 40 ? "#f5a623" : "#e74c3c");

  return (
    <ToolShell
      icone="🎯"
      titulo="Radar de Tendências"
      cor="#4a7dff"
      subtitulo="Tendências filtradas pelo nicho"
      canal={canal}
    >
      {carregando ? (
        <div className="tool-loading font-mono text-zinc-400">Escaneando tendências…</div>
      ) : (
        <div className="radar-lista grid gap-3">
          {tendencias.length === 0 && (
            <div className="tool-vazio text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              Nenhuma tendência no feed. Adicione em{" "}
              <code className="text-amber-400 font-mono text-xs">
                channels/{canal.channelId}/data/trends_feed.json
              </code>
            </div>
          )}
          {tendencias.map((t, i) => (
            <div
              key={i}
              className={`radar-card flex items-center justify-between gap-4 bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl transition-all duration-150 ${
                t.fit.bloqueado
                  ? "opacity-45 filter grayscale-[0.6] hover:border-zinc-900 hover:transform-none"
                  : "hover:border-blue-500/50 hover:transform hover:translate-x-1"
              }`}
            >
              <div
                className="radar-fit text-center w-16 shrink-0 font-sans"
                style={{ "--fit-cor": corFit(t.fit.score) } as React.CSSProperties}
              >
                <div className="radar-fit__num font-display font-black text-2xl" style={{ color: corFit(t.fit.score) }}>
                  {t.fit.score}
                </div>
                <div className="radar-fit__rotulo text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                  fit
                </div>
                <div className="radar-fit__barra h-1 bg-zinc-900 rounded-full mt-1.5 overflow-hidden">
                  <i
                    className="block h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${t.fit.score}%`,
                      backgroundColor: corFit(t.fit.score),
                    }}
                  />
                </div>
              </div>
              <div className="radar-info flex-1 min-w-0 font-sans">
                <div className="radar-tema text-xs font-bold text-zinc-100 leading-snug">
                  {t.fit.bloqueado && "🚫 "}
                  {t.tema}
                </div>
                <div className="radar-motivos text-[10px] text-zinc-500 font-mono mt-1 select-none">
                  {t.fit.motivos.join(" · ") || "—"}
                </div>
                <div className="radar-tags flex flex-wrap gap-1.5 mt-2">
                  {t.sub_nicho && (
                    <span className="ch-tag text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      {t.sub_nicho}
                    </span>
                  )}
                  {t.competicao && (
                    <span className="ch-tag text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      competição: {t.competicao}
                    </span>
                  )}
                  {t.urgencia && (
                    <span className="ch-tag text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      urgência: {t.urgencia}
                    </span>
                  )}
                </div>
              </div>
              {!t.fit.bloqueado && (
                <button
                  className="ch-btn ch-btn--primary px-3 py-1.5 text-[11px] font-bold rounded-lg shrink-0"
                  onClick={() => aoVirarVideo?.({ tema: t.tema, sub_nicho: t.sub_nicho })}
                  title="Enviar para o Criador com tema pré-preenchido"
                >
                  🎬 Virar vídeo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </ToolShell>
  );
}
