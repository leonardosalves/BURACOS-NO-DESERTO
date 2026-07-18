import { buildConsolidatedGuidelines } from "./guidelines.js";
import {
  VIRAL_HOOK_TYPES,
  VIRAL_SHORT_FORM_REINFORCEMENT,
  UGC_SCRIPTWRITER_REINFORCEMENT,
  SCRIPT_CREATIVE_REINFORCEMENT,
} from "./viralFrameworks.js";
import { buildChecklistSchemaBlock } from "./assessors.js";
import { VISUAL_PROMPT_SPECIFICITY_RULES } from "../scenePromptSpecificity.js";
import { buildPovContractBlock } from "../../shared/povBlock.js";
import { buildTitleCraftRules } from "../titleGenerator.js";
import {
  buildCinematicNarrationRules,
  buildEpidemicMoodPrompt,
} from "../videoProEnhancements.js";
import { resolveStockSearchQuery } from "../stockSearchQuery.js";
import { isPioneerStrategyText } from "../pioneerNicheDiscovery.js";
import {
  SHORTS_MIN_VIDEO_SCENES,
  SHORTS_VIDEO_SCENE_TYPE,
  IMAGE_SCENE_TYPE,
} from "./visualPromptPipeline.js";
import {
  DEFAULT_VISUAL_ASSET_STYLE,
  buildVisualAssetStyleDirective,
  isMapOnlyPromptsEnabled,
  normalizeVisualAssetStyleId,
} from "../../shared/visualAssetStyles.js";
function resolveUserBlockCount(idea = {}, format = "LONGO") {
  if (Array.isArray(idea?.blocks) && idea.blocks.length > 0)
    return idea.blocks.length;
  return format === "SHORTS" ? 4 : 8;
}

function resolveScriptRules({
  isListicle,
  listicleRank,
  rankOrder,
  format,
  listicleTopic,
  listicleBlockCount,
}) {
  return isListicle
    ? buildListicleScriptRules({
        rankCount: listicleRank,
        rankOrder: rankOrder || "desc",
        format,
        listTopic: listicleTopic,
        blockCount: listicleBlockCount,
      })
    : buildFormatScriptRules(format);
}

function resolveHistoricalWitnessBlock(isHistoricalWitness, historicalWitness) {
  return isHistoricalWitness
    ? buildHistoricalWitnessContractBlock(historicalWitness)
    : "";
}

export function buildFormatScriptRules(format = "LONGO") {
  if (format === "SHORTS") {
    return `
REGRAS ESPECÍFICAS — SHORTS (30–50 segundos, 3–4 blocos):

- UMA ideia, UMA virada, UM payoff. Nada de sub-temas paralelos.
- Orçamento de fatos conforme NARRACAOPRO: máximo 2–3 fatos centrais, pelo menos 1 mecanismo, pelo menos 1 consequência concreta, nenhum fato decorativo.
- Bloco 1 (gancho): ≤10 palavras, voz ativa — use um dos tipos de gancho viral (pergunta, choque, problema/solução, antes/depois, urgência, desafio, segredo leve, impacto pessoal).
- Bloco 2 (contexto): 1 frase — quem/o quê/onde. Sem história paralela.
- Bloco 3 (desenvolvimento): 2–3 fatos centrais com números, datas ou analogias do dia a dia — cada fato sobe a aposta.
- Bloco 4 (virada + stakes): o detalhe que muda a perspectiva + por que isso importa hoje (risco, consequência moderna).
- Bloco 5 (payoff): responde o gancho do bloco 1 em 1-2 frases DECLARATIVAS — mic drop factual. Sem pergunta vazia ao espectador.
- Narração total: 80–130 palavras. Frases de até 12 palavras na maioria.
- Ritmo: alterne frase curta (3–5 palavras) + frase explicativa. Nunca dois parágrafos densos seguidos.
- O espectador deve entender a mensagem mesmo sem som (pela lógica do texto).

${VIRAL_SHORT_FORM_REINFORCEMENT}
`;
  }

  return `
REGRAS ESPECÍFICAS — VÍDEO LONGO (10–20 min, 12 blocos):

- Estrutura em capítulos mentais: Gancho → Promessa → Contexto → 4-6 blocos de desenvolvimento (cada um com mini-payoff) → Tensão → Revelação principal → Síntese → CTA.
- Cada bloco termina com ponte para o próximo ("Mas o detalhe que muda tudo vem agora..." só se o próximo bloco realmente entregar).
- Repita a tese central com palavras diferentes no bloco 7 e no bloco 11 (âncora de memória), sem copiar frases.
- Profundidade SIM, enrolação NÃO: cada bloco adiciona fato, exemplo ou consequência nova — nunca repete o mesmo argumento com sinônimos.
- Dados e datas quando possível; histórias humanas de 2-3 frases para emocionar.
- Narração: 1500–3000 palavras. Parágrafos de 3-5 frases no máximo.
- Ao final, o espectador deve conseguir explicar o tema para outra pessoa em 30 segundos.
`;
}

export function buildScriptChecklistEvaluationPrompt({
  narrative_script = "",
  strategy = {},
  format = "SHORTS",
  ideaTitle = "",
  niche = "",
} = {}) {
  const title = strategy.title_main || ideaTitle || "";
  const hook = strategy.hook || "";
  return `Você é avaliador de qualidade para vídeos YouTube (Script Master Lumiera).

Avalie o roteiro abaixo e preencha o checklist de qualidade com notas REAIS de 1 a 10 (nunca deixe tudo 0).

FORMATO: ${format}
NICHO: ${niche || "geral"}
TÍTULO: ${title}
GANCHO: ${hook}

NARRAÇÃO:
"""
${String(narrative_script).trim().slice(0, 6000)}
"""

Responda APENAS JSON válido:
{
  "checklist": {
    "click_potential": 0-10,
    "retention_potential": 0-10,
    "comments_potential": 0-10,
    "feedback": "recomendações IA em PT-BR",
    "corrections": ["correção 1", "correção 2"]
  }
}`;
}

export function buildIdeasQualityAddendum() {
  return `
Para cada ideia, inclua em "why_it_works" como a mensagem central será compreensível para leigos.
Evite ideias cujo título promete algo que 40 segundos (Shorts) ou 12 minutos (Longo) não conseguem entregar com clareza.
`;
}

export function buildIdeaOpportunityAddendum(format = "LONGO") {
  const isShorts = String(format).toUpperCase() === "SHORTS";
  return `
CONTRATO DE OPORTUNIDADE EDITORIAL (OBRIGATÓRIO):
- Não confunda assunto interessante com oportunidade pouco explorada. Evite clichês e temas já cobertos por muitos canais sem um recorte novo comprovável.
- Toda ideia precisa nascer de algo documentado que aconteceu/acontece ou, quando o nicho aceitar previsão, de um cenário plausível apoiado em mecanismo e evidência. Nunca apresente hipótese como fato.
- "reality_status": documented | current | plausible | disputed. Use "plausible" apenas para futuro/cenário possível e explique a condição; use "disputed" quando fontes divergem.
- "evidence_anchor": fato, caso, evento, dado, estudo, pessoa, local ou mecanismo específico que permite pesquisar e verificar a ideia.
- "saturation_level": low | medium | high | unknown. Só use "low" quando a pesquisa/concorrência trouxer sinal concreto de pouca cobertura. Sem evidência, use "unknown".
- "saturation_evidence": sinal observado que justifica o nível. Não invente volume de busca, quantidade de vídeos ou métricas.
- "undercovered_reason": por que este recorte permanece pouco tratado e como ele difere dos vídeos comuns do nicho.
- "premium_upgrade": melhoria prática de tese, recorte, narrativa, evidência e proposta visual para o vídeo parecer premium.
- "validation_needed": o que ainda precisa ser confirmado antes do roteiro. Pode ser "nenhuma validação crítica" somente quando o contexto de pesquisa sustentar a ideia.
- Descarte ideias com saturation_level="high", salvo quando houver um recorte claramente novo em undercovered_reason.
- Se uma afirmação não estiver apoiada no contexto de pesquisa, formule-a como pergunta de investigação, não como verdade.
- A lista final é uma lista de ideias PRONTAS PARA ROTEIRO, não uma fila de hipóteses para pesquisar depois.
- Na lista final, aceite somente reality_status="documented" ou "current", com evidence_anchor concreto e validation_needed="nenhuma validação crítica".
- Se a premissa central ainda exigir confirmar, verificar, aprofundar, identificar, provar ou encontrar fontes/estudos, DESCARTE a ideia inteira e substitua por outra já sustentada pela pesquisa.
- Ideias "plausible" ou "disputed" podem orientar a pesquisa interna, mas são PROIBIDAS no array final e jamais podem receber recomendação.

ADEQUAÇÃO AO FORMATO:
${
  isShorts
    ? `- O vídeo deve caber em no máximo 60 segundos. Escolha UMA revelação central, 2–3 evidências curtas e conclusão direta.
- "format_fit" deve ser SHORTS. Se o tema exigir antecedentes, múltiplas causas, controvérsia ou mais de 3 evidências, descarte-o desta lista e proponha um recorte menor.
- "recommended_duration": entre 30 e 60 segundos.`
    : `- O vídeo deve justificar explicação aprofundada: causa, contexto, mecanismo, consequência e pelo menos 3 evidências ou exemplos.
- "format_fit" deve ser LONGO. Ideias explicáveis por inteiro em menos de 60 segundos devem ser aprofundadas com um recorte legítimo ou descartadas desta lista.
- "recommended_duration": entre 6 e 12 minutos.`
}
`;
}

function hasNoCriticalValidation(value = "") {
  return /^(nenhuma|nenhum|não há|nao ha|sem)\b/i.test(String(value).trim());
}

export function assessIdeaScriptEligibility(item = {}) {
  const realityStatus = String(item.reality_status ?? item.realityStatus ?? "")
    .trim()
    .toLowerCase();
  const evidenceAnchor = String(
    item.evidence_anchor ?? item.evidenceAnchor ?? ""
  ).trim();
  const validationNeeded = String(
    item.validation_needed ?? item.validationNeeded ?? ""
  ).trim();
  const blockingReasons = [];

  if (!["documented", "current"].includes(realityStatus)) {
    blockingReasons.push(
      `premissa com realidade "${realityStatus || "não informada"}"`
    );
  }
  if (!evidenceAnchor || evidenceAnchor.length < 12) {
    blockingReasons.push("âncora factual concreta ausente");
  }
  if (!validationNeeded || !hasNoCriticalValidation(validationNeeded)) {
    blockingReasons.push("validação factual crítica ainda pendente");
  }

  return {
    script_eligible: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
  };
}

