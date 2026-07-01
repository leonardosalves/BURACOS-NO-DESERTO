import crypto from "crypto";
import fs from "fs";
import path from "path";
import { LUMIERA_CANVA_CALLBACK } from "./lumieraUrls.js";

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";

export const CANVA_SCOPES = [
  "asset:read",
  "asset:write",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "profile:read",
].join(" ");

export function getCanvaPaths(workspaceDir) {
  return {
    secrets: path.join(workspaceDir, "canva_client_secrets.json"),
    token: path.join(workspaceDir, "canva_token.json"),
    pending: path.join(workspaceDir, "canva_oauth_pending.json"),
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function base64BasicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getCanvaConnectionStatus(workspaceDir) {
  const paths = getCanvaPaths(workspaceDir);
  const secrets = readJson(paths.secrets);
  const token = readJson(paths.token);
  return {
    connected: Boolean(secrets?.client_id && token?.access_token),
    hasSecrets: Boolean(secrets?.client_id && secrets?.client_secret),
    clientId: secrets?.client_id || null,
    expiresAt: token?.expires_at || null,
  };
}

export function saveCanvaCredentials(workspaceDir, { client_id, client_secret, redirect_uri }) {
  const paths = getCanvaPaths(workspaceDir);
  writeJson(paths.secrets, {
    client_id: client_id.trim(),
    client_secret: client_secret.trim(),
    redirect_uri: redirect_uri?.trim() || LUMIERA_CANVA_CALLBACK,
  });
}

export function buildCanvaAuthUrl(workspaceDir, redirectUri = LUMIERA_CANVA_CALLBACK) {
  const paths = getCanvaPaths(workspaceDir);
  const secrets = readJson(paths.secrets);
  if (!secrets?.client_id) {
    throw new Error("Credenciais do Canva não configuradas.");
  }

  const codeVerifier = crypto.randomBytes(96).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(48).toString("base64url");

  writeJson(paths.pending, {
    state,
    code_verifier: codeVerifier,
    created_at: new Date().toISOString(),
  });

  const params = new URLSearchParams({
    code_challenge: codeChallenge,
    code_challenge_method: "s256",
    scope: CANVA_SCOPES,
    response_type: "code",
    client_id: secrets.client_id,
    state,
    redirect_uri: secrets.redirect_uri || redirectUri,
  });

  return `${CANVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCanvaAuthCode(workspaceDir, { code, state }, redirectUri = LUMIERA_CANVA_CALLBACK) {
  const paths = getCanvaPaths(workspaceDir);
  const secrets = readJson(paths.secrets);
  const pending = readJson(paths.pending);

  if (!secrets?.client_id || !secrets?.client_secret) {
    throw new Error("Credenciais do Canva ausentes.");
  }
  if (!pending?.code_verifier || pending.state !== state) {
    throw new Error("Estado OAuth inválido. Tente vincular novamente.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code_verifier: pending.code_verifier,
    code,
    redirect_uri: secrets.redirect_uri || redirectUri,
  });

  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64BasicAuth(secrets.client_id, secrets.client_secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Falha ao obter token do Canva.");
  }

  const expiresAt = Date.now() + (Number(data.expires_in || 3600) * 1000);
  writeJson(paths.token, { ...data, expires_at: expiresAt, obtained_at: new Date().toISOString() });
  try { fs.unlinkSync(paths.pending); } catch { /* ignore */ }
  return data;
}

export async function getCanvaAccessToken(workspaceDir) {
  const paths = getCanvaPaths(workspaceDir);
  const secrets = readJson(paths.secrets);
  const token = readJson(paths.token);

  if (!secrets?.client_id || !secrets?.client_secret || !token?.access_token) {
    throw new Error("Canva não conectado. Vincule sua conta nas integrações.");
  }

  if (token.expires_at && token.expires_at > Date.now() + 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error("Token do Canva expirado. Vincule novamente.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64BasicAuth(secrets.client_id, secrets.client_secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Falha ao renovar token do Canva.");
  }

  const expiresAt = Date.now() + (Number(data.expires_in || 3600) * 1000);
  const merged = {
    ...token,
    ...data,
    refresh_token: data.refresh_token || token.refresh_token,
    expires_at: expiresAt,
    refreshed_at: new Date().toISOString(),
  };
  writeJson(paths.token, merged);
  return merged.access_token;
}

async function canvaRequest(workspaceDir, endpoint, { method = "GET", body, headers = {} } = {}) {
  const accessToken = await getCanvaAccessToken(workspaceDir);
  const response = await fetch(`${CANVA_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body,
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!response.ok) {
    const message = data?.message || data?.error?.message || data?.error || text || response.statusText;
    throw new Error(`Canva API ${response.status}: ${message}`);
  }

  return data;
}

export async function pollCanvaJob(workspaceDir, endpoint, { intervalMs = 2000, maxAttempts = 60 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await canvaRequest(workspaceDir, endpoint);
    const job = data?.job || data;
    const status = job?.status;

    if (status === "success") return job;
    if (status === "failed") {
      throw new Error(job?.error?.message || job?.error?.code || "Job do Canva falhou.");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timeout aguardando job do Canva.");
}

export async function uploadCanvaAsset(workspaceDir, filePath, displayName = "lumiera-thumb") {
  const safeName = String(displayName).slice(0, 50);
  const metadataHeader = JSON.stringify({
    name_base64: Buffer.from(safeName, "utf8").toString("base64"),
  });
  const accessToken = await getCanvaAccessToken(workspaceDir);
  const fileBuffer = fs.readFileSync(filePath);

  const response = await fetch(`${CANVA_API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": metadataHeader,
      "Content-Length": String(fileBuffer.length),
    },
    body: fileBuffer,
  });

  const initial = await response.json();
  if (!response.ok) {
    throw new Error(initial?.message || initial?.error?.message || "Falha ao enviar asset para o Canva.");
  }

  const jobId = initial?.job?.id;
  if (!jobId) throw new Error("Canva não retornou job de upload.");

  const job = await pollCanvaJob(workspaceDir, `/asset-uploads/${jobId}`);
  if (!job?.asset?.id) throw new Error("Upload no Canva concluído sem asset_id.");
  return job.asset;
}

export async function createCanvaDesign(workspaceDir, { width, height, assetId, title }) {
  const payload = {
    type: "type_and_asset",
    design_type: { type: "custom", width, height },
    title: title || "Lumiera Thumbnail",
  };
  if (assetId) payload.asset_id = assetId;

  return canvaRequest(workspaceDir, "/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function exportCanvaDesign(workspaceDir, designId, format = { type: "jpg", quality: 95 }) {
  const created = await canvaRequest(workspaceDir, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format }),
  });

  const jobId = created?.job?.id;
  if (!jobId) throw new Error("Canva não retornou job de exportação.");

  const job = await pollCanvaJob(workspaceDir, `/exports/${jobId}`, { maxAttempts: 90 });
  const urls = job?.urls || job?.result?.urls || [];
  const downloadUrl = Array.isArray(urls) ? urls[0]?.url || urls[0] : urls?.url;
  if (!downloadUrl) throw new Error("Exportação do Canva sem URL de download.");
  return { job, downloadUrl };
}

export async function downloadCanvaFile(downloadUrl, outputPath) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo do Canva (${response.status}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}