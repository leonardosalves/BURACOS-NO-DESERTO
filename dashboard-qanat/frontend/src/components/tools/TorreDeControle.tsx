import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

interface TorreDeControleProps {
  aoMudarAba: (aba: "canal" | "reviver" | "radar" | "monitor") => void;
  aoVirarVideo?: (opts: { tema: string; sub_nicho: string }) => void;
}

interface Missao {
  tipo: "radar" | "monitor" | "diagnostico" | "reviver";
  titulo: string;
  descricao: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  acaoLabel: string;
  meta: {
    tema?: string;
    sub_nicho?: string;
    video_id?: string;
    title?: string;
  };
}

interface Alerta {
  tipo: "sucesso" | "perigo" | "info" | "alerta";
  titulo: string;
  mensagem: string;
}

interface HealthBreakdownItem {
  tag: string;
  points: number;
}

interface BrainData {
  healthScore: number;
  healthBreakdown: HealthBreakdownItem[];
  alertas: Alerta[];
  missoes: Missao[];
  memoria: {
    sucessos: string[];
    evitar: string[];
  };
  lastSync: string;
}

export default function TorreDeControle({ aoMudarAba, aoVirarVideo }: TorreDeControleProps) {
  const activeChannel = useActiveChannel();
  const { channelId, channelName, loading: channelLoading } = activeChannel;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrainData | null>(null);

  // Estados para gerenciar a edição de memória
  const [novoSucesso, setNovoSucesso] = useState("");
  const [novoEvitar, setNovoEvitar] = useState("");
  const [salvandoMemoria, setSalvandoMemoria] = useState(false);

  const carregarDadosCerebro = async () => {
    if (!channelId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/brain/${channelId}`);
      if (!response.ok) {
        throw new Error("Falha ao recuperar dados do Cérebro do Canal.");
      }
      const resData = await response.json();
      if (resData.ok) {
        setData(resData);
      } else {
        throw new Error(resData.error || "Erro desconhecido.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosCerebro();
  }, [channelId]);

  const handleSalvarMemoria = async (novosSucessos: string[], novosEvitar: string[]) => {
    if (!channelId) return;
    setSalvandoMemoria(true);
    try {
      const response = await fetch(`/api/brain/${channelId}/memoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sucessos: novosSucessos, evitar: novosEvitar })
      });
      if (!response.ok) throw new Error("Erro ao salvar memória.");
      const res = await response.json();
      if (res.ok && data) {
        setData({
          ...data,
          memoria: res.memoria
        });
      }
    } catch (err) {
      alert("Erro ao salvar as lições aprendidas.");
    } finally {
      setSalvandoMemoria(false);
    }
  };

  const adicionarSucesso = () => {
    if (!novoSucesso.trim() || !data) return;
    const novos = [...data.memoria.sucessos, novoSucesso.trim()];
    handleSalvarMemoria(novos, data.memoria.evitar);
    setNovoSucesso("");
  };

  const removerSucesso = (index: number) => {
    if (!data) return;
    const novos = data.memoria.sucessos.filter((_, i) => i !== index);
    handleSalvarMemoria(novos, data.memoria.evitar);
  };

  const adicionarEvitar = () => {
    if (!novoEvitar.trim() || !data) return;
    const novos = [...data.memoria.evitar, novoEvitar.trim()];
    handleSalvarMemoria(data.memoria.sucessos, novos);
    setNovoEvitar("");
  };

  const removerEvitar = (index: number) => {
    if (!data) return;
    const novos = data.memoria.evitar.filter((_, i) => i !== index);
    handleSalvarMemoria(data.memoria.sucessos, novos);
  };

  const executarMissao = (missao: Missao) => {
    switch (missao.tipo) {
      case "radar":
        if (missao.meta.tema && aoVirarVideo) {
          // Virar vídeo no Criador
          aoVirarVideo({
            tema: missao.meta.tema,
            sub_nicho: missao.meta.sub_nicho || ""
          });
        } else {
          aoMudarAba("radar");
        }
        break;
      case "reviver":
        aoMudarAba("reviver");
        break;
      case "monitor":
        aoMudarAba("monitor");
        break;
      case "diagnostico":
        aoMudarAba("canal");
        break;
      default:
        break;
    }
  };

  const getCorHealth = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
    if (score >= 50) return "text-amber-400 border-amber-500/30 bg-amber-500/5";
    return "text-rose-400 border-rose-500/30 bg-rose-500/5";
  };

  const getPrioridadeBadge = (prio: string) => {
    switch (prio) {
      case "critica":
        return "bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded uppercase font-extrabold";
      case "alta":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded uppercase font-extrabold";
      case "media":
        return "bg-sky-500/20 text-sky-400 border border-sky-500/40 text-[10px] px-2 py-0.5 rounded uppercase font-extrabold";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] px-2 py-0.5 rounded uppercase font-extrabold";
    }
  };

  if (channelLoading || (loading && !data)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-xs font-mono">Sintonizando frequências do Cérebro...</p>
      </div>
    );
  }

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">🧠</div>
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-2">Nenhum Canal Selecionado</h3>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Selecione ou crie um canal no switcher superior para ver a Torre de Controle e ativar a inteligência de loop fechado.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded p-6 text-center max-w-lg mx-auto my-10">
        <div className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-2">Erro de Inteligência</div>
        <p className="text-zinc-400 text-xs mb-4">{error}</p>
        <button
          onClick={carregarDadosCerebro}
          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded cursor-pointer transition-all border border-rose-500/30"
        >
          Tentar Reconectar
        </button>
      </div>
    );
  }

  const score = data?.healthScore || 0;
  const breakDown = data?.healthBreakdown || [];
  const alertas = data?.alertas || [];
  const missoes = data?.missoes || [];
  const memoria = data?.memoria || { sucessos: [], evitar: [] };

  return (
    <div className="space-y-6 font-sans text-zinc-300 pb-10">
      
      {/* HEADER DE COMUNICAÇÃO DO LOOP */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/80 border border-zinc-900 rounded p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-widest">
              Torre de Controle: {channelName}
            </h2>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Loop Fechado ativo. Retroalimentação baseada nos últimos uploads e tendências do nicho.
          </p>
        </div>
        <div className="text-right text-[10px] font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800">
          ÚLTIMA SINCRONIZAÇÃO: {new Date(data?.lastSync || "").toLocaleString()}
        </div>
      </div>

      {/* PAINEL CENTRAL DE MÉTRICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: HEALTH SCORE */}
        <div className="lg:col-span-4 bg-zinc-950/80 border border-zinc-900 rounded p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-2xl pointer-events-none"></div>
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-1.5">
              <span>🩺</span> Saúde do Canal (Health Score)
            </h3>
            
            <div className="flex flex-col items-center py-4">
              <div className="relative flex items-center justify-center">
                {/* SVG Progress Arc */}
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="#18181b" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="64" 
                    stroke={score >= 80 ? "#10b981" : score >= 50 ? "#f5a623" : "#f43f5e"} 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={402}
                    strokeDashoffset={402 - (402 * score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-4xl font-extrabold font-mono leading-none ${score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {score}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">Pontos</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-6 pt-4 border-t border-zinc-900">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fatores de Impacto:</h4>
            {breakDown.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {breakDown.map((item, idx) => (
                  <span 
                    key={idx}
                    className={`text-[10px] px-2 py-0.5 font-semibold rounded border ${
                      item.points > 0 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-400"
                    }`}
                  >
                    {item.tag} ({item.points > 0 ? `+${item.points}` : item.points})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600 italic">Nenhum fator de impacto listado ainda.</p>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: ALERTAS E MISSÕES */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ALERTAS DO ALGORITMO */}
          {alertas.length > 0 && (
            <div className="space-y-3">
              {alertas.map((alerta, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded border flex items-start gap-3 relative overflow-hidden ${
                    alerta.tipo === "perigo" 
                      ? "bg-rose-950/20 border-rose-900/60 text-rose-200" 
                      : alerta.tipo === "sucesso"
                      ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-200"
                      : "bg-amber-950/20 border-amber-900/60 text-amber-200"
                  }`}
                >
                  <span className="text-base mt-0.5">
                    {alerta.tipo === "perigo" ? "⚠️" : alerta.tipo === "sucesso" ? "🔥" : "💡"}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">{alerta.titulo}</h4>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{alerta.mensagem}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRID DE MISSÕES PRIORIZADAS */}
          <div className="bg-zinc-950/80 border border-zinc-900 rounded p-6">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>🎯</span> Missões do Loop Fechado
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missoes.map((missao, idx) => (
                <div 
                  key={idx}
                  className="bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 rounded p-4 flex flex-col justify-between space-y-4 transition-all duration-300 relative group"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {missao.titulo}
                      </h4>
                      {getPrioridadeBadge(missao.prioridade)}
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed mt-2">
                      {missao.descricao}
                    </p>
                  </div>

                  <button
                    onClick={() => executarMissao(missao)}
                    className="w-full text-center py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold uppercase rounded tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-lg shadow-amber-500/5 hover:shadow-amber-500/10"
                  >
                    {missao.acaoLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* MEMÓRIA DE APRENDIZADO DO CANAL */}
      <div className="bg-zinc-950/80 border border-zinc-900 rounded p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠</span> Memória de Aprendizado do Canal
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              Lições aprendidas de performance. Os prompts do Criador consomem estes dados para roteirização.
            </p>
          </div>
          {salvandoMemoria && (
            <span className="text-[10px] font-mono text-amber-500 animate-pulse uppercase">Salvando...</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LIÇÕES DE SUCESSO (O que fazer) */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-emerald-500/10 pb-2">
              <span>✅</span> Padrões de Sucesso (Fazer)
            </h4>
            
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {memoria.sucessos.map((item, idx) => (
                <li key={idx} className="flex justify-between items-start gap-2 bg-zinc-900/30 p-2.5 rounded border border-zinc-900 text-xs leading-relaxed group">
                  <span className="text-zinc-300">{item}</span>
                  <button 
                    onClick={() => removerSucesso(idx)}
                    className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                    title="Excluir aprendizado"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input 
                type="text"
                value={novoSucesso}
                onChange={(e) => setNovoSucesso(e.target.value)}
                placeholder="Ex: Títulos com perguntas abertas aumentam CTR..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
                onKeyDown={(e) => e.key === "Enter" && adicionarSucesso()}
              />
              <button 
                onClick={adicionarSucesso}
                className="px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 text-xs font-bold rounded cursor-pointer transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* LIÇÕES DE FRACASSO (O que evitar) */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-500/10 pb-2">
              <span>❌</span> Padrões de Fracasso (Evitar)
            </h4>
            
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {memoria.evitar.map((item, idx) => (
                <li key={idx} className="flex justify-between items-start gap-2 bg-zinc-900/30 p-2.5 rounded border border-zinc-900 text-xs leading-relaxed group">
                  <span className="text-zinc-300">{item}</span>
                  <button 
                    onClick={() => removerEvitar(idx)}
                    className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                    title="Excluir aprendizado"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input 
                type="text"
                value={novoEvitar}
                onChange={(e) => setNovoEvitar(e.target.value)}
                placeholder="Ex: Vídeos acima de 15 minutos perdem retenção..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded focus:outline-none focus:border-rose-500/50 transition-colors placeholder:text-zinc-600"
                onKeyDown={(e) => e.key === "Enter" && adicionarEvitar()}
              />
              <button 
                onClick={adicionarEvitar}
                className="px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 text-xs font-bold rounded cursor-pointer transition-all"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
