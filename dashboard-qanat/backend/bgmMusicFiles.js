/**
 * Separa arquivos de BGM (música de fundo) de narração e saídas do mixer.
 */

import fs from "fs";
import path from "path";

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg)$/i;

/** Saída do mix_bgm.py — não é candidata a seleção manual. */
const NON_BGM_PICKER_NAMES = new Set([
  "narracao_mestra_premium.mp3",
  "narracao_master.mp3",
  "voiceover.mp3",
  "trilha_documentario.mp3",
]);

/** Fatias por bloco geradas pelo Whisper/align (1.mp3, 2.mp3, …) = trechos da voz. */
export function isBlockNarrationSlice(fileName = "") {
  return /^\d+\.mp3$/i.test(path.basename(String(fileName || "").trim()));
}

export function isBgmMusicCandidate(fileName = "") {
  const base = path.basename(String(fileName || "").trim());
  if (!base || !AUDIO_EXT.test(base)) return false;
  const lower = base.toLowerCase();
  if (NON_BGM_PICKER_NAMES.has(lower)) return false;
  if (isBlockNarrationSlice(lower)) return false;
  return true;
}

export function listBgmMusicCandidates(projDir) {
  const found = new Set();
  const scanDir = (dir) => {
    try {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (!fs.statSync(full).isFile()) continue;
        if (isBgmMusicCandidate(name)) found.add(name);
      }
    } catch {
      /* ignore missing dirs */
    }
  };

  scanDir(projDir);
  scanDir(path.join(projDir, "MUSICAS"));
  scanDir(path.join(projDir, "ASSETS", "audio"));

  return [...found].sort((a, b) => a.localeCompare(b));
}

/** Resolve arquivo apenas dentro da pasta do projeto (sem fallback ao workspace). */
export function findProjectFileLocal(projDir, fileName = "") {
  if (!projDir || !fileName) return null;
  const safeName = path.basename(String(fileName).trim());
  if (!safeName) return null;
  const candidates = [
    path.join(projDir, safeName),
    path.join(projDir, "ASSETS", safeName),
    path.join(projDir, "ASSETS", "images", safeName),
    path.join(projDir, "ASSETS", "videos", safeName),
    path.join(projDir, "ASSETS", "audio", safeName),
    path.join(projDir, "MUSICAS", safeName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export function projectBgmFileExists(projDir, fileName = "") {
  return Boolean(findProjectFileLocal(projDir, fileName));
}
