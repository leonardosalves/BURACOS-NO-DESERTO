/**
 * Helpers padronizados para rotas Express no backend Lumiera.
 * - asyncHandler: elimina try/catch repetido
 * - openSseStream: SSE com cleanup de desconexão do cliente
 * - requireProjectJson: leitura obrigatória de arquivo com erro amigável
 */

import fs from "fs";
import path from "path";

/**
 * Wrapper que elimina try/catch repetido em rotas async.
 * Erros com .status usam esse código HTTP; demais = 500.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.geminiBrowserPending) return; // resposta já tratada pelo browser bridge
    if (res.headersSent) return;
    const status = Number(err?.status) || 500;
    res.status(status).json({ error: err?.message || String(err) });
  });

/**
 * Abre um stream SSE com cleanup automático de desconexão do cliente.
 * Retorna { signal, send, end } para controle do pipeline.
 */
export function openSseStream(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  return {
    signal: controller.signal,
    send: (type, payload = {}) => {
      if (controller.signal.aborted) return false;
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
      return true;
    },
    end: () => {
      if (!controller.signal.aborted) res.end();
    },
  };
}

/**
 * Leitura obrigatória de arquivo JSON do projeto com erro amigável.
 * Lança erro com status 400 se o arquivo não existir.
 */
export function requireProjectJson(projDir, filename, friendlyMessage) {
  const p = path.join(projDir, filename);
  if (!fs.existsSync(p)) {
    const err = new Error(
      friendlyMessage || `${filename} não encontrado no projeto.`
    );
    err.status = 400;
    throw err;
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
