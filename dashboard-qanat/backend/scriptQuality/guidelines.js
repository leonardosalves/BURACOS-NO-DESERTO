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
