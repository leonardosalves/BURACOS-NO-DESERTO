/**
 * shotcraftCatalog.js
 * Catálogo dos shot cards do video-shotcraft no formato do orquestrador.
 * Cada card: templateId, category, function, semanticTags, styles, duração, energy, formats.
 */

// [templateId, category, [functions], [styles], [semanticTags], minDur, maxDur, energy, [formats]]
const CARD_DEFS = [
  // ── DADOS / MÉTRICAS ──
  ["odometer-digit-roll", "dados", ["dado_numerico", "metrica", "recorde"], ["odometer-digit-roll"], ["número", "métrica", "estatística", "recorde", "total", "quantidade"], 2.5, 4.5, "high", ["9:16", "16:9"]],
  ["chart-live-moves", "dados", ["dado_numerico", "grafico", "comparacao"], ["oscilloscope-stream", "unit-dot-swarm-regroup", "axis-rescale-shock"], ["gráfico", "dados", "osciloscópio", "escala", "tendência"], 3, 6, "medium", ["16:9", "9:16"]],
  ["particle-sand-fill", "dados", ["dado_numerico", "grafico", "ranking"], ["particle-sand-fill"], ["gráfico", "barras", "proporção", "ranking", "partículas"], 3, 5, "medium", ["16:9", "9:16"]],
  ["gauge-readout-moves", "dados", ["dado_numerico", "medidor"], ["needle-sweep-selftest", "tape-scroll-fixed-pointer"], ["medidor", "velocidade", "capacidade", "instrumento", "ponteiro"], 2.5, 5, "medium", ["16:9", "9:16"]],
  ["crane-rise-reveal", "dados", ["dashboard", "revelacao", "dado_numerico"], ["crane-rise-reveal"], ["dashboard", "painel", "visão geral", "revelar", "números"], 4, 7, "medium", ["16:9"]],
  ["dataviz-landscape-open", "dados", ["abertura", "dados", "grafico"], ["dataviz-landscape-open"], ["dados", "paisagem", "abertura", "fluxo", "técnico"], 3, 6, "medium", ["16:9"]],
  ["autolayout-gap-dial", "dados", ["dado_numerico", "processo"], ["autolayout-gap-dial"], ["ajuste", "valor", "dial", "tempo real", "espaçamento"], 3, 5, "medium", ["16:9"]],
  ["ai-stream-response", "dados", ["dado_numerico", "lista", "processo"], ["ai-stream-response"], ["resumo", "evidência", "streaming", "análise", "resultado"], 4, 7, "medium", ["16:9", "9:16"]],

  // ── COMPARAÇÃO ──
  ["before-after-slider-scrub", "comparacao", ["comparacao", "antes_depois"], ["before-after-slider-scrub"], ["antes", "depois", "comparação", "evolução", "slider", "transformação"], 3, 6, "medium", ["16:9", "9:16"]],
  ["text-column-converge", "comparacao", ["comparacao"], ["text-column-converge"], ["comparação", "versus", "opções", "convergência", "escolha"], 3, 5, "medium", ["16:9"]],

  // ── TIMELINE / SEQUÊNCIA ──
  ["timeline-travel", "timeline", ["timeline", "cronologia", "historia"], ["timeline-travel"], ["linha do tempo", "cronologia", "história", "datas", "evolução", "sequência", "marcos"], 4, 8, "medium", ["16:9", "9:16"]],
  ["document-typewriter-reveal", "timeline", ["timeline", "processo", "historia"], ["document-typewriter-reveal"], ["documento", "história", "registro", "arquivo", "escrever"], 4, 7, "low", ["16:9"]],

  // ── LISTAS / RANKING ──
  ["list-stack-press", "lista", ["lista", "ranking", "enumeracao"], ["list-stack-press"], ["lista", "ranking", "top", "posição", "empilhar", "contador"], 3, 6, "high", ["9:16", "16:9"]],
  ["row-embed", "lista", ["lista", "dado_numerico"], ["row-embed"], ["linhas", "tabela", "dados", "inserir", "lista"], 3, 5, "medium", ["16:9"]],
  ["beat-step-list-theme-cycle", "lista", ["lista", "impacto"], ["beat-step-list-theme-cycle"], ["lista", "beat", "adjetivos", "ciclo", "ritmo"], 3, 6, "high", ["9:16"]],
  ["wall-reveal-moves", "lista", ["lista", "destaque"], ["bento-light-up", "grid-wave-flip", "wireframe-draw-on"], ["grid", "mosaico", "bento", "revelar", "conjunto"], 3, 6, "medium", ["16:9"]],
  ["deck-deal-flyin", "lista", ["lista", "abertura"], ["deck-deal-flyin"], ["cards", "grid", "distribuir", "coleção", "abertura"], 3, 6, "high", ["16:9"]],

  // ── DESTAQUE / HERO ──
  ["spotlight-hero-card", "destaque", ["destaque", "hero", "revelacao"], ["spotlight-hero-card"], ["destaque", "foco", "principal", "hero", "selecionar"], 3, 6, "medium", ["16:9"]],
  ["card-flip-reveal", "destaque", ["destaque", "revelacao"], ["card-flip-reveal"], ["revelar", "resultado", "flip", "card", "surpresa"], 2.5, 5, "medium", ["16:9", "9:16"]],
  ["spotlight-sweep-moves", "destaque", ["destaque", "camera"], ["spotlight-sweep-moves"], ["spotlight", "foco", "revelar", "varredura"], 3, 6, "medium", ["16:9"]],
  ["segmented-thumb-hero", "destaque", ["destaque", "elemento"], ["segmented-thumb-hero"], ["controle", "seleção", "close-up", "opção"], 2.5, 4.5, "medium", ["16:9"]],

  // ── ABERTURA ──
  ["brand-ink-open", "abertura", ["abertura", "brand"], ["brand-ink-open"], ["abertura", "intro", "marca", "wordmark", "ink"], 2.5, 5, "medium", ["16:9", "9:16"]],
  ["trailer-grammar-moves", "abertura", ["abertura", "impacto"], ["trailer-bumper", "card-footage-cadence", "smash-cut"], ["abertura", "trailer", "hook", "impacto", "intro"], 2, 5, "high", ["16:9", "9:16"]],
  ["brand-frame-snap", "abertura", ["abertura", "brand"], ["brand-frame-snap"], ["abertura", "frame", "marca", "moldura"], 2, 4, "medium", ["16:9"]],
  ["letterspace-materialize", "abertura", ["abertura", "texto", "brand"], ["letterspace-materialize"], ["abertura", "wordmark", "letras", "desenhar", "marca"], 3, 5, "low", ["16:9"]],
  ["neon-frame-forerun", "abertura", ["abertura", "impacto"], ["neon-frame-forerun"], ["abertura", "neon", "frame", "perspectiva"], 2.5, 5, "high", ["16:9"]],
  ["neon-frame-orbit-drop", "abertura", ["abertura", "camera"], ["neon-frame-orbit-drop"], ["abertura", "neon", "órbita", "componentes"], 3, 6, "high", ["16:9"]],

  // ── ENCERRAMENTO ──
  ["outro-group-photo-launch", "encerramento", ["encerramento", "final", "brand"], ["outro-group-photo-launch"], ["encerramento", "final", "launch", "wordmark", "finale"], 3, 6, "medium", ["16:9"]],
  ["ui-strip-away-outro", "encerramento", ["encerramento", "final"], ["ui-strip-away-outro"], ["encerramento", "final", "evaporar", "botão", "wordmark"], 3, 6, "low", ["16:9"]],
  ["edit-hook-moves", "encerramento", ["encerramento", "brand", "impacto"], ["logo-sting-button"], ["stinger", "logo", "easter egg", "encerramento"], 1, 2.5, "high", ["16:9", "9:16"]],

  // ── TRANSIÇÕES ──
  ["shot-transitions", "transicao", ["transicao"], ["flash-cut", "shot-transitions-4", "shot-transitions-5", "shot-transitions-6", "whip-pan", "mask-wipe"], ["transição", "corte", "flash", "whip pan", "mask wipe"], 0.4, 1.2, "high", ["16:9", "9:16"]],
  ["wipe-transitions", "transicao", ["transicao"], ["clock-wipe", "blinds-slice"], ["transição", "wipe", "radial", "blinds", "geométrico"], 0.5, 1.2, "medium", ["16:9", "9:16"]],
  ["page-turn-transitions", "transicao", ["transicao"], ["cube-rotate", "barn-door-split"], ["transição", "página", "cube", "portas", "virada"], 0.6, 1.4, "medium", ["16:9"]],
  ["transition-hidden-cut", "transicao", ["transicao"], ["invisible-cut", "versus-slam", "light-leak-burn"], ["transição", "corte invisível", "light leak", "ocultar"], 0.4, 1, "medium", ["16:9", "9:16"]],
  ["transition-travel", "transicao", ["transicao"], ["shared-element-morph", "letterform-zoom"], ["transição", "morph", "passagem", "elemento compartilhado"], 0.6, 1.4, "medium", ["16:9"]],
  ["circle-match-iris", "transicao", ["transicao"], ["circle-match-iris"], ["transição", "íris", "círculo", "match cut"], 0.5, 1.2, "medium", ["16:9", "9:16"]],
  ["line-carry-transition", "transicao", ["transicao"], ["line-carry-transition"], ["transição", "linha", "guia", "conduzir"], 0.6, 1.4, "medium", ["16:9"]],
  ["color-block-step-wipe", "transicao", ["transicao"], ["color-block-step-wipe"], ["transição", "bloco", "wipe", "cor", "passos"], 0.5, 1.2, "high", ["16:9", "9:16"]],
  ["bottom-push-stack-wipe", "transicao", ["transicao"], ["bottom-push-stack-wipe"], ["transição", "empurrar", "stack", "wipe"], 0.5, 1.2, "high", ["9:16", "16:9"]],
  ["tear-streak-transitions", "transicao", ["transicao", "impacto"], ["glitch-displace"], ["transição", "glitch", "tear", "distortion"], 0.3, 0.8, "high", ["16:9", "9:16"]],
  ["print-texture-transitions", "transicao", ["transicao"], ["ink-bleed-reveal"], ["transição", "ink", "bleed", "textura", "revelar"], 0.6, 1.4, "medium", ["16:9"]],
  ["bubble-swarm-takeover", "transicao", ["transicao"], ["bubble-swarm-takeover"], ["transição", "bolhas", "cobrir", "revelar"], 1, 2, "medium", ["16:9", "9:16"]],

  // ── CÂMERA / MOVIMENTO ──
  ["space-camera-moves", "camera", ["camera", "revelacao"], ["exploded-view", "snorricam-lock", "drone-dive-landing"], ["câmera", "3D", "exploded view", "drone", "mergulho", "montagem"], 3, 7, "high", ["16:9"]],
  ["tension-camera-moves", "camera", ["camera", "impacto"], ["bullet-time-freeze-orbit", "dutch-roll-to-level", "slow-push-in", "pull-back-isolation"], ["câmera", "tensão", "push in", "pull back", "dolly", "isolamento"], 3, 7, "medium", ["16:9"]],
  ["depth-layer-moves", "camera", ["camera"], ["multiplane", "dolly-zoom"], ["câmera", "profundidade", "parallax", "dolly zoom", "multiplane"], 3, 6, "medium", ["16:9"]],
  ["overhead-camera-moves", "camera", ["camera", "revelacao"], ["tilt-reveal", "overhead-tabletop-drop"], ["câmera", "aérea", "overhead", "revelar", "top-down"], 2.5, 5, "medium", ["16:9"]],
  ["crash-zoom-punch", "camera", ["camera", "impacto"], ["crash-zoom-punch"], ["zoom", "impacto", "close-up", "punch", "crash"], 0.5, 1.5, "high", ["16:9", "9:16"]],
  ["graze-face-tour", "camera", ["camera"], ["graze-face-tour"], ["câmera", "rasante", "superfície", "tour"], 3, 6, "medium", ["16:9"]],
  ["steep-tilt-glide", "camera", ["camera"], ["steep-tilt-glide"], ["câmera", "perspectiva", "glide", "inclinação"], 3, 6, "medium", ["16:9"]],
  ["runway-ground-skim", "camera", ["camera", "impacto"], ["runway-ground-skim"], ["câmera", "rasante", "cards", "pouso"], 3, 6, "high", ["16:9"]],
  ["scroll-brake-moves", "camera", ["camera", "destaque"], ["changelog-scroll-brake", "brake-reticle-lock"], ["scroll", "freio", "target", "reticle", "foco"], 2.5, 5, "medium", ["9:16", "16:9"]],

  // ── TEXTO / TÍTULO ──
  ["gradient-word-sweep", "texto", ["texto", "destaque"], ["gradient-word-sweep"], ["palavra", "destaque", "gradiente", "glow", "varredura"], 2, 4, "medium", ["16:9", "9:16"]],
  ["marker-underline-title", "texto", ["texto", "destaque"], ["marker-underline-title"], ["título", "sublinhar", "marker", "palavra-chave"], 2, 4, "low", ["16:9", "9:16"]],
  ["scene-locked-title", "texto", ["texto", "camera"], ["scene-locked-title"], ["título", "perspectiva", "ancorado", "cena"], 2.5, 5, "low", ["16:9"]],
  ["text-as-mask", "texto", ["texto", "camera", "abertura"], ["text-as-mask"], ["título", "máscara", "footage", "letras", "abertura"], 3, 6, "medium", ["16:9"]],
  ["typewriter-moves", "texto", ["texto", "processo"], ["terminal-typewriter", "error-retype"], ["texto", "digitar", "terminal", "comando", "escrever"], 2.5, 5, "low", ["16:9", "9:16"]],
  ["type-assembly-moves", "texto", ["texto", "abertura"], ["split-text-stagger", "drift-assembly", "tracking-expand", "text-on-path"], ["título", "montagem", "letras", "convergência", "path"], 2.5, 5, "medium", ["16:9"]],
  ["type-entrance-moves", "texto", ["texto", "abertura"], ["scramble-decode", "letter-drop-physics"], ["título", "entrada", "decode", "gravidade", "letras"], 2, 4, "medium", ["16:9", "9:16"]],
  ["type-rhythm-sync", "texto", ["texto", "impacto"], ["font-weight-pump", "karaoke-fill-sync"], ["texto", "ritmo", "beat", "karaoke", "sincronia", "voz"], 2.5, 5, "high", ["16:9", "9:16"]],
  ["split-flap-title", "texto", ["texto", "abertura"], ["split-flap-title"], ["título", "split-flap", "mecânico", "flip", "abertura"], 2.5, 5, "medium", ["16:9"]],
  ["paper-title-card", "texto", ["texto", "abertura"], ["paper-title-card"], ["título", "papel", "title card", "abertura", "frase"], 2.5, 5, "low", ["16:9"]],
  ["stroke-segment-build", "texto", ["texto", "abertura"], ["stroke-segment-build"], ["título", "traços", "montagem", "revelar"], 2.5, 5, "medium", ["16:9"]],
  ["title-demote-to-label", "texto", ["texto", "transicao"], ["title-demote-to-label"], ["título", "label", "seção", "transição", "encolher"], 2, 4, "low", ["16:9"]],
  ["word-relay-filmstrip", "texto", ["texto", "lista"], ["word-relay-filmstrip"], ["texto", "filmstrip", "relay", "palavras", "cards"], 3, 6, "medium", ["16:9"]],
  ["spectrum-morph-ui", "texto", ["texto", "elemento"], ["spectrum-morph-ui"], ["título", "espectro", "barras", "morph"], 2.5, 5, "medium", ["16:9"]],
  ["hashtag-to-pill-materialize", "texto", ["texto", "elemento"], ["hashtag-to-pill-materialize"], ["hashtag", "tag", "pill", "materializar"], 2.5, 5, "medium", ["9:16", "16:9"]],
  ["hires-rasterize-3d-text", "texto", ["texto", "camera"], ["hires-rasterize-3d-text"], ["texto", "3D", "nitidez", "perspectiva"], 2, 5, "low", ["16:9"]],

  // ── IMPACTO / RITMO ──
  ["beat-cut-moves", "impacto", ["impacto", "ritmo"], ["beat-cut-accelerando", "paparazzi-flash"], ["beat", "corte", "ritmo", "acelerar", "flash", "montagem"], 1.5, 4, "high", ["9:16", "16:9"]],
  ["cel-flash-stomp", "impacto", ["impacto", "ritmo", "texto"], ["cel-flash-stomp"], ["palavras", "beat", "stomp", "flash", "impacto", "humor"], 1.5, 4, "high", ["9:16", "16:9"]],
  ["impact-feedback", "impacto", ["impacto"], ["hit-counter", "anime-impact"], ["impacto", "combo", "anime", "counter", "dano"], 1, 3, "high", ["9:16", "16:9"]],
  ["montage-rhythm-moves", "impacto", ["impacto", "ritmo"], ["drop-blackout-slam", "wright-triple-cut", "domino-cascade"], ["montagem", "ritmo", "blackout", "slam", "cascata"], 2, 5, "high", ["16:9", "9:16"]],
  ["rhythm-interrupt-moves", "impacto", ["impacto", "ritmo"], ["jump-cut-punch-in", "strobe-black-frames"], ["ritmo", "jump cut", "punch in", "strobe", "quebra"], 1.5, 4, "high", ["16:9", "9:16"]],
  ["slam-entrance-moves", "impacto", ["impacto", "abertura"], ["kanada-perspective-snap", "score-slam", "impact-burst-kit"], ["entrada", "slam", "impacto", "burst", "perspectiva"], 1.5, 4, "high", ["16:9", "9:16"]],
  ["riso-print-hits", "impacto", ["impacto", "ritmo"], ["misregistration-hit", "beat-pump"], ["impacto", "risograph", "beat", "cor", "registro"], 1, 3, "high", ["16:9", "9:16"]],
  ["particle-celebrate-hits", "impacto", ["impacto", "dado_numerico"], ["confetti-crossfire", "counter-tick-sparks"], ["celebração", "confete", "sparks", "marco", "counter"], 1.5, 3.5, "high", ["16:9", "9:16"]],
  ["sakuga-timing-shift", "impacto", ["impacto", "camera"], ["sakuga-timing-shift"], ["timing", "sakuga", "aceleração", "clímax", "animação"], 2, 5, "high", ["16:9"]],
  ["speed-ramp-freeze", "impacto", ["impacto", "camera"], ["speed-ramp", "freeze-annotate"], ["speed ramp", "freeze", "câmera lenta", "anotação"], 2, 5, "medium", ["16:9", "9:16"]],
  ["icon-performance-moves", "impacto", ["impacto", "elemento"], ["pop-burst-confirm", "attention-bounce"], ["ícone", "burst", "bounce", "confirmação", "atenção"], 1, 3, "high", ["16:9", "9:16"]],

  // ── ELEMENTOS / UI ──
  ["element-body-moves", "elemento", ["elemento"], ["axial-stretch", "contact-shadow-lift"], ["elemento", "stretch", "sombra", "físico"], 1.5, 3.5, "medium", ["16:9"]],
  ["morph-from-primitive", "elemento", ["elemento", "revelacao"], ["morph-from-primitive"], ["morph", "círculo", "card", "revelar"], 2, 4, "low", ["16:9"]],
  ["cloner-depth-echo", "elemento", ["elemento", "camera"], ["cloner-depth-echo"], ["clone", "profundidade", "eco", "trail"], 2, 4, "medium", ["16:9"]],
  ["smear-multiples", "elemento", ["elemento", "impacto"], ["smear-multiples"], ["smear", "cópias", "movimento", "rastro"], 1, 3, "high", ["16:9"]],
  ["skeleton-reveal", "elemento", ["elemento", "revelacao"], ["skeleton-reveal"], ["skeleton", "loading", "revelar", "placeholder"], 3, 6, "low", ["16:9"]],
  ["canvas-materialize-moves", "elemento", ["elemento", "revelacao"], ["panel-to-canvas", "diagram-cascade"], ["canvas", "materializar", "diagrama", "árvore"], 3, 6, "medium", ["16:9"]],
  ["command-palette-summon", "elemento", ["elemento", "processo"], ["command-palette-summon"], ["command palette", "busca", "resultados", "interface"], 3, 6, "medium", ["16:9"]],
  ["type-and-filter", "elemento", ["elemento", "processo"], ["type-and-filter"], ["busca", "filtro", "resultado", "interface"], 3, 6, "medium", ["16:9"]],
  ["integration-hub-map", "elemento", ["elemento", "revelacao"], ["integration-hub-map"], ["integração", "hub", "conexões", "apps"], 3, 6, "medium", ["16:9"]],
  ["collab-cursor-moves", "elemento", ["elemento"], ["dialogue-duet", "cast-ensemble"], ["cursores", "colaboração", "dueto", "ensemble"], 3, 6, "low", ["16:9"]],
  ["input-trigger-moves", "elemento", ["elemento", "impacto"], ["cursor-performance", "keycap-smash-cut"], ["cursor", "tecla", "input", "gatilho"], 1.5, 4, "medium", ["16:9"]],
  ["paper-plane-messenger", "elemento", ["elemento", "transicao"], ["paper-plane-messenger"], ["avião de papel", "mensagem", "envio", "bezier"], 3, 6, "medium", ["16:9"]],
  ["voice-waveform-live", "elemento", ["elemento", "audio"], ["voice-waveform-live"], ["waveform", "voz", "gravação", "barras", "áudio"], 2.5, 5, "medium", ["16:9", "9:16"]],
  ["theme-switch-moves", "elemento", ["elemento"], ["theme-sweep-toggle", "palette-theme-ripple"], ["tema", "switch", "cor", "toggle"], 2, 4, "medium", ["16:9"]],
  ["icon-field-colorize", "elemento", ["elemento", "revelacao"], ["icon-field-colorize"], ["ícones", "grid", "cor", "colorir"], 3, 6, "medium", ["16:9"]],
  ["fui-hud-moves", "elemento", ["elemento", "destaque"], ["line-unfold-panel", "reticle-lock-on"], ["HUD", "reticle", "painel", "FUI", "target"], 2.5, 5, "medium", ["16:9"]],
  ["glow-flyline-moves", "elemento", ["elemento"], ["glow-orb-ambient", "flyline-arc", "orb-flyline-relay"], ["glow", "flyline", "arcos", "orbs", "conexão"], 3, 6, "low", ["16:9"]],
  ["light-play-moves", "elemento", ["elemento", "camera"], ["spotlight-sweep", "sheen-sweep", "halation-bloom"], ["luz", "spotlight", "sheen", "halation", "bloom"], 2, 5, "medium", ["16:9"]],
  ["neon-triple-marquee", "elemento", ["texto", "impacto"], ["neon-triple-marquee"], ["neon", "marquee", "texto", "scroll", "gigante"], 3, 6, "high", ["16:9"]],
  ["page-waterfall-wall", "elemento", ["elemento", "camera"], ["page-waterfall-wall"], ["páginas", "cascata", "wall", "3D", "conteúdo"], 3, 7, "medium", ["16:9"]],
  ["panel-grid-moves", "elemento", ["lista", "impacto"], ["grid-flash-mosaic", "flip-grid-reflow", "comic-panel-split"], ["grid", "mosaico", "flip", "comic", "painéis"], 3, 6, "medium", ["16:9"]],
  ["paper-craft-moves", "elemento", ["elemento"], ["masking-tape-slap", "popup-book-rise"], ["papel", "fita", "pop-up", "craft", "card"], 2.5, 5, "medium", ["16:9"]],
  ["magician-card-flourish", "elemento", ["impacto", "revelacao"], ["magician-card-flourish"], ["mágica", "card", "flash", "starburst", "revelar"], 1.5, 3.5, "high", ["16:9"]],
  ["card-flock-tumble", "elemento", ["impacto", "revelacao"], ["card-flock-tumble"], ["cards", "3D", "tumble", "fumaça", "palavra"], 3, 6, "high", ["16:9"]],
  ["draw-svg-trace", "elemento", ["elemento", "revelacao"], ["draw-svg-trace"], ["traço", "svg", "desenhar", "outline", "revelar"], 2.5, 5, "low", ["16:9"]],
  ["line-boil", "elemento", ["elemento"], ["line-boil"], ["line boil", "textura", "handmade", "vivo", "redesenhar"], 2, 5, "low", ["16:9"]],
  ["ui-to-brand-morph", "elemento", ["encerramento", "brand"], ["icon-flip-bloom", "input-morph-assemble"], ["UI", "brand", "morph", "logo", "encerramento"], 2.5, 5, "medium", ["16:9"]],
  // 106º card — score/impact genérico (humor + ranking)
  ["score-slam-hit", "impacto", ["impacto", "dado_numerico", "ranking"], ["score-slam"], ["score", "slam", "impacto", "pontuação", "hit"], 1, 2.5, "high", ["16:9", "9:16"]],
];

