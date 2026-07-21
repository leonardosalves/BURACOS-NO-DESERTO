#!/usr/bin/env node
/**
 * validateMigration.mjs
 * Valida se a migração para o Design System ficou consistente.
 * USO: node scripts/validateMigration.mjs
 * Exit code 0 = tudo ok · 1 = algo falhou
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

const checks = [];
const check = (name, pass, detail = "") => checks.push({ name, pass, detail });

function* walk(dir, exts) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full, exts);
    else if (exts.includes(path.extname(e.name))) yield full;
  }
}

const jsxFiles = [...walk(SRC, [".jsx", ".tsx"])];
const allJsx = jsxFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// ── 1. Classes legadas removidas dos JSX ──
const legacyBtn = (allJsx.match(/ch-btn/g) || []).length;
const legacyTag = (allJsx.match(/ch-tag/g) || []).length;
check("Sem 'ch-btn' nos JSX/TSX", legacyBtn === 0, `${legacyBtn} ocorrência(s)`);
check("Sem 'ch-tag' nos JSX/TSX", legacyTag === 0, `${legacyTag} ocorrência(s)`);

// ── 2. Classes novas presentes ──
check("Classe 'btn' em uso", /["'`\s]btn["'`\s]/.test(allJsx));
check("Classe 'badge' em uso", /badge/.test(allJsx));

// ── 3. legacy-compat.css configurado ──
const compatPath = path.join(SRC, "styles/legacy-compat.css");
const compatExists = fs.existsSync(compatPath);
check("legacy-compat.css existe", compatExists);
if (compatExists) {
  const compat = fs.readFileSync(compatPath, "utf8");
  check("legacy-compat mapeia --amber", compat.includes("--amber:"));
  check("legacy-compat mapeia --bg-card", compat.includes("--bg-card:"));
  check("legacy-compat mapeia --font-display", compat.includes("--font-display:"));
}

// ── 4. channels.css sem tokens antigos ──
const channelsPath = path.join(SRC, "styles/channels.css");
if (fs.existsSync(channelsPath)) {
  const channels = fs.readFileSync(channelsPath, "utf8");
  const hasOldAmber = /--amber:\s*#[0-9a-fA-F]/.test(channels);
  check(
    "channels.css sem --amber antigo (hex)",
    !hasOldAmber,
    hasOldAmber ? "ainda define --amber com hex" : "ok"
  );
  const hasOldFont = /Archivo Black/.test(channels);
  check(
    "channels.css sem fonte antiga (Archivo Black)",
    !hasOldFont,
    hasOldFont ? "ainda referencia Archivo Black" : "ok"
  );
} else {
  check("channels.css existe", false, "arquivo não encontrado");
}

// ── 5. Ordem de imports no main (+ App como fallback) ──
const mainPath = ["main.jsx", "main.tsx", "index.jsx", "index.tsx"]
  .map((f) => path.join(SRC, f))
  .find((p) => fs.existsSync(p));
const appPath = ["App.tsx", "App.jsx"]
  .map((f) => path.join(SRC, f))
  .find((p) => fs.existsSync(p));

if (mainPath) {
  const main = fs.readFileSync(mainPath, "utf8");
  const app = appPath ? fs.readFileSync(appPath, "utf8") : "";
  const combined = main + "\n" + app;
  const dsIdx = combined.indexOf("design-system.css");
  const lcIdx = combined.indexOf("legacy-compat.css");
  const chIdx = combined.indexOf("channels.css");
  check("main importa design-system.css", main.includes("design-system.css"));
  check("main importa legacy-compat.css", main.includes("legacy-compat.css"));
  check(
    "ordem: design-system → legacy-compat",
    dsIdx !== -1 && lcIdx !== -1 && dsIdx < lcIdx
  );
  check(
    "ordem: legacy-compat → channels (main ou App)",
    lcIdx !== -1 && chIdx !== -1 && lcIdx < chIdx
  );
} else {
  check("main.jsx/tsx encontrado", false);
}

// ── 6. Design system files ──
for (const f of [
  "styles/design-system.css",
  "styles/design-system-light.css",
  "styles/splash.css",
  "components/Logo.tsx",
  "components/SplashScreen.tsx",
  "components/ThemeToggle.tsx",
  "hooks/themeStore.ts",
  "hooks/useTheme.ts",
]) {
  check(`${f} existe`, fs.existsSync(path.join(SRC, f)));
}

// ── Resultado ──
let passCount = 0;
console.log("\n── Validação da Migração ──\n");
for (const c of checks) {
  console.log(
    `${c.pass ? "✅" : "❌"} ${c.name}${c.detail ? `  (${c.detail})` : ""}`
  );
  if (c.pass) passCount++;
}
console.log(`\n${passCount}/${checks.length} verificações passaram.`);
process.exit(passCount === checks.length ? 0 : 1);
