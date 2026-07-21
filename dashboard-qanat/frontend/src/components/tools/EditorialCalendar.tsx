import React, { useState, useEffect } from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

interface Slot {
  dia: string;
  data: string;
  horario: string;
  tema: string;
  sub_nicho: string | null;
  origem: "radar" | "monitor";
  fit?: number;
  justificativa: string;
  prioridade: "alta" | "normal";
  status: string;
}

interface CalendarioData {
  canal: string;
  dias_publicacao: string[];
  horario_padrao: string;
  sub_nicho_preferido: string | null;
  slots: Slot[];
}

interface EditorialCalendarProps {
  aoAgendar?: (args: { tema: string; sub_nicho?: string | null }) => void;
}

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";
const ORIGEM = {
  radar: { icone: "🎯", cor: "var(--info)" },
  monitor: { icone: "📊", cor: "var(--success)" },
};

export default function EditorialCalendar({ aoAgendar }: EditorialCalendarProps) {
  const canal = useActiveChannel();
  const [cal, setCal] = useState<CalendarioData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semanas, setSemanas] = useState(1);

  const carregar = () => {
    if (!canal.channelId) return;
    setCarregando(true);
    fetch(`${API}/api/calendar/${canal.channelId}?semanas=${semanas}`)
      .then((r) => r.json())
      .then((d) => setCal(d))
      .catch((e) => console.error("Erro ao carregar calendário:", e))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, [canal.channelId, semanas]);

  const confirmar = async (slot: Slot) => {
    try {
      const res = await fetch(`${API}/api/calendar/${canal.channelId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      if (res.ok) {
        alert(`Slot "${slot.tema}" enviado para a fila editorial!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="tool-shell">
      <header className="tool-head" style={{ "--tool-cor": "#1abc9c" } as React.CSSProperties}>
        <div className="tool-head__icone">📅</div>
        <div style={{ flex: 1 }}>
          <h3 className="tool-head__titulo">Calendário Editorial</h3>
          <div className="tool-head__sub">
            Semana ideal cruzando Radar + Monitor + Memória ·{" "}
            <strong style={{ color: canal.channelColor }}>{canal.channelName}</strong>
          </div>
        </div>
        <select className="select"
          value={semanas}
          onChange={(e) => setSemanas(Number(e.target.value))}
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          <option value={1}>1 semana</option>
          <option value={2}>2 semanas</option>
          <option value={4}>4 semanas</option>
        </select>
      </header>

      <div className="tool-body">
        {carregando ? (
          <div className="tool-loading font-mono text-zinc-400">Montando semana ideal…</div>
        ) : (
          cal && (
            <>
              <div className="cal-resumo mono">
                Publicações: {cal.dias_publicacao.join(" · ")} às {cal.horario_padrao}
                {cal.sub_nicho_preferido && (
                  <>
                    {" "}
                    · sub-nicho foco: <strong>{cal.sub_nicho_preferido}</strong>
                  </>
                )}
              </div>

              <div className="cal-grid">
                {cal.slots.map((slot, i) => {
                  const o = ORIGEM[slot.origem] || ORIGEM.monitor;
                  return (
                    <div
                      key={i}
                      className={`cal-card ${
                        slot.prioridade === "alta" ? "cal-card--urgente" : ""
                      }`}
                    >
                      <div className="cal-card__topo">
                        <span className="cal-card__dia">
                          {slot.dia.slice(0, 3).toUpperCase()}
                        </span>
                        <span className="cal-card__data mono">
                          {new Date(slot.data + "T00:00").toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                        <span className="cal-card__hora mono">{slot.horario}</span>
                      </div>
                      <div className="cal-card__origem" style={{ color: o.cor }}>
                        {o.icone} {slot.origem}
                        {slot.fit ? ` · fit ${slot.fit}` : ""}
                      </div>
                      <div className="cal-card__tema">{slot.tema}</div>
                      <div className="cal-card__just">{slot.justificativa}</div>
                      <div className="cal-card__acoes">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => confirmar(slot)}
                        >
                          ✓ Agendar
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() =>
                            aoAgendar?.({ tema: slot.tema, sub_nicho: slot.sub_nicho })
                          }
                        >
                          🎬 Criar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}
