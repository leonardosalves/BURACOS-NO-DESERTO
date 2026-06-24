import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

// ==================== API Configuration ====================
// Primary: Epidemic Sound's internal JSON API (works without auth for search)
// The search results include lqMp3Url for audio preview/download
const ES_SEARCH_BASE = "https://www.epidemicsound.com/json/search";
// Partner Content REST API (requires API Key with epidemic_live_ prefix)
const REST_API_BASE = "https://partner-content-api.epidemicsound.com";
// MCP SSE endpoint (fallback)
const MCP_SSE_URL = "https://www.epidemicsound.com/a/mcp-service/mcp";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ==================== HTTP Helpers ====================

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(urlObj, {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA, ...headers }
    }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        httpsGet(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", chunk => body += chunk.toString());
      res.on("end", () => resolve({ statusCode: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Request timeout (30s)")); });
    req.end();
  });
}

// ==================== PRIMARY: Epidemic Sound Internal API ====================
// These endpoints are used by the epidemicsound.com website itself
// They work without authentication for search, and include preview audio URLs

async function esInternalSearchMusic(query) {
  const url = `${ES_SEARCH_BASE}/tracks/?term=${encodeURIComponent(query)}&limit=10`;
  console.log(`[Epidemic] Searching music via internal API: "${query}" ...`);
  
  const res = await httpsGet(url, { "Accept": "application/json" });
  
  if (res.statusCode >= 400) {
    throw new Error(`ES_INTERNAL_FAILED:${res.statusCode}`);
  }
  
  const data = JSON.parse(res.body);
  const tracksMap = data.entities?.tracks || {};
  const tracks = Object.values(tracksMap);
  
  console.log(`[Epidemic] Found ${tracks.length} tracks for "${query}"`);
  return tracks.map(t => ({
    id: t.id || t.kosmosId,
    title: t.title,
    artist: t.creatives?.mainArtists?.[0]?.name || t.creatives?.composers?.[0]?.name || "Epidemic Sound",
    bpm: t.bpm,
    duration: t.durationMs || (t.length * 1000),
    previewUrl: t.stems?.full?.lqMp3Url || null,
    publicSlug: t.publicSlug || null
  }));
}

async function esInternalSearchSFX(query) {
  const url = `${ES_SEARCH_BASE}/sfx/?term=${encodeURIComponent(query)}&limit=10`;
  console.log(`[Epidemic] Searching SFX via internal API: "${query}" ...`);
  
  const res = await httpsGet(url, { "Accept": "application/json" });
  
  if (res.statusCode >= 400) {
    throw new Error(`ES_INTERNAL_SFX_FAILED:${res.statusCode}`);
  }
  
  const data = JSON.parse(res.body);
  const tracksMap = data.entities?.tracks || {};
  const tracks = Object.values(tracksMap);
  
  console.log(`[Epidemic] Found ${tracks.length} SFX for "${query}"`);
  return tracks.map(s => ({
    id: s.id || s.kosmosId,
    title: s.title,
    duration: s.durationMs || (s.length * 1000),
    previewUrl: s.stems?.full?.lqMp3Url || null
  }));
}

// Download audio file directly from the preview/CDN URL
async function esDownloadFromPreviewUrl(trackId, destPath, previewUrl) {
  if (previewUrl) {
    console.log(`[Epidemic] Downloading from preview URL...`);
    await downloadFile(previewUrl, destPath);
    return destPath;
  }
  
  // If no preview URL, search for the track to get it
  console.log(`[Epidemic] No preview URL cached, searching for track ${trackId}...`);
  const url = `${ES_SEARCH_BASE}/tracks/?term=${encodeURIComponent(String(trackId))}&limit=5`;
  const res = await httpsGet(url, { "Accept": "application/json" });
  
  if (res.statusCode >= 400) {
    throw new Error(`Could not find track ${trackId}`);
  }
  
  const data = JSON.parse(res.body);
  const tracksMap = data.entities?.tracks || {};
  const tracks = Object.values(tracksMap);
  const match = tracks.find(t => String(t.id) === String(trackId)) || tracks[0];
  
  if (!match?.stems?.full?.lqMp3Url) {
    throw new Error(`No audio URL found for track ${trackId}`);
  }
  
  await downloadFile(match.stems.full.lqMp3Url, destPath);
  return destPath;
}

// ==================== PARTNER REST API (for API Key holders) ====================

async function restSearchMusic(token, query) {
  const url = `${REST_API_BASE}/v0/tracks/search?term=${encodeURIComponent(query)}&limit=10`;
  console.log(`[Epidemic REST] Searching music: "${query}" ...`);
  
  const res = await httpsGet(url, {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  });
  
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new Error(`REST_AUTH_FAILED:${res.statusCode}`);
  }
  if (res.statusCode >= 400) {
    throw new Error(`REST API failed (${res.statusCode}): ${res.body}`);
  }
  
  const data = JSON.parse(res.body);
  const tracks = data.tracks || data.entities || data.hits || [];
  
  return tracks.map(t => ({
    id: t.id || t.trackId,
    title: t.title || t.name,
    artist: t.createdBy || t.artistName || "Epidemic Sound",
    bpm: t.bpm,
    duration: t.length || t.duration || t.durationMs,
    previewUrl: t.stems?.full?.lqMp3Url || t.previewUrl || null
  }));
}

