import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:3005";

export interface Channel {
  id: string;
  nome: string;
  youtube_channel_id: string | null;
  status: string;
  criado_em: string;
  cor?: string;
  nicho?: string;
  sub_nichos_permitidos?: string[];
  temas_proibidos?: string[];
  descricao?: string;
  ativo: boolean;
  has_config: boolean;
}

interface ChannelContextType {
  channels: Channel[];
  activeId: string | null;
  activeConfig: any;
  loading: boolean;
  error: string | null;
  switchChannel: (channelId: string) => Promise<void>;
  createChannel: (payload: any) => Promise<any>;
  updateChannel: (channelId: string, config: any) => Promise<any>;
  deleteChannel: (channelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType | null>(null);

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/channels`);
      if (!res.ok) throw new Error("Erro ao carregar lista de canais.");
      const data = await res.json();
      setChannels(data.channels || []);
      setActiveId(data.active_channel);

      if (data.active_channel) {
        const cfgRes = await fetch(
          `${API_BASE}/api/channels/${data.active_channel}/pipeline`
        );
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          setActiveConfig(cfgData.pipeline);
        } else {
          setActiveConfig(null);
        }
      } else {
        setActiveConfig(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const switchChannel = useCallback(
    async (channelId: string) => {
      const res = await fetch(`${API_BASE}/api/channels/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao trocar canal");
      }
      await fetchChannels();
    },
    [fetchChannels]
  );

  const createChannel = useCallback(
    async (payload: any) => {
      const res = await fetch(`${API_BASE}/api/channels/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar canal");
      await fetchChannels();
      return data;
    },
    [fetchChannels]
  );

  const updateChannel = useCallback(
    async (channelId: string, config: any) => {
      const res = await fetch(`${API_BASE}/api/channels/${channelId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar canal");
      await fetchChannels();
      return data;
    },
    [fetchChannels]
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      const res = await fetch(`${API_BASE}/api/channels/${channelId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao excluir canal");
      }
      await fetchChannels();
    },
    [fetchChannels]
  );

  return (
    <ChannelContext.Provider
      value={{
        channels,
        activeId,
        activeConfig,
        loading,
        error,
        switchChannel,
        createChannel,
        updateChannel,
        deleteChannel,
        refresh: fetchChannels,
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannels() {
  const ctx = useContext(ChannelContext);
  if (!ctx)
    throw new Error("useChannels deve estar dentro de <ChannelProvider>");
  return ctx;
}
