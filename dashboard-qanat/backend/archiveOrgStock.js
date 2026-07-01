/**
 * Stock documental via Archive.org — complemento a Pexels/Pixabay (OpenMontage documentary).
 */

import https from "https";

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Lumiera/1.0", ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGetJson(res.headers.location, headers).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON inválido Archive.org: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

function pickMediaFile(files = [], preferVideo = false) {
  const sorted = [...files].filter((f) => f?.name && Number(f.size) > 50000);
  if (preferVideo) {
    const mp4 = sorted
      .filter((f) => /\.mp4$/i.test(f.name))
      .sort((a, b) => Number(b.size) - Number(a.size));
    if (mp4[0]) return mp4[0];
  }
  const images = sorted
    .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f.name))
    .sort((a, b) => Number(b.size) - Number(a.size));
  if (images[0]) return images[0];
  const anyMp4 = sorted.find((f) => /\.mp4$/i.test(f.name));
  return anyMp4 || null;
}

export async function searchArchiveOrg(query, { rows = 8, preferVideo = false } = {}) {
  const q = encodeURIComponent(
    `(${String(query).slice(0, 80)}) AND (mediatype:movies OR mediatype:image) AND NOT collection:opensource_movies AND NOT collection:community`,
  );
  const url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=mediatype&rows=${rows}&output=json`;
  const data = await httpsGetJson(url);
  const docs = data?.response?.docs || [];
  return docs.map((d) => ({
    identifier: d.identifier,
    title: d.title || d.identifier,
    mediatype: d.mediatype,
    preferVideo,
  }));
}

export async function resolveArchiveOrgMedia(identifier, { preferVideo = false } = {}) {
  if (!identifier) return null;
  const meta = await httpsGetJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  const file = pickMediaFile(meta?.files || [], preferVideo);
  if (!file) return null;

  const ext = /\.mp4$/i.test(file.name) ? ".mp4" : (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".jpg");
  const url = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`;

  return {
    url,
    ext,
    source: "archive.org",
    sourceId: `archive:${identifier}`,
    title: meta?.metadata?.title || identifier,
    filename: file.name,
  };
}

export async function searchArchiveOrgMedia(query, { preferVideo = false, skipSourceIds = new Set() } = {}) {
  const hits = await searchArchiveOrg(query, { rows: 6, preferVideo });
  for (const hit of hits) {
    const sourceId = `archive:${hit.identifier}`;
    if (skipSourceIds.has(sourceId)) continue;
    try {
      const media = await resolveArchiveOrgMedia(hit.identifier, { preferVideo });
      if (media?.url) return media;
    } catch {
      /* try next */
    }
  }
  return null;
}