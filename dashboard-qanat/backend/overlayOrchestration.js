/**
 * Orquestração profissional de overlays HyperFrames → Remotion PRO
 * Estratégia de retenção YouTube para vídeos LONGOS e CURTOS (Shorts/Reels)
 */

const VARIETY_PROFILES = [
  {
    id: "documentary-prestige",
    label: "Documentário Premium",
    componentPriority: ["lower-third", "timeline", "counter", "bar-chart"],
    lowerThirdVariants: ["bild", "glass", "accent-underline", "clean-bar"],
    positions: ["bottom-left", "top-left", "bottom-center", "top-right"],
    lotties: ["history", "book", "compass", "shield", "sparkles", "earth"],
    hyperframesRefs: ["lt-kicker-name", "lt-side-rule", "flowchart-vertical", "apple-money-count"],
  },
  {
    id: "data-journalist",
    label: "Jornalismo de Dados",
    componentPriority: ["bar-chart", "counter", "lower-third", "timeline"],
    lowerThirdVariants: ["accent-underline", "bold-block", "clean-bar", "glass"],
    positions: ["bottom-right", "top-right", "bottom-left", "bottom-center"],
    lotties: ["money", "science", "gear", "warning", "compass", "lightbulb"],
    hyperframesRefs: ["data-chart", "multiple-bar-comparison", "lt-accent-underline", "lt-bold-block"],
  },
  {
    id: "mystery-reveal",
    label: "Mistério & Revelação",
    componentPriority: ["lower-third", "kinetic-text", "counter", "timeline"],
    lowerThirdVariants: ["accent-underline", "glass", "bild", "clean-bar"],
    positions: ["top-left", "bottom-left", "top-right", "bottom-center"],
    lotties: ["warning", "history", "sparkles", "shield", "book", "compass"],
    hyperframesRefs: ["lt-mask-reveal", "lt-accent-underline", "caption-kinetic-slam", "vfx-portal"],
  },
  {
    id: "geography-explorer",
    label: "Explorador Geográfico",
    componentPriority: ["bar-chart", "timeline", "lower-third", "counter"],
    lowerThirdVariants: ["glass", "clean-bar", "soft-pill", "accent-underline"],
    positions: ["top-right", "bottom-left", "top-left", "bottom-center"],
    lotties: ["earth", "compass", "nature", "history", "sparkles", "shield"],
    hyperframesRefs: ["world-map", "nyc-paris-flight", "us-map-flow", "lt-soft-pill"],
  },
  {
    id: "social-proof",
    label: "Prova Social Viral",
    componentPriority: ["lower-third", "counter", "kinetic-text", "bar-chart"],
    lowerThirdVariants: ["glass", "bold-block", "accent-underline", "bild"],
    positions: ["bottom-center", "top-left", "bottom-right", "top-right"],
    lotties: ["sparkles", "heart", "money", "crown", "lightbulb", "warning"],
    hyperframesRefs: ["reddit-post", "x-post", "tiktok-follow", "lt-soft-pill"],
  },
  {
    id: "industrial-impact",
    label: "Impacto Industrial",
    componentPriority: ["counter", "lower-third", "bar-chart", "timeline"],
    lowerThirdVariants: ["bold-block", "bild", "clean-bar", "glass"],
    positions: ["bottom-left", "top-right", "bottom-right", "top-left"],
    lotties: ["shield", "gear", "warning", "flame", "science", "history"],
    hyperframesRefs: ["lt-stack-bars", "lt-bold-block", "apple-money-count", "flowchart"],
  },
];

