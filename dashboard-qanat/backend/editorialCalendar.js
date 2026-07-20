/**
 * editorialCalendar.js — Monta a semana editorial ideal para o canal.
 *
 * USO no server.js:
 *   import calendarRouter from "./editorialCalendar.js";
 *   app.use("/api/calendar", calendarRouter);
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChannelConfig } from "./channelProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_DIR = path.resolve(__dirname, "..", "..", "channels");
const router = Router();

const readJson = (p, fb = {}) =>
  fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb;
const writeJson = (p, d) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(d, null, 2), "utf8");
};

const DIAS = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

// Próxima data de um dia da semana (ex: próxima "terca")
function proximaData(diaSemana, offset = 0) {
  const alvo = DIAS.indexOf(diaSemana);
  const hoje = new Date();
  const diff = ((alvo - hoje.getDay() + 7) % 7) + offset * 7;
  const d = new Date(hoje);
  d.setDate(hoje.getDate() + (diff === 0 ? 7 : diff)); // se for hoje, joga pra semana que vem
  return d;
}

// ── Monta o calendário da semana ──
export function montarCalendario(channelId, semanas = 1) {
  const config = loadChannelConfig(channelId);
  if (!config) return { slots: [] };

  const formato = config.formato_video || {};
  const diasPublicacao = formato.dias_publicacao || [
    "terca",
    "quinta",
    "sabado",
  ];
  const horario = formato.horario_publicacao || "18:00";

  // Fontes de conteúdo
  const trends = readJson(
    path.join(CHANNELS_DIR, channelId, "data", "trends_feed.json"),
    { tendencias: [] }
  ).tendencias;
  const memoria = readJson(
    path.join(CHANNELS_DIR, channelId, "data", "memoria.json"),
    { licoes: [] }
  );

  // Melhor sub-nicho (da memória ou do histórico)
  const licaoNicho = memoria.licoes.find((l) => l.tipo === "nicho" && l.ativo);
  const subNichoPreferido = licaoNicho
    ? licaoNicho.insight.match(/'([^']+)'/)?.[1] || null
    : null;

  // Tendências ordenadas por fit (só as boas e não bloqueadas)
  const trendsBoas = trends
    .map((t) => ({ ...t, fit: t.fit?.score ?? 50 }))
    .filter((t) => t.fit >= 55)
    .sort((a, b) => b.fit - a.fit);

  const slots = [];
  let trendIdx = 0;

  for (let s = 0; s < semanas; s++) {
    for (const dia of diasPublicacao) {
      const data = proximaData(dia, s);
      let slot;

      // Prioridade 1: tendência quente disponível
      if (trendIdx < trendsBoas.length) {
        const t = trendsBoas[trendIdx++];
        slot = {
          dia,
          data: data.toISOString().split("T")[0],
          horario,
          tema: t.tema,
          sub_nicho: t.sub_nicho || subNichoPreferido,
          origem: "radar",
          fit: t.fit,
          justificativa: `Tendência fit ${t.fit}/100 · ${t.urgencia === "alta" ? "janela quente" : "competição " + (t.competicao || "média")}`,
          prioridade: t.urgencia === "alta" ? "alta" : "normal",
        };
      } else {
        // Prioridade 2: melhor sub-nicho (evergreen)
        slot = {
          dia,
          data: data.toISOString().split("T")[0],
          horario,
          tema: subNichoPreferido
            ? `Vídeo evergreen de ${subNichoPreferido}`
            : "Vídeo do sub-nicho campeão",
          sub_nicho: subNichoPreferido,
          origem: "monitor",
          justificativa: subNichoPreferido
            ? `Sub-nicho '${subNichoPreferido}' performa acima da média (memória)`
            : "Sem tendências quentes — usar sub-nicho de melhor desempenho",
          prioridade: "normal",
        };
      }
      slot.status = "sugerido";
      slots.push(slot);
    }
  }

  return {
    canal: config.meta?.nome,
    dias_publicacao: diasPublicacao,
    horario_padrao: horario,
    sub_nicho_preferido: subNichoPreferido,
    slots,
  };
}

// ── ENDPOINTS ──

router.get("/:channelId", (req, res) => {
  const semanas = parseInt(req.query.semanas || "1", 10);
  res.json({ ok: true, ...montarCalendario(req.params.channelId, semanas) });
});

// Confirma um slot (marca como planejado / envia para fila editorial)
router.post("/:channelId/commit", (req, res) => {
  const { slot } = req.body || {};
  const filaPath = path.join(
    CHANNELS_DIR,
    req.params.channelId,
    "data",
    "editorial_queue.json"
  );
  const fila = readJson(filaPath, { itens: [] });
  fila.itens.push({
    ...slot,
    status: "planejado",
    criado_em: new Date().toISOString(),
  });
  writeJson(filaPath, fila);
  res.json({ ok: true, fila });
});

export default router;
