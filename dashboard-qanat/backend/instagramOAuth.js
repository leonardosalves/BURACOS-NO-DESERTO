import fs from "fs";
import path from "path";

const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
];

export function getInstagramPaths(workspaceDir) {
  return {
    secrets: path.join(workspaceDir, "instagram_app_secrets.json"),
    token: path.join(workspaceDir, "instagram_oauth_token.json"),
    legacy: path.join(workspaceDir, "instagram_secrets.json"),
  };
}

export function saveInstagramAppCredentials(workspaceDir, { app_id, app_secret }) {
  const paths = getInstagramPaths(workspaceDir);
  fs.writeFileSync(paths.secrets, JSON.stringify({ app_id, app_secret }, null, 2), "utf8");
}

export function getInstagramConnectionStatus(workspaceDir) {
  const paths = getInstagramPaths(workspaceDir);
  const hasApp = fs.existsSync(paths.secrets);
  const hasOAuth = fs.existsSync(paths.token);
  const hasLegacy = fs.existsSync(paths.legacy);
  return {
    connected: hasOAuth || hasLegacy,
    hasApp,
    hasOAuth,
    hasLegacy,
    oauthReady: hasApp && hasOAuth,
  };
}

export function buildInstagramAuthUrl(workspaceDir, redirectUri) {
  const paths = getInstagramPaths(workspaceDir);
  const secrets = JSON.parse(fs.readFileSync(paths.secrets, "utf8"));
  const params = new URLSearchParams({
    client_id: secrets.app_id,
    redirect_uri: redirectUri,
    scope: IG_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeInstagramCode(workspaceDir, code, redirectUri) {
  const paths = getInstagramPaths(workspaceDir);
  const secrets = JSON.parse(fs.readFileSync(paths.secrets, "utf8"));

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      client_id: secrets.app_id,
      client_secret: secrets.app_secret,
      redirect_uri: redirectUri,
      code,
    }).toString()}`,
  );
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData?.error?.message || "Falha no OAuth Instagram.");
  }

  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: secrets.app_id,
      client_secret: secrets.app_secret,
      fb_exchange_token: tokenData.access_token,
    }).toString()}`,
  );
  const longData = await longRes.json();
  const accessToken = longData.access_token || tokenData.access_token;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`,
  );
  const pagesData = await pagesRes.json();
  const page = pagesData?.data?.[0];

  const payload = {
    access_token: accessToken,
    page_id: page?.id || null,
    page_name: page?.name || null,
    obtained_at: new Date().toISOString(),
  };
  fs.writeFileSync(paths.token, JSON.stringify(payload, null, 2), "utf8");

  if (page?.id) {
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
    );
    const igData = await igRes.json();
    const igId = igData?.instagram_business_account?.id;
    if (igId) {
      fs.writeFileSync(
        paths.legacy,
        JSON.stringify({ instagram_business_account_id: igId, access_token: accessToken }, null, 2),
        "utf8",
      );
      payload.instagram_business_account_id = igId;
    }
  }

  return payload;
}