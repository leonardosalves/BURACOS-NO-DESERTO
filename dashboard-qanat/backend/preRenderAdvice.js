/**
 * Sugestões acionáveis antes do render — mapeia issues de qualidade e gaps de workflow
 * para passos concretos no dashboard Lumiera.
 */

const AUTO_FIX_HOOK = {
  id: "shift_hook_overlays",
  label: "Corrigir automaticamente",
  hint: "O programa move os overlays para depois do gancho (1.5s Short / 5s Long).",
};

const ISSUE_PLAYBOOKS = {
  hook_polluted: {
    title: "Gancho poluído por overlays",
    summary: "Overlays informativos aparecem antes do fim do gancho — prejudica retenção em Shorts.",
    steps: [
      "Clique em Corrigir automaticamente — o Lumiera afasta os overlays do gancho.",
      "Depois clique Atualizar análise para confirmar que o aviso sumiu.",
    ],
    autoFix: AUTO_FIX_HOOK,
    tab: "status",
    priority: "error",
  },
  gap_short: {
    title: "Intervalo curto entre overlays",
    summary: "Dois overlays muito próximos — poluição visual e cansaço.",
    steps: [
      "Verifique o orçamento do formato na aba Render (Short: gap ~5s; Long: ~18s).",
      "Remova ou desloque overlays redundantes no planejamento.",
      "Replaneje com Remotion PRO ou Studio Agents (com memória) para redistribuir no tempo.",
      "Atualize Qualidade Pré-Render até o aviso sumir.",
    ],
    tab: "workflow",
    priority: "warning",
  },
  overlay_budget: {
    title: "Excesso de overlays",
    summary: "Quantidade acima do orçamento do formato — risco de poluição.",
    steps: [
      "Conte overlays na seção Timing overlays IA (aba Render).",
      "Mantenha só os de maior impacto: 1 gancho, 1 prova, 1 fechamento (Short).",
      "Replaneje overlays ou remova tipos repetidos (dois lower-thirds seguidos).",
      "Listicle Short: máximo 2 overlays IA + HUD de ranking.",
    ],
    tab: "workflow",
    priority: "error",
  },
  pattern_interrupt: {
    title: "Cena longa sem estímulo visual",
    summary: "Em Shorts, cenas >12s sem overlay aumentam queda de retenção.",
    steps: [
      "Identifique o bloco/cena na aba Roteiro e Tags.",
      "Adicione um overlay leve (counter, kinetic-text) no meio da cena.",
      "Ou divida a cena em dois cortes visuais no storyboard.",
      "Replaneje overlays e atualize a qualidade.",
    ],
    tab: "timeline",
    priority: "warning",
  },
  weak_hook_visual: {
    title: "Gancho visual fraco",
    summary: "Primeira cena parece logo ou placeholder — hook não prende.",
    steps: [
      "Workflow → Buscar B-roll e troque a imagem da cena 1.",
      "Use o visual mais forte (rosto, ação, dado chocante).",
    ],
    tab: "workflow",
    priority: "warning",
    manualOnly: true,
  },
  text_too_long: {
    title: "Texto de overlay muito longo",
    summary: "Overlay com mais de 12 palavras — difícil de ler no tempo na tela.",
    steps: [
      "Encurte título/subtítulo do overlay para ≤12 palavras.",
      "Divida em dois overlays sequenciais se necessário.",
      "Replaneje overlays ou edite props no storyboard.",
    ],
    tab: "editor",
    priority: "warning",
  },
  lt_repeat: {
    title: "Lower-thirds repetidos",
    summary: "Dois lower-thirds seguidos — falta variedade visual.",
    steps: [
      "Alterne tipos: lower-third → counter → bar-chart → kinetic-text.",
      "Replaneje com HyperFrames AI (catálogo variado).",
      "Studio Agents → Planejar overlays (com memória) aplica regra de variedade.",
    ],
    tab: "agents",
    priority: "info",
  },
  listicle_no_rank: {
    title: "Listicle sem HUD de ranking",
    summary: "Falta badge #N persistente — formato listicle incompleto.",
    steps: [
      "Confirme content_mode LISTICLE e rank_count no projeto.",
      "Replaneje overlays — o sistema injeta rank-progress automaticamente.",
      "Verifique storyboard.list_items preenchido em Roteiro e Tags.",
    ],
    tab: "timeline",
    priority: "warning",
  },
  listicle_no_items: {
    title: "Listicle sem itens no storyboard",
    summary: "list_items vazio — ranking fica genérico.",
    steps: [
      "Creator ou Roteiro e Tags → preencha os itens do ranking.",
      "Depois replaneje overlays.",
    ],
    tab: "timeline",
    priority: "warning",
    manualOnly: true,
  },
  no_bgm: {
    title: "Sem trilha BGM",
    summary: "Nenhuma música mapeada — vídeo pode ficar sem sonoplastia.",
    steps: [
      "Abra a aba Trilha BGM.",
      "Shorts: ative use_single_bgm e escolha uma faixa Epidemic.",
      "Longos: mapeie bgm_mappings por bloco.",
      "Salve config e renderize de novo.",
    ],
    tab: "music",
    priority: "info",
  },
  caption_long: {
    title: "Legendas longas demais",
    summary: "Chunks com mais de 8 palavras — ruim para Shorts virais.",
    steps: [
      "Revise transcrição em Roteiro e Tags ou regenere narração.",
      "Confirme caption_style shorts-viral em Configurações.",
      "Preview 30s para validar ritmo das legendas.",
    ],
    tab: "settings",
    priority: "info",
  },
  slideshow_risk_fail: {
    title: "Risco slideshow — bloqueado",
    summary: "Montagem parece slides animados (texto demais, pouco movimento, repetição).",
    steps: [
      "Adicione B-roll de vídeo (Workflow → Buscar stock inclui Archive.org).",
      "Alterne tipos de overlay: counter → bar-chart → kinetic-text.",
      "Remova lower-thirds placeholder (INFO) — só dados concretos.",
      "Replaneje overlays com Studio Agents e atualize Qualidade Pré-Render.",
    ],
    tab: "workflow",
    priority: "error",
  },
  slideshow_risk_revise: {
    title: "Risco slideshow — revisar",
    summary: "Variedade visual abaixo do ideal — risco de retenção fraca.",
    steps: [
      "Injete 1–2 counters ou bar-charts com dados do roteiro.",
      "Troque imagens estáticas por clip stock quando possível.",
      "Veja dimensões no painel Qualidade Pré-Render (slideshow risk).",
    ],
    tab: "workflow",
    priority: "warning",
  },
  sample_not_rendered: {
    title: "Amostra 12s não renderizada",
    summary: "OpenMontage sample-first: valide gancho e voz antes do render completo.",
    steps: [
      "Aba Render → «Amostra 12s (PRO)» — ouve voz, vê estilo, sente pacing.",
      "Ajuste roteiro/overlays se necessário.",
      "Depois renderize o vídeo completo.",
    ],
    tab: "status",
    priority: "warning",
    manualOnly: true,
  },
  quality_score: {
    title: "Score de qualidade baixo",
    summary: "Vários problemas acumulados — render pode sair abaixo do padrão.",
    steps: [
      "Corrija primeiro os itens marcados como erro (vermelho).",
      "Use Studio Agents → Capturar qualidade para registrar padrões.",
      "Consolide memória e replaneje overlays com memória do estúdio.",
      "Meta: score ≥ 80 (Shorts) antes do render final.",
    ],
    tab: "agents",
    priority: "warning",
  },
};

const WORKFLOW_PLAYBOOKS = {
  generate_tts: {
    title: "Narração ausente",
    summary: "Sem arquivo de narração — o render não pode sincronizar áudio.",
    steps: [
      "Abra Workflow e Tarefas.",
      "Execute Gerar narração TTS (ou grave/importe narração).",
      "Aguarde block_timings.json ser gerado (Whisper/sync).",
      "Volte à aba Render e atualize Qualidade Pré-Render.",
    ],
    tab: "workflow",
    priority: "error",
  },
  sync_timings: {
    title: "Timings não sincronizados",
    summary: "block_timings.json ausente — overlays e legendas não alinham.",
    steps: [
      "Workflow → Sincronizar narração (Whisper).",
      "Confirme que block_timings.json foi criado no projeto.",
      "Replaneje overlays (timing depende dos blocos).",
    ],
    tab: "workflow",
    priority: "error",
  },
  fetch_stock: {
    title: "Cenas sem mídia (B-roll)",
    summary: "Há cenas no roteiro sem imagem/vídeo em ASSETS.",
    steps: [
      "Workflow → Buscar B-roll (Pexels/Pixabay/Bing/Archive.org) para as cenas faltantes.",
      "Ou Associe mídias com IA (auto_map).",
      "Confira previews na aba Editor.",
    ],
    tab: "workflow",
    priority: "warning",
  },
  apply_bgm: {
    title: "Trilha não configurada",
    summary: "Projeto sem BGM mapeada.",
    steps: [
      "Aba Trilha BGM → buscar e aplicar faixa Epidemic.",
      "Shorts: uma faixa única; Longos: uma por bloco.",
    ],
    tab: "music",
    priority: "info",
  },
  publish_prep: {
    title: "Metadados não preparados",
    summary: "Opcional antes do render, mas acelera publicação depois.",
    steps: [
      "Aba IA · Metadados → Gerar Metadados.",
      "Revise títulos, descrição e tags.",
      "Não bloqueia render — faça após compilar se preferir.",
    ],
    tab: "ai",
    priority: "info",
  },
};

