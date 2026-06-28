/**
 * Baixa ícones Lottie gratuitos (LottieFiles CDN) para lottie_assets/
 * Run: node scripts/download-lottie-pack.mjs
 * Run again safely — ignora arquivos que já existem.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../src/overlays/lottie_assets");

/** key = nome semântico no registry · url = JSON público LottieFiles */
const PACK = [
  { key: "sword", file: "lottie_edu_sword_1.json", url: "https://lottie.host/4c4e5c8f-8f3a-4e2b-9c1d-2a3b4c5d6e7f/sword.json" },
  { key: "scroll", file: "lottie_edu_scroll_1.json", url: "https://assets10.lottiefiles.com/packages/lf20_u4yrau.json" },
  { key: "pyramid", file: "lottie_nature_pyramid_1.json", url: "https://assets3.lottiefiles.com/packages/lf20_touohxv0.json" },
  { key: "ship", file: "lottie_life_ship_1.json", url: "https://assets9.lottiefiles.com/packages/lf20_5ngs2qsx.json" },
  { key: "anchor", file: "lottie_life_anchor_1.json", url: "https://assets1.lottiefiles.com/packages/lf20_iorpbol0.json" },
  { key: "skull", file: "lottie_life_skull_1.json", url: "https://assets4.lottiefiles.com/packages/lf20_kcsr6fcp.json" },
  { key: "hammer", file: "lottie_life_hammer_1.json", url: "https://assets2.lottiefiles.com/packages/lf20_tfa8yebr.json" },
  { key: "pickaxe", file: "lottie_life_pickaxe_1.json", url: "https://assets5.lottiefiles.com/packages/lf20_q5pk4pqs.json" },
  { key: "microscope", file: "lottie_tech_microscope_1.json", url: "https://assets6.lottiefiles.com/packages/lf20_1px6dvhc.json" },
  { key: "dna", file: "lottie_tech_dna_1.json", url: "https://assets7.lottiefiles.com/packages/lf20_49rdyysj.json" },
  { key: "telescope", file: "lottie_tech_telescope_1.json", url: "https://assets8.lottiefiles.com/packages/lf20_ab8hz5ct.json" },
  { key: "mountain", file: "lottie_nature_mountain_1.json", url: "https://assets1.lottiefiles.com/packages/lf20_x62chJ.json" },
  { key: "water", file: "lottie_nature_water_1.json", url: "https://assets9.lottiefiles.com/packages/lf20_ydo1amjm.json" },
  { key: "temple", file: "lottie_edu_temple_1.json", url: "https://assets3.lottiefiles.com/packages/lf20_v7id8o.json" },
  { key: "pillar", file: "lottie_edu_pillar_1.json", url: "https://assets2.lottiefiles.com/packages/lf20_myejiggj.json" },
  { key: "hourglass", file: "lottie_ui_hourglass_1.json", url: "https://assets4.lottiefiles.com/packages/lf20_kxsdyyzc.json" },
  { key: "key", file: "lottie_ui_key_1.json", url: "https://assets5.lottiefiles.com/packages/lf20_ysrn2i.json" },
  { key: "lock", file: "lottie_ui_lock_1.json", url: "https://assets6.lottiefiles.com/packages/lf20_6o5m2w.json" },
  { key: "lightning", file: "lottie_tech_lightning_1.json", url: "https://assets7.lottiefiles.com/packages/lf20_jcikwtux.json" },
  { key: "earth", file: "lottie_life_earth_1.json", url: "https://assets8.lottiefiles.com/packages/lf20_touohxv0.json" },
];

async function downloadOne({ key, file, url }) {
  const dest = path.join(ASSETS_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`  skip ${file} (exists)`);
    return { key, file, status: "skipped" };
  }
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.v && !data.layers) throw new Error("not a lottie JSON");
    fs.writeFileSync(dest, JSON.stringify(data), "utf8");
    console.log(`  ok   ${file}`);
    return { key, file, status: "ok" };
  } catch (err) {
    console.warn(`  fail ${file}: ${err.message}`);
    return { key, file, status: "fail", error: err.message };
  }
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  console.log(`[lottie-download] ${PACK.length} ícones → ${ASSETS_DIR}`);
  const results = [];
  for (const item of PACK) {
    results.push(await downloadOne(item));
  }
  const ok = results.filter((r) => r.status === "ok").length;
  const skip = results.filter((r) => r.status === "skipped").length;
  const fail = results.filter((r) => r.status === "fail").length;
  console.log(`[lottie-download] ${ok} novos, ${skip} já existiam, ${fail} falhas`);
  if (ok > 0) {
    console.log("[lottie-download] Rode: node scripts/generate-lottie-registry.mjs");
  }
}

main();