import React, { useState } from "react";
import { useChannels, Channel } from "../../context/ChannelContext";

interface ChannelCardProps {
  channel: Channel;
  active: boolean;
  onEdit: () => void;
}

export default function ChannelCard({
  channel,
  active,
  onEdit,
}: ChannelCardProps) {
  const { switchChannel, deleteChannel } = useChannels();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const color = channel.cor || "#f5a623";

  const handleActivate = async () => {
    if (active) return;
    setBusy(true);
    try {
      await switchChannel(channel.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteChannel(channel.id);
    } catch (e: any) {
      alert(e.message);
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className={`ch-card ${active ? "ch-card--active" : ""}`}
      style={{ "--card-accent": color } as React.CSSProperties}
    >
      <div className="ch-card__top">
        <div className="ch-avatar" style={{ background: color }}>
          {channel.nome.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ch-card__name">{channel.nome}</div>
          <div className="ch-card__id">{channel.id}</div>
        </div>
        {active ? (
          <span className="ch-status ch-status--active">
            <span className="dot" />
            ATIVO
          </span>
        ) : (
          <span className="ch-status ch-status--draft">
            {channel.status || "rascunho"}
          </span>
        )}
      </div>

      <div className="ch-card__meta">
        {channel.nicho && <span className="ch-tag">{channel.nicho}</span>}
        {channel.youtube_channel_id && (
          <span className="ch-tag">
            YT: {channel.youtube_channel_id.slice(0, 10)}…
          </span>
        )}
      </div>

      <div className="ch-card__actions">
        <button
          className="ch-btn ch-btn--primary"
          onClick={handleActivate}
          disabled={active || busy}
        >
          {active ? "✓ Ativo" : "Ativar"}
        </button>
        <button className="ch-btn" onClick={onEdit} disabled={busy}>
          Editar
        </button>
        <button
          className="ch-btn ch-btn--danger"
          onClick={handleDelete}
          disabled={busy}
        >
          {confirmDelete ? "Confirmar?" : "🗑"}
        </button>
      </div>
    </div>
  );
}