const FORMAT_TIPS = {
  SHORT: {
    title: "Checklist Shorts (9:16)",
    summary: "Padrões de sucesso para vídeos curtos.",
    steps: [
      "Gancho limpo 1.5s · pattern interrupt a cada 8–12s.",
      "Legendas shorts-viral (≤8 palavras/chunk).",
      "Listicle: Top 3 ou 5 + HUD rank-progress.",
      "Preview 30s (PRO) antes do render completo.",
    ],
    tab: "status",
    priority: "tip",
  },
  LONG: {
    title: "Checklist Longo (16:9)",
    summary: "Padrões para documentário / vídeo longo.",
    steps: [
      "Gancho limpo 5s · gap 18s entre overlays informativos.",
      "BGM por bloco · progress bar e chapter stingers ativos.",
      "Legendas documentary (frases completas).",
    ],
    tab: "status",
    priority: "tip",
  },
};

function timingOverlaySuggestions(entries = [], format = "SHORT") {
  const bad = entries.filter((e) => e.status && e.status !== "ok");
  if (!bad.length) return [];

  const hookEnd = format === "SHORT" ? 1.5 : 5;
  const inHook = bad.filter((e) => Number(e.startSec) < hookEnd);
  const offScene = bad.filter((e) => /fora da cena|scene/i.test(String(e.message || "")));

  const items = [];
  if (inHook.length) {
    items.push({
      id: "timing_hook",
      priority: "error",
      title: `${inHook.length} overlay(s) no gancho`,
      summary: `${inHook.map((e) => e.id).join(", ")} aparecem antes de ${hookEnd}s — o gancho deve ficar limpo.`,
      steps: ISSUE_PLAYBOOKS.hook_polluted.steps,
      autoFix: AUTO_FIX_HOOK,
      tab: "status",
    });
  }
  if (offScene.length) {
    items.push({
      id: "timing_scene",
      priority: "warning",
      title: `${offScene.length} overlay(s) fora da cena narrativa`,
      summary: "Overlays desalinhados com a cena da narração.",
      steps: [
        "Clique em Corrigir automaticamente — o programa reancora aos blocos/cenas.",
        "Se persistir: Studio Agents → Planejar overlays (com memória).",
      ],
      autoFix: { id: "repair_overlay_timing", label: "Corrigir automaticamente", hint: "Reancora overlays às cenas e ao gancho." },
      tab: "status",
    });
  }
  const other = bad.filter((e) => !inHook.includes(e) && !offScene.includes(e));
  if (other.length) {
    items.push({
      id: "timing_other",
      priority: "warning",
      title: `${other.length} problema(s) de timing de overlay`,
      summary: other.map((e) => `${e.id}: ${e.message || e.status}`).slice(0, 3).join(" · "),
      steps: [
        "Clique em Corrigir automaticamente para ajustar posição e duração.",
        "Veja detalhes em Timing overlays IA (aba Render).",
      ],
      autoFix: { id: "repair_overlay_timing", label: "Corrigir automaticamente", hint: "Ajusta timing dos overlays planejados." },
      tab: "status",
    });
  }
  return items;
}

