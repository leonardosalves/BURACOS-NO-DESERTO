export type CreatorIdeationMode =
  | "ai"
  | "custom"
  | "listicle"
  | "historical-witness"
  | "humor-facts"
  | "video-reverse-engineering"
  | "collage-broll"
  | "express";

export type CreatorModeIdentity = {
  id: CreatorIdeationMode;
  menuLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  promise: string;
  sequence: [string, string, string];
  accentText: string;
  accentBorder: string;
  accentSurface: string;
  halo: string;
};

export const CREATOR_MODE_IDENTITIES: Record<
  CreatorIdeationMode,
  CreatorModeIdentity
> = {
  express: {
    id: "express",
    menuLabel: "Criador Express",
    eyebrow: "Criação ultra rápida",
    title: "Criador Express",
    subtitle: "Escreva e monte um YouTube Short em segundos.",
    promise:
      "Gera roteiro com gancho matador e desenvolvimento acelerado a partir do tema e nicho.",
    sequence: ["Definir Tema/Nicho", "Gerar Roteiro", "Aprovar Produção"],
    accentText: "text-rose-200",
    accentBorder: "border-rose-400/30",
    accentSurface: "bg-rose-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(244,63,94,0.18),transparent_34%)]",
  },
  ai: {
    id: "ai",
    menuLabel: "Radar de Ideias",
    eyebrow: "Inteligência editorial",
    title: "Radar de Ideias",
    subtitle:
      "Encontre histórias verdadeiras que o seu nicho ainda não percebeu.",
    promise:
      "Cruza oportunidade, baixa saturação e potencial de retenção antes de escrever a narração.",
    sequence: ["Mapear o nicho", "Escolher a pauta", "Construir a história"],
    accentText: "text-violet-200",
    accentBorder: "border-violet-400/30",
    accentSurface: "bg-violet-400/[0.07]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(167,139,250,0.22),transparent_34%)]",
  },
  custom: {
    id: "custom",
    menuLabel: "Oficina Autoral",
    eyebrow: "Sala de roteiro",
    title: "Oficina Autoral",
    subtitle: "Sua ideia entra bruta. O estúdio devolve uma premissa filmável.",
    promise:
      "Diagnostica gancho, promessa, estrutura e formato sem apagar a sua intenção criativa.",
    sequence: ["Registrar a ideia", "Lapidar o ângulo", "Aprovar a narração"],
    accentText: "text-cyan-200",
    accentBorder: "border-cyan-400/30",
    accentSurface: "bg-cyan-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(34,211,238,0.18),transparent_34%)]",
  },
  listicle: {
    id: "listicle",
    menuLabel: "Ranking Lab",
    eyebrow: "Engenharia de listas",
    title: "Ranking Lab",
    subtitle:
      "Listas com progressão, evidência e uma recompensa real no primeiro lugar.",
    promise:
      "Organiza critérios, tension crescente e identidade visual para fugir do Top N genérico.",
    sequence: ["Definir o critério", "Ordenar a tensão", "Dirigir o ranking"],
    accentText: "text-emerald-200",
    accentBorder: "border-emerald-400/30",
    accentSurface: "bg-emerald-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(52,211,153,0.18),transparent_34%)]",
  },
  "historical-witness": {
    id: "historical-witness",
    menuLabel: "História Viva",
    eyebrow: "Arquivo cinematográfico",
    title: "História Viva",
    subtitle: "O passado narrado por quem poderia ter estado dentro dele.",
    promise:
      "Trava época, personagem e causalidade para criar cenas históricas coerentes e pesquisáveis.",
    sequence: [
      "Abrir o arquivo",
      "Escolher a testemunha",
      "Reconstruir a época",
    ],
    accentText: "text-amber-200",
    accentBorder: "border-amber-400/30",
    accentSurface: "bg-amber-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(251,191,36,0.18),transparent_34%)]",
  },
  "humor-facts": {
    id: "humor-facts",
    menuLabel: "Fatos com Graça",
    eyebrow: "Comédia factual importada",
    title: "Fatos com Graça",
    subtitle: "Narração aprovada e direção de humor carregadas diretamente.",
    promise:
      "Preserva cada palavra da narração e leva cenas, prompts, câmera, música e SFX ao Wizard sem passar pela Oficina Autoral.",
    sequence: [
      "Narração preservada",
      "Cenas humorísticas carregadas",
      "Produção liberada",
    ],
    accentText: "text-orange-200",
    accentBorder: "border-orange-400/30",
    accentSurface: "bg-orange-400/[0.07]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(251,146,60,0.2),transparent_34%)]",
  },
  "video-reverse-engineering": {
    id: "video-reverse-engineering",
    menuLabel: "Engenharia Reversa",
    eyebrow: "Dossiê audiovisual importado",
    title: "Engenharia Reversa",
    subtitle: "Roteiro e decupagem reconstruídos diretamente da referência.",
    promise:
      "Preserva narração, cenas, prompts, câmera, edição, música e SFX sem passar por uma nova criação editorial.",
    sequence: [
      "Roteiro recuperado",
      "Storyboard carregado",
      "Produção liberada",
    ],
    accentText: "text-cyan-200",
    accentBorder: "border-cyan-400/30",
    accentSurface: "bg-cyan-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(34,211,238,0.2),transparent_34%)]",
  },
  "collage-broll": {
    id: "collage-broll",
    menuLabel: "Lab Colagem",
    eyebrow: "Metáforas visuais stop-motion",
    title: "Laboratório de Colagem",
    subtitle:
      "Crie narrações e projetos focados em colagem de papel stop-motion.",
    promise:
      "Gera narrações poéticas ou conceituais e já monta as metáforas do Collage B-roll automaticamente para produção tátil.",
    sequence: ["Escrever a narração", "Refinar metáforas", "Produzir colagens"],
    accentText: "text-emerald-200",
    accentBorder: "border-emerald-400/30",
    accentSurface: "bg-emerald-400/[0.06]",
    halo: "bg-[radial-gradient(circle_at_86%_16%,rgba(16,185,129,0.18),transparent_34%)]",
  },
};

export function resolveCreatorModeIdentity(mode: string): CreatorModeIdentity {
  return (
    CREATOR_MODE_IDENTITIES[mode as CreatorIdeationMode] ||
    CREATOR_MODE_IDENTITIES.ai
  );
}
