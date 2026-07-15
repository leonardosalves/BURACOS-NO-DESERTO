/**
 * Cache de leitura de arquivo com verificação de mtime.
 * Evita reler NARRACAOPRO.md (~32KB) e COMOUSARANARRACAOPRO.md (~24KB)
 * do disco a cada montagem de prompt.
 */

import fs from "fs";

const cache = new Map(); // path → { mtimeMs, content }

/**
 * Lê um arquivo e cacheia o conteúdo.
 * Recarrega automaticamente se o mtime mudou.
 * Retorna string vazia se o arquivo não existir.
 */
export function loadFileCached(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const hit = cache.get(filePath);
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit.content;
    const content = fs.readFileSync(filePath, "utf8");
    cache.set(filePath, { mtimeMs: stat.mtimeMs, content });
    return content;
  } catch {
    return "";
  }
}

/** Invalida o cache para um arquivo específico (útil em testes). */
export function invalidateFileCache(filePath) {
  cache.delete(filePath);
}