export function normalizeIdeaOpportunity(item = {}, { format = "LONGO" } = {}) {
  const pick = (...values) =>
    String(values.find((value) => value != null && value !== "") ?? "").trim();
  const allowedReality = new Set([
    "documented",
    "current",
    "plausible",
    "disputed",
  ]);
  const allowedSaturation = new Set(["low", "medium", "high", "unknown"]);
  const realityRaw = pick(
    item.reality_status,
    item.realityStatus
  ).toLowerCase();
  const saturationRaw = pick(
    item.saturation_level,
    item.saturationLevel
  ).toLowerCase();
  const fallbackFormat =
    String(format).toUpperCase() === "SHORTS" ? "SHORTS" : "LONGO";
  const formatRaw = pick(
    item.format_fit,
    item.formatFit,
    item.best_format,
    item.bestFormat
  ).toUpperCase();
  const validationNeeded = pick(item.validation_needed, item.validationNeeded);
  const hasPendingValidation =
    validationNeeded && !hasNoCriticalValidation(validationNeeded);
  const normalizedReality =
    ["documented", "current"].includes(realityRaw) && hasPendingValidation
      ? "disputed"
      : allowedReality.has(realityRaw)
        ? realityRaw
        : "disputed";
  const evidenceAnchor = pick(item.evidence_anchor, item.evidenceAnchor);
  const eligibility = assessIdeaScriptEligibility({
    reality_status: normalizedReality,
    evidence_anchor: evidenceAnchor,
    validation_needed: validationNeeded,
  });

  return {
    ...item,
    reality_status: normalizedReality,
    evidence_anchor: evidenceAnchor,
    saturation_level: allowedSaturation.has(saturationRaw)
      ? saturationRaw
      : "unknown",
    saturation_evidence: pick(
      item.saturation_evidence,
      item.saturationEvidence
    ),
    undercovered_reason: pick(
      item.undercovered_reason,
      item.undercoveredReason
    ),
    format_fit: ["SHORTS", "LONGO"].includes(formatRaw)
      ? formatRaw
      : fallbackFormat,
    recommended_duration: pick(
      item.recommended_duration,
      item.recommendedDuration
    ),
    premium_upgrade: pick(item.premium_upgrade, item.premiumUpgrade),
    validation_needed: validationNeeded,
    ...eligibility,
  };
}

export function buildCustomIdeaEvaluationPrompt({
  niche = "",
  format = "LONGO",
  title = "",
  hook = "",
  outline = "",
  researchContext = "",
} = {}) {
  return `Você é o editor-chefe de desenvolvimento do Lumiera. Avalie a ideia do usuário sem apagar sua intenção.

NICHO: ${String(niche).trim() || "não informado"}
FORMATO ESCOLHIDO: ${format}
IDEIA/TÍTULO: ${String(title).trim()}
GANCHO ATUAL: ${String(hook).trim() || "não informado"}
PROMESSA/ESTRUTURA ATUAL: ${String(outline).trim() || "não informada"}

${researchContext}

${buildIdeaOpportunityAddendum(format)}

TAREFA:
1. Preserve o núcleo da ideia e diga se ela é real, plausível, disputada ou não verificável com o contexto disponível.
2. Avalie saturação com honestidade. Sem evidência competitiva, marque unknown.
3. Verifique se cabe no formato escolhido e recomende SHORTS ou LONGO conforme a profundidade real.
4. Crie uma versão premium mais específica, verificável e visual, sem clickbait falso.
5. Dê ações concretas para melhorar a ideia antes de gerar o roteiro.

Responda SOMENTE JSON válido:
{
  "verdict": "strong | promising | needs_research | weak",
  "summary": "diagnóstico editorial direto",
  "reality_status": "documented | current | plausible | disputed",
  "evidence_anchor": "âncora factual específica ou lacuna encontrada",
  "saturation_level": "low | medium | high | unknown",
  "saturation_evidence": "evidência honesta ou 'não confirmado'",
  "undercovered_reason": "lacuna e diferencial do recorte",
  "format_fit": "SHORTS | LONGO",
  "recommended_duration": "duração recomendada",
  "premium_upgrade": "como elevar tese, narrativa, evidência e visual",
  "validation_needed": "checagens ainda necessárias",
  "improved_title": "título premium no idioma da ideia",
  "improved_hook": "gancho fiel e específico",
  "improved_promise": "promessa clara e entregável",
  "suggested_blocks": ["bloco ou beat 1", "bloco ou beat 2"],
  "actions": ["ação concreta 1", "ação concreta 2", "ação concreta 3"]
}`;
}

export function buildViralIdeasAddendum(format = "LONGO") {
  const hookList = VIRAL_HOOK_TYPES.map(
    (h) => `  - ${h.id}: ${h.label} (ex.: "${h.example}")`
  ).join("\n");
  const isShorts = format === "SHORTS";

  return `
FRAMEWORK VIRAL DE IDEIAS (curadoria + ganchos — use em TODAS as 10 ideias):

CATEGORIAS DE HISTÓRIA (campo "viral_category" — varie entre as 10 ideias):
- impactful | practical | provocative | astonishing
Descarte ideias: ad-driven, puramente políticas, sem substância factual.

TIPOS DE GANCHO (campo "hook_angle" — use tipos DIFERENTES entre ideias):
${hookList}

${
  isShorts
    ? `PROCESSO MENTAL POR IDEIA SHORT (não entregue rascunho — só metadados):
1. Esboce 3 ganchos candidatos (campo "hook_candidates": array de 3 strings ≤10 palavras)
2. Escolha o melhor em "hook_angle" + "hooks" (gancho principal para o roteiro)
3. Planeje 2–3 fatos centrais verificáveis em "wow_facts_preview" (números/datas curtos, conforme orçamento NARRACAOPRO)`
    : `Para LONGO: "hook_angle" indica o tipo de abertura; "hooks" = gancho de retenção dos primeiros 30s.`
}

REGRAS:
- Cada ideia deve ter "viral_category" e "hook_angle" (id do tipo, ex.: "shock", "before_after")
- "hooks" = gancho principal ≤10 palavras em PT-BR, voz ativa
- Varie categorias e tipos de gancho — não repita o mesmo hook_angle em mais de 2 ideias
- Filtros: sem clickbait falso, sem política partidária, sem tema sem fatos verificáveis
`;
}

export function buildNicheIsolationAddendum(niche = "") {
  const n = String(niche).trim();
  return `
ISOLAMENTO DE NICHO (CRÍTICO — violação invalida a resposta):
- O usuário está explorando APENAS o nicho: "${n}"
- NÃO use, adapte, mencione nem sugira temas de outros canais, nichos ou vídeos que o usuário possa ter feito antes — a menos que estejam literalmente dentro de "${n}"
- Esta busca é independente do histórico do usuário no programa. Trate "${n}" como um canal novo, sem memória de projetos passados
- Cada sugestão deve ser defensável como pertencente a "${n}"; se não couber, descarte
- Se "${n}" for amplo, distribua sugestões em subáreas DIFERENTES do próprio nicho (não desvie para nichos adjacentes que o usuário não pediu)`;
}

export function buildNicheVarietyInstruction(niche = "") {
  const n = String(niche).trim();
  return `
DIRETRIZ DE VARIABILIDADE (somente dentro de "${n}"):
- Explore ângulos DIFERENTES entre si, todos estritamente dentro de "${n}"
- Varie quando fizer sentido: perguntas do público, mitos vs realidade, recordes, comparações improváveis, impacto no cotidiano, controverses, ciência, origem surpreendente, antes/depois, erros famosos, lendas verificáveis
- Proibido puxar temas de engenharia antiga, impérios ou invenções clássicas SE "${n}" não for explicitamente sobre história ou engenharia
- Busque fatos frescos sobre "${n}" — como se fosse a primeira pesquisa desse canal, sem repetir clichês de outros nichos`;
}

export const SHORTS_LISTICLE_RANK_OPTIONS = [3, 5];

export function resolveListicleBlockCount({
  rankCount = 20,
  format = "LONGO",
} = {}) {
  const rank = clampListicleRankCount(rankCount, format);
  return rank + 2;
}

export function clampListicleRankCount(rankCount = 20, format = "LONGO") {
  const rank = Math.min(50, Math.max(3, Number(rankCount) || 20));
  if (format === "SHORTS") {
    if (SHORTS_LISTICLE_RANK_OPTIONS.includes(rank)) return rank;
    return rank <= 4 ? 3 : 5;
  }
  return rank;
}

export function buildListicleIdeasAddendum({
  rankCount = 20,
  listTopic = "",
  rankOrder = "desc",
} = {}) {
  const orderLabel =
    rankOrder === "asc" ? "1 até N (build-up)" : "N até 1 (countdown)";
  return `
MODO LISTICLE / TOP N (OBRIGATÓRIO):
- Gere exatamente 10 ideias de vídeo no formato "Top ${rankCount}" sobre: "${listTopic}"
- Cada título deve incluir o número (${rankCount}) e o tema de forma específica (ex: "Top ${rankCount} Invenções Chinesas Que o Ocidente Ignora")
- Ordem narrativa sugerida: ${orderLabel}
- Em "why_it_works", explique por que o formato ranking retém (curiosidade do #1, debate nos comentários, rewatch)
- Inclua campo extra em cada ideia: "listicle_angle" (ex: "surpresa histórica", "impacto no dia a dia", "mito vs realidade")
- Varie o recorte: país, época, categoria técnica, impacto humano, invenções esquecidas
- Evite itens genéricos repetidos entre ideias (ex: não sugerir 10x "Top ${rankCount} invenções" com o mesmo ângulo)
`;
}

const LISTICLE_RANKING_ARCHETYPES = [
  "mais subestimados / esquecidos pelo público",
  "que mudaram o mundo (impacto global)",
  "mais perigosos / destrutivos / letais",
  "mais controversos (geram debate nos comentários)",
  "que você usa todo dia sem saber a origem",
  "de um país ou civilização específica",
  "piores falhas / erros históricos",
  "recordes que parecem impossíveis",
  "que especialistas discordam no #1",
  "para iniciantes entenderem o nicho",
  "antes vs depois de um evento marcante",
  "mais lucrativos / de maior ROI / impacto econômico",
];

