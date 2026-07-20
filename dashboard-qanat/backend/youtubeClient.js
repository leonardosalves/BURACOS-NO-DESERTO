/**
 * youtubeClient.js — Cliente que usa a credencial do canal específico.
 *
 * Lógica de credenciais:
 *   - Analytics (CTR/retenção): OAuth do canal (ids=channel==MINE)
 *   - Data (vídeos/stats públicos): API key do canal → senão API key global
 */

import { loadCredentials, saveCredentials } from "./youtubeCredentials.js";

const getOAuthConfig = () => {
  return {
    client_id: process.env.YT_OAUTH_CLIENT_ID,
    client_secret: process.env.YT_OAUTH_CLIENT_SECRET,
  };
};

// ── Garante access_token válido (renova com refresh_token se expirado) ──
async function getAccessToken(channelId) {
  const creds = loadCredentials(channelId);
  if (!creds.oauth?.refresh_token) return null;

  // Ainda válido (com folga de 60s)?
  if (creds.oauth.access_token && creds.oauth.expires_at > Date.now() + 60000) {
    return creds.oauth.access_token;
  }

  const oauth = getOAuthConfig();
  if (!oauth.client_id || !oauth.client_secret) {
    console.warn(
      "[OAuth Refresh] YT_OAUTH_CLIENT_ID ou YT_OAUTH_CLIENT_SECRET não configurados."
    );
    return null;
  }

  try {
    // Renovar o access_token
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: creds.oauth.refresh_token,
        client_id: oauth.client_id,
        client_secret: oauth.client_secret,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await res.json();
    if (tokens.error) {
      throw new Error(
        `OAuth refresh falhou: ${tokens.error_description || tokens.error}`
      );
    }

    creds.oauth.access_token = tokens.access_token;
    creds.oauth.expires_at = Date.now() + (tokens.expires_in || 3600) * 1000;
    saveCredentials(channelId, creds);
    return tokens.access_token;
  } catch (err) {
    console.error(
      `[OAuth Refresh] Erro ao renovar token para o canal ${channelId}:`,
      err.message
    );
    return null;
  }
}

// ── API Key: do canal → senão global ──
function resolveApiKey(channelId) {
  const creds = loadCredentials(channelId);
  return creds.api_key || process.env.YOUTUBE_API_KEY || null;
}

// ── YOUTUBE ANALYTICS (dados privados — requer OAuth do canal) ──
export async function getChannelAnalytics(channelId, days = 28) {
  try {
    const token = await getAccessToken(channelId);
    if (!token) {
      return { disponivel: false, motivo: "Canal não conectado via OAuth." };
    }

    const end = new Date();
    const start = new Date(Date.now() - days * 86400000);
    const fmt = (d) => d.toISOString().split("T")[0];

    const params = new URLSearchParams({
      ids: "channel==MINE", // ← MINE = o canal DONO do token (multi-canal seguro)
      startDate: fmt(start),
      endDate: fmt(end),
      metrics: [
        "views",
        "estimatedMinutesWatched",
        "averageViewDuration",
        "averageViewPercentage",
        "subscribersGained",
        "subscribersLost",
        "annotationClickThroughRate",
        "annotationImpressions",
      ].join(","),
      dimensions: "day",
    });

    const res = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (data.error) {
      return { disponivel: false, motivo: data.error.message };
    }

    if (!data.columnHeaders) {
      return {
        disponivel: false,
        motivo: "Dados inválidos recebidos da API do YouTube Analytics.",
      };
    }

    const headers = data.columnHeaders.map((h) => h.name);
    const rows = (data.rows || []).map((r) =>
      Object.fromEntries(headers.map((h, i) => [h, r[i]]))
    );

    const totais = rows.reduce(
      (acc, r) => {
        acc.views += Number(r.views || 0);
        acc.watch += Number(r.estimatedMinutesWatched || 0);
        acc.subsGained += Number(r.subscribersGained || 0);
        acc.subsLost += Number(r.subscribersLost || 0);
        acc.ctrSoma += Number(r.annotationClickThroughRate || 0);
        acc.retSoma += Number(r.averageViewPercentage || 0);
        return acc;
      },
      { views: 0, watch: 0, subsGained: 0, subsLost: 0, ctrSoma: 0, retSoma: 0 }
    );

    const n = Math.max(rows.length, 1);
    return {
      disponivel: true,
      periodo_dias: days,
      views: totais.views,
      watch_time_min: Math.round(totais.watch),
      inscritos_ganhos: totais.subsGained,
      inscritos_perdidos: totais.subsLost,
      inscritos_liquido: totais.subsGained - totais.subsLost,
      ctr_medio: Math.round((totais.ctrSoma / n) * 100) / 100, // %
      retencao_media: Math.round((totais.retSoma / n) * 10) / 10, // %
      serie: rows.map((r) => ({ dia: r.day, views: Number(r.views || 0) })),
    };
  } catch (err) {
    console.error(
      `[YouTube Analytics] Falha ao buscar dados para o canal ${channelId}:`,
      err.message
    );
    return { disponivel: false, motivo: err.message };
  }
}

