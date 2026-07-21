import React, { useState } from "react";
import { useChannels } from "../../context/ChannelContext";
import ChannelManager from "./ChannelManager";

export default function ChannelSwitcher() {
  const { channels, activeId, activeConfig, loading } = useChannels();
  const [managerOpen, setManagerOpen] = useState(false);
  const [openOnCreate, setOpenOnCreate] = useState(false);

  const active = channels.find((c) => c.id === activeId);
  const color =
    activeConfig?.brand?.paleta_cores?.primaria || active?.cor || "#f5a623";
  const initial = (active?.nome || "?").charAt(0).toUpperCase();

  const openManager = (create = false) => {
    setOpenOnCreate(create);
    setManagerOpen(true);
  };

  if (loading) return null;

  return (
    <>
      <div
        className="ch-switcher"
        onClick={() => openManager(false)}
        title="Gerenciar canais"
        role="button"
      >
        <div
          className="ch-switcher__avatar"
          style={{
            background: color,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {active?.avatar_url ? (
            <img
              src={active.avatar_url}
              alt={active.nome}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initial
          )}
        </div>
        <div className="ch-switcher__info">
          <div className="ch-switcher__name">
            {active?.nome || "Selecione um canal"}
          </div>
          <div className="ch-switcher__niche">
            {activeConfig?.nicho?.principal || "—"}
          </div>
        </div>
        <button
          className="ch-switcher__add"
          title="Adicionar novo canal"
          onClick={(e) => {
            e.stopPropagation();
            openManager(true);
          }}
        >
          +
        </button>
      </div>

      {managerOpen && (
        <ChannelManager
          startOnCreate={openOnCreate}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </>
  );
}