export function buildListicleRankingIdeasPrompt({
  niche = "",
  format = "LONGO",
  compact = false,
} = {}) {
  const archetypes = LISTICLE_RANKING_ARCHETYPES.map(
    (a, i) => `${i + 1}. ${a}`
  ).join("\n");
  const isShorts = format === "SHORTS";
  const formatRules = isShorts
    ? `- FORMATO SHORTS (exclusivo): "suggested_rank_count" deve ser APENAS 3 ou 5 — nunca outro número
- Títulos com "Top 3" ou "Top 5" conforme a profundidade do tema no nicho
- Mix obrigatório: ~6 ideias Top 3 (gancho rápido, 35-50s) e ~6 ideias Top 5 (mais denso, 45-60s)
- "best_format" sempre "SHORTS" em todas as ideias
- Rankings Top 3: ângulos de choque imediato, 1 fato forte por item
- Rankings Top 5: ângulos com mais variedade/categorias, ainda cabendo em Short`
    : `- FORMATO LONGO: "suggested_rank_count" entre 5 e 20 (varie: Top 5, 10, 15, 20 conforme profundidade)
- "best_format" preferencialmente "LONGO" (algumas ideias podem ser "SHORTS" se o tema for naturalmente curto)`;

  return `Você é um estrategista de YouTube especializado em vídeos LISTICLE / TOP N com alta retenção.

O usuário escolheu o NICHO: "${niche}"
Formato preferido: ${format}${isShorts ? " (SHORTS — apenas Top 3 e Top 5)" : ""}

SUA MISSÃO: Sugerir exatamente 12 ideias de RANKINGS interessantes, específicos e variados DENTRO desse nicho — não títulos genéricos.

${
  compact
    ? `- Foque só no nicho "${niche}". Varie ângulos (subestimados, controversos, recordes, etc.).`
    : `${buildNicheIsolationAddendum(niche)}

${buildNicheVarietyInstruction(niche)}

${SCRIPT_CREATIVE_REINFORCEMENT}`
}

ARQUÉTIPOS DE RANKING (use pelo menos 8 tipos diferentes entre as 12 ideias):
${archetypes}

REGRAS DE RETENÇÃO / QUALIDADE (obrigatório):
- Cada ideia deve ser um ranking DISTINTO — não 12 variações do mesmo tema
- Títulos em PT-BR, específicos, com número no título
${formatRules}
- Inclua 3 "sample_items" como NOMES CURTOS de itens (máx. 40 caracteres cada — só o nome, sem explicação entre parênteses)
- "controversy_hook": por que o #1 vai surpreender ou gerar comentário
- "why_interesting": 1 frase sobre apelo de retenção (curiosidade, choque, nostalgia, debate)
- "list_topic": tema interno curto para gerar o roteiro (ex: "invenções chinesas antigas subestimadas")
- Proibido: rankings vagos ("Top 10 coisas legais"), clichês saturados, itens fictícios
- Priorize ângulos que o público do nicho BUSCA mas raramente encontra em listas bem feitas

${buildIdeaOpportunityAddendum(format)}

Responda APENAS JSON válido (sem markdown, sem texto extra):
{
  "niche_analysis": {
    "audience_profile": "quem assiste esse nicho",
    "what_they_search": "o que buscam no YouTube",
    "comment_triggers": "o que faz comentar",
    "best_ranking_styles": "que estilos de top N funcionam aqui"
  },
  "ranking_ideas": [
    {
      "title": "Top 15 ...",
      "suggested_rank_count": 15,
      "list_topic": "tema curto para roteiro",
      "listicle_angle": "subestimados | controversos | impacto diário | ...",
      "promise": "promessa do vídeo",
      "why_interesting": "por que esse ranking prende",
      "controversy_hook": "gancho do #1 surpreendente",
      "sample_items": ["item real 1", "item real 2", "item real 3"],
      "emotion": "emoção dominante",
      "best_format": "LONGO ou SHORTS",
      "reality_status": "documented | current | plausible | disputed",
      "evidence_anchor": "fato/caso verificável que sustenta a lista",
      "saturation_level": "low | medium | high | unknown",
      "saturation_evidence": "sinal de cobertura observado ou não confirmado",
      "undercovered_reason": "por que este recorte é pouco tratado",
      "format_fit": "LONGO ou SHORTS",
      "recommended_duration": "duração recomendada",
      "premium_upgrade": "como tornar o ranking premium",
      "validation_needed": "o que validar antes do roteiro"
    }
  ],
  "best_index": 0,
  "best_reason": "por que essa é a melhor ideia de ranking agora"
}`;
}

function normalizeRankingIdeaItem(item = {}) {
  const pickStr = (...vals) => String(vals.find((v) => v) ?? "").trim();
  const count = Number(
    item.suggested_rank_count ??
      item.suggestedRankCount ??
      item.rank_count ??
      item.quantidade ??
      0
  );
  return normalizeIdeaOpportunity(
    {
      title: pickStr(item.title, item.titulo),
      suggested_rank_count: count > 0 ? count : 15,
      list_topic: pickStr(
        item.list_topic,
        item.listTopic,
        item.tema,
        item.topic
      ),
      listicle_angle: pickStr(
        item.listicle_angle,
        item.listicleAngle,
        item.angle,
        item.angulo
      ),
      promise: pickStr(item.promise, item.promessa),
      why_interesting: pickStr(
        item.why_interesting,
        item.whyInteresting,
        item.why_it_works,
        item.por_que
      ),
      controversy_hook: pickStr(
        item.controversy_hook,
        item.controversyHook,
        item.gancho,
        item.hook
      ),
      sample_items: Array.isArray(item.sample_items)
        ? item.sample_items
        : Array.isArray(item.sampleItems)
          ? item.sampleItems
          : Array.isArray(item.exemplos)
            ? item.exemplos
            : [],
      emotion: pickStr(item.emotion, item.emocao),
      best_format:
        pickStr(item.best_format, item.bestFormat, item.formato) || "LONGO",
      reality_status: pickStr(item.reality_status, item.realityStatus),
      evidence_anchor: pickStr(item.evidence_anchor, item.evidenceAnchor),
      saturation_level: pickStr(item.saturation_level, item.saturationLevel),
      saturation_evidence: pickStr(
        item.saturation_evidence,
        item.saturationEvidence
      ),
      undercovered_reason: pickStr(
        item.undercovered_reason,
        item.undercoveredReason
      ),
      format_fit: pickStr(item.format_fit, item.formatFit),
      recommended_duration: pickStr(
        item.recommended_duration,
        item.recommendedDuration
      ),
      premium_upgrade: pickStr(item.premium_upgrade, item.premiumUpgrade),
      validation_needed: pickStr(item.validation_needed, item.validationNeeded),
    },
    {
      format:
        pickStr(item.best_format, item.bestFormat, item.formato) || "LONGO",
    }
  );
}

export function normalizeListicleIdeasResponse(
  data = {},
  { format = "LONGO" } = {}
) {
  if (Array.isArray(data)) {
    return normalizeListicleIdeasResponse({ ranking_ideas: data }, { format });
  }
  if (!data || typeof data !== "object") {
    return {
      niche_analysis: {},
      ranking_ideas: [],
      best_index: 0,
      best_reason: "",
    };
  }

  const ideasKey = Object.keys(data).find((k) =>
    /ranking_ideas|rankingideas|ideias_ranking|ideias_de_ranking|lista_rankings|rankings|ideias/i.test(
      k
    )
  );
  const analysisKey = Object.keys(data).find((k) =>
    /niche_analysis|analise_nicho|nicheanalysis|analise_do_nicho/i.test(k)
  );

  let rawIdeas =
    data.ranking_ideas ?? data[ideasKey] ?? data.ideas ?? data.rankings ?? [];
  if (!Array.isArray(rawIdeas) && rawIdeas && typeof rawIdeas === "object") {
    rawIdeas = Object.values(rawIdeas);
  }
  if (!Array.isArray(rawIdeas)) rawIdeas = [];

  const normalizedIdeas = rawIdeas
    .map(normalizeRankingIdeaItem)
    .map((item) => {
      if (format !== "SHORTS") return item;
      const rank = clampListicleRankCount(item.suggested_rank_count, "SHORTS");
      return {
        ...item,
        suggested_rank_count: rank,
        best_format: "SHORTS",
        title: item.title.replace(/\btop\s+\d+\b/gi, `Top ${rank}`),
      };
    })
    .filter((item) => item.title.length > 3);
  const requestedBestIndex = Math.max(
    0,
    Math.min(
      normalizedIdeas.length - 1,
      Number(
        data.best_index ??
          data.bestIndex ??
          data.melhor_indice ??
          data.best_idea_index ??
          0
      ) || 0
    )
  );
  const requestedBestIdea = normalizedIdeas[requestedBestIndex];
  const ranking_ideas = normalizedIdeas.filter(
    (item) => item.script_eligible === true
  );

  const rawAnalysis = data.niche_analysis ?? data[analysisKey] ?? {};
  const niche_analysis =
    typeof rawAnalysis === "object" && rawAnalysis !== null ? rawAnalysis : {};

  const remappedBestIndex = requestedBestIdea
    ? ranking_ideas.indexOf(requestedBestIdea)
    : -1;
  const best_index = ranking_ideas.length
    ? remappedBestIndex >= 0
      ? remappedBestIndex
      : 0
    : -1;

  return {
    niche_analysis,
    ranking_ideas,
    best_index,
    best_reason: String(
      data.best_reason ??
        data.bestReason ??
        data.melhor_motivo ??
        data.best_idea_reason ??
        ""
    ).trim(),
    rejected_idea_count: normalizedIdeas.length - ranking_ideas.length,
  };
}

