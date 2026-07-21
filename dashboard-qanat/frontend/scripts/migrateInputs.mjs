#!/usr/bin/env node
/**
 * migrateInputs.mjs
 * Adiciona className="input" (ou "select") em <input>/<select>/<textarea>
 * que ainda NÃO têm className, para usar o Design System.
 *
 * USO:
 *   node scripts/migrateInputs.mjs
 *   node scripts/migrateInputs.mjs --apply
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

const APPLY = process.argv.includes("--apply");
const BACKUP = !process.argv.includes("--no-backup");

const EXTENSIONS = new Set([".jsx", ".tsx"]);
const SKIP_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "hidden",
  "file",
  "button",
  "submit",
  "image",
]);

const TAG_RE =
  /<(input|select|textarea)\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{[^}]*\})*?)(\/?>)/gs;

function processContent(src) {
  const changes = [];
  const out = src.replace(TAG_RE, (match, tag, attrs, close) => {
    if (/\bclassName\s*=/.test(attrs)) return match;

    const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/);
    const type = typeMatch ? typeMatch[1].toLowerCase() : "";
    if (tag === "input" && SKIP_INPUT_TYPES.has(type)) return match;

    const cls = tag === "select" ? "select" : "input";
    changes.push({ tag, cls });
    return `<${tag} className="${cls}"${attrs}${close}`;
  });
  return { out, changes };
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

let filesChanged = 0;
let totalAdded = 0;

console.log(
  `${APPLY ? "🔧 APLICANDO" : "🔍 DRY-RUN"} — unificação de inputs em ${SRC_DIR}\n`
);

for (const file of walk(SRC_DIR)) {
  const original = fs.readFileSync(file, "utf8");
  const { out, changes } = processContent(original);
  if (!changes.length) continue;

  filesChanged++;
  totalAdded += changes.length;
  const rel = path.relative(process.cwd(), file);
  const resumo = changes
    .map((c) => c.cls)
    .reduce((a, c) => ((a[c] = (a[c] || 0) + 1), a), {});
  const desc = Object.entries(resumo)
    .map(([k, v]) => `${v}× .${k}`)
    .join(", ");
  console.log(
    `  ${APPLY ? "✏️ " : "• "}${rel}  (+${changes.length}: ${desc})`
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
console.log(`Classes adicionadas: ${totalAdded}`);
if (!APPLY && filesChanged > 0) {
  console.log(
    `\n⚠️  Nada foi alterado. Rode com --apply para efetivar (com backup).`
  );
}
