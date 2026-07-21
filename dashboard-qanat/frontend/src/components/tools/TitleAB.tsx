import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

interface Variante {
  id: string;
  titulo: string;
  template: string;
  chars: number;
  dentro_limite: boolean;
}

interface RankItem {
  template: string;
  usos: number;
  ctr_soma: number;
  ctr_medio: number;
  vitorias: number;
}

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

export default function TitleAB() {
  const canal = useActiveChannel();
  const [dados, setDados] = useState({
    objeto: "",
    numero: "",
    sujeito: "",
    acao: "",
    metodo: "",
  });
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [gerando, setGerando] = useState(false);

  const carregarRanking = () => {
    if (!canal.channelId) return;
    fetch(`${API}/api/ab/results/${canal.channelId}`)
      .then((r) => r.json())
      .then((d) => setRanking(d.ranking_templates || []))
      .catch((e) => console.error("Erro ao carregar ranking A/B:", e));
  };

  useEffect(() => {
    carregarRanking();
  }, [canal.channelId]);

  const gerar = async () => {
    setGerando(true);
    try {
      const res = await fetch(`${API}/api/ab/generate/${canal.channelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados, qtd: 3 }),
      });
      const d = await res.json();
      setVariantes(d.variantes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGerando(false);
    }
  };

  const promover = async (template: string) => {
    try {
      const res = await fetch(`${API}/api/ab/promote/${canal.channelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        alert("Template promovido para o topo dos templates vencedores do canal!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDados((d) => ({ ...d, [k]: e.target.value }));
  };

  return (
    <section className="tool-shell">
      <header className="tool-head" style={{ "--tool-cor": "#e67e22" } as React.CSSProperties}>
        <div className="tool-head__icone">🔀</div>
        <div style={{ flex: 1 }}>
          <h3 className="tool-head__titulo">A/B de Títulos</h3>
          <div className="tool-head__sub">
            Gere variantes com os templates do canal e promova os vencedores ·{" "}
            <strong style={{ color: canal.channelColor }}>{canal.channelName}</strong>
          </div>
        </div>
      </header>

      <div className="tool-body">
        {/* Gerador de variantes */}
        <div className="ab-gerador">
          <div className="ab-campos">
            <input className="input"
              placeholder="objeto (ex: arranha-céu)"
              value={dados.objeto}
              onChange={set("objeto")}
            />
            <input className="input"
              placeholder="número (ex: 73)"
              value={dados.numero}
              onChange={set("numero")}
            />
            <input className="input"
              placeholder="sujeito (ex: os romanos)"
              value={dados.sujeito}
              onChange={set("sujeito")}
            />
            <input className="input"
              placeholder="ação (ex: erguia templos)"
              value={dados.acao}
              onChange={set("acao")}
            />
            <input className="input"
              placeholder="método (ex: rodas de hamster)"
              value={dados.metodo}
              onChange={set("metodo")}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary align-self-start"
            onClick={gerar}
            disabled={gerando}
          >
            {gerando ? "Gerando…" : "⚡ Gerar 3 variantes"}
          </button>
        </div>

        {variantes.length > 0 && (
          <div className="ab-variantes">
            {variantes.map((v) => (
              <div
                key={v.id}
                className={`ab-variante ${v.dentro_limite ? "" : "ab-variante--longa"}`}
              >
                <span className="ab-variante__id">{v.id}</span>
                <div className="ab-variante__corpo">
                  <div className="ab-variante__titulo">{v.titulo}</div>
                  <div className="ab-variante__meta mono">
                    {v.chars} chars {v.dentro_limite ? "✓" : "⚠ acima do limite"} · template: {v.template}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigator.clipboard?.writeText(v.titulo)}
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ranking de templates */}
        <div className="tool-bloco" style={{ marginTop: 24 }}>
          <h4 className="tool-bloco__titulo">🏆 Ranking de templates (por CTR médio)</h4>
          {ranking.length === 0 && (
            <div className="tool-vazio text-zinc-500 font-sans p-6 text-center border border-dashed border-zinc-900 rounded-xl">
              Registre resultados de CTR para montar o ranking.
            </div>
          )}
          <div className="ab-ranking">
            {ranking.map((r, i) => (
              <div key={i} className="ab-rank-item">
                <span className="ab-rank-item__pos">#{i + 1}</span>
                <div className="ab-rank-item__corpo">
                  <div className="ab-rank-item__tpl">{r.template}</div>
                  <div className="ab-rank-item__meta mono">
                    CTR médio {r.ctr_medio}% · {r.usos} usos · {r.vitorias} vitórias
                  </div>
                </div>
                <div
                  className="ab-rank-item__ctr"
                  style={{
                    color: r.ctr_medio >= 6 ? "var(--success)" : "var(--warning)",
                  }}
                >
                  {r.ctr_medio}%
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => promover(r.template)}
                >
                  ↑ Promover
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
