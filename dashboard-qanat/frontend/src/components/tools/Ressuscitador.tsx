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
  score_ressuscitabilidade?: number;
  motivos?: string[];
}

interface Plano {
  autopsia: string[];
  resgate: Array<{
    tipo: string;
    sugestao: string;
    prompt?: string;
  }>;
}

interface ReviveHistoryItem {
  video_id: string;
  titulo_antigo: string;
  titulo_novo: string;
  resultado: string;
  em: string;
}

export default function Ressuscitador() {
  const canal = useActiveChannel();
  const [mortos, setMortos] = useState<DeadVideo[]>([]);
  const [historico, setHistorico] = useState<ReviveHistoryItem[]>([]);
  const [media, setMedia] = useState<number>(0);
  const [planos, setPlanos] = useState<Record<string, Plano>>({});
  const [aberto, setAberto] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [tituloNovoInput, setTituloNovoInput] = useState<Record<string, string>>({});

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
    fetch(`${API}/api/tools/${canal.channelId}/revive-scores`)
      .then((r) => r.json())
      .then((d) => {
        setMortos(d.analisados || []);
        setHistorico(d.historico || []);
        if (d.analisados && d.analisados.length > 0) {
          setMedia(d.analisados[0].media_canal || 0);
        }
      })
      .catch((e) => console.error("Erro ao carregar dados do ressuscitador:", e));
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
      
      // Auto-preenche sugestão de título novo se houver
      const sug = data.resgate?.find((r: any) => r.tipo === "titulo" || r.tipo === "A/B de thumbnail")?.sugestao || "";
      if (sug) {
        setTituloNovoInput(prev => ({ ...prev, [video.video_id]: sug.replace("Novo título sugerido: ", "") }));
      }
    } catch (e) {
      console.error("Erro ao gerar plano de resgate:", e);
    } finally {
      setGerando(null);
    }
  };

  const salvarRessuscitacao = async (video: DeadVideo) => {
    const novoTpl = tituloNovoInput[video.video_id] || "Alteração de Thumbnail e Capa";
    try {
      await fetch(`${API}/api/tools/${canal.channelId}/revive-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.video_id,
          titulo_antigo: video.title,
          titulo_novo: novoTpl,
          resultado: "Pendente (aguardando indexação de views)",
        }),
      });
      
      // Atualiza o histórico
      const res = await fetch(`${API}/api/tools/${canal.channelId}/revive-scores`);
      const d = await res.json();
      setHistorico(d.historico || []);
      setAberto(null);
    } catch (err) {
      console.error(err);
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
      <div className="space-y-6">
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
            const score = v.score_ressuscitabilidade || 30;
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="revive-card__titulo font-bold text-zinc-100 text-xs truncate">
                        {v.title}
                      </div>
                      {/* Score de Ressuscitabilidade */}
                      <span
                        className="ch-tag text-[9px] font-bold"
                        style={{
                          backgroundColor: score >= 70 ? "#2ecc7120" : score >= 50 ? "#f5a62320" : "#e74c3c20",
                          color: score >= 70 ? "#2ecc71" : score >= 50 ? "#f5a623" : "#e74c3c",
                          border: `1px solid ${score >= 70 ? "#2ecc7130" : score >= 50 ? "#f5a62330" : "#e74c3c30"}`
                        }}
                      >
                        Resgate: {score}%
                      </span>
                      {v.motivos?.map((m) => (
                        <span key={m} className="ch-tag text-[9px] font-mono bg-zinc-800 text-zinc-400">
                          {m}
                        </span>
                      ))}
                    </div>
                    <div className="revive-card__meta text-[10px] text-zinc-500 font-mono">
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
                  <div className="revive-plano p-4 border-t border-zinc-900 bg-zinc-950/80 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    {/* Formulário de Execução de Ressuscitação */}
                    <div className="revive-executa border-t border-zinc-900 pt-4 flex flex-col md:flex-row gap-4 items-end justify-between bg-zinc-900/10 p-3 rounded-xl">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                          Novo Título / Ação Aplicada
                        </label>
                        <input
                          type="text"
                          className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                          value={tituloNovoInput[v.video_id] || ""}
                          onChange={(e) => setTituloNovoInput({ ...tituloNovoInput, [v.video_id]: e.target.value })}
                          placeholder="Digite o novo título ou a ação aplicada no YouTube..."
                        />
                      </div>
                      <button
                        type="button"
                        className="ch-btn ch-btn--success px-4 py-2 text-xs font-bold w-full md:w-auto"
                        onClick={() => salvarRessuscitacao(v)}
                      >
                        💾 Salvar no Histórico
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Histórico de Aproveitamento / Ressuscitações */}
        {historico.length > 0 && (
          <div className="tool-bloco space-y-3">
            <h4 className="tool-bloco__titulo text-xs uppercase tracking-wider font-bold text-zinc-400">
              📜 Histórico de ressuscitações aplicadas
            </h4>
            <div className="historico-lista grid gap-3">
              {historico.map((h, i) => (
                <div key={i} className="p-4 bg-zinc-950/20 border border-zinc-900 rounded-xl flex flex-col md:flex-row justify-between gap-4 text-xs">
                  <div>
                    <strong className="text-zinc-300 block mb-1">Título Antigo: {h.titulo_antigo}</strong>
                    <span className="text-emerald-400 font-medium">Novo Título: {h.titulo_novo}</span>
                  </div>
                  <div className="text-right font-mono text-[10px] text-zinc-500">
                    <div className="text-zinc-400 font-bold">{h.resultado}</div>
                    <div>{new Date(h.em).toLocaleDateString("pt-BR")} às {new Date(h.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
