import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

interface Channel {
  id: string;
  nome: string;
  youtube_channel_id: string | null;
  status: string;
  criado_em: string;
  ativo: boolean;
  has_config: boolean;
}

export default function ChannelSwitcher() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/channels`);
      if (!res.ok) throw new Error("Erro ao carregar canais do backend");
      const data = await res.json();
      setChannels(data.channels || []);
      setActiveId(data.active_channel);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSwitch = async (channelId: string) => {
    if (!channelId || channelId === activeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/channels/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao trocar canal");
      setActiveId(channelId);
      toast.success(
        `Canal ativo: ${channels.find((c) => c.id === channelId)?.nome || channelId}`
      );

      // Notificar o resto da UI
      window.dispatchEvent(
        new CustomEvent("lumiera-channel-changed", { detail: { channelId } })
      );
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (channels.length === 0 && !error) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">
      <span className="text-zinc-500 font-bold select-none text-[11px] uppercase tracking-wider">
        Perfil Canal:
      </span>
      <select
        value={activeId || ""}
        onChange={(e) => handleSwitch(e.target.value)}
        disabled={loading}
        className="bg-transparent border-0 outline-none text-zinc-100 font-sans cursor-pointer py-0.5 pr-6 pl-1 font-semibold hover:text-white transition-colors"
        style={{
          WebkitAppearance: "menulist-button",
        }}
      >
        {channels.map((ch) => (
          <option
            key={ch.id}
            value={ch.id}
            className="bg-zinc-950 text-zinc-100 font-sans font-semibold py-1.5"
          >
            {ch.nome} {ch.id === activeId ? " (Ativo)" : ""}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-red-400 text-[10px] animate-pulse">{error}</span>
      )}
    </div>
  );
}