// ── YOUTUBE DATA (dados públicos — usa API key) ──
export async function getChannelPublicData(channelId, ytChannelId) {
  try {
    const apiKey = resolveApiKey(channelId);
    if (!apiKey) {
      return {
        disponivel: false,
        motivo: "YOUTUBE_API_KEY não configurada para o canal nem globalmente.",
      };
    }
    if (!ytChannelId) {
      return {
        disponivel: false,
        motivo: "youtube_channel_id não definido para este canal.",
      };
    }

    const base = "https://www.googleapis.com/youtube/v3";
    const [chRes, vidRes] = await Promise.all([
      fetch(
        `${base}/channels?part=statistics,snippet&id=${ytChannelId}&key=${apiKey}`
      ),
      fetch(
        `${base}/search?part=snippet&channelId=${ytChannelId}&maxResults=25&order=date&type=video&key=${apiKey}`
      ),
    ]);
    const chData = await chRes.json();
    const vidData = await vidRes.json();

    if (chData.error)
      throw new Error(`Erro na busca do canal: ${chData.error.message}`);
    if (vidData.error)
      throw new Error(`Erro na busca de vídeos: ${vidData.error.message}`);

    const videoIds = (vidData.items || [])
      .map((i) => i.id.videoId)
      .filter(Boolean)
      .join(",");
    let videos = [];
    if (videoIds) {
      const statsRes = await fetch(
        `${base}/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`
      );
      const statsData = await statsRes.json();
      if (statsData.error)
        throw new Error(
          `Erro nas estatísticas de vídeo: ${statsData.error.message}`
        );

      videos = (statsData.items || []).map((v) => {
        // Conversão simples de duração ISO 8601 (ex: PT8M5S) para segundos
        let durationSeconds = 300; // fallback 5 min
        try {
          const match = v.contentDetails?.duration?.match(
            /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
          );
          if (match) {
            const h = parseInt(match[1] || "0", 10);
            const m = parseInt(match[2] || "0", 10);
            const s = parseInt(match[3] || "0", 10);
            durationSeconds = h * 3600 + m * 60 + s;
          }
        } catch {}

        return {
          video_id: v.id,
          title: v.snippet.title,
          published_at: v.snippet.publishedAt,
          thumbnail:
            v.snippet.thumbnails?.medium?.url ||
            v.snippet.thumbnails?.default?.url,
          views: Number(v.statistics.viewCount || 0),
          likes: Number(v.statistics.likeCount || 0),
          comments: Number(v.statistics.commentCount || 0),
          duration_seconds: durationSeconds,
        };
      });
    }

    return {
      disponivel: true,
      stats: chData.items?.[0]?.statistics || {},
      videos,
    };
  } catch (err) {
    console.error(
      `[YouTube Data] Falha ao buscar dados públicos para o canal ${channelId}:`,
      err.message
    );
    return { disponivel: false, motivo: err.message };
  }
}
