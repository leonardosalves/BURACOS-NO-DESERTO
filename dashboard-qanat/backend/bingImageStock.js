/**
 * Bing Images scrap — provedor de imagens sem API key (padrão ShortGPT / fast.ai).
 * Extrai URLs "murl" do HTML de busca do Bing.
 */

import https from "https";
import crypto from "crypto";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function httpsGetText(url, headers = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      urlObj,
      {
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          ...headers,
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : `${urlObj.protocol}//${urlObj.host}${res.headers.location}`;
          httpsGetText(next, headers, redirects + 1).then(resolve).catch(reject);
          return;
        }
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Bing HTTP ${res.statusCode}`));
            return;
          }
          resolve(body);
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error("Bing timeout"));
    });
    req.end();
  });
}

function hashUrl(url) {
  return crypto.createHash("md5").update(String(url)).digest("hex").slice(0, 12);
}

function extFromUrl(url) {
  const match = String(url).match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (match) {
    const ext = match[1].toLowerCase();
    return ext === "jpeg" ? ".jpg" : `.${ext}`;
  }
  return ".jpg";
}

function decodeEscapedUrl(raw = "") {
  return String(raw)
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&");
}

export function extractBingImageUrls(html = "") {
  const urls = new Set();
  const patterns = [
    /"murl":"((?:https?:)?(?:\\\/|\/)[^"\\]+)"/g,
    /murl&quot;:&quot;((?:https?:)?\/\/[^&]+)/g,
    /"imgurl":"((?:https?:)?(?:\\\/|\/)[^"\\]+)"/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let candidate = decodeEscapedUrl(match[1]);
      if (candidate.startsWith("//")) candidate = `https:${candidate}`;
      if (!/^https?:\/\//i.test(candidate)) continue;
      if (candidate.length < 20) continue;
      urls.add(candidate);
    }
  }

  return [...urls];
}

const BLOCKED_HOST_RE =
  /(rule34|paheal|pictoa|xnxx|xvideos|pornhub|redtube|hentai|e621|gelbooru|danbooru|sankaku|nhentai|imagefap|motherless|sex\.|xxx\.)/i;

function isUsableBingImageUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (/\.(svg|ico)(\?|$)/i.test(url)) return false;
  if (/favicon|logo.*small|avatar/i.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    if (BLOCKED_HOST_RE.test(host)) return false;
    if (BLOCKED_HOST_RE.test(url)) return false;
  } catch {
    return false;
  }
  return true;
}

export async function searchBingImages(query, { count = 24 } = {}) {
  const q = encodeURIComponent(String(query || "").trim().slice(0, 120));
  if (!q) return [];
  const url = [
    `https://www.bing.com/images/search?q=${q}`,
    "first=1",
    `count=${Math.min(count, 35)}`,
    "adlt=strict",
    "qft=+filterui:imagesize-large+filterui:photo-photo",
    "form=HDRSC2",
  ].join("&");
  const html = await httpsGetText(url);
  const murls = extractBingImageUrls(html).filter(isUsableBingImageUrl);
  return murls.slice(0, count).map((murl) => ({
    murl,
    sourceId: `bing:${hashUrl(murl)}`,
  }));
}

export async function searchBingImagesMedia(query, { skipSourceIds = new Set() } = {}) {
  const hits = await searchBingImages(query, { count: 30 });
  for (const hit of hits) {
    if (skipSourceIds.has(hit.sourceId)) continue;
    if (!isUsableBingImageUrl(hit.murl)) continue;
    return {
      url: hit.murl,
      ext: extFromUrl(hit.murl),
      source: "bing",
      sourceId: hit.sourceId,
    };
  }
  return null;
}