function dedupeSuggestions(list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = s.id || s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PRIORITY_ORDER = { error: 0, warning: 1, info: 2, tip: 3 };

export function buildPreRenderAdvice(qualityReport = {}, workflow = {}) {
  const suggestions = [];
  const format = qualityReport?.plan?.format || "SHORT";

  for (const issue of qualityReport.issues || []) {
    const book = ISSUE_PLAYBOOKS[issue.code];
    if (book) {
      suggestions.push({
        id: `issue_${issue.code}`,
        priority: issue.severity === "error" ? "error" : book.priority || issue.severity,
        title: book.title,
        summary: issue.message || book.summary,
        steps: book.steps,
        tab: book.tab,
        code: issue.code,
        autoFix: book.autoFix,
        manualOnly: book.manualOnly,
      });
    } else {
      suggestions.push({
        id: `issue_${issue.code || "generic"}_${suggestions.length}`,
        priority: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
        title: issue.code || "Observação de qualidade",
        summary: issue.message,
        steps: [
          "Leia a mensagem acima e corrija no Editor ou Workflow.",
          "Atualize Qualidade Pré-Render.",
          "Se persistir: Studio Agents → Capturar qualidade para registrar o padrão.",
        ],
        tab: "workflow",
        code: issue.code,
      });
    }
  }

  suggestions.push(...timingOverlaySuggestions(qualityReport.overlay_timing?.entries, format));

  for (const action of workflow.actions || []) {
    const book = WORKFLOW_PLAYBOOKS[action.id];
    if (book) {
      suggestions.push({
        id: `workflow_${action.id}`,
        priority: action.severity === "error" ? "error" : book.priority,
        title: book.title,
        summary: action.count ? `${book.summary} (${action.count} itens)` : book.summary,
        steps: book.steps,
        tab: book.tab,
      });
    }
  }

  if (qualityReport.slideshow_risk?.verdict === "fail") {
    const book = ISSUE_PLAYBOOKS.slideshow_risk_fail;
    if (!suggestions.some((s) => s.code === "slideshow_risk_fail")) {
      suggestions.push({
        id: "slideshow_risk_fail",
        priority: "error",
        title: book.title,
        summary: `Score ${qualityReport.slideshow_risk.average}/5 — ${qualityReport.slideshow_risk.findings?.[0]?.message || book.summary}`,
        steps: book.steps,
        tab: book.tab,
        code: "slideshow_risk_fail",
      });
    }
  }

  if (
    qualityReport.plan?.format === "SHORT"
    && !qualityReport.sample_approved
    && (qualityReport.score ?? 0) >= 70
    && !suggestions.some((s) => s.id === "sample_not_rendered")
  ) {
    const book = ISSUE_PLAYBOOKS.sample_not_rendered;
    suggestions.push({
      id: "sample_not_rendered",
      priority: "warning",
      title: book.title,
      summary: book.summary,
      steps: book.steps,
      tab: book.tab,
      manualOnly: true,
    });
  }

  if (Number(qualityReport.score) < 80 && !suggestions.some((s) => s.code === "quality_score")) {
    const book = ISSUE_PLAYBOOKS.quality_score;
    suggestions.push({
      id: "low_score",
      priority: "warning",
      title: book.title,
      summary: `Score atual: ${qualityReport.score}/100`,
      steps: book.steps,
      tab: book.tab,
    });
  }

  const formatTip = FORMAT_TIPS[format] || FORMAT_TIPS.SHORT;
  suggestions.push({
    id: `format_tip_${format}`,
    ...formatTip,
  });

  const sorted = dedupeSuggestions(suggestions).sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
  );

  const blocking = sorted.filter((s) => s.priority === "error");
  const slideshowBlocks = qualityReport.slideshow_risk?.verdict === "fail";
  const ready = blocking.length === 0
    && !slideshowBlocks
    && (qualityReport.score ?? 0) >= 80;

  return {
    ready,
    score: qualityReport.score ?? null,
    format,
    blockingCount: blocking.length + (slideshowBlocks ? 1 : 0),
    suggestionCount: sorted.length,
    suggestions: sorted,
    slideshow_risk: qualityReport.slideshow_risk || null,
  };
}