export function buildListicleScriptRules({
  rankCount = 20,
  rankOrder = "desc",
  format = "LONGO",
  listTopic = "",
  blockCount = 22,
} = {}) {
  const orderDesc = rankOrder !== "asc";
  const itemBlocks = blockCount - 2;
  const isShortsTop3 = format === "SHORTS" && itemBlocks <= 3;
  const wordsPerItem =
    format === "SHORTS" ? (isShortsTop3 ? "15-22" : "20-30") : "80-140";
  const totalWords =
    format === "SHORTS"
      ? isShortsTop3
        ? "65-95"
        : "110-150"
      : `${itemBlocks * 90}-${itemBlocks * 150}`;
  const shortsDuration = isShortsTop3 ? "30-45 segundos" : "45-60 segundos";

  return `
MODO LISTICLE / TOP N — ESTRUTURA OBRIGATÓRIA (prioridade sobre regras de documentário padrão):

TEMA DA LISTA: "${listTopic}"
ITENS NA LISTA: ${itemBlocks}
${format === "SHORTS" ? `DURAÇÃO ALVO (SHORTS): ${shortsDuration}` : ""}
ORDEM: ${orderDesc ? `countdown ${itemBlocks} → 1 (maior retenção — comece pelo item #${itemBlocks})` : `build-up 1 → ${itemBlocks} (crescendo até o #${itemBlocks})`}
TOTAL DE BLOCOS: ${blockCount} (bloco 1 = intro, blocos 2-${blockCount - 1} = um item cada, bloco ${blockCount} = recap + CTA)

ESTRUTURA DOS BLOCOS:
- Bloco 1 (INTRO): gancho em 3 segundos + promessa da lista + por que ESSA lista importa hoje. Não revele o #1 ainda.
- Blocos 2-${blockCount - 1} (ITENS): EXATAMENTE 1 item por bloco, nesta ordem:
  ${orderDesc ? `  • Bloco 2 = item #${itemBlocks}, bloco 3 = #${itemBlocks - 1} ... bloco ${blockCount - 1} = #1` : `  • Bloco 2 = item #1, bloco 3 = #2 ... bloco ${blockCount - 1} = #${itemBlocks}`}
  Cada bloco de item DEVE conter:
    1. Chamada do ranking ("Número X..." ou "Em Xº lugar...")
    2. Nome do item/invenção/evento (claro e específico)
    3. Contexto: ano, inventor, país ou civilização (quando aplicável)
    4. ${format === "SHORTS" ? "1 fato concreto que surpreende (o mais forte — não enfileire fatos)" : "2 fatos concretos que surpreendem"}
    5. Impacto no mundo moderno (1 frase curta)
    6. Ponte oral de 3-5 palavras para o próximo item (exceto no último item antes do outro)
- Bloco ${blockCount} (OUTRO): ${format === "SHORTS" ? "1 frase de recap declarativa + mic drop (consequência ou fato final)" : "recap do top 3 em 2 frases + fechamento declarativo — sem perguntas vazias"}
${
  format === "SHORTS"
    ? `
NARRAÇÃO SHORTS — HUMANA, ENXUTA E CLARA (prioridade máxima):
- TOTAL: ${totalWords} palavras. Se passar do teto, CORTE antes de entregar — menos é mais.
- Por item: ~${wordsPerItem} palavras — nome + 1 fato forte + 1 linha de impacto. Proibido empilhar 3 fatos no mesmo item.
- Intro: máximo 2 frases curtas (gancho + promessa do ranking).
- Tom oral PT-BR: como quem CONTA ao vivo — use transições naturais ("Olha isso", "E o mais insano?", "Agora o topo").
- Frases de até 10-12 palavras na maioria. Ritmo de countdown, zero enrolação.
- O telespectador deve entender a mensagem de CADA item na primeira escuta, mesmo sem conhecer o tema.
- 1 ideia por frase. Se uma frase não avança o ranking, remova.
`
    : ""
}

NARRAÇÃO CINEMATOGRÁFICA (narrative_script_tagged):
- [pausa] antes de cada número do ranking e antes do #1
- [ênfase] no nome do item e em números/datas
- [rápido] na ponte entre itens; [lento] no impacto histórico
- narrative_script = texto limpo SEM marcadores

REGRAS DE NARRAÇÃO:
- ${totalWords} palavras no total (teto rígido — prefira ficar abaixo do máximo)
- ~${wordsPerItem} palavras por item
- Humanize: linguagem falada, transições orais, zero tom de redação ou Wikipedia
- Frases curtas, ritmo de countdown — sem enrolação entre itens
- NUNCA pule um número da lista; NUNCA repita o mesmo item
- Itens devem ser REAIS e verificáveis — sem invenção fictícia
- Diversifique tipos de itens (não 20 itens iguais da mesma categoria)

VISUAL_PROMPTS (crítico para listicle):
- Mínimo 3 cenas por item (bloco de item)
- A PRIMEIRA cena de cada item deve ter "text_overlay": "#N — NOME DO ITEM" (N = rank daquele bloco)
- Prompts visuais: objeto/invenção em close, contexto histórico, impacto moderno
- ${format === "SHORTS" ? 'SHORTS: mínimo 3 cenas com type "vídeo IA (max 10s)" distribuídas (gancho, meio, payoff); demais imagem 2K' : "80-90% imagem 2K, 10-20% vídeo IA"}

IMPACT_TEXTS (obrigatório):
- Um impact_text por bloco de item: {"block": N, "start_offset": 0.0, "end_offset": 4.0, "text": "#20 — NOME"}
- Intro: {"block": 1, "start_offset": 0.0, "end_offset": 5.0, "text": "TOP ${itemBlocks}"}

CAMPO EXTRA NO JSON — "listicle":
{
  "content_mode": "LISTICLE",
  "rank_count": ${itemBlocks},
  "rank_order": "${orderDesc ? "desc" : "asc"}",
  "topic": "${listTopic}"
}

CAMPO EXTRA — "list_items" (array com ${itemBlocks} objetos):
{
  "rank": 20,
  "title": "Nome do item",
  "year": "ano ou período",
  "origin": "país/civilização",
  "block": 2,
  "hook_line": "frase de gancho do item",
  "visual_hook": "english stock term"
}
`;
}

export function buildHumanizeRepairPrompt({
  format,
  ideaTitle,
  rawScript,
  blockCount,
}) {
  const guidelinesBlock = buildConsolidatedGuidelines();

  return `Você é um roteirista brasileiro especialista em clareza e naturalidade para YouTube.

${guidelinesBlock}

O roteiro abaixo foi gerado por IA e pode estar robótico, confuso ou com mensagem difusa. REESCREVA apenas os campos de texto da narração mantendo a fidelidade das diretrizes acima.

FORMATO: ${format}
TÍTULO DA IDEIA: ${ideaTitle}
BLOCOS ESPERADOS: ${blockCount}

ROTEIRO ATUAL (JSON parcial):
${JSON.stringify(rawScript, null, 2).slice(0, 12000)}

TAREFAS OBRIGATÓRIAS:
1. Reescreva "narrative_script" em PT-BR natural, como narração falada — frases que soam bem em voz alta.
2. Reescreva "narrative_script_tagged" com as mesmas palavras + tags de áudio ([pause], (breath), etc.).
3. Reescreva "technical_config.script" dividido em exatamente ${blockCount} parágrafos (um por bloco), separados por linha em branco.
4. Atualize "technical_config.block_phrases" — cada "phrase" deve ser o início EXATO do bloco (4-8 palavras, todas diferentes).
5. Atualize "strategy.hook" se estiver genérico.
6. Mantenha a TESE do vídeo; remova frases vazias, clichês de IA e trechos que não ajudam o espectador a entender.
7. FINAL declarativo — sem "Você prefere…?" nem CTAs de comentário forçados.
8. NÃO altere visual_prompts, bgm_mappings nem impact_texts.

${UGC_SCRIPTWRITER_REINFORCEMENT}
9. Em "narrative_script_tagged", use marcadores cinematográficos com moderação: [pausa], [ênfase], [rápido], [lento] — ver regras de narração cinematográfica.

Responda APENAS JSON com as chaves:
{
  "narrative_script": "...",
  "narrative_script_tagged": "...",
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}]
  },
  "strategy": { "hook": "..." },
  "visual_orchestration": {
    "chapters": [{ "block": 1, "title": "titulo do capitulo", "start_hint_sec": 0 }],
    "placements": [
      {
        "kind": "chart|quote|lower_third|text_overlay|content_animation|background",
        "reason": "por que o visual ajuda",
        "anchor": { "type": "block|time|narration_span", "block": 1, "text": "trecho", "start": 0, "duration": 4 },
        "data": { "value": 0, "unit": "%", "label": "...", "quote": "...", "attribution": "..." },
        "preferred_subcategories": ["Stat Counter"]
      }
    ],
    "avoid": ["fake_stats", "credits_roll_generic"]
  }
}

visual_orchestration e OPCIONAL mas recomendado: so inclua placements com dados reais da narração (numero, citação, nome/lugar). Nao invente estatisticas. Quote e lower_third so se fizerem sentido.`;
}

export function buildIdeaContextHeader(params = {}) {
  if (
    process.env.NODE_ENV !== "production" &&
    ("listTopic" in params || "blockCount" in params)
  ) {
    console.warn(
      "[promptBuilders] buildIdeaContextHeader: use listicleTopic/listicleBlockCount"
    );
  }
  const {
    niche,
    format,
    idea = {},
    isListicle = false,
    listicleRank = 20,
    listicleTopic = "",
    rankOrder = "desc",
    listicleBlockCount = 22,
  } = params;
  let header = `O usuário selecionou a seguinte ideia de vídeo para o nicho "${niche}" (Formato: "${format}")${isListicle ? ` — MODO LISTICLE TOP ${listicleRank}` : ""}:

Título: "${idea.title || ""}"

Promessa: "${idea.promise || ""}"

Emoção: "${idea.emotion || ""}"`;

  if (isListicle) {
    header += `\n\nTEMA DA LISTA: ${listicleTopic}
ORDEM DO RANKING: ${rankOrder === "asc" ? "1 → N (build-up)" : "N → 1 (countdown)"}
BLOCOS TOTAIS: ${listicleBlockCount} (intro + ${listicleRank} itens + outro)`;
    if (idea.listicle_angle)
      header += `\nÂNGULO DO RANKING: ${idea.listicle_angle}`;
    if (Array.isArray(idea.sample_items) && idea.sample_items.length) {
      header += `\nITENS SUGERIDOS (use ou refine): ${idea.sample_items.join(", ")}`;
    }
  }

  const customHookVal = idea.hook || idea.hooks || "";
  if (customHookVal) {
    header += `\nGancho de Retenção Inicial (Hook) sugerido: "${customHookVal}"`;
  }

  if (idea.hook_angle) {
    const hookType = VIRAL_HOOK_TYPES.find((h) => h.id === idea.hook_angle);
    header += `\nTipo de gancho viral: ${hookType ? `${hookType.label} (${hookType.id})` : idea.hook_angle}`;
  }
  if (idea.viral_category) {
    header += `\nCategoria viral: ${idea.viral_category}`;
  }
  if (Array.isArray(idea.wow_facts_preview) && idea.wow_facts_preview.length) {
    header += `\nFatos centrais planejados (use ou refine com pesquisa): ${idea.wow_facts_preview.join(" | ")}`;
  }
  if (Array.isArray(idea.hook_candidates) && idea.hook_candidates.length) {
    header += `\nGanchos candidatos: ${idea.hook_candidates.join(" / ")}`;
  }

  if (idea.blocks) {
    let blocksStr = "";
    if (Array.isArray(idea.blocks)) {
      blocksStr = idea.blocks
        .map((b) => `Block ${b.block || b.index || 1}: ${b.content}`)
        .join("\n");
    } else {
      blocksStr = String(idea.blocks);
    }
    header += `\nEstrutura/Ganchos por Bloco recomendados pelo usuário:\n"${blocksStr}"`;
  }

  if (idea.isCustom) {
    header += `\n\nATENÇÃO: A ideia original pode estar em inglês. A narração deve ser em PT-BR natural e humana.`;
  }

  const opportunityFields = [
    ["STATUS DE REALIDADE", idea.reality_status],
    ["ÂNCORA DE EVIDÊNCIA", idea.evidence_anchor],
    ["NÍVEL DE SATURAÇÃO", idea.saturation_level],
    ["EVIDÊNCIA DE SATURAÇÃO", idea.saturation_evidence],
    ["LACUNA EDITORIAL", idea.undercovered_reason],
    ["ADEQUAÇÃO AO FORMATO", idea.format_fit],
    ["DURAÇÃO RECOMENDADA", idea.recommended_duration],
    ["UPGRADE PREMIUM", idea.premium_upgrade],
    ["VALIDAÇÃO PENDENTE", idea.validation_needed],
  ].filter(([, value]) => String(value || "").trim());
  if (opportunityFields.length) {
    header += `\n\nCONTRATO DE OPORTUNIDADE DA IDEIA (preserve no roteiro):\n${opportunityFields
      .map(([label, value]) => `${label}: ${String(value).trim()}`)
      .join("\n")}`;
    header += `\nREGRAS: use a âncora de evidência como ponto inicial da pesquisa; não transforme "plausible" ou "disputed" em fato; resolva a validação pendente antes de afirmar; use a lacuna editorial e o upgrade premium para diferenciar o vídeo sem inventar dados.
REGRA DE SEGURANÇA: título, promessa, hook e why_works são HIPÓTESES EDITORIAIS, não fontes. Se a pesquisa não comprovar a premissa original, corrija a tese. Para relações de "influenciou", "inspirou", "copiou", "replicou" ou "deu origem", exija evidência histórica direta. Sem essa evidência, transforme o vídeo em comparação/analogia honesta ou rejeite a premissa — nunca preencha a lacuna com invenção.`;
  }

  return header;
}

export function buildNarracaoProInputsBlock({
  niche,
  format,
  idea = {},
  listTopic = "",
}) {
  const tema = String(idea.title || listTopic || niche || "").trim();
  const nicho = String(niche || "").trim();
  const formato = format === "SHORTS" ? "SHORTS" : "LONGO";
  const duracao =
    format === "SHORTS"
      ? "40 a 60 segundos"
      : "10 a 20 minutos (1500 a 3000 palavras)";
  const publico = String(
    idea.target_audience ||
      "Pessoas interessadas em documentários, curiosidades e storytelling envolvente."
  ).trim();
  const objetivo = String(
    idea.purpose ||
      idea.objective ||
      (format === "SHORTS"
        ? "Gerar retenção extrema e engajamento rápido."
        : "Contar uma narrativa aprofundada, instrutiva e surpreendente.")
  ).trim();
  const tom = String(
    idea.tone ||
      (format === "SHORTS"
        ? "Dramático, dinâmico e intrigante"
        : "Documental cinematográfico e envolvente")
  ).trim();
  const dataAtual = new Date().toLocaleDateString("pt-BR");

  return `### ENTRADAS PARA A GERAÇÃO (DIRETRIZES NARRACAOPRO)

