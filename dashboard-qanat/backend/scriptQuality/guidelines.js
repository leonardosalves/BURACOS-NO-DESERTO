import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadFileCached } from "../shared/cachedFileLoader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = path.resolve(__dirname, "../../..");

export function loadNarracaoProGuidelines() {
  return loadPreferredGuideline("NARRACAOPRO.md");
}

export function loadComousarAnarracaoProGuidelines() {
  return loadPreferredGuideline("COMOUSARANARRACAOPRO.md");
}

function loadPreferredGuideline(filename) {
  const agentVersion = path.join(WORKSPACE_DIR, ".agents", filename);
  const workspaceVersion = path.join(WORKSPACE_DIR, filename);
  return loadFileCached(
    fs.existsSync(agentVersion) ? agentVersion : workspaceVersion
  );
}

const SHORTS_SECTIONS_RE =
  /## (?:3\. REGRA CENTRAL|6\. MÓDULO DE VALIDAÇÃO|7\. INTEGRIDADE FACTUAL|8\. AUDITORIA ORAL|9\. PORTÕES|10\. ESTRUTURA PARA|12\. TRANSIÇÕES|14\. CONTROLE DE DURAÇÃO|15\. BLOCK_PHRASE|16\. FORMATO DE SAÍDA)/;

const LONGO_SECTIONS_RE =
  /## (?:3\. REGRA CENTRAL|5\. FLUXO|6\. MÓDULO|7\. INTEGRIDADE|8\. AUDITORIA|9\. PORTÕES|11\. ESTRUTURA PARA VÍDEOS LONGOS|12\. TRANSIÇÕES|13\. PROTOCOLO|14\. CONTROLE|15\. BLOCK|16\. FORMATO|17\. MECANISMOS|18\. SEO)/;

function extractSections(markdown, sectionRe) {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const kept = [];
  let inSection = false;
  for (const line of lines) {
    if (/^## \d+\./.test(line)) {
      inSection = sectionRe.test(line);
    }
    if (inSection) kept.push(line);
  }
  return kept.join("\n");
}

/**
 * Versão compacta das diretrizes — injeta apenas seções relevantes
 * para o formato/duração, economizando ~30K tokens em Shorts.
 */
export function buildCompactGuidelines({
  format = "LONGO",
  durationSeconds = 0,
} = {}) {
  const isShorts =
    format === "SHORTS" ||
    format === "SHORT" ||
    (durationSeconds > 0 && durationSeconds <= 90);
  const guidelines = loadNarracaoProGuidelines();
  const comousar = loadComousarAnarracaoProGuidelines();

  const hierarchy = `\n=== HIERARQUIA DE DIRETRIZES (resolva conflitos por prioridade) ===
PRIORIDADE 1: Precisão factual e teste de entidade (NARRACAOPRO)
PRIORIDADE 2: Tese única, causalidade e concretude (NARRACAOPRO)
PRIORIDADE 3: Clareza e naturalidade oral (NARRACAOPRO)
PRIORIDADE 4: Adequação à duração e ao formato (NARRACAOPRO)
PRIORIDADE 5: Retenção e ritmo (NARRACAOPRO + VIRAL quando Shorts)
PRIORIDADE 6: Recursos criativos (SCRIPT_CREATIVE — submissa)
PRIORIDADE 7: CTA (fechamento declarativo é o padrão)
Regra: nível superior SEMPRE vence conflito com nível inferior.\n`;

  if (!isShorts) {
    return buildConsolidatedGuidelines();
  }

  let block = hierarchy;
  const compactNarracao = extractSections(guidelines, SHORTS_SECTIONS_RE);
  if (compactNarracao) {
    block += `\n[PRIORIDADE 1-4 — SOBERANA] DIRETRIZES ESSENCIAIS (NARRACAOPRO.md — modo Shorts compacto):\n${compactNarracao}\n`;
  }
  if (comousar) {
    const compactComousar = comousar.slice(0, 4000);
    block += `\n[PRIORIDADE 1-2 — PESQUISA] CURADORIA FACTUAL (resumo — escopo: pesquisa, fontes, cruzamento, certeza):\n${compactComousar}\n[... restante omitido para Shorts — consulte NARRACAOPRO completo se necessário]\n`;
  }
  return block;
}

/**
 * Compila as diretrizes de narração com hierarquia explícita.
 * Resolve duplicações e conflitos ANTES de injetar no prompt.
 * Chamado por todos os prompt builders que usam NARRACAOPRO + COMOUSARANARRACAOPRO.
 */
export function buildConsolidatedGuidelines() {
  const guidelines = loadNarracaoProGuidelines();
  const comousar = loadComousarAnarracaoProGuidelines();

  let block = "";

  block += `\n=== HIERARQUIA DE DIRETRIZES (resolva conflitos por prioridade) ===
PRIORIDADE 1: Precisão factual e teste de entidade (NARRACAOPRO)
PRIORIDADE 2: Tese única, causalidade e concretude (NARRACAOPRO)
PRIORIDADE 3: Clareza e naturalidade oral (NARRACAOPRO)
PRIORIDADE 4: Adequação à duração e ao formato (NARRACAOPRO)
PRIORIDADE 5: Retenção e ritmo (NARRACAOPRO + VIRAL quando Shorts)
PRIORIDADE 6: Recursos criativos (SCRIPT_CREATIVE — submissa)
PRIORIDADE 7: CTA (fechamento declarativo é o padrão)
Regra: nível superior SEMPRE vence conflito com nível inferior.\n`;

  if (guidelines) {
    block += `\n[PRIORIDADE 1-4 — SOBERANA] DIRETRIZES DE ROTEIRO E NARRAÇÃO (NARRACAOPRO.md):\n${guidelines}\n`;
  }
  if (comousar) {
    block += `\n[PRIORIDADE 1-2 — PESQUISA] CURADORIA FACTUAL (COMOUSARANARRACAOPRO.md — escopo: pesquisa, fontes, cruzamento, certeza. NÃO controla estrutura narrativa, tom, fechamento, CTA ou formato de saída):\n${comousar}\n`;
  }

  return block;
}
