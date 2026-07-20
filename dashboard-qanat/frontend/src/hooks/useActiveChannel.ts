import { useChannels, Channel } from "../context/ChannelContext";

export interface ActiveChannelType {
  loading: boolean;
  channelId: string | null;
  channelName: string;
  channelColor: string;
  niche: string | null;
  subNichos: string[];
  forbiddenThemes: string[];
  seoKeywords: string[];
  titleMaxChars: number;
  titleTemplates: string[];
  roteiro: any;
  visualStyle: string | null;
  visual: any;
  tts: any;
  formato: any;
  brand: any;
  prompts: Record<string, string>;
  config: any;
}

export function useActiveChannel(): ActiveChannelType {
  const { activeConfig, activeId, channels, loading } = useChannels();
  const meta = channels.find((c) => c.id === activeId);

  return {
    loading,
    channelId: activeId,
    channelName: activeConfig?.canal_nome || meta?.nome || "Nenhum canal",
    channelColor:
      activeConfig?.brand?.paleta_cores?.primaria || meta?.cor || "#f5a623",

    // ── Nicho vem do canal (não mais manual) ──
    niche: activeConfig?.nicho?.principal || null,
    subNichos: activeConfig?.nicho?.sub_nichos_permitidos || [],
    forbiddenThemes: activeConfig?.nicho?.temas_proibidos || [],
    seoKeywords: activeConfig?.nicho?.palavras_chave_seo || [],

    // ── Regras de título ──
    titleMaxChars: activeConfig?.titulo?.max_caracteres || 60,
    titleTemplates: activeConfig?.titulo?.templates_vencedores || [],

    // ── Roteiro ──
    roteiro: activeConfig?.roteiro || {},

    // ── Visual / TTS / Formato ──
    visualStyle: activeConfig?.visual?.estilo_padrao || null,
    visual: activeConfig?.visual || {},
    tts: activeConfig?.tts || {},
    formato: activeConfig?.formato || {},
    brand: activeConfig?.brand || {},

    // ── Prompts customizados do canal ──
    prompts: activeConfig?.prompts || {},

    config: activeConfig,
  };
}
