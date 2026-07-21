import React from "react";
import { useActiveChannel } from "../../hooks/useActiveChannel";

export default function ChannelBadge() {
  const ch = useActiveChannel();

  if (ch.loading) return null;
  if (!ch.channelId) {
    return (
      <div
        className="ch-badge"
        style={{
          borderColor: "var(--danger)",
          borderLeftColor: "var(--danger)",
          background: "var(--danger-soft)",
        }}
      >
        <div className="ch-badge__text">
          <strong>Nenhum canal ativo.</strong> Selecione um canal no topo para
          gerar vídeos.
        </div>
      </div>
    );
  }

  return (
    <div className="ch-badge font-sans">
      <div className="ch-badge__avatar" style={{ background: ch.channelColor }}>
        {ch.channelName.charAt(0).toUpperCase()}
      </div>
      <div className="ch-badge__text">
        Gerando para <strong>{ch.channelName}</strong> ·{" "}
        <span className="mono">{ch.niche || "sem nicho"}</span>
        {ch.titleMaxChars && (
          <>
            {" "}
            · título ≤ <span className="mono">{ch.titleMaxChars}</span> chars
          </>
        )}
      </div>
    </div>
  );
}
