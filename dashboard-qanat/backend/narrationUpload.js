import fs from "fs";

export const MAX_NARRATION_UPLOAD_BYTES = 250 * 1024 * 1024;

export function hasMp3Signature(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(3);
    if (fs.readSync(fd, header, 0, 3, 0) < 2) return false;
    return (
      header.toString("ascii", 0, 3) === "ID3" ||
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
    );
  } finally {
    fs.closeSync(fd);
  }
}

export async function installNarrationAtomically(
  tempPath,
  destinationPath,
  { probeDuration } = {}
) {
  const stat = fs.statSync(tempPath);
  if (!stat.size) throw new Error("O arquivo de narração está vazio.");
  if (!hasMp3Signature(tempPath))
    throw new Error("O arquivo não possui assinatura MP3 válida.");
  const duration = Number(await probeDuration?.(tempPath));
  if (!Number.isFinite(duration) || duration <= 0.1)
    throw new Error("Não foi possível validar a duração do MP3.");
  const backupPath = `${destinationPath}.previous`;
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  const hadPrevious = fs.existsSync(destinationPath);
  if (hadPrevious) fs.renameSync(destinationPath, backupPath);
  try {
    fs.renameSync(tempPath, destinationPath);
  } catch (err) {
    if (hadPrevious && fs.existsSync(backupPath))
      fs.renameSync(backupPath, destinationPath);
    throw err;
  }
  if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  return { duration, bytes: stat.size };
}

export function removeTemporaryNarration(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}
