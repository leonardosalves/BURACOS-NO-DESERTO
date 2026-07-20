/**
 * youtubeCredentials.js — Armazena credenciais por canal, CRIPTOGRAFADAS.
 * Requer: CREDENTIALS_SECRET no .env
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const ALGO = "aes-256-gcm";

function getKey() {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret) {
    throw new Error(
      "Defina CREDENTIALS_SECRET no .env (ex: openssl rand -hex 32)"
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(text) {
  if (text == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const data = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    data: data.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(payload) {
  if (!payload || !payload.iv || !payload.data || !payload.tag) return null;
  try {
    const decipher = crypto.createDecipheriv(
      ALGO,
      getKey(),
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    console.error("[Criptografia] Erro ao descriptografar:", err.message);
    return null;
  }
}

function credPath(channelId) {
  return path.join(CHANNELS_DIR, channelId, "credentials.enc.json");
}

// ── SALVAR (criptografa campos sensíveis) ──
export function saveCredentials(channelId, creds) {
  const current = fs.existsSync(credPath(channelId))
    ? loadCredentials(channelId)
    : { api_key: null, oauth: null };

  // Mesclar dados passados com os que já existem para não apagar a API key ao atualizar o OAuth e vice-versa
  const api_key_to_save = creds.hasOwnProperty("api_key")
    ? creds.api_key
    : current.api_key;
  const oauth_to_save = creds.hasOwnProperty("oauth")
    ? creds.oauth
    : current.oauth;

  const stored = {
    api_key: api_key_to_save ? encrypt(api_key_to_save) : null,
    oauth: oauth_to_save
      ? {
          refresh_token: oauth_to_save.refresh_token
            ? encrypt(oauth_to_save.refresh_token)
            : null,
          access_token: oauth_to_save.access_token
            ? encrypt(oauth_to_save.access_token)
            : null,
          expires_at: oauth_to_save.expires_at || 0,
          scopes: oauth_to_save.scopes || [],
          connected_at: oauth_to_save.connected_at || new Date().toISOString(),
          email: oauth_to_save.email || null,
        }
      : null,
    atualizado_em: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(credPath(channelId)), { recursive: true });
  fs.writeFileSync(
    credPath(channelId),
    JSON.stringify(stored, null, 2),
    "utf8"
  );
}

// ── CARREGAR (descriptografa) ──
export function loadCredentials(channelId) {
  const p = credPath(channelId);
  if (!fs.existsSync(p)) return { api_key: null, oauth: null };
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      api_key: decrypt(raw.api_key),
      oauth: raw.oauth
        ? {
            refresh_token: decrypt(raw.oauth.refresh_token),
            access_token: decrypt(raw.oauth.access_token),
            expires_at: raw.oauth.expires_at,
            scopes: raw.oauth.scopes,
            connected_at: raw.oauth.connected_at,
            email: raw.oauth.email,
          }
        : null,
    };
  } catch (err) {
    console.error(
      `[Criptografia] Falha ao carregar credenciais do canal ${channelId}:`,
      err.message
    );
    return { api_key: null, oauth: null };
  }
}

// ── STATUS (seguro p/ frontend — sem tokens) ──
export function getCredentialsStatus(channelId) {
  const creds = loadCredentials(channelId);
  return {
    has_api_key: Boolean(creds.api_key),
    oauth_connected: Boolean(creds.oauth?.refresh_token),
    oauth_email: creds.oauth?.email || null,
    oauth_connected_at: creds.oauth?.connected_at || null,
  };
}

export function deleteCredentials(channelId) {
  const p = credPath(channelId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
