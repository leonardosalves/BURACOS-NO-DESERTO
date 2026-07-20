import React, { useState, useEffect } from "react";
import { useChannels, Channel } from "../../context/ChannelContext";

interface ChannelCardProps {
  channel: Channel;
  active: boolean;
  onEdit: () => void;
}

interface CredsStatus {
  has_api_key: boolean;
  oauth_connected: boolean;
  oauth_email: string | null;
  oauth_connected_at: string | null;
}

export default function ChannelCard({
  channel,
  active,
  onEdit,
}: ChannelCardProps) {
  const { switchChannel, deleteChannel } = useChannels();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<CredsStatus | null>(null);
  const [conectando, setConectando] = useState(false);

  const color = channel.cor || "#f5a623";

  const carregarStatus = async () => {
    try {
      const res = await fetch(`/api/youtube/status/${channel.id}`);
      const data = await res.json();
      if (data.ok) {
        setStatus(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    carregarStatus();
  }, [channel.id]);

  const conectar = async () => {
    setConectando(true);
    try {
      const res = await fetch(`/api/youtube/oauth/url/${channel.id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // popup centralizado
      const width = 520;
      const height = 640;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        "yt-oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error(
          "Popup bloqueado pelo navegador. Por favor, libere popups."
        );
      }

      // Polling para checar quando o popup fecha
      const timer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(timer);
          setConectando(false);
          await carregarStatus();
        }
      }, 800);
    } catch (err: any) {
      alert(err.message);
      setConectando(false);
    }
  };

  const desconectar = async () => {
    if (
      !window.confirm(
        `Deseja realmente desconectar o YouTube do canal "${channel.nome}"?`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/youtube/disconnect/${channel.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        await carregarStatus();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

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

      {/* 🔗 Status da conexão YouTube */}
      <div className="ch-conn">
        {status?.oauth_connected ? (
          <div className="flex flex-col w-full space-y-1.5 font-sans">
            <div className="flex justify-between items-center">
              <span className="ch-conn__ok font-bold">● YouTube Conectado</span>
              <button
                className="text-[10px] text-zinc-500 hover:text-rose-400 font-bold uppercase transition-colors"
                onClick={desconectar}
                disabled={busy}
              >
                Desconectar
              </button>
            </div>
            {status.oauth_email && (
              <span className="ch-conn__email mono block break-all text-zinc-400">
                Conta: {status.oauth_email}
              </span>
            )}
          </div>
        ) : (
          <div className="flex justify-between items-center w-full">
            <span className="ch-conn__off text-zinc-500 text-xs">
              ○ YouTube Desconectado
            </span>
            <button
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-extrabold uppercase rounded tracking-wider transition-all disabled:opacity-50"
              onClick={conectar}
              disabled={conectando || busy}
            >
              {conectando ? "Aguardando..." : "Conectar"}
            </button>
          </div>
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