const NICHE_RPM_HINTS = {
  finance: { rpm: "alto ($8-$20)", palette: ["#D4AF37", "#00FF87", "#0D1117"], theme: "classic" },
  tech: { rpm: "alto ($6-$12)", palette: ["#00E5FF", "#7C4DFF", "#0F141C"], theme: "tech" },
  history: { rpm: "médio-alto ($4-$8)", palette: ["#C5A880", "#8B0000", "#1A1410"], theme: "ancient" },
  nature: { rpm: "médio ($3-$6)", palette: ["#00E5FF", "#2E7D32", "#0A1A12"], theme: "nature" },
  industrial: { rpm: "médio ($4-$7)", palette: ["#FF3D00", "#B0BEC5", "#121214"], theme: "industrial" },
  default: { rpm: "variável", palette: ["#D4AF37", "#00E5FF", "#121214"], theme: "classic" },
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function detectNicheCategory(niche = "") {
  const n = niche.toLowerCase();
  if (/finan|negoc|dinheiro|invest|economia/.test(n)) return "finance";
  if (/tecnolog|program|software|inteligencia artificial|\bia generativa\b|comput|cyber|ciber/.test(n)) return "tech";
  if (/histor|arqueolog|antig|castelo|egito|inca|mistério|misterio|curios/.test(n)) return "history";
  if (/geograf|natureza|deserto|amazon|viagem|terra/.test(n)) return "nature";
  if (/militar|guerra|industrial|engenharia/.test(n)) return "industrial";
  return "default";
}

export function detectVideoFormat(config = {}, totalDuration = 0) {
  const aspect = config.aspect_ratio || config.format || "";
  const explicit = String(config.video_format || config.format_type || "").toUpperCase();
  if (explicit === "SHORTS" || explicit === "SHORT") return "SHORT";
  if (explicit === "LONGO" || explicit === "LONG") return "LONG";
  if (aspect === "9:16" || totalDuration > 0 && totalDuration <= 75) return "SHORT";
  if (totalDuration > 120) return "LONG";
  return aspect === "16:9" ? "LONG" : "SHORT";
}

export function selectVarietyProfile(projectName, niche, { isListicle = false } = {}) {
  const category = detectNicheCategory(niche);
  const seed = hashString(`${projectName || "lumiera"}-${niche || "geral"}`);
  const profileIdx = seed % VARIETY_PROFILES.length;
  let profile = VARIETY_PROFILES[profileIdx];

  if (isListicle && (category === "history" || category === "default")) {
    profile = VARIETY_PROFILES.find((p) => p.id === "documentary-prestige") || profile;
  } else if (category === "history" && profile.id === "data-journalist") {
    profile = VARIETY_PROFILES.find((p) => p.id === "mystery-reveal") || profile;
  } else if (category === "nature" && profile.id === "social-proof") {
    profile = VARIETY_PROFILES.find((p) => p.id === "geography-explorer") || profile;
  } else if (category === "finance" && profile.id === "mystery-reveal") {
    profile = VARIETY_PROFILES.find((p) => p.id === "data-journalist") || profile;
  }

  return { profile, seed, category };
}

export function buildOverlayOrchestrationPlan({
  config = {},
  niche = "Geral",
  totalDuration = 0,
  projectName = "",
  sceneCount = 0,
  blockCount = 0,
} = {}) {
  const format = detectVideoFormat(config, totalDuration);
  const isListicle = config?.content_mode === "LISTICLE";
  const { profile, seed, category } = selectVarietyProfile(projectName, niche, { isListicle });
  const rpmHint = NICHE_RPM_HINTS[category] || NICHE_RPM_HINTS.default;
  const isShort = format === "SHORT";

  const duration = Math.max(totalDuration || (isShort ? 45 : 600), isShort ? 20 : 180);

  const plan = {
    format,
    niche,
    category,
    isListicle,
    totalDuration: duration,
    varietyProfile: profile.id,
    varietyLabel: profile.label,
    rpmHint,
    seed,
    sceneCount,
    blockCount,
    limits: {},
    rhythm: {},
    acts: [],
    componentPalette: [],
    forbiddenZones: [],
    retentionGoals: [],
    hyperframesRefs: profile.hyperframesRefs,
  };

  if (isShort) {
    const shortMax = isListicle ? 8 : Math.min(8, Math.max(5, Math.floor(duration / 8)));
    const aiBudget = isListicle ? 2 : shortMax;
    plan.limits = {
      maxTotal: aiBudget,
      finalMaxTotal: shortMax,
      maxData: isListicle ? 2 : 3,
      maxLowerThird: isListicle ? 0 : 3,
      maxKinetic: isListicle ? 0 : 2,
      maxTimeline: isListicle ? 0 : 2,
      minGapSeconds: isListicle ? 10 : 5,
      maxDurationSeconds: isListicle ? 3 : 4.5,
    };
    plan.rhythm = {
      hookCleanSeconds: 1.5,
      firstOverlayPercent: 0.12,
      secondOverlayPercent: 0.35,
      thirdOverlayPercent: 0.58,
      fourthOverlayPercent: 0.75,
      outroCleanSeconds: 2,
    };
    plan.acts = isListicle
      ? [
        { act: 1, label: "Gancho + Ranking", percent: "0-20%", overlays: 0, goal: "HUD de ranking (#N, TOP N) já injetado — tela limpa, só legenda." },
        { act: 2, label: "Itens #3 e #2", percent: "20-65%", overlays: 1, goal: "Máx. 1 counter com dado novo (não repetir narração)." },
        { act: 3, label: "Item #1 + Fechamento", percent: "65-100%", overlays: 1, goal: "Máx. 1 counter opcional. Recap automático no final." },
      ]
      : [
        { act: 1, label: "Gancho Visual", percent: "0-12%", overlays: 0, goal: "1.5s limpos — imagem forte + legenda viral palavra-a-palavra." },
        { act: 2, label: "Impacto", percent: "12-35%", overlays: 2, goal: "kinetic-text slam + lower-third glass. Parar o scroll." },
        { act: 3, label: "Prova Rápida", percent: "35-58%", overlays: 2, goal: "counter + bar-chart compacto. Credibilidade em 2s." },
        { act: 4, label: "Profundidade", percent: "58-82%", overlays: 2, goal: "timeline vertical OU lower-third accent + counter. Manter atenção." },
        { act: 5, label: "Fechamento", percent: "82-100%", overlays: 1, goal: "1 lower-third ou kinetic-text reveal. Últimos 2s limpos." },
      ];
    plan.componentPalette = [
      "kinetic-text",
      "lower-third",
      "counter",
      "bar-chart",
      "timeline",
      ...profile.componentPriority,
    ].filter((v, i, a) => a.indexOf(v) === i);
    plan.forbiddenZones = [
      { start: 0, end: 1.5, reason: "Gancho — sem overlay nos primeiros 1.5s" },
      { start: duration - 2, end: duration, reason: "Saída limpa — sem overlay nos últimos 2s" },
    ];
    plan.retentionGoals = isListicle
      ? [
        `Orçamento TOTAL final (HUD + IA): ${shortMax} overlays — o sistema já injeta badge #N, TOP N e recap`,
        "IA: gere NO MÁXIMO 2 counters com 1 número impactante cada (dado NOVO, não na narração)",
        "PROIBIDO em listicle Shorts: lower-third, kinetic-text, bar-chart, timeline, info-card por item",
        "PROIBIDO overlay por bloco/item — máximo 1 counter a cada 20s de vídeo",
        "Gap mínimo de 10s entre overlays da IA",
      ]
      : [
        `Até ${shortMax} overlays distribuídos com gap mínimo de 5s`,
        "Use kinetic-text nos momentos de virada narrativa",
        "Números na narração → counter ou bar-chart obrigatório",
        "Nunca 2 overlays simultâneos na tela",
        "Textos de 4-10 palavras (leitura em <1.2s)",
        "Alternar tipo E posição a cada overlay",
        "Assets com efeitos cinematográficos já ativos — overlays complementam, não competem",
      ];
  } else {
    const maxOverlays = Math.min(12, Math.max(4, Math.floor(duration / 50)));
    plan.limits = {
      maxTotal: maxOverlays,
      maxData: Math.ceil(maxOverlays * 0.35),
      maxLowerThird: Math.ceil(maxOverlays * 0.5),
      maxKinetic: 2,
      minGapSeconds: 18,
      maxDurationSeconds: 7,
    };
    plan.rhythm = {
      hookCleanSeconds: 5,
      firstOverlayPercent: 0.08,
      dataIntervalSeconds: 45,
      outroCleanSeconds: 15,
    };
    plan.acts = [
      { act: 1, label: "Abertura & Contexto", percent: "0-15%", overlays: Math.max(1, Math.floor(maxOverlays * 0.15)), goal: "1-2 lower-thirds bild/glass. Estabelecer tema sem poluir." },
      { act: 2, label: "Desenvolvimento", percent: "15-55%", overlays: Math.floor(maxOverlays * 0.45), goal: "Rotação: counter → bar-chart → timeline → lower-third. Intervalo 18-25s limpo." },
      { act: 3, label: "Clímax & Revelação", percent: "55-85%", overlays: Math.floor(maxOverlays * 0.3), goal: "Dados de impacto + lower-third accent-underline. Momento de maior retenção." },
      { act: 4, label: "Resolução", percent: "85-100%", overlays: Math.max(0, Math.floor(maxOverlays * 0.1)), goal: "Máximo 1 overlay. Últimos 15s limpos para logo/outro." },
    ];
    plan.componentPalette = profile.componentPriority;
    plan.forbiddenZones = [
      { start: 0, end: 5, reason: "Cold open cinematográfico — sem overlay nos primeiros 5s" },
      { start: duration - 15, end: duration, reason: "Outro limpo — sem overlay nos últimos 15s" },
    ];
    plan.retentionGoals = [
      `Máximo ${maxOverlays} overlays em ${Math.round(duration / 60)} minutos`,
      "Intervalo mínimo de 18s entre overlays",
      "Nunca repetir o mesmo tipo de componente 2x seguidas",
      "Números na narração → counter ou bar-chart obrigatório",
      "Processos/sequências → timeline horizontal",
      "Definições/nomes → lower-third (nunca info-card no centro)",
    ];
  }

  return plan;
}

export function buildOrchestrationPrompt(plan) {
  const isShort = plan.format === "SHORT";
  const profile = VARIETY_PROFILES.find((p) => p.id === plan.varietyProfile) || VARIETY_PROFILES[0];

  return `
## 🎯 PLANO DE ORQUESTRAÇÃO YOUTUBE (OBRIGATÓRIO PARA ESTE VÍDEO)

**Formato detectado:** ${plan.format} (${isShort ? "Shorts/Reels/TikTok 9:16" : "Documentário Longo 16:9"})
**Nicho:** ${plan.niche} | **Categoria RPM:** ${plan.category} (${plan.rpmHint.rpm})
**Perfil visual deste vídeo (varia entre projetos):** "${plan.varietyLabel}" (${plan.varietyProfile})
**Duração total:** ~${Math.round(plan.totalDuration)}s | **Cenas:** ${plan.sceneCount} | **Blocos:** ${plan.blockCount}

### Orçamento de overlays (NÃO EXCEDER)
- Total máximo: **${plan.limits.maxTotal}** overlays
- Lower-thirds: até **${plan.limits.maxLowerThird}**
- Dados (counter/bar-chart/timeline): até **${plan.limits.maxData}**
- Kinetic-text: até **${plan.limits.maxKinetic}**
- Intervalo mínimo entre overlays: **${plan.limits.minGapSeconds}s** de tela limpa
- Duração máxima por overlay: **${plan.limits.maxDurationSeconds}s**

### Estrutura narrativa (retenção por atos)
${plan.acts.map((a) => `- **Ato ${a.act} — ${a.label} (${a.percent}):** ${a.overlays} overlay(s). ${a.goal}`).join("\n")}

### Zonas proibidas (tela 100% limpa)
${plan.forbiddenZones.map((z) => `- ${z.start}s → ${z.end}s: ${z.reason}`).join("\n")}

### Paleta de componentes Remotion para ESTE vídeo (use nesta ordem de prioridade)
${plan.componentPalette.map((c, i) => `${i + 1}. \`${c}\``).join("\n")}

