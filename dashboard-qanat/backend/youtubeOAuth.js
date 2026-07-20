/**
 * youtubeOAuth.js — Conecta um canal via OAuth (autorização do dono).
 *
 * USO no server.js:
 *   import oauthRouter from "./youtubeOAuth.js";
 *   app.use("/api/youtube", oauthRouter);
 *
 * Requer no .env:
 *   YT_OAUTH_CLIENT_ID=...
 *   YT_OAUTH_CLIENT_SECRET=...
 *   YT_OAUTH_REDIRECT_URI=http://127.0.0.1:3005/api/youtube/oauth/callback
 */

import { Router } from "express";
import {
  saveCredentials,
  loadCredentials,
  getCredentialsStatus,
} from "./youtubeCredentials.js";

const router = Router();

const getOAuthConfig = () => {
  return {
    client_id: process.env.YT_OAUTH_CLIENT_ID,
    client_secret: process.env.YT_OAUTH_CLIENT_SECRET,
    redirect_uri:
      process.env.YT_OAUTH_REDIRECT_URI ||
      "http://127.0.0.1:3005/api/youtube/oauth/callback",
    scopes: [
      "https://www.googleapis.com/auth/yt-analytics.readonly", // CTR, retenção, watch time
      "https://www.googleapis.com/auth/youtube.readonly", // dados do canal
      "https://www.googleapis.com/auth/userinfo.email", // identificar a conta
    ],
  };
};

// ── 1. Gera a URL de autorização (frontend abre em popup) ──
router.get("/oauth/url/:channelId", (req, res) => {
  const { channelId } = req.params;
  const oauth = getOAuthConfig();
  if (!oauth.client_id) {
    return res
      .status(500)
      .json({ error: "YT_OAUTH_CLIENT_ID não configurado no .env." });
  }

  const params = new URLSearchParams({
    client_id: oauth.client_id,
    redirect_uri: oauth.redirect_uri,
    response_type: "code",
    scope: oauth.scopes.join(" "),
    access_type: "offline", // ← garante refresh_token
    prompt: "consent", // ← força consentir (garante refresh_token mesmo se já autorizado)
    state: channelId, // ← identifica qual canal no callback
    include_granted_scopes: "true",
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// ── 2. Callback do Google (troca code por tokens) ──
router.get("/oauth/callback", async (req, res) => {
  try {
    const { code, state: channelId, error } = req.query;
    if (error) return res.send(`❌ Autorização negada: ${error}`);
    if (!code || !channelId)
      return res.status(400).send("Faltou code ou state.");

    const oauth = getOAuthConfig();

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: oauth.client_id || "",
        client_secret: oauth.client_secret || "",
        redirect_uri: oauth.redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Descobrir o email da conta (para mostrar na UI)
    let email = null;
    try {
      const infoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );
      email = (await infoRes.json()).email;
    } catch (err) {
      console.warn(
        "[OAuth] Não foi possível ler informações do e-mail:",
        err.message
      );
    }

    saveCredentials(channelId, {
      oauth: {
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
        scopes: tokens.scope?.split(" ") || oauth.scopes,
        email,
      },
    });

    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 60px; background: #0b0d17; color: #eef0f8">
          <h2 style="color: #2ecc71; font-size: 24px; margin-bottom: 10px;">✅ Canal conectado com sucesso!</h2>
          <p style="color: #9aa2c0; font-size: 14px; margin-bottom: 20px;">
            ${email ? `Conta vinculada: <strong>${email}</strong><br>` : ""}
            O Lumiera já está integrado ao seu canal.
          </p>
          <p style="color: #626b8f; font-size: 12px;">Esta janela será fechada automaticamente...</p>
          <script>
            setTimeout(() => {
              try {
                window.close();
              } catch(e) {}
            }, 2500);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 60px; background: #0b0d17; color: #eef0f8">
          <h2 style="color: #e74c3c; font-size: 24px; margin-bottom: 10px;">❌ Falha na conexão</h2>
          <p style="color: #9aa2c0; font-size: 14px; margin-bottom: 20px;">
            Erro detalhado: <code style="background: #171b2c; padding: 4px 8px; border-radius: 4px; color: #ff9d92">${err.message}</code>
          </p>
          <button onclick="window.close()" style="background: #171b2c; border: 1px solid #343c5e; color: #eef0f8; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Fechar Janela</button>
        </body>
      </html>
    `);
  }
});

// ── 3. Status da conexão (seguro — sem tokens) ──
router.get("/status/:channelId", (req, res) => {
  res.json({ ok: true, ...getCredentialsStatus(req.params.channelId) });
});

// ── 4. Desconectar ──
router.delete("/disconnect/:channelId", (req, res) => {
  const { channelId } = req.params;
  const creds = loadCredentials(channelId);
  saveCredentials(channelId, { api_key: creds.api_key, oauth: null });
  res.json({ ok: true });
});

// ── 5. Salvar API key opcional do canal ──
router.post("/apikey/:channelId", (req, res) => {
  const { channelId } = req.params;
  const { apiKey } = req.body || {};
  const creds = loadCredentials(channelId);
  saveCredentials(channelId, { api_key: apiKey, oauth: creds.oauth });
  res.json({ ok: true });
});

export default router;
