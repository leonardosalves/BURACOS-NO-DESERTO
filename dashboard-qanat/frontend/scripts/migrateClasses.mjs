#!/usr/bin/env node
/**
 * migrateClasses.mjs
 * Migra classes legadas (ch-btn, ch-tag) para o Design System (btn, badge)
 * em todos os arquivos JSX/TSX do frontend.
 *
 * SEGURANÇA:
 *  - Dry-run por padrão (não altera nada sem --apply)
 *  - Backup .bak antes de sobrescrever (apenas com --apply)
 *  - Substitui SOMENTE tokens dentro de string literals (className="...", `...`)
 *  - NÃO toca em: ch-card, ch-badge, ch-field, etc.
 *
 * USO:
 *   node scripts/migrateClasses.mjs
 *   node scripts/migrateClasses.mjs --apply
 *   node scripts/migrateClasses.mjs --apply --no-backup
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

const APPLY = process.argv.includes("--apply");
const BACKUP = !process.argv.includes("--no-backup");

// Ordem: mais específico primeiro — Map evita protótipo (toString/valueOf)
const CLASS_MAP = new Map([
  ["ch-btn--primary", "btn--primary"],
  ["ch-btn--ghost", "btn--ghost"],
  ["ch-btn--danger", "btn--danger"],
  ["ch-btn", "btn"],
  ["ch-tag", "badge"],
]);

const EXTENSIONS = new Set([".jsx", ".tsx", ".js", ".ts"]);

function replaceTokensInString(str) {
  // Só tokens de classe (inclui --). NUNCA usar Object plain map: Object.prototype.toString
  // poluiria `.toString` em template strings (`Math.random().toString(36)`).
  return str.replace(/[A-Za-z0-9_-]+/g, (token) =>
    CLASS_MAP.has(token) ? CLASS_MAP.get(token) : token
  );
}

function migrateContent(src) {
  let changed = false;
  // Só string literals de className / class (evita tocar template strings de lógica)
  const out = src.replace(
    /\b(className|class)\s*=\s*(["'`])((?:\\.|(?!\2).)*)\2/g,
    (match, attr, quote, inner) => {
      const replaced = replaceTokensInString(inner);
      if (replaced !== inner) changed = true;
      return `${attr}=${quote}${replaced}${quote}`;
    }
  );
  return { out, changed };
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

function reportDeadCss() {
  const cssPath = path.resolve(__dirname, "../src/styles/channels.css");
  if (!fs.existsSync(cssPath)) return;
  const css = fs.readFileSync(cssPath, "utf8");
  const deadSelectors = [...CLASS_MAP.keys()].map((c) => `.${c}`);
  const found = deadSelectors.filter((sel) => css.includes(sel));
  if (found.length) {
    console.log(
      "\n📋 CSS agora sem uso em channels.css (remover manualmente, se desejar):"
    );
    found.forEach((sel) => console.log(`   ${sel}`));
  }
}

let filesChanged = 0;
let totalReplacements = 0;

console.log(
  `${APPLY ? "🔧 APLICANDO" : "🔍 DRY-RUN"} — migração de classes em ${SRC_DIR}\n`
);

for (const file of walk(SRC_DIR)) {
  const original = fs.readFileSync(file, "utf8");
  const { out, changed } = migrateContent(original);
  if (!changed) continue;

  filesChanged++;
  const before = (original.match(/ch-btn|ch-tag/g) || []).length;
  const after = (out.match(/ch-btn|ch-tag/g) || []).length;
  totalReplacements += before - after;

  const rel = path.relative(process.cwd(), file);
  console.log(
    `  ${APPLY ? "✏️ " : "• "}${rel}  (${before - after} substituições)`
  );

  if (APPLY) {
    if (BACKUP) fs.copyFileSync(file, `${file}.bak`);
    fs.writeFileSync(file, out, "utf8");
  }
}

console.log(`\n── Resumo ──`);
console.log(
  `Arquivos ${APPLY ? "modificados" : "que mudariam"}: ${filesChanged}`
);
console.log(`Substituições: ${totalReplacements}`);
if (!APPLY && filesChanged > 0) {
  console.log(
    `\n⚠️  Nada foi alterado. Rode com --apply para efetivar (com backup).`
  );
}
if (APPLY) {
  reportDeadCss();
}
