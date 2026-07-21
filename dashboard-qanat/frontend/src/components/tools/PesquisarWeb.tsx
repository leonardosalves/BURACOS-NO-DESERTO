import React, { useState } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

interface Angulo {
  angulo: string;
  fonte: string;
  sugestao_titulo: string;
  por_que_funciona: string;
}

interface ResultadoBusca {
  titulo: string;
  url: string;
  snippet: string;
  dominio: string;
  score_autoridade: number;
  score_relevancia: number;
}

interface RespostaPesquisa {
  ok: boolean;
  canal: string;
  nicho: string;
  query: {
    query_original: string;
    query_enriquecida: string;
    keywords_usadas: string[];
    nicho: string;
  };
  resultados: ResultadoBusca[];
  angulos: Angulo[];
  total: number;
}

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

export default function PesquisarWeb() {
  const canal = useActiveChannel();
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState<RespostaPesquisa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pesquisar = async () => {
    if (!canal.channelId) {
      setErro("Selecione um canal primeiro.");
      return;
    }
    if (!query.trim()) return;
    setBuscando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch(`${API}/api/search/${canal.channelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.bloqueado) {
        setErro(data.motivo);
      } else {
        setResultado(data);
      }
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <section className="tool-shell">
      <header className="tool-head" style={{ "--tool-cor": "#3498db" } as React.CSSProperties}>
        <div className="tool-head__icone">🔍</div>
        <div style={{ flex: 1 }}>
          <h3 className="tool-head__titulo">Pesquisar Web</h3>
          <div className="tool-head__sub">
            Pesquisa filtrada pelo nicho ·{" "}
            <strong style={{ color: canal.channelColor }}>{canal.channelName}</strong>
            {canal.niche && <span className="mono"> · {canal.niche}</span>}
          </div>
        </div>
      </header>

      <div className="tool-body p-5">
        {!canal.channelId ? (
          <div className="tool-vazio font-sans p-8 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
            <span className="text-2xl block mb-2">🔍</span>
            <strong className="text-zinc-300 font-bold block mb-1">Selecione um canal</strong>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Selecione um canal para pesquisar dentro do nicho dele.
            </p>
          </div>
        ) : (
          <>
            <div className="search-bar">
              <input className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pesquisar()}
                placeholder={`Pesquisar temas de ${canal.niche || "nicho"}…`}
                disabled={!canal.channelId}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={pesquisar}
                disabled={buscando || !canal.channelId}
              >
                {buscando ? "Pesquisando…" : "🔍 Pesquisar"}
              </button>
            </div>

            {/* Palavras-chave do canal (contexto) */}
            {canal.seoKeywords && canal.seoKeywords.length > 0 && (
              <div className="search-keywords mono">
                Filtro ativo:{" "}
                {canal.seoKeywords.slice(0, 5).map((k) => (
                  <span key={k} className="badge">
                    {k}
                  </span>
                ))}
              </div>
            )}

            {erro && <div className="ch-error">⚠ {erro}</div>}

            {resultado && (
              <>
                {/* Query enriquecida */}
                <div className="search-queryinfo">
                  <span className="mono">Query original:</span>{" "}
                  {resultado.query.query_original}
                  <br />
                  <span className="mono">Query enriquecida:</span>{" "}
                  {resultado.query.query_enriquecida}
                  {resultado.query.keywords_usadas.length > 0 && (
                    <span className="mono">
                      {" "}
                      (+ {resultado.query.keywords_usadas.join(", ")})
                    </span>
                  )}
                </div>

                {/* Ângulos de vídeo sugeridos */}
                {resultado.angulos && resultado.angulos.length > 0 && (
                  <div className="tool-bloco" style={{ marginBottom: 24 }}>
                    <h4 className="tool-bloco__titulo">🎬 Ângulos de vídeo sugeridos</h4>
                    <div className="search-angulos">
                      {resultado.angulos.map((a, i) => (
                        <div key={i} className="search-angulo">
                          <strong>{a.angulo}</strong>
                          <div className="mono">
                            {a.fonte} · {a.por_que_funciona}
                          </div>
                          <div className="search-angulo__titulo">
                            💡 {a.sugestao_titulo}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultados ranqueados */}
                <div className="tool-bloco">
                  <h4 className="tool-bloco__titulo">
                    📚 Resultados ({resultado.total}) — ordenados por autoridade + relevância
                  </h4>
                  <div className="search-resultados">
                    {resultado.resultados.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="search-resultado"
                      >
                        <div className="search-resultado__scores">
                          <span
                            className="score-badge"
                            style={{
                              color: r.score_autoridade >= 80 ? "var(--success)" : "var(--warning)",
                            }}
                          >
                            aut {r.score_autoridade}
                          </span>
                          <span className="score-badge" style={{ color: "var(--info)" }}>
                            rel {r.score_relevancia}
                          </span>
                        </div>
                        <div className="search-resultado__corpo">
                          <div className="search-resultado__titulo">{r.titulo}</div>
                          <div className="search-resultado__snippet">{r.snippet}</div>
                          <div className="search-resultado__url mono">{r.dominio}</div>
                        </div>
                      </a>
                    ))}
                    {resultado.resultados.length === 0 && (
                      <div className="tool-vazio text-zinc-500 font-sans p-6 text-center border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
                        Nenhum resultado encontrado.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
