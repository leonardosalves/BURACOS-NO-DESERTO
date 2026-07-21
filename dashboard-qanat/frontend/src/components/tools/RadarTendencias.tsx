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
  urgencia_score?: number;
  saturacao?: number;
  emergente?: boolean;
  oportunidade?: number;
  ja_usada?: boolean;
}

interface RadarTendenciasProps {
  aoVirarVideo?: (opts: { tema: string; sub_nicho: string }) => void;
}

export default function RadarTendencias({ aoVirarVideo }: RadarTendenciasProps) {
  const canal = useActiveChannel();
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
  const [emergentes, setEmergentes] = useState<Tendencia[]>([]);
  const [clusters, setClusters] = useState<Record<string, Tendencia[]>>({});
  const [carregando, setCarregando] = useState<boolean>(true);
  const [abaAtiva, setAbaAtiva] = useState<"todas" | "emergentes" | "clusters">("todas");

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
    fetch(`${API}/api/tools/${canal.channelId}/trends-rich`)
      .then((r) => r.json())
      .then((d) => {
        setTendencias(d.tendencias || []);
        setEmergentes(d.emergentes || []);
        setClusters(d.clusters || {});
      })
      .catch((e) => console.error("Erro ao carregar tendências do canal:", e))
      .finally(() => setCarregando(false));
  }, [canal.channelId]);

  const corScore = (s: number) =>
    s >= 70 ? "var(--success)" : s >= 40 ? "var(--warning)" : "var(--danger)";

  const renderCard = (t: Tendencia, idx: number) => {
    const score = t.fit.score;
    const oport = t.oportunidade || 50;
    return (
      <div
        key={idx}
        className={`radar-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl transition-all duration-150 ${
          t.fit.bloqueado
            ? "opacity-45 filter grayscale-[0.6] hover:border-zinc-900"
            : "hover:border-blue-500/50"
        }`}
      >
        <div className="flex items-center gap-4 shrink-0">
          {/* Fit Score */}
          <div className="radar-fit text-center w-14 shrink-0">
            <div className="radar-fit__num font-display font-black text-xl" style={{ color: corScore(score) }}>
              {score}
            </div>
            <div className="radar-fit__rotulo text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              FIT CANAL
            </div>
          </div>

          {/* Oportunidade Score */}
          <div className="radar-fit text-center w-14 shrink-0 border-l border-zinc-900 pl-4">
            <div className="radar-fit__num font-display font-black text-xl text-indigo-400">
              {oport}%
            </div>
            <div className="radar-fit__rotulo text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              OPORT.
            </div>
          </div>
        </div>

        <div className="radar-info flex-1 min-w-0 font-sans">
          <div className="radar-tema text-xs font-bold text-zinc-100 leading-snug flex items-center gap-2 flex-wrap">
            {t.fit.bloqueado && "🚫 "}
            {t.tema}
            {t.emergente && (
              <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                🔥 Emergente
              </span>
            )}
            {t.ja_usada && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                ✓ Publicado
              </span>
            )}
          </div>
          <div className="radar-motivos text-[10px] text-zinc-500 font-mono mt-1 select-none">
            {t.fit.motivos.join(" · ") || "—"}
          </div>
          <div className="radar-tags flex flex-wrap gap-1.5 mt-2">
            {t.sub_nicho && (
              <span className="badge text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                {t.sub_nicho}
              </span>
            )}
            {t.competicao && (
              <span className="badge text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                saturação: {t.competicao} ({t.saturacao}%)
              </span>
            )}
            {t.urgencia && (
              <span className="badge text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                urgência: {t.urgencia}
              </span>
            )}
          </div>
        </div>

        {!t.fit.bloqueado && !t.ja_usada && (
          <button
            className="btn btn--primary px-3 py-1.5 text-[11px] font-bold rounded-lg shrink-0 w-full md:w-auto mt-2 md:mt-0"
            onClick={() => aoVirarVideo?.({ tema: t.tema, sub_nicho: t.sub_nicho })}
            title="Enviar para o Criador com tema pré-preenchido"
          >
            🎬 Virar vídeo
          </button>
        )}
      </div>
    );
  };

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
        <div className="space-y-6">
          {/* Métricas do Radar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
              <div className="text-2xl font-bold font-mono text-indigo-400">
                {tendencias.filter(t => (t.oportunidade || 0) >= 70).length}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">
                Alta Oportunidade (Score ≥ 70)
              </div>
            </div>
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
              <div className="text-2xl font-bold font-mono text-red-400">{emergentes.length}</div>
              <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">
                Emergentes (Crescimento 48h)
              </div>
            </div>
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {tendencias.filter(t => t.ja_usada).length}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">
                Tendências Aproveitadas
              </div>
            </div>
          </div>

          {/* Filtros de Visão */}
          <div className="flex gap-2 border-b border-zinc-900 pb-px">
            <button
              onClick={() => setAbaAtiva("todas")}
              className={`pb-2 px-4 text-xs font-bold font-sans border-b-2 transition-all ${
                abaAtiva === "todas" ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Feed Geral ({tendencias.length})
            </button>
            <button
              onClick={() => setAbaAtiva("emergentes")}
              className={`pb-2 px-4 text-xs font-bold font-sans border-b-2 transition-all ${
                abaAtiva === "emergentes" ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🔥 Apenas Emergentes ({emergentes.length})
            </button>
            <button
              onClick={() => setAbaAtiva("clusters")}
              className={`pb-2 px-4 text-xs font-bold font-sans border-b-2 transition-all ${
                abaAtiva === "clusters" ? "border-blue-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              📂 Agrupado por Sub-Nicho
            </button>
          </div>

          {/* Listagens */}
          <div className="radar-lista grid gap-3">
            {abaAtiva === "todas" && (
              <>
                {tendencias.length === 0 && (
                  <div className="tool-vazio text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    Nenhuma tendência no feed geral.
                  </div>
                )}
                {tendencias.map((t, idx) => renderCard(t, idx))}
              </>
            )}

            {abaAtiva === "emergentes" && (
              <>
                {emergentes.length === 0 && (
                  <div className="tool-vazio text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    Nenhuma tendência explodindo no momento.
                  </div>
                )}
                {emergentes.map((t, idx) => renderCard(t, idx))}
              </>
            )}

            {abaAtiva === "clusters" && (
              <div className="space-y-6">
                {Object.keys(clusters).length === 0 ? (
                  <div className="tool-vazio text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    Sem agrupamento de clusters disponível.
                  </div>
                ) : (
                  Object.entries(clusters).map(([subNicho, itens]) => (
                    <div key={subNicho} className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900/60 pb-1 mb-2">
                        📂 {subNicho.replace(/_/g, " ")} ({itens.length})
                      </h5>
                      <div className="grid gap-3">
                        {itens.map((t, idx) => renderCard(t, idx))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