async function restDownloadTrack(token, trackId, destPath) {
  const url = `${REST_API_BASE}/v0/tracks/${trackId}/download`;
  console.log(`[Epidemic REST] Getting download URL for track ${trackId}...`);
  
  const res = await httpsGet(url, {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  });
  
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new Error(`REST_AUTH_FAILED:${res.statusCode}`);
  }
  if (res.statusCode >= 400) {
    throw new Error(`REST download failed (${res.statusCode}): ${res.body}`);
  }
  
  const data = JSON.parse(res.body);
  const downloadUrl = data.url || data.downloadUrl;
  if (!downloadUrl) throw new Error(`No download URL in REST response`);
  
  await downloadFile(downloadUrl, destPath);
  return destPath;
}

async function restSearchSFX(token, query) {
  const url = `${REST_API_BASE}/v0/sound-effects/search?term=${encodeURIComponent(query)}&limit=10`;
  console.log(`[Epidemic REST] Searching SFX: "${query}" ...`);
  
  const res = await httpsGet(url, {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  });
  
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new Error(`REST_AUTH_FAILED:${res.statusCode}`);
  }
  if (res.statusCode >= 400) {
    throw new Error(`REST SFX search failed (${res.statusCode}): ${res.body}`);
  }
  
  const data = JSON.parse(res.body);
  const sfxs = data.soundEffects || data.entities || [];
  
  return sfxs.map(s => ({
    id: s.id || s.soundEffectId,
    title: s.title || s.name,
    duration: s.length || s.duration || s.durationMs,
    previewUrl: s.baseUrl || s.previewUrl || null
  }));
}

async function restDownloadSFX(token, sfxId, destPath) {
  const url = `${REST_API_BASE}/v0/sound-effects/${sfxId}/download`;
  
  const res = await httpsGet(url, {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  });
  
  if (res.statusCode === 401 || res.statusCode === 403) {
    throw new Error(`REST_AUTH_FAILED:${res.statusCode}`);
  }
  if (res.statusCode >= 400) {
    throw new Error(`REST SFX download failed (${res.statusCode})`);
  }
  
  const data = JSON.parse(res.body);
  const downloadUrl = data.url || data.downloadUrl;
  if (!downloadUrl) throw new Error(`No SFX download URL in REST response`);
  
  await downloadFile(downloadUrl, destPath);
  return destPath;
}

// ==================== MCP SSE (Last Resort Fallback) ====================

function getMcpPostUrl(token) {
  return new Promise((resolve, reject) => {
    console.log("[Epidemic MCP] Initiating SSE handshake...");
    const req = https.request(MCP_SSE_URL, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_UA,
        "Authorization": `Bearer ${token}`,
        "Accept": "text/event-stream"
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let errBody = "";
        res.on("data", chunk => errBody += chunk.toString());
        res.on("end", () => {
          console.error(`[Epidemic MCP] Handshake failed (${res.statusCode}): ${errBody}`);
          reject(new Error(`MCP_FAILED:${res.statusCode}`));
        });
        return;
      }

      let postUrl = null;
      let buffer = "";

      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop();

        let currentEvent = "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.substring(5).trim();
            if (currentEvent === "endpoint") {
              postUrl = dataStr;
              console.log(`[Epidemic MCP] Got POST URL: ${postUrl}`);
              res.destroy();
              resolve(postUrl);
              return;
            }
          }
        }
      });

      res.on("end", () => {
        if (!postUrl) reject(new Error("SSE closed before receiving endpoint event."));
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("MCP SSE timeout (15s)")); });
    req.end();
  });
}

