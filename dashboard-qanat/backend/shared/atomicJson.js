import fs from "fs";
import path from "path";

const writeQueues = new Map(); // serializa escritas por arquivo

/**
 * Escrita atômica: grava em arquivo temporário e renomeia.
 * Nunca deixa JSON truncado em disco — rename é atômico no mesmo volume.
 */
export function writeJsonAtomicSync(filePath, data) {
  const dir = path.dirname(filePath);
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    // Fallback: em volumes diferentes, rename pode falhar — copia + remove
    fs.copyFileSync(tmp, filePath);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignora se cleanup falhar */
    }
    if (!fs.existsSync(filePath)) throw err;
  }
}

/**
 * Versão com fila: escritas concorrentes no MESMO arquivo são serializadas.
 * Retorna Promise que resolve quando a escrita foi concluída.
 */
export async function writeJsonQueued(filePath, data) {
  const key = path.resolve(filePath);
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => writeJsonAtomicSync(key, data));
  writeQueues.set(key, next);
  return next;
}

/**
 * Leitura segura de JSON com guarda de existência.
 * Retorna fallback se o arquivo não existir ou for inválido.
 */
export function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