export const SHOTCRAFT_CATALOG = CARD_DEFS.map(
  ([
    templateId,
    category,
    func,
    styles,
    semanticTags,
    minDur,
    maxDur,
    energy,
    formats,
  ]) => ({
    templateId,
    name: templateId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    source: "video-shotcraft",
    category,
    function: func,
    supportedFormats: formats,
    minDurationSec: minDur,
    maxDurationSec: maxDur,
    semanticTags,
    styles,
    energy,
    component: `@shotcraft/${templateId}`,
    approved: true,
  })
);

export function findCard(templateId) {
  return SHOTCRAFT_CATALOG.find((c) => c.templateId === templateId) || null;
}

export function cardsByCategory(category) {
  return SHOTCRAFT_CATALOG.filter((c) => c.category === category);
}

export function cardsByFunction(func) {
  return SHOTCRAFT_CATALOG.filter((c) => c.function.includes(func));
}

export function searchCardsByTags(text, { format = "16:9", limit = 5 } = {}) {
  const t = String(text).toLowerCase();
  return SHOTCRAFT_CATALOG.filter((c) => c.supportedFormats.includes(format))
    .map((c) => {
      const score = c.semanticTags.reduce(
        (s, tag) => s + (t.includes(String(tag).toLowerCase()) ? 1 : 0),
        0
      );
      return { card: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.card);
}

export const CATALOG_STATS = {
  total: SHOTCRAFT_CATALOG.length,
  categories: [...new Set(SHOTCRAFT_CATALOG.map((c) => c.category))],
};