TEMA DO VÍDEO: ${tema}
NICHO DE MERCADO: ${nicho}
FORMATO: ${formato}
DURAÇÃO ESTIMADA: ${duracao}
PÚBLICO-ALVO: ${publico}
OBJETIVO DO VÍDEO: ${objetivo}
TOM DESEJADO: ${tom}
CONTEXTO DO CANAL: Canal focado em conteúdo audiovisual de alto impacto para o nicho ${nicho}.
DATA DE REFERÊNCIA: ${dataAtual}
IDIOMA DA SAÍDA: português brasileiro (PT-BR)`;
}

export function buildVisualPromptsRules({
  format = "LONGO",
  isListicle = false,
  listicleRank = 20,
  visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
  visualMapOnly = false,
} = {}) {
  const sceneCount =
    format === "SHORTS"
      ? isListicle
        ? `${listicleRank * 2 + 4}-${listicleRank * 3 + 6}`
        : "5-12"
      : isListicle
        ? `${listicleRank * 3}+`
        : "40-80+";
  const mapOnly = isMapOnlyPromptsEnabled(visualMapOnly);
  const typeMixRule = mapOnly
    ? `- MODO MAPAS: 90%+ "imagem IA 2k" (mapa estático da época); vídeo só se o mapa ANIMAR (rota desenhando, zoom cartográfico).`
    : format === "SHORTS"
      ? `- SHORTS: mínimo ${SHORTS_MIN_VIDEO_SCENES} cenas com type "${SHORTS_VIDEO_SCENE_TYPE}" — gancho, virada e payoff devem ter movimento; distribua vídeos ao longo do Short (não concentre no final). Demais cenas: imagem IA 2k.`
      : `- 80-90% "imagem IA 2k"; 10-20% "${SHORTS_VIDEO_SCENE_TYPE}" para movimento active.`;
  const styleDirective = buildVisualAssetStyleDirective(visualAssetStyle, {
    mapOnly,
  });

  return `
REGRAS DOS PROMPTS VISUAIS (OBRIGATÓRIO — sem isso o roteiro fica inutilizável):

- CUBRA 100% DA NARRAÇÃO APROVADA. Cada 1-2 frases = 1 objeto em visual_prompts.
- Gere ${sceneCount} cenas no mínimo.
- CADA objeto DEVE ter "narration_text" preenchido com o trecho EXATO falado na cena (copiado da narração aprovada).
- CADA objeto DEVE ter "prompt" em inglês — hiper-detalhado e cinematográfico (NÃO genérico).
- O "prompt" deve descrever VISUALMENTE a cena: sujeito ESPECÍFICO + ação + enquadramento + texturas + iluminação. NUNCA use frases vagas como "the exact subject from this scene" ou "subject".
- text_overlay e impact_text são metadados renderizados depois pelo Remotion. NUNCA copie esses textos para o prompt nem peça palavras, títulos, legendas ou parágrafos dentro da imagem/vídeo.
${styleDirective.systemBlock}
- Embute em CADA prompt a cláusula de estilo: "${styleDirective.promptClause}"
${typeMixRule}
- CONSISTÊNCIA type ↔ prompt (CRÍTICO):
  - Se o prompt descreve movimento ativo (drone, água, fogo, multidão, ferramenta em ação, câmera em movimento, drill, pour, walk…) → type DEVE ser "${SHORTS_VIDEO_SCENE_TYPE}".
  - Se type for "${SHORTS_VIDEO_SCENE_TYPE}", o prompt DEVE pedir cinematic motion e production.broll_type="video".
  - NUNCA marque type "imagem IA 2k" quando a cena for para gerar/upload de VÍDEO. Imagem = still + Ken Burns; vídeo = clip com movimento real.
  - Cenas POV / Video A–B: type SEMPRE "${SHORTS_VIDEO_SCENE_TYPE}".
- Nunca deixe narration_text ou prompt vazios.
- NÃO inclua "duration" nem "duration_seconds" — os segundos de cada cena são calculados pelo Whisper após a narração (100% da voz, sem estimativa).
- Inclua stock_query em inglês em cada cena.
${isListicle ? `- LISTICLE: text_overlay na primeira cena de cada item (#N — NOME).` : ""}
${VISUAL_PROMPT_SPECIFICITY_RULES}
`;
}

export function buildVisualPromptsJsonSchema() {
  // Nota: parâmetros blockCount, isListicle e listicleRank removidos pois não são usados.
  return `
4. "visual_prompts": [
   GERE UM OBJETO PARA CADA SEGMENTO DA NARRAÇÃO. Cubra o vídeo inteiro. Cada objeto:
   {
     "scene": "1.1",
     "block": 1,
     "narration_text": "Trecho EXATO da narração aprovada para esta cena (1-2 frases, NUNCA vazio)",
     "type": "imagem IA 2k" ou "vídeo IA (max 10s)",
     "prompt": "Prompt CINEMATOGRÁFICO em inglês: sujeito ESPECÍFICO + ação + ângulo de câmera + texturas + iluminação. Termine pedindo mídia limpa, sem texto editorial renderizado.",
     "editor_notes": "Ken Burns zoom in, dissolve, etc.",
     "stock_query": "2-5 palavras em inglês: sujeito específico + ação (ex.: gannet plunge dive)"
   }
]`;
}

export function buildVisualPromptsFromNarrationPrompt({
  approvedNarration = "",
  format = "LONGO",
  blockCount = 5,
  isListicle = false,
  listicleRank = 20,
  listTopic = "",
  rankOrder = "desc",
  ideaTitle = "",
  existingPrompts = [],
  historicalWitness = null,
  enablePov = false,
  povPlacement = null,
  idea = {},
  niche = "",
}) {
  const historicalWitnessBlock =
    buildHistoricalWitnessContractBlock(historicalWitness);
  const povBlock = buildPovContractBlock({
    enablePov,
    placement: povPlacement,
    niche: niche || ideaTitle,
    idea: { title: ideaTitle, ...idea },
    format,
    totalBlocks: blockCount,
  });
  const skeleton =
    Array.isArray(existingPrompts) && existingPrompts.length > 0
      ? `\nESQUELETO DE CENAS (mantenha scene/block/type; PREENCHA narration_text e prompt em TODOS):\n${JSON.stringify(
          existingPrompts.map((vp) => ({
            scene: vp.scene,
            block: vp.block,
            type: vp.type || "imagem IA 2k",
          })),
          null,
          2
        ).slice(0, 6000)}`
      : "";

  return `Você é um Prompt Engineer especialista em criar prompts visuais hiper-detalhados e cinematográficos para YouTube (curiosidades históricas, engenharia, construções, fatos surpreendentes). A narração já foi aprovada pelo usuário — NÃO altere palavras da narração nos trechos das cenas.

TÍTULO: ${ideaTitle}
FORMATO: ${format}
BLOCOS: ${blockCount}${isListicle ? ` (LISTICLE TOP ${listicleRank}, ordem ${rankOrder === "asc" ? "1→N" : "N→1"}, tema: ${listTopic})` : ""}

NARRAÇÃO APROVADA (fonte única — copie trechos para narration_text):
"""
${approvedNarration.trim()}
"""
${skeleton}${historicalWitnessBlock}${povBlock}

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

TAREFFA: Gere visual_prompts cobrindo 100% da narração + technical_config com:
- script: narração dividida em ${blockCount} parágrafos (quebra de linha entre blocos)
- block_phrases: início exato de cada bloco (4-8 palavras)

Responda APENAS JSON:
{
  "visual_prompts": [ { "scene", "block", "narration_text", "type", "prompt", "editor_notes", "stock_query", "production": { "data_type": "location|stat_number|timeline_date|curiosity_punch|comparison|broll_only", "broll_type": "image|video", "remotion_hint": "counter|location-intro|bar-chart|timeline|kinetic-text|null" }, "directing_brief": { "dramatic_function", "camera_intent", "lighting_intent", "performance_intent", "sound_intent" }, "seedance_refs": { "identity", "motion", "camera", "audio", "style", "environment", "first_frame", "last_frame" } } ],
  "technical_config": {
    "script": "...",
    "block_phrases": [{"block": 1, "phrase": "..."}],
    "impact_texts": [],
    "highlight_keywords": [],
    "bgm_mappings": []
  }
}`;
}

export function buildBatchScenePromptsAiRequest(
  scenes = [],
  {
    ideaTitle = "",
    historicalWitness = null,
    visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
    visualMapOnly = false,
  } = {}
) {
  const historicalWitnessBlock =
    buildHistoricalWitnessContractBlock(historicalWitness);
  const mapOnly = isMapOnlyPromptsEnabled(visualMapOnly);
  const styleDirective = buildVisualAssetStyleDirective(visualAssetStyle, {
    mapOnly,
  });
  const sceneSummary = scenes.map((s) => ({
    scene: s.scene,
    narration: String(s.narration_text || "").slice(0, 300),
    type: s.type || "imagem IA 2k",
    has_text_overlay: !!(s.text_overlay || s.impact_text),
  }));

  return `You are an expert Prompt Engineer specialized in creating hyper-detailed, cinematic visual prompts for YouTube documentary videos. The niche/subject of the video can be anything (history, science, space, nature, technology, finance, philosophy, pop culture, life hacks, mystery, and infinite other subjects).

TITLE: ${ideaTitle}
${historicalWitnessBlock}

PROJECT VISUAL STYLE (MANDATORY FOR EVERY PROMPT): ${styleDirective.label} (${styleDirective.id})
STYLE CLAUSE (embed in every prompt): "${styleDirective.promptClause}"
Do NOT mix with other aesthetics. Subject and story stay faithful; only the rendering style changes.
${mapOnly ? "MAP-ONLY MODE: every prompt must be a period-accurate informative MAP for the place/era in the narration (no portraits, no lifestyle B-roll)." : ""}

Your goal is to translate abstract narration blocks into CONCRETE visual descriptions. What should the viewer physically see?

For EACH scene below, generate:
1. "prompt": A visual description in ENGLISH in the project style (${styleDirective.look})${mapOnly ? " as a cartographic map matching the historical era of the line" : ""} following these MANDATORY rules:
   - NEVER be generic. NO placeholders ("a person", "an object", "illustrating this", "the subject").
   - Extract the core physical reality of the narration: describe specific items, models, settings, climates, periods, or entities related to it.
   ${mapOnly ? "- Subject MUST be a map: territory, routes, borders, campaigns — age-correct cartography (parchment / copperplate / military chart / satellite)." : "- Specify: camera type/angle (low angle, tracking, aerial drone, macro, isometric), camera movement, lighting (golden hour, volumetric light, volumetric shadows, neon glow), textures (worn brick, rust, dust under light beams, skin pores, reflective glass), and atmosphere."}
   - MAP GEOGRAPHY (if the scene is a map): NEVER invent city pin positions. Prefer accurate regional outline WITHOUT fake city labels. Only label cities if relative placement matches real geography; wrong pins (decorative Blumenau/Brusque/Gaspar etc.) are forbidden.
   - MAP LABELS LANGUAGE: text ON the map must use the official/historical language of the COUNTRY or region shown (detect from narration — never hardcode one language). Generation prompt may be English; painted labels follow the country (e.g. Brazil→Portuguese nouns, France→French, USA→English). Never force Portuguese on non-Brazil maps; never force English generics on non-English countries.
   - Esthetic MUST match the project style above — not a generic photorealistic default unless that is the selected style.
   - Slow down motion for heavy things: use "slow deliberate motion", "inch by inch" or "snail pace" to depict scale/weight.
   - End every prompt with the style clause: "${styleDirective.promptClause}".
   - If has_text_overlay is true, reserve clean negative space for post-production, but do not render the overlay or any editorial text in the source media.
2. "stock_query": 2-5 words in English for stock footage search (e.g. ${mapOnly ? '"roman empire map parchment", "1940s military campaign map"' : '"quantum computing server room", "1930s style vintage phone"'}).
3. "editor_notes": Editing instructions (timing, transitions, text layout spacing).

SCENES:
${JSON.stringify(sceneSummary, null, 2)}

