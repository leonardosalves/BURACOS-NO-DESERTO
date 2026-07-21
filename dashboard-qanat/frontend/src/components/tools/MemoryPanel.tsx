import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

interface Licao {
  chave: string;
  tipo: "gancho" | "nicho" | "duracao" | "titulo" | "thumbnail" | "roteiro";
  insight: string;
  acao: string;
  confianca: number;
  evidencias: number;
  ativo: boolean;
}

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";
const TIPO_ICONE: Record<string, string> = {
  gancho: "🪝",
  nicho: "🎯",
  duracao: "⏱️",
  titulo: "📝",
  thumbnail: "🖼️",
  roteiro: "📜",
};

export default function MemoryPanel() {
  const canal = useActiveChannel();
  const [licoes, setLicoes] = useState<Licao[]>([]);
  const [promptPreview, setPromptPreview] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    if (!canal.channelId) return;
    setCarregando(true);
    Promise.all([
      fetch(`${API}/api/memory/${canal.channelId}`).then((r) => r.json()),
      fetch(`${API}/api/memory/${canal.channelId}/prompt`).then((r) => r.json()),
    ])
      .then(([l, p]) => {
        setLicoes(l.licoes || []);
        setPromptPreview(p.prompt || "");
      })
      .catch((e) => console.error("Erro ao carregar memória:", e))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [canal.channelId]);

  const toggleAtivo = async (chave: string, ativo: boolean) => {
    try {
      await fetch(
        `${API}/api/memory/${canal.channelId}/${encodeURIComponent(chave)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ativo: !ativo }),
        }
      );
      carregar();
    } catch (e) {
      console.error(e);
    }
  };

  const remover = async (chave: string) => {
    if (!window.confirm("Deseja realmente excluir esta lição da memória?")) return;
    try {
      await fetch(
        `${API}/api/memory/${canal.channelId}/${encodeURIComponent(chave)}`,
        { method: "DELETE" }
      );
      carregar();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="tool-shell">
      <header className="tool-head" style={{ "--tool-cor": "#9b59b6" } as React.CSSProperties}>
        <div className="tool-head__icone">🧠</div>
        <div style={{ flex: 1 }}>
          <h3 className="tool-head__titulo">Memória do Canal</h3>
          <div className="tool-head__sub">
            Lições aprendidas injetadas automaticamente no roteiro ·{" "}
            <strong style={{ color: canal.channelColor }}>{canal.channelName}</strong>
          </div>
        </div>
      </header>

      <div className="tool-body">
        {carregando ? (
          <div className="tool-loading font-mono text-zinc-400">Carregando memória…</div>
        ) : (
          <>
            {licoes.length === 0 && (
              <div className="tool-vazio text-zinc-500 font-sans p-6 text-center border border-dashed border-zinc-900 rounded-xl">
                Nenhuma lição ainda. Publique ≥ 3 vídeos — o Monitor extrai padrões e os transforma em memória automaticamente.
              </div>
            )}

            <div className="mem-lista">
              {licoes.map((l) => (
                <div
                  key={l.chave}
                  className={`mem-card ${l.ativo ? "" : "mem-card--off"}`}
                >
                  <span className="mem-card__icone">{TIPO_ICONE[l.tipo] || "💡"}</span>
                  <div className="mem-card__corpo">
                    <div className="mem-card__insight">{l.insight}</div>
                    <div className="mem-card__acao">→ {l.acao}</div>
                    <div className="mem-card__meta mono">
                      confiança {Math.round((l.confianca || 0) * 100)}% · {l.evidencias} evidências · {l.tipo}
                    </div>
                  </div>
                  <div className="mem-card__acoes">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => toggleAtivo(l.chave, l.ativo)}
                    >
                      {l.ativo ? "✓ Ativa" : "○ Inativa"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => remover(l.chave)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {promptPreview && (
              <details className="mem-preview">
                <summary className="select-none font-bold">👁 Ver como o agente recebe estas lições (prompt)</summary>
                <pre>{promptPreview}</pre>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}