function callMcpTool(token, postUrl, toolName, args = {}) {
  return new Promise((resolve, reject) => {
    let targetUrl = postUrl;
    if (!targetUrl.startsWith("http")) {
      targetUrl = new URL(postUrl, MCP_SSE_URL).toString();
    }

    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args }
    });

    const urlObj = new URL(targetUrl);
    const req = https.request(urlObj, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk.toString());
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`MCP tool failed (${res.statusCode}): ${body}`));
        } else {
          try {
            const data = JSON.parse(body);
            if (data.error) reject(new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`));
            else resolve(data);
          } catch (e) {
            reject(new Error(`Failed to parse MCP response: ${e.message}`));
          }
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("MCP tool timeout (30s)")); });
    req.write(payload);
    req.end();
  });
}

function parseToolResultText(rpcResponse) {
  const content = rpcResponse?.result?.content;
  if (!Array.isArray(content) || content.length === 0) throw new Error("No valid content in MCP response");
  const textBlock = content.find(c => c.type === "text");
  if (!textBlock?.text) throw new Error("No text block in MCP result");
  try { return JSON.parse(textBlock.text); } catch { return textBlock.text; }
}

async function mcpSearchMusic(token, query) {
  const postUrl = await getMcpPostUrl(token);
  const response = await callMcpTool(token, postUrl, "search_music", { query });
  const parsed = parseToolResultText(response);
  const tracks = parsed.recordings || parsed.tracks || parsed || [];
  return tracks.map(t => ({
    id: t.id || t.recordingID,
    title: t.title || t.name,
    artist: t.artist || t.artistName || (t.artists?.[0]?.name) || "Epidemic Sound",
    bpm: t.bpm,
    duration: t.duration || t.durationMs,
    previewUrl: t.previewUrl || t.audio?.previewUrl
  }));
}

async function mcpSearchSFX(token, query) {
  const postUrl = await getMcpPostUrl(token);
  const response = await callMcpTool(token, postUrl, "search_sound_effects", { query });
  const parsed = parseToolResultText(response);
  const sfxs = parsed.soundEffects || parsed || [];
  return sfxs.map(s => ({
    id: s.id || s.soundEffectID,
    title: s.title || s.name,
    duration: s.duration || s.durationMs,
    previewUrl: s.previewUrl || s.audio?.previewUrl
  }));
}

async function mcpDownloadTrack(token, trackId, destPath) {
  const postUrl = await getMcpPostUrl(token);
  const response = await callMcpTool(token, postUrl, "download_music_track", { trackId, format: "mp3", stemType: "FULL" });
  const parsed = parseToolResultText(response);
  const downloadUrl = parsed.url || parsed;
  if (!downloadUrl || typeof downloadUrl !== "string") throw new Error(`No download URL from MCP`);
  await downloadFile(downloadUrl, destPath);
  return destPath;
}

async function mcpDownloadSFX(token, sfxId, destPath) {
  const postUrl = await getMcpPostUrl(token);
  const response = await callMcpTool(token, postUrl, "download_sound_effect", { sfxId, format: "mp3" });
  const parsed = parseToolResultText(response);
  const downloadUrl = parsed.url || parsed;
  if (!downloadUrl || typeof downloadUrl !== "string") throw new Error(`No SFX download URL from MCP`);
  await downloadFile(downloadUrl, destPath);
  return destPath;
}

// ==================== Download Helper ====================

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`[Epidemic] Downloading: ${url.substring(0, 80)}...`);
    
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    
    const req = protocol.get(url, { headers: { "User-Agent": BROWSER_UA } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`Download failed (${res.statusCode})`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`[Epidemic] Saved: ${destPath}`);
        resolve(destPath);
      });
    });

    req.on("error", (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("Download timeout (120s)")); });
  });
}

// ==================== PUBLIC API ====================
// Strategy order:
// 1. Internal ES API (no auth needed for search, uses CDN preview URLs for download)
// 2. Partner REST API (needs epidemic_live_ API key)
// 3. MCP SSE (needs API key from account/api-keys, may fail on datacenter IPs)

/**
 * Search music tracks.
 * Uses ES internal API as primary (no auth needed), with REST and MCP fallbacks.
 */
export async function searchMusic(token, query) {
  // Strategy 1: ES Internal API (always works, no auth needed)
  try {
    return await esInternalSearchMusic(query);
  } catch (err) {
    console.warn("[Epidemic] Internal API failed:", err.message);
  }
  
  // Strategy 2: Partner REST API (needs proper API key)
  if (token) {
    try {
      return await restSearchMusic(token, query);
    } catch (err) {
      console.warn("[Epidemic] REST API failed:", err.message);
    }
  }
  
  // Strategy 3: MCP SSE
  if (token) {
    try {
      return await mcpSearchMusic(token, query);
    } catch (err) {
      console.error("[Epidemic] MCP SSE failed:", err.message);
    }
  }
  
  throw new Error(
    `Não foi possível buscar músicas na Epidemic Sound.\n` +
    `Todas as 3 estratégias falharam. Verifique sua conexão com a internet.`
  );
}

/**
 * Download a music track by ID.
 * Tries preview URL first (from search results), then REST API, then MCP.
 */
export async function downloadMusicTrack(token, trackId, destPath, previewUrl) {
  // Strategy 1: Download from preview/CDN URL (no auth needed)
  try {
    return await esDownloadFromPreviewUrl(trackId, destPath, previewUrl);
  } catch (err) {
    console.warn("[Epidemic] Preview URL download failed:", err.message);
  }
  
  // Strategy 2: Partner REST API download (HQ, needs API key)
  if (token) {
    try {
      return await restDownloadTrack(token, trackId, destPath);
    } catch (err) {
      console.warn("[Epidemic] REST download failed:", err.message);
    }
  }
  
  // Strategy 3: MCP SSE download
  if (token) {
    try {
      return await mcpDownloadTrack(token, trackId, destPath);
    } catch (err) {
      console.error("[Epidemic] MCP download failed:", err.message);
    }
  }
  
  throw new Error(`Não foi possível baixar a trilha (ID: ${trackId}).`);
}

/**
 * Search sound effects.
 */
export async function searchSoundEffects(token, query) {
  // Strategy 1: ES Internal API
  try {
    return await esInternalSearchSFX(query);
  } catch (err) {
    console.warn("[Epidemic] Internal SFX API failed:", err.message);
  }
  
  // Strategy 2: Partner REST API
  if (token) {
    try {
      return await restSearchSFX(token, query);
    } catch (err) {
      console.warn("[Epidemic] REST SFX failed:", err.message);
    }
  }
  
  // Strategy 3: MCP SSE
  if (token) {
    try {
      return await mcpSearchSFX(token, query);
    } catch (err) {
      console.error("[Epidemic] MCP SFX failed:", err.message);
    }
  }
  
  throw new Error(`Não foi possível buscar efeitos sonoros na Epidemic Sound.`);
}

/**
 * Download a sound effect by ID.
 */
export async function downloadSoundEffect(token, sfxId, destPath, previewUrl) {
  // Strategy 1: Download from preview URL
  if (previewUrl) {
    try {
      await downloadFile(previewUrl, destPath);
      return destPath;
    } catch (err) {
      console.warn("[Epidemic] SFX preview download failed:", err.message);
    }
  }
  
  // Try to find the SFX and get its preview URL
  try {
    return await esDownloadFromPreviewUrl(sfxId, destPath, null);
  } catch (err) {
    console.warn("[Epidemic] SFX internal download failed:", err.message);
  }
  
  // Strategy 2: Partner REST API
  if (token) {
    try {
      return await restDownloadSFX(token, sfxId, destPath);
    } catch (err) {
      console.warn("[Epidemic] REST SFX download failed:", err.message);
    }
  }
  
  // Strategy 3: MCP SSE
  if (token) {
    try {
      return await mcpDownloadSFX(token, sfxId, destPath);
    } catch (err) {
      console.error("[Epidemic] MCP SFX download failed:", err.message);
    }
  }
  
  throw new Error(`Não foi possível baixar o efeito sonoro (ID: ${sfxId}).`);
}