Respond ONLY with a JSON array:
[{ "scene": "1.1", "prompt": "...", "stock_query": "...", "editor_notes": "..." }]`;
}

export function buildHistoricalWitnessContractBlock(context = {}) {
  if (!context || context.contentMode !== "HISTORICAL_WITNESS") return "";
  const character = context.character || {};
  const idea = context.idea || {};
  const blueprint = context.blueprint || {};
  const compactContext = {
    contentMode: "HISTORICAL_WITNESS",
    niche: context.niche,
    format: context.format,
    character,
    idea,
    blueprint: {
      title: blueprint.title,
      hook: blueprint.hook,
      promise: blueprint.promise,
      characterLock: blueprint.characterLock,
      voiceDirection: blueprint.voiceDirection,
      globalNegativePrompt: blueprint.globalNegativePrompt,
      historicalFrame: blueprint.historicalFrame,
      blocks: Array.isArray(blueprint.blocks) ? blueprint.blocks : [],
    },
    userEdits: context.userEdits || {},
  };

  return `
[CONTRATO EDITORIAL OBRIGATORIO — HISTORICAL_WITNESS / HISTORIA VIVA]
Este projeto NAO e uma ideia personalizada generica. O Creator ja definiu um personagem recorrente, uma entidade historica, periodo, local, tese, nivel de certeza e um esqueleto causal/visual. O NARRADORPRO deve pesquisar, revisar e aprimorar esse material, sem descaracteriza-lo.

REGRAS INQUEBRAVEIS:
- Preserve a identidade e o ponto de vista do personagem. Ele narra como alguem presente naquele tempo e NAO conhece fatos futuros, salvo quando o contrato indicar explicitamente um narrador contemporaneo.
- Preserve entidade/sitio, local, periodo, tese central, verdade revelada e nivel de certeza. Nunca funda dados de entidades, sitios, datas ou fontes diferentes em um unico caso.
- O NARRADORPRO pode reescrever frases, fortalecer causalidade, corrigir fatos e melhorar retencao. Nao pode transformar o tema em uma explicacao generica nem trocar o acontecimento escolhido.
- Organize a progressao em CAUSA -> ACAO -> MECANISMO -> RESULTADO -> IMPORTANCIA, mantendo uma ligacao clara entre blocos e respondendo ao gancho inicial.
- Cada afirmacao historica deve ser sustentada pela pesquisa fornecida; quando a certeza for limitada, declare a incerteza em vez de inventar.
- Na fase visual, redesenhe e enriqueça os prompts em ingles, mas mantenha o characterLock completo em toda cena com o personagem. Nunca use atalhos como "same person" ou "same character".
- Cada prompt deve corresponder ao trecho de narracao aprovado e respeitar causalRole, factBasis e visualEvidence do bloco de origem.
- Placas, documentos e textos diegeticos pertencem ao idioma real do local/epoca; quando houver traducao para o publico, forneca portugues do Brasil abaixo como legenda/overlay editorial, sem trocar a geografia.
- Retorne content_mode="HISTORICAL_WITNESS" e preserve historical_witness no resultado.

DADOS ESTRUTURADOS DO CREATOR:
${JSON.stringify(compactContext, null, 2).slice(0, 28000)}
`;
}

export function buildNarrationOnlyPrompt({
  niche,
  format,
  idea = {},
  isListicle = false,
  listicleRank = 20,
  listicleTopic = "",
  rankOrder = "desc",
  listicleBlockCount = 22,
  notebooklmContext = "",
  webResearchContext = "",
  cinematicNarrationRules = "",
  remotionTemplateContext = "",
  isHistoricalWitness = false,
  historicalWitness = null,
  enablePov = false,
  povPlacement = null,
}) {
  const guidelinesBlock = buildConsolidatedGuidelines();

  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const inputsBlock = buildNarracaoProInputsBlock({
    niche,
    format,
    idea,
    listTopic: listicleTopic,
  });

  const userBlockCount = resolveUserBlockCount(idea, format);

  const isPioneerNiche =
    idea?.pioneerNiche === true || Boolean(idea?.pioneerMeta);
  const nlmBlock = notebooklmContext
    ? isPioneerNiche
      ? `\n[ESTILO/HUMANIZAÇÃO — use apenas como referência de tom e fluência, NÃO como fonte de fatos. Os fatos devem vir exclusivamente do tema descrito acima]:\n${notebooklmContext}\n`
      : notebooklmContext
    : "";
  const narrationTemplateBlock = remotionTemplateContext
    ? `\n[CONTRATOS DOS TEMPLATES REMOTION APROVADOS]\n${remotionTemplateContext}\nUse esses contratos apenas para tornar a narração visualmente orquestrável: quando for natural e sustentado pelas fontes, deixe explícitos entidade, local, data, número, unidade, comparação e relação causal necessários aos data_slots. Não acrescente fatos, listas ou números apenas para alimentar um template. A tese e a clareza do NARRACAOPRO continuam prioritárias.\n`
    : "";
  const historicalWitnessBlock = resolveHistoricalWitnessBlock(
    isHistoricalWitness,
    historicalWitness
  );
  const povBlock = buildPovContractBlock({
    enablePov,
    placement: povPlacement,
    niche,
    idea,
    format,
    totalBlocks: isListicle
      ? listicleBlockCount
      : userBlockCount || listicleBlockCount,
  });

  return `Você é o "Lumiera Script Master" (Roteirista Profissional para YouTube).

${ideaHeader}

${inputsBlock}

${nlmBlock}${webResearchContext}${narrationTemplateBlock}${historicalWitnessBlock}${povBlock}

FASE 1 — APENAS NARRAÇÃO (o usuário revisará e aprovará antes dos blocos visuais):

Gere SOMENTE a narração completa do vídeo em português brasileiro. NÃO gere visual_prompts, technical_config, list_items nem bgm ainda.

${SCRIPT_CREATIVE_REINFORCEMENT}

${resolveScriptRules({ isListicle, listicleRank, rankOrder, format, listicleTopic, listicleBlockCount })}

${format === "SHORTS" && !isListicle ? VIRAL_SHORT_FORM_REINFORCEMENT : ""}

${cinematicNarrationRules}
${guidelinesBlock}

REGRAS DESTA FASE:
- HUMANIZE: escreva como narração FALADA — alguém contando ao vivo para um amigo curioso. Frases que soam bem em voz alta.
- RESUMA AO MÁXIMO: cada palavra deve carregar informação. Corte adjetivos vazios, repetições e frases que não avançam a mensagem.
- SEM GRANDIOSIDADE DE PLANTÃO: não repita colossal, gigantesco, monumental, épico, titânico, descomunal, "maior de todos". No máximo 1× no vídeo e só com medida/prova na mesma frase; prefira número, escala ou comparação concreta.
- PROFISSÃO ESPECÍFICA E NATURAL: em nichos técnicos (ex.: engenharia), não fique só em "engenheiro/engenheiros". Use especialidade ou função real de forma falada (engenheiro civil, estrutural, naval, de solo; "quem calcula a fundação"; "a equipe de estrutura"). Não invente especialidade se a fonte não disser — use a função concreta. Não force lista de cargos.
- CLAREZA: o telespectador precisa entender a tese do vídeo e cada item do ranking na primeira escuta — sem jargão sem explicação.
- Revise cada frase: elimine tom robótico, clichês de IA, tom de redação escolar e trechos desconexos.
- Formato: "${format}"${isListicle ? ` — LISTICLE TOP ${listicleRank}` : ""}.
- ${
    isListicle
      ? `Estruture em ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). ${format === "SHORTS" && listicleRank <= 3 ? "Top 3 Short: máximo ~90 palavras, 1 fato forte por item." : ""}`
      : format === "SHORTS"
        ? `SHORTS: use EXATAMENTE ${userBlockCount} blocos. Narração TOTAL: 80-130 palavras. Cada bloco = 1 a 3 frases curtas (máx. 12 palavras cada). NÃO ultrapasse 130 palavras. NÃO invente fatos fora do tema descrito acima.`
        : `LONGO: use EXATAMENTE ${userBlockCount} blocos. 10-20 minutos, 1500-3000 palavras. Explore profundamente o tema.`
  }
- Escreva BLOCO A BLOCO primeiro (frases curtas, 1 ideia por bloco), depois una em narrative_script.
- Se houver pesquisa NotebookLM acima, priorize fatos verificáveis dela — estilo documental brasileiro enxuto.

EXECUÇÃO OBRIGATÓRIA DAS 12 ETAPAS DO NARRACAOPRO:
Antes de escrever a narração, execute INTERNAMENTE cada uma das 12 etapas do NARRACAOPRO in order. Preencha TODOS os campos de "narracao_pro_trace" com evidência REAL. Mesmo que demore, NÃO pule nenhuma etapa.

Responda APENAS JSON válido (sem markdown):
{
  "strategy": {
    "title_main": "Título específico ao tema",
    "hook": "Gancho de 3 segundos",
    "target_audience": "Público-alvo",
    "tone": "Tom do vídeo"
  },
  "narrative_script": "Narração COMPLETA em texto corrido, SEM marcadores de áudio.",
  "narrative_script_tagged": "A MESMA narração com tags de performance ([pausa], [ênfase], (breath), etc.)",
  "technical_config": {
    "script": "Narração dividida em parágrafos — um parágrafo por bloco, separados por quebra dupla de linha.",
    "block_phrases": [{"block": 1, "phrase": "início exato do bloco (4-8 palavras)"}]
  },
  "narracao_pro_trace": {
    "etapa_1_recorte": "Pergunta respondível definida para este vídeo (não o tema amplo)",
    "etapa_2_pesquisa": ["Fato 1 + fonte confiável", "Fato 2 + fonte confiável"],
    "etapa_3_entidades": [
      {"entidade": "nome", "funcao": "papel no tema", "local": "onde", "periodo": "quando", "certeza": "confirmado|hipotese|estimativa"}
    ],
    "etapa_4_tese": {
      "objeto": "o que está sendo explicado",
      "mecanismo": "como funciona ou funcionou",
      "consequencia": "o que resultou disso",
      "tese_completa": "Frase ÚNICA com OBJETO + MECANISMO + CONSEQUÊNCIA"
    },
    "etapa_5_fatos_selecionados": ["Somente os fatos que provam a tese — os demais foram cortados"],
    "etapa_6_cadeia_causal": "PROBLEMA → CAUSA → MECANISMO → MUDANÇA → CONSEQUÊNCIA (texto corrido)",
    "etapa_7_gancho": {
      "texto": "Gancho ≤12 palavras, específico ao tema",
      "tipo": "pergunta|choque|problema_solucao|antes_depois|urgencia|desafio|segredo|impacto"
    },
    "etapa_8_redacao": "EXECUTADA — narração escrita",
    "etapa_9_vazios_removidos": ["Frase cortada ou reescrita: motivo"],
    "etapa_10_validacao_factual": {
      "teste_identidade_passou": true,
      "fusao_detectada": false,
      "auditoria": "resumo"
    },
    "etapa_11_validacao_narracao": {
      "portoes_15_resultado": "Todos passaram",
      "auditoria_oral": "resultado"
    },
    "etapa_12_validacao_entrega": {
      "duracao_ok": true,
      "block_phrases_validadas": true,
      "fechamento_declarativo": true,
      "palavras_contadas": 120
    },
    "notas_auditoria": {
      "coerencia": 10,
      "clareza": 10,
      "profundidade": 10,
      "qualidade_factual": 10,
      "progressao": 10,
      "naturalidade": 10,
      "retencao": 10,
      "conclusao": 10
    }
  }
}`;
}

export function buildFullScriptFromNarrationPrompt({
  niche,
  format,
  idea = {},
  isListicle = false,
  listicleRank = 20,
  listicleTopic = "",
  rankOrder = "desc",
  listicleBlockCount = 22,
  approvedNarration = "",
  approvedNarrationTagged = "",
  notebooklmContext = "",
  webResearchContext = "",
  titleCraftRules = "",
  epidemicMoodPrompt = "",
}) {
  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const taggedBlock = approvedNarrationTagged?.trim()
    ? `\nNARRAÇÃO COM TAGS (use se ainda válida após edições do usuário):\n"""\n${approvedNarrationTagged.trim()}\n"""`
    : "\nGere narrative_script_tagged a partir da narração aprovada com tags cinematográficas moderadas.";

  return `Você é o "Lumiera Script Master" (Roteirista, Diretor Criativo e Editor para YouTube).

