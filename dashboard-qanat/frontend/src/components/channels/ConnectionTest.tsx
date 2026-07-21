import React, { useState } from "react";

interface ConnectionTestProps {
  channelId: string;
}

interface TestResult {
  canal: string;
  youtube_channel_id: string | null;
  api_key: { ok: boolean; detalhe: string | null };
  oauth: { ok: boolean; detalhe: string | null };
  veredito: "completo" | "parcial" | "sem_dados" | "incompleto";
}

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

const VEREDITO = {
  completo: {
    cor: "var(--success)",
    icone: "✅",
    texto: "Tudo funcionando — dados públicos + analytics reais",
  },
  parcial: {
    cor: "var(--warning)",
    icone: "⚠️",
    texto: "Parcial — faltam analytics (conecte via OAuth)",
  },
  sem_dados: {
    cor: "var(--danger)",
    icone: "❌",
    texto: "Sem dados — configure as credenciais",
  },
  incompleto: {
    cor: "var(--text-3)",
    icone: "○",
    texto: "Configure as credenciais do canal",
  },
};

export default function ConnectionTest({ channelId }: ConnectionTestProps) {
  const [resultado, setResultado] = useState<TestResult | null>(null);
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const testar = async () => {
    setTestando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch(`${API}/api/youtube/test/${channelId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no teste");
      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setTestando(false);
    }
  };

  const v = resultado ? VEREDITO[resultado.veredito] : VEREDITO.incompleto;

  return (
    <div className="conn-test">
      <div className="conn-test__head">
        <h5>🩺 Diagnóstico de conexão</h5>
        <button
          type="button"
          className="btn btn--primary"
          onClick={testar}
          disabled={testando}
        >
          {testando
            ? "Testando…"
            : resultado
              ? "↻ Testar novamente"
              : "Testar conexão"}
        </button>
      </div>

      {erro && <div className="ch-error">⚠ {erro}</div>}

      {resultado && (
        <div
          className="conn-test__body"
          style={{ "--vc": v.cor } as React.CSSProperties}
        >
          <div className="conn-veredito">
            <span className="conn-veredito__icone">{v.icone}</span>
            <span>{v.texto}</span>
          </div>

          <div className="conn-linha">
            <span className={`conn-dot ${resultado.api_key.ok ? "on" : "off"}`}>
              ●
            </span>
            <div className="conn-linha__info">
              <strong>API Key</strong>{" "}
              <span className="mono">(dados públicos)</span>
              <div className="conn-linha__detalhe">
                {resultado.api_key.detalhe || "—"}
              </div>
            </div>
          </div>

          <div className="conn-linha">
            <span className={`conn-dot ${resultado.oauth.ok ? "on" : "off"}`}>
              ●
            </span>
            <div className="conn-linha__info">
              <strong>OAuth</strong>{" "}
              <span className="mono">(CTR · retenção · watch time)</span>
              <div className="conn-linha__detalhe">
                {resultado.oauth.detalhe || "—"}
              </div>
            </div>
          </div>

          {resultado.youtube_channel_id && (
            <div className="conn-id mono">
              Channel ID: {resultado.youtube_channel_id}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