### Referências HyperFrames para inspirar o design (mapear para tipos Remotion)
${plan.hyperframesRefs.map((r) => `- \`${r}\``).join("\n")}

### Rotação de variedade (perfil "${plan.varietyLabel}")
- Variantes lower-third: ${profile.lowerThirdVariants.join(" → ")}
- Posições (alternar, nunca repetir em sequência): ${profile.positions.join(" → ")}
- Ícones Lottie (não repetir): ${profile.lotties.join(", ")}
- Paleta de acento sugerida: ${plan.rpmHint.palette.join(", ")}

### Metas de retenção SEO YouTube
${plan.retentionGoals.map((g) => `- ${g}`).join("\n")}

${plan.isListicle ? `### LISTICLE / TOP N (prioridade de layout)
- O topo central da tela é RESERVADO para o contador de ranking (#N → #1). NUNCA coloque counter, timeline, info-card, lower-third ou kinetic-text no topo ou centro.
- Datas, anos (ex: "2000 anos", "150 a.C.") e números informativos → counter ou timeline em **bottom-right** ou **bottom-left** apenas.
- O contador do ranking sempre vai do MAIOR para o MENOR (ex: Top 20 começa em #20 e termina em #1).
${plan.format === "SHORT" ? `- SHORTS + LISTICLE: posição OBRIGATÓRIA "bottom-left" ou "bottom-right" para counters. O terço inferior é a única zona segura. Gere só counters (máx. 2 no vídeo inteiro).` : ""}

` : ""}### Regras de ouro do criador profissional
1. **Complementar, nunca repetir:** overlays trazem dados NOVOS que a legenda não diz.
2. **Um overlay = um insight:** 5-12 palavras. Leitura em menos de 1.5 segundo.
3. **Rotação de tipos:** se o overlay anterior foi lower-third, o próximo DEVE ser counter, bar-chart, timeline ou kinetic-text.
4. **Dados visuais > texto:** se há número, porcentagem ou comparação na narração, use counter ou bar-chart.
5. **Sem padrão fixo:** este vídeo usa o perfil "${plan.varietyLabel}" — o próximo vídeo terá perfil diferente.
6. **Campo start:** sempre scene_id (ex: "2.1"), nunca segundos absolutos.
`.trim();
}

const DATA_TYPES = new Set(["counter", "bar-chart", "timeline"]);
const LT_TYPES = new Set(["lower-third"]);
const KINETIC_TYPES = new Set(["kinetic-text"]);
const TIMELINE_TYPES = new Set(["timeline"]);

function overlayPriority(overlay) {
  if (DATA_TYPES.has(overlay.type)) return 3;
  if (LT_TYPES.has(overlay.type)) return 2;
  if (KINETIC_TYPES.has(overlay.type)) return 1;
  return 0;
}

export function enforceOverlayOrchestration(overlays, plan) {
  if (!Array.isArray(overlays) || overlays.length === 0) return overlays;

  const profile = VARIETY_PROFILES.find((p) => p.id === plan.varietyProfile) || VARIETY_PROFILES[0];
  const sorted = [...overlays]
    .filter((o) => o && typeof o.start === "number" && Number.isFinite(o.start))
    .sort((a, b) => a.start - b.start);

  const filtered = [];
  let dataCount = 0;
  let ltCount = 0;
  let kineticCount = 0;
  let timelineCount = 0;
  const maxTimeline = plan.limits.maxTimeline || plan.limits.maxData;
  let lastStart = -Infinity;
  let lastType = null;
  let variantIdx = 0;
  let posIdx = 0;
  let lottieIdx = 0;

  for (const overlay of sorted) {
    const inForbidden = plan.forbiddenZones.some(
      (z) => overlay.start >= z.start && overlay.start < z.end
    );
    if (inForbidden) {
      console.log(`[Orchestration] Removido overlay ${overlay.id} em zona proibida (${overlay.start}s)`);
      continue;
    }

    if (overlay.start - lastStart < plan.limits.minGapSeconds) {
      console.log(`[Orchestration] Removido overlay ${overlay.id} — gap insuficiente (${(overlay.start - lastStart).toFixed(1)}s < ${plan.limits.minGapSeconds}s)`);
      continue;
    }

    if (filtered.length >= plan.limits.maxTotal) {
      console.log(`[Orchestration] Limite total atingido (${plan.limits.maxTotal}). Ignorando ${overlay.id}`);
      break;
    }

    if (overlay.type === "timeline") {
      if (timelineCount >= maxTimeline) continue;
      timelineCount++;
      dataCount++;
    } else if (DATA_TYPES.has(overlay.type)) {
      if (dataCount >= plan.limits.maxData) continue;
      dataCount++;
    }
    if (LT_TYPES.has(overlay.type)) {
      if (ltCount >= plan.limits.maxLowerThird) continue;
      ltCount++;
    }
    if (KINETIC_TYPES.has(overlay.type)) {
      if (kineticCount >= plan.limits.maxKinetic) continue;
      kineticCount++;
    }

    if (lastType && lastType === overlay.type && DATA_TYPES.has(overlay.type) === false) {
      console.log(`[Orchestration] Tipo repetido em sequência (${overlay.type}). Mantido mas variante forçada.`);
    }

    if (!overlay.props) overlay.props = {};
    overlay.duration = Math.min(Number(overlay.duration) || 4, plan.limits.maxDurationSeconds);

    if (overlay.type === "lower-third") {
      overlay.props.variant = profile.lowerThirdVariants[variantIdx % profile.lowerThirdVariants.length];
      variantIdx++;
    }

    const listicleBottomPool = plan.format === "SHORT"
      ? ["bottom-left", "bottom-right"]
      : ["bottom-right", "bottom-left", "bottom-center"];
    const positionPool = plan.isListicle
      ? listicleBottomPool
      : profile.positions;
    const safePool = positionPool.length ? positionPool : ["bottom-right", "bottom-left"];
    overlay.props.position = safePool[posIdx % safePool.length];
    posIdx++;

    if (["lower-third", "counter", "bar-chart", "info-card"].includes(overlay.type)) {
      overlay.props.iconType = profile.lotties[lottieIdx % profile.lotties.length];
      lottieIdx++;
    }

    if (plan.rpmHint.theme && !overlay.props.theme) {
      overlay.props.theme = plan.rpmHint.theme;
    }
    if (!overlay.props.accentColor && plan.rpmHint.palette?.[0]) {
      overlay.props.accentColor = plan.rpmHint.palette[0];
    }

    filtered.push(overlay);
    lastStart = overlay.start;
    lastType = overlay.type;
  }

  if (filtered.length < sorted.length) {
    console.log(`[Orchestration] ${sorted.length} → ${filtered.length} overlays após enforcement (${plan.format}, perfil ${plan.varietyProfile})`);
  }

  return filtered;
}

export { VARIETY_PROFILES, NICHE_RPM_HINTS };