${ideaHeader}
${notebooklmContext}${webResearchContext}

FASE 2 — ROTEIRO COMPLETO (narração já aprovada pelo usuário):

A narração abaixo foi REVISADA e APROVADA. Use o texto EXATO em "narrative_script" — NÃO reescreva, NÃO resuma, NÃO altere palavras.
Monte blocos, prompts visuais, trilha e configuração técnica ANCORADOS nesta narração.

NARRAÇÃO APROVADA:
"""
${approvedNarration.trim()}
"""
${taggedBlock}

${SCRIPT_CREATIVE_REINFORCEMENT}

${resolveScriptRules({ isListicle, listicleRank, rankOrder, format, listicleTopic, listicleBlockCount })}

${titleCraftRules}

${epidemicMoodPrompt}

SUA MISSÃO:
- narrative_script e narrative_script_tagged = narração aprovada.
- DIVIDA a narração em segmentos e gere visual_prompts cobrindo 100% do texto — TODOS os campos narration_text e prompt PREENCHIDOS.
- technical_config.script = narração dividida em ${listicleBlockCount} parágrafos (um por bloco).
- ${
    isListicle
      ? `EXATAMENTE ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). Gere list_items e listicle.`
      : `Estruture em ${format === "SHORTS" ? "5" : "12"} blocos lógicos em block_phrases.`
  }

${buildVisualPromptsRules({ format, isListicle, listicleRank })}

FORMATO DE RESPOSTA — JSON válido com:
1. "strategy" (title_main, title_variations, hook, target_audience, tone, pinned_comment, cta)
2. "narrative_script" (texto aprovado, idêntico)
3. "narrative_script_tagged"
${buildVisualPromptsJsonSchema()}
5. "bgm_recommendations"
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config" (script, block_phrases, impact_texts, highlight_keywords, bgm_mappings)
${isListicle ? `10. "listicle" e 11. "list_items" (${listicleRank} itens)` : ""}

REGRAS FINAIS:
- Retorne APENAS JSON puro, sem markdown.
- visual_prompts deve cobrir TODA a narração sem lacunas e sem campos vazios.`;
}

export function buildCreatorPhase2Prompt(ctx = {}) {
  const {
    niche,
    format,
    idea = {},
    isListicle = false,
    listicleRank = 20,
    listicleTopic = "",
    rankOrder = "desc",
    listicleBlockCount = 22,
    approvedNarration = "",
    approvedNarrationTagged = "",
    existingStrategy = {},
    notebooklmContext = "",
    webResearchContext = "",
    epidemicMoodPrompt = "",
    remotionTemplateContext = "",
    isHistoricalWitness = false,
    historicalWitness = null,
    enablePov = false,
    povPlacement = null,
    visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
    visualMapOnly = false,
  } = ctx;

  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const strategySeed =
    existingStrategy?.title_main || existingStrategy?.hook
      ? `\nESTRATÉGIA DA FASE 1 (reutilize e complete se faltar campo):\n${JSON.stringify(existingStrategy, null, 2).slice(0, 2500)}`
      : "";

  const taggedBlock = approvedNarrationTagged?.trim()
    ? `\nNARRAÇÃO COM TAGS:\n"""\n${approvedNarrationTagged.trim()}\n"""`
    : "";

  const templateBlock = remotionTemplateContext
    ? `\nCATÁLOGO REMOTION TEMPLATE STUDIO APROVADO PARA ESTE VÍDEO:\n${remotionTemplateContext}\n\nUse somente esses templates nas cenas Remotion. Para cada cena compatível, escolha o template que melhor explica o trecho e forneça em production os fatos necessários para preencher seus data_slots. Não invente dados para preencher slots. Preserve a narração aprovada sem alterações.`
    : "";
  const historicalWitnessBlock = resolveHistoricalWitnessBlock(
    isHistoricalWitness,
    historicalWitness
  );
  const povBlock = buildPovContractBlock({
    enablePov,
    placement: povPlacement,
    niche,
    idea,
    format,
    totalBlocks: listicleBlockCount,
  });

  return `Você é o Lumiera Script Master — FASE 2: montar roteiro técnico.

${ideaHeader}${templateBlock}${historicalWitnessBlock}${povBlock}
${notebooklmContext}${webResearchContext}${strategySeed}

A narração abaixo foi APROVADA — copie EXATAMENTE em narrative_script (não reescreva).

NARRAÇÃO APROVADA:
"""
${approvedNarration.trim()}
"""
${taggedBlock}

${buildVisualPromptsRules({ format, isListicle, listicleRank, visualAssetStyle, visualMapOnly })}
${epidemicMoodPrompt}

TAREFA: Gere APENAS a estrutura técnica ancorada na narração.
- visual_prompts: cubra 100% da narração (${format === "SHORTS" ? "5-12" : "25-50"} cenas mínimo)
- technical_config.script: ${listicleBlockCount} parágrafos (um por bloco)
${isListicle ? `- listicle + list_items com EXATAMENTE ${listicleRank} itens` : ""}

Responda APENAS JSON válido (sem markdown) com:
1. "strategy" (title_main, title_variations[3], hook, target_audience, tone, pinned_comment, cta)
2. "narrative_script" (idêntico à narração aprovada)
3. "narrative_script_tagged"
${buildVisualPromptsJsonSchema()}
5. "bgm_recommendations" (um por bloco)
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config"
${isListicle ? `10. "listicle" e 11. "list_items" (${listicleRank} itens)` : ""}`;
}

export function buildCreatorFullScriptPrompt(ctx = {}) {
  const guidelinesBlock = buildConsolidatedGuidelines();

  const {
    niche,
    format,
    idea = {},
    isListicle = false,
    listicleRank = 20,
    listicleTopic = "",
    rankOrder = "desc",
    listicleBlockCount = 22,
    notebooklmContext = "",
    webResearchContext = "",
    cinematicNarrationRules = "",
    titleCraftRules = "",
    epidemicMoodPrompt = "",
    isHistoricalWitness = false,
    historicalWitness = null,
    enablePov = false,
    povPlacement = null,
    visualAssetStyle = DEFAULT_VISUAL_ASSET_STYLE,
    visualMapOnly = false,
  } = ctx;

  const ideaHeader = buildIdeaContextHeader({
    niche,
    format,
    idea,
    isListicle,
    listicleRank,
    listicleTopic,
    rankOrder,
    listicleBlockCount,
  });

  const inputsBlock = buildNarracaoProInputsBlock({
    niche,
    format,
    idea,
    listTopic: listicleTopic,
  });

  let customAddendum = "";
  if (idea.isCustom) {
    customAddendum += `\n\nATENÇÃO: A ideia original, os ganchos e a estrutura fornecida pelo usuário podem estar em português ou inglês. O roteiro gerado e a narração devem ser obrigatoriamente em Português do Brasil (PT-BR) de forma extremamente natural, humanizada, fluida e cativante — estilo UGC falado (skill ugc-scriptwriter). Fechamento DECLARATIVO; proibido "Você prefere…?" ou perguntas vazias de comentário. No entanto, os ganchos visuais ("visual_prompts") e termos de busca ('prompt' e 'stock_query') devem permanecer em inglês para manter a compatibilidade com a geração de assets.`;
    const customHookVal = idea.hook || idea.hooks || "";
    const pioneerMode =
      idea.pioneerNiche ||
      isPioneerStrategyText(idea.title) ||
      isPioneerStrategyText(idea.promise) ||
      isPioneerStrategyText(customHookVal) ||
      /TEMA DO VÍDEO/i.test(String(idea.promise || ""));
    if (pioneerMode) {
      customAddendum += `\n\nMODO NICHO PIONEIRO: O vídeo deve ser SOBRE O TEMA/ÂNGULO descrito na promessa (fatos, história, objeto, fenômeno real). PROIBIDO fazer vídeo sobre "nicho virgem", saturação de mercado, gap de pontos, como encontrar nichos no YouTube, "farsa do mercado saturado" ou estratégia de criador. Se a promessa tiver "Contexto estratégico", use só como nota interna — não vire isso no roteiro.`;
    }
    if (webResearchContext) customAddendum += webResearchContext;
  }

  const formatRules = resolveScriptRules({
    isListicle,
    listicleRank,
    rankOrder,
    format,
    listicleTopic,
    listicleBlockCount,
  });

  const titleRules =
    titleCraftRules ||
    buildTitleCraftRules(format === "SHORTS" ? "SHORT" : "LONG");
  const cinemaRules = cinematicNarrationRules || buildCinematicNarrationRules();
  const moodPrompt =
    epidemicMoodPrompt ||
    buildEpidemicMoodPrompt(
      niche,
      {
        niche,
        content_mode: isListicle ? "LISTICLE" : undefined,
        list_topic: listicleTopic,
      },
      { listicle: { topic: listicleTopic } }
    );
  const historicalWitnessBlock = resolveHistoricalWitnessBlock(
    isHistoricalWitness,
    historicalWitness
  );

  const userBlockCount = resolveUserBlockCount(idea, format);
  const povBlock = buildPovContractBlock({
    enablePov,
    placement: povPlacement,
    niche,
    idea,
    format,
    totalBlocks: isListicle ? listicleBlockCount : userBlockCount,
  });
  const blockStructureRule = isListicle
    ? `MODO LISTICLE ATIVO: use EXATAMENTE ${listicleBlockCount} blocos (intro + ${listicleRank} itens + outro). Cada item = 1 bloco. Não resuma vários itens no mesmo bloco.`
    : `ESTRUTURA OBRIGATÓRIA: use EXATAMENTE ${userBlockCount} blocos na narração e em 'technical_config.block_phrases' — esse é o número definido pelo usuário. NÃO adicione nem remova blocos. Cada bloco deve cobrir o conteúdo descrito na Estrutura/Ganchos por Bloco fornecida acima.`;

  const durationRule = isListicle
    ? `LISTICLE: ${listicleBlockCount} blocos obrigatórios. Tempo estimado: ${format === "SHORTS" ? (listicleRank >= 5 ? "45-60 segundos" : "35-50 segundos") : `${Math.round(listicleRank * 0.75)}-${Math.round(listicleRank * 1.2)} minutos`}. Um item por bloco, ordem ${rankOrder === "asc" ? "crescente" : "decrescente"}.`
    : format === "SHORTS"
      ? `SHORTS: 30-50 segundos, ${userBlockCount} blocos. Narração TOTAL: 80-130 palavras. Cada bloco = 1 frase curta a 3 frases no máximo. Frases de até 12 palavras. NÃO ultrapasse 130 palavras no total.`
      : "LONGO: O roteiro DEVE ser muito profundo, detalhado e extenso. O tempo de vídeo ideal é de 10 a 20 minutos (1500 a 3000 palavras). Explore cada detalhe do assunto ao máximo, traga histórias, metáforas, contexto histórico, dados e crie uma narrativa imersiva. NUNCA faça um roteiro superficial ou curto.";

  const visualTypeMix = isMapOnlyPromptsEnabled(visualMapOnly)
    ? `- MODO MAPAS: quase todas as cenas = "imagem IA 2k" (mapa cartográfico da época da fala).
