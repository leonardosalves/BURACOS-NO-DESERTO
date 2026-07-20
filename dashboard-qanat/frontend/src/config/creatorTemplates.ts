// config/creatorTemplates.ts
//
// MUDANÇA-CHAVE:
//  - Removido o campo { key: "nicho", ... } de todos os templates.
//  - Adicionado channelBound: true → o criador herda nicho/regras do canal ativo.
//  - O campo "sub_nicho" agora tem origem: "canal.subNichos" → populado
//    dinamicamente pelo useActiveChannel().subNichos.

export interface CreatorField {
  key: string;
  label: string;
  tipo: "texto" | "select";
  origem?: string;
  obrigatorio: boolean;
  placeholder?: string;
  opcoes?: string[];
}

export interface CreatorTemplate {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  channelBound: boolean;
  formato: string;
  campos: CreatorField[];
}

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: "video-longo",
    nome: "Vídeo Longo",
    icone: "🎬",
    descricao: "8–12 min · YouTube",
    channelBound: true,
    formato: "longo",
    campos: [
      {
        key: "tema",
        label: "Tema do vídeo",
        tipo: "texto",
        obrigatorio: true,
        placeholder: "Ex: como os romanos erguiam templos",
      },
      {
        key: "sub_nicho",
        label: "Sub-nicho",
        tipo: "select",
        origem: "canal.subNichos",
        obrigatorio: true,
      },
      {
        key: "gancho",
        label: "Gancho (opcional)",
        tipo: "texto",
        placeholder: "Deixe vazio para gerar automaticamente",
      },
    ],
  },
  {
    id: "shorts",
    nome: "Shorts / Reels",
    icone: "⚡",
    descricao: "≤ 60s · vertical",
    channelBound: true,
    formato: "curto",
    campos: [
      { key: "tema", label: "Tema do short", tipo: "texto", obrigatorio: true },
      {
        key: "sub_nicho",
        label: "Sub-nicho",
        tipo: "select",
        origem: "canal.subNichos",
        obrigatorio: true,
      },
    ],
  },
  {
    id: "timelapse",
    nome: "Timelapse de Construção",
    icone: "🏗️",
    descricao: "Obra acelerada · visual",
    channelBound: true,
    formato: "timelapse",
    campos: [
      {
        key: "tema",
        label: "Obra / estrutura",
        tipo: "texto",
        obrigatorio: true,
      },
      {
        key: "sub_nicho",
        label: "Sub-nicho",
        tipo: "select",
        origem: "canal.subNichos",
        obrigatorio: true,
      },
      {
        key: "duracao",
        label: "Duração alvo",
        tipo: "select",
        opcoes: ["30s", "60s", "90s"],
        obrigatorio: true,
      },
    ],
  },
];

// Valida se um sub-nicho escolhido é permitido no canal ativo.
export function isSubNichoPermitido(subNicho: string, canal: any) {
  if (!canal?.subNichos?.length) return true;
  return canal.subNichos.includes(subNicho);
}

// Bloqueia temas proibidos do canal ativo.
export function isTemaProibido(tema: string, canal: any) {
  if (!canal?.forbiddenThemes?.length) return false;
  const t = String(tema).toLowerCase();
  return canal.forbiddenThemes.some((p: string) => t.includes(p.toLowerCase()));
}
