import React, { useState } from "react";
import { useChannels, Channel } from "../../context/ChannelContext";
import ChannelCard from "./ChannelCard";
import ChannelForm from "./ChannelForm";

interface ChannelManagerProps {
  startOnCreate?: boolean;
  onClose: () => void;
}

export default function ChannelManager({
  startOnCreate = false,
  onClose,
}: ChannelManagerProps) {
  const { channels, activeId } = useChannels();
  const [view, setView] = useState<"list" | "form">(
    startOnCreate ? "form" : "list"
  );
  const [editing, setEditing] = useState<Channel | null>(null);

  const openCreate = () => {
    setEditing(null);
    setView("form");
  };
  const openEdit = (channel: Channel) => {
    setEditing(channel);
    setView("form");
  };
  const backToList = () => {
    setEditing(null);
    setView("list");
  };

  const activeChannel = channels.find((c) => c.id === activeId);

  return (
    <div className="ch-overlay" onClick={onClose}>
      <div className="ch-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ch-head">
          <div>
            <h2>
              {view === "form" ? (
                editing ? (
                  <>
                    Editar <span>Canal</span>
                  </>
                ) : (
                  <>
                    Novo <span>Canal</span>
                  </>
                )
              ) : (
                <>
                  Meus <span>Canais</span>
                </>
              )}
            </h2>
            <div className="ch-sub">
              {view === "form"
                ? editing
                  ? `Editando ${editing.nome}`
                  : "Crie um canal com nicho, regras e identidade próprios"
                : `${channels.length} canal(is) · ativo: ${activeChannel?.nome || "—"}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "form" && (
              <button className="btn btn--ghost" onClick={backToList}>
                ← Voltar
              </button>
            )}
            <button className="btn btn--ghost" onClick={onClose}>
              ✕ Fechar
            </button>
          </div>
        </div>

        {view === "list" ? (
          <div className="ch-grid">
            {channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                active={ch.id === activeId}
                onEdit={() => openEdit(ch)}
              />
            ))}
            <div
              className="ch-card ch-card--new"
              onClick={openCreate}
              role="button"
            >
              <div className="plus">+</div>
              <strong>Novo Canal</strong>
              <span style={{ fontSize: 12 }}>nicho e identidade próprios</span>
            </div>
          </div>
        ) : (
          <ChannelForm channel={editing} onDone={backToList} />
        )}
      </div>
    </div>
  );
}