- Vídeo só se o mapa ANIMAR (linha de rota, zoom, revelação territorial).`
    : format === "SHORTS"
      ? `- SHORTS: mínimo ${SHORTS_MIN_VIDEO_SCENES} cenas com type "${SHORTS_VIDEO_SCENE_TYPE}" — gancho (cena 1), virada (meio) e payoff (final) devem ter movimento active. Distribua os vídeos ao longo do Short; não concentre todos no fim.
- SHORTS: demais cenas = "imagem IA 2k" (photorealistic 2k, Ken Burns).`
      : `- 80-90% devem ser IMAGEM IA 2K (photorealistic 2k resolution, cinematic, para usar com efeito Ken Burns zoom lento).
- 10-20% devem ser VÍDEO IA (máximo estrito de 10 segundos, apenas para movimento ativo: água, fogo, multidão, câmera em movimento).`;

  const aspectRule =
    format === "SHORTS"
      ? "Composição vertical 9:16, framing apertado, sujeito centralizado ou em terços superiores/inferiores."
      : "Composição widescreen 16:9, shots amplos ou pans horizontais quando apropriado, profundidade de campo cinematográfica.";

  const listicleJsonTail = isListicle
    ? `
10. "listicle": {
   "content_mode": "LISTICLE",
   "rank_count": ${listicleRank},
   "rank_order": "${rankOrder === "asc" ? "asc" : "desc"}",
   "topic": "${String(listicleTopic).replace(/"/g, '\\"')}"
}
11. "list_items": [
   { "rank": ${listicleRank}, "title": "nome do item", "year": "ano", "origin": "país", "block": 2, "hook_line": "gancho", "visual_hook": "english stock term" }
]`
    : "";

  return `Você é o "Lumiera Script Master" (Roteirista Profissional, Estrategista de Retenção, Diretor Criativo e Editor de Vídeos para YouTube).

${ideaHeader}${customAddendum}${historicalWitnessBlock}${povBlock}

${inputsBlock}

${notebooklmContext}

SUA MISSÃO PRINCIPAL:

Crie um roteiro COMPLETO de narração para o vídeo e DIVIDA TODA a narração em segmentos sequenciais. Para CADA segmento da narração, gere um prompt visual correspondente (imagem 2K ou vídeo IA máx 10s). A narração inteira deve ser coberta — sem lacunas. Se precisar de 50, 80 ou 100 segmentos, gere todos. O array "visual_prompts" É o roteiro do vídeo.

${SCRIPT_CREATIVE_REINFORCEMENT}

${formatRules}

${titleRules}

${cinemaRules}

${moodPrompt}
${guidelinesBlock}

Reforco especifico para montagem do roteiro:

- A MENSAGEM CENTRAL deve estar clara na promessa da ideia ("${idea.promise || ""}"). Cada bloco aproxima o espectador dessa compreensão.
- Preserve exatamente o formato JSON solicitado abaixo (com todas as chaves, incluindo 'technical_config').
- ${blockStructureRule}
- Nao reduza a cobertura visual: o array visual_prompts continua cobrindo toda a narracao, como o programa ja espera.

Regras do Roteiro:

1. Pesquise internamente o nicho (tendências, dores, desejos, medos, polêmicas, curiosidades).
2. Não repita temas de vídeos anteriores.
3. Prenda a atenção nos primeiros 3 segundos.
4. Use open loop, curiosidade progressiva, microcliffhangers e payoff final.
5. Narração em português brasileiro: deve ser extremamente humana, fluida, natural, carismática e cheia de vida.
6. Comentário Fixado (pinned_comment em strategy): Deve ser curto (1-2 frases), em português, focado em retenção ou engajamento orgânico. Use ou uma "Extensão de Contexto/Segundo Gancho" (fato inédito ou detalhe intrigante que complementa o vídeo) ou "Matador de Objeção" (defende a veracidade do conteúdo/fontes) ou "Pergunta com Stakes Reais" (escolha que divide opiniões de forma inteligente). Nunca use clichês como "Você sabia?", "O que achou?", "Prefere Sim ou Não?" ou baits de engajamento vazio.
7. Formato: "${format}"${isListicle ? ` — LISTICLE TOP ${listicleRank}` : ""}.
   ${durationRule}

${buildVisualPromptsRules({ format, isListicle, listicleRank, visualAssetStyle, visualMapOnly })}

${visualTypeMix}

- Prompts variados: ${isMapOnlyPromptsEnabled(visualMapOnly) ? "mapas de épocas diferentes, rotas, fronteiras, campanhas, zoom cartográfico" : "close-ups, planos abertos, aéreas, texturas, detalhes, paisagens, mapas, infográficos visuais"}.
- Nunca coloque texto dentro dos prompts visuais.
- Cada prompt deve ter um stock_query para busca em Pexels/Pixabay/Canva.
- REGRA INQUEBRÁVEL DE MÍDIA LIMPA: text_overlay e impact_text são renderizados depois pelo Remotion. Não peça títulos, frases, legendas, parágrafos, logos ou marcas d'água dentro da imagem/vídeo. Se houver overlay, apenas reserve espaço negativo limpo na composição.
- COMPOSIÇÃO DE ASPECTO: ${aspectRule}
${isListicle ? `- LISTICLE: inclua "text_overlay" em toda primeira cena de cada item (ex: "#15 — PÓLVORA").` : ""}

FORMATO DE RESPOSTA - JSON válido com estas propriedades:

1. "strategy": { "title_main", "title_variations" (5), "hook", "target_audience", "tone", "pinned_comment", "cta" }
2. "narrative_script": narração COMPLETA em texto corrido (limpa, sem tags).
3. "narrative_script_tagged": mesma narração com tags de áudio ([pause], (breath), <break time="1.5s"/>, etc.).
${buildVisualPromptsJsonSchema()}
5. "bgm_recommendations": [ um objeto por bloco com "block", "recommendation", "search_theme" ]
6. "editing_map"
7. "hyperframe_prompt"
${buildChecklistSchemaBlock()}
9. "technical_config": { "script", "block_phrases", "impact_texts", "highlight_keywords", "bgm_mappings" }
10. "narracao_pro_trace": { "etapa_1_recorte", "etapa_2_pesquisa" (array de fatos+fontes), "etapa_3_entidades" (array com entidade/funcao/local/periodo/certeza), "etapa_4_tese" (objeto/mecanismo/consequencia/tese_completa), "etapa_5_fatos_selecionados" (array), "etapa_6_cadeia_causal" (PROBLEMA→CAUSA→MECANISMO→MUDANÇA→CONSEQUÊNCIA), "etapa_7_gancho" (texto+tipo), "etapa_8_redacao": "EXECUTADA", "etapa_9_vazios_removidos" (array de frases cortadas+motivo), "etapa_10_validacao_factual" (teste_identidade_passou/fusao_detectada/auditoria), "etapa_11_validacao_narracao" (portoes_15_resultado/auditoria_oral), "etapa_12_validacao_entrega" (duracao_ok/block_phrases_validadas/fechamento_declarativo/palavras_contadas), "notas_auditoria" (coerencia/clareza/profundidade/qualidade_factual/progressao/naturalidade/retencao/conclusao) }
${listicleJsonTail}

EXECUÇÃO OBRIGATÓRIA DAS 12 ETAPAS DO NARRACAOPRO:
Antes de escrever a narração, execute INTERNAMENTE cada uma das 12 etapas do NARRACAOPRO em ordem. Preencha TODOS os campos de "narracao_pro_trace" com evidência REAL. Mesmo que demore, NÃO pule nenhuma etapa.

REGRAS FINAIS:
- Retorne APENAS JSON puro, sem markdown, sem explicações.
- O JSON deve ser 100% válido. Escape aspas internas com barra invertida.
- O array visual_prompts deve cobrir TODA a narração sem lacunas.
- NÃO inclua "duration" nos visual_prompts — os segundos de cada cena vêm do Whisper após a narração.`;
}

export function buildNarrationHumanizeRepairPrompt({
  format,
  ideaTitle,
  narrative_script = "",
  narrative_script_tagged = "",
  blockCount = 12,
  isListicle = false,
  listicleRank = 20,
  listTopic = "",
} = {}) {
  const guidelinesBlock = buildConsolidatedGuidelines();

  const wordCeiling =
    format === "SHORTS"
      ? isListicle && listicleRank <= 3
        ? 95
        : isListicle
          ? 150
          : 130
      : null;

  const listicleNote = isListicle
    ? `
MODO LISTICLE TOP ${listicleRank}${listTopic ? ` — "${listTopic}"` : ""}:
- Mantenha TODOS os ${listicleRank} itens do ranking na ordem correta — não pule nem funda itens.
- Por item: nome + 1 fato forte + impacto em 1 frase. Proibido empilhar vários fatos no mesmo item.
- Transições orais curtas entre itens ("Agora o #2", "E em primeiro lugar...").
${wordCeiling ? `- TETO: ${wordCeiling} palavras no total. Se passar, CORTE até caber — priorize clareza sobre volume.` : ""}`
    : "";

  return `Você é um roteirista brasileiro especialista em narração natural, enxuta e clara para YouTube.

${guidelinesBlock}

A narração abaixo pode estar robótica, longa demais ou confusa. REESCREVA apenas os campos de narração mantendo a fidelidade das diretrizes acima.

FORMATO: ${format}
TÍTULO: ${ideaTitle}
BLOCOS ESPERADOS (estrutura mental): ${blockCount}
${listicleNote}

NARRAÇÃO ATUAL:
${JSON.stringify({ narrative_script, narrative_script_tagged }, null, 2).slice(0, 10000)}

OBJETIVO: deixar a narração O MAIS RESUMIDA POSSÍVEL sem perder clareza — o telespectador deve compreender a mensagem do vídeo na primeira escuta.

TAREFAS:
1. Reescreva "narrative_script" em PT-BR natural e HUMANO — como quem CONTA ao vivo, não quem LÊ um texto.
2. ENXUGUE: remova adjetivos vazios, repetições, frases de preenchimento e explicações redundantes. 1 fato forte > 3 fatos fracos.
3. Corte grandiosidade de plantão (colossal, gigantesco, monumental, épico) salvo 1× com medida/prova na mesma frase.
4. Em nicho técnico (ex. engenharia), troque "engenheiro" genérico por especialidade ou função natural quando a fonte permitir.
5. Mantenha nomes, datas, números e o nome de cada item do ranking (âncoras de credibilidade).
6. Frases curtas (maioria com até 12 palavras). Uma ideia por frase.
7. Reescreva "narrative_script_tagged" com as MESMAS palavras + tags ([pause], (breath), [pausa], [ênfase], [rápido], [lento]).
8. Mantenha a tese e a estrutura; remova clichês de IA ("neste vídeo", "prepare-se", "incrível" sem prova).
9. FINAL: frase declarativa (mic drop) — remova perguntas vazias ("Você prefere…?", "Comenta aí").

${UGC_SCRIPTWRITER_REINFORCEMENT}

Responda APENAS JSON:
{
  "narrative_script": "...",
  "narrative_script_tagged": "..."
}`;
}
