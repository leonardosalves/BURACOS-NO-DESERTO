import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";
import { StatCard, ToolShell } from "./pecas";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";
const SEV_ICON: Record<string, string> = { critico: "🔴", atencao: "🟡", ok: "🟢" };

interface Diagnosis {
  severidade: string;
  area: string;
  problema: string;
  acao: string;
}

export default function CanalYouTube() {
  const canal = useActiveChannel();
  const [overview, setOverview] = useState<any>(null);
  const [diags, setDiags] = useState<Diagnosis[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  if (!canal.channelId) {
    return (
      <div className="tool-vazio font-sans p-8 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
        <span className="text-2xl block mb-2">📺</span>
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
      fetch(`${API}/api/tools/${canal.channelId}/overview`).then((r) => r.json()),
      fetch(`${API}/api/tools/${canal.channelId}/diagnosis`).then((r) => r.json()),
      fetch(`${API}/api/tools/${canal.channelId}/insights`).then((r) => r.json()),
    ])
      .then(([ov, dg, ins]) => {
        setOverview(ov);
        setDiags(dg.diagnosticos || []);
        setInsights(ins);
      })
      .catch((e) => console.error("Erro ao carregar visão geral do canal:", e))
      .finally(() => setCarregando(false));
  }, [canal.channelId]);

  const s = overview?.stats;
  const fmt = (n: any) => (n != null ? Number(n).toLocaleString("pt-BR") : "—");

  return (
    <ToolShell
      icone="📺"
      titulo="Canal YouTube"
      cor="#ff4d4d"
      subtitulo="Monitoramento do canal"
      canal={canal}
      offline={overview?.offline}
    >
      {carregando ? (
        <div className="tool-loading font-mono text-zinc-400">Sincronizando com o YouTube…</div>
      ) : (
        <div className="space-y-6">
          <div className="tool-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              rotulo="Inscritos"
              valor={fmt(s?.subscriberCount)}
              serie={overview?.series?.inscritos}
              cor="#ff4d4d"
            />
            <StatCard
              rotulo="Views (total)"
              valor={fmt(s?.viewCount)}
              serie={overview?.series?.views}
              cor="#ff4d4d"
            />
            <StatCard rotulo="Vídeos" valor={fmt(s?.videoCount)} cor="#ff4d4d" />
            <StatCard
              rotulo="Última sync"
              valor={
                overview?.synced_at
                  ? new Date(overview.synced_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "nunca"
              }
              cor="#ff4d4d"
            />
          </div>

          {/* 🆕 Insights adicionais: Health Score, Projeção, Benchmark, Horário */}
          {insights && (
            <div className="yt-insights grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Health Score */}
              <div
                className="insight-card p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl"
                style={{
                  borderLeft: `3px solid ${
                    insights.health >= 75
                      ? "#2ecc71"
                      : insights.health >= 50
                      ? "#f5a623"
                      : "#e74c3c"
                  }`,
                }}
              >
                <div className="text-2xl font-bold font-mono text-zinc-100">{insights.health}</div>
                <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">
                  Health Score
                </div>
              </div>

              {/* Benchmark */}
              {insights.benchmark && (
                <div className="insight-card p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
                    📊 Benchmark vs nicho
                  </h5>
                  <div className="text-[11px] text-zinc-300">
                    CTR: {insights.benchmark.ctr?.canal}% vs {insights.benchmark.ctr?.nicho}% (
                    {insights.benchmark.ctr?.status})
                  </div>
                  <div className="text-[11px] text-zinc-300 mt-1">
                    Retenção: {insights.benchmark.retencao?.canal}% vs{" "}
                    {insights.benchmark.retencao?.nicho}% ({insights.benchmark.retencao?.status})
                  </div>
                </div>
              )}

              {/* Projeção */}
              {insights.projecao && (
                <div className="insight-card p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
                    📈 Projeção ({insights.projecao.tendencia})
                  </h5>
                  <div className="text-[11px] font-mono text-zinc-300">
                    30d: {fmt(insights.projecao.em_30_dias)} · 90d: {fmt(insights.projecao.em_90_dias)}
                  </div>
                </div>
              )}

              {/* Melhor horário */}
              {insights.melhorHorario && (
                <div className="insight-card p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">
                    ⏰ Melhor horário
                  </h5>
                  <div className="text-[11px] font-mono text-zinc-300">{insights.melhorHorario}</div>
                </div>
              )}
            </div>
          )}

          {/* 🔬 Diagnóstico automático */}
          <div className="tool-bloco space-y-3 mt-6">
            <h4 className="tool-bloco__titulo text-xs uppercase tracking-wider font-bold text-zinc-400">
              🔬 Diagnóstico automático
            </h4>

            {/* Anomalias críticas do sistema */}
            {insights?.anomalias && insights.anomalias.length > 0 && (
              <div className="anomalias-lista grid gap-2 mb-3">
                {insights.anomalias.map((a: any, i: number) => (
                  <div
                    key={i}
                    className="diag diag--critico flex items-start gap-3 bg-red-950/10 p-3 border border-red-900/40 rounded-xl text-red-200 text-xs font-sans"
                  >
                    <span>⚠️</span>
                    <div>{a.msg}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="diag-lista grid gap-3">
              {diags.map((d, i) => (
                <div
                  key={i}
                  className={`diag diag--${d.severidade} flex items-start gap-3 bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl`}
                >
                  <span className="diag__sev text-sm select-none">{SEV_ICON[d.severidade]}</span>
                  <div>
                    <div className="diag__area font-bold text-zinc-200 text-xs">
                      {d.area} — <span className="font-medium text-zinc-400">{d.problema}</span>
                    </div>
                    <div className="diag__acao text-[11px] text-amber-400 mt-1 font-mono">
                      → {d.acao}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
