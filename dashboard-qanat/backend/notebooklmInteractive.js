import fs from "fs";
import path from "path";

const QUESTION_CUE_RE =
  /você gostaria|você quer|deseja que|quer que eu|posso fazer|devo fazer|gostaria que eu/i;

export function extractNotebooklmQuestions(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const found = [];
  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim().replace(/^[-•›\s]+/, "");
    if (trimmed.includes("?")) {
      const parts = trimmed.match(/[^.!?\n]*\?/g) || [];
      for (const part of parts) {
        const q = part.trim();
        if (q.length > 12) found.push(q);
      }
    }
  }

  const lastPara = raw.split(/\n\n+/).pop()?.trim() || "";
  if (lastPara.includes("?")) {
    const parts = lastPara.match(/[^.!?\n]*\?/g) || [];
    for (const part of parts) {
      const q = part.trim();
      if (q.length > 12 && !found.includes(q)) found.push(q);
    }
  }

  return [...new Set(found)].slice(0, 6);
}

export function isNotebooklmAwaitingUser(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return false;

  const questions = extractNotebooklmQuestions(raw);
  if (!questions.length) return false;

  const numberedFacts =
    (raw.match(/^\s*\d+[\).\]:]/gm) || []).length +
    raw.split("\n").filter((line) => /^\s*[-•]/.test(line.trim())).length;

  const hasQuestionCue = QUESTION_CUE_RE.test(raw);
  const tail = raw.slice(-500).trim();
  const endsWithQuestion = /\?[\s"»»]*$/.test(tail);

  if (numberedFacts >= 6) return false;
  return hasQuestionCue || endsWithQuestion || questions.length >= 1;
}

function sessionPath(projDir, backendDir, niche) {
  if (projDir && fs.existsSync(projDir)) {
    return path.join(projDir, "notebooklm_session.json");
  }
  const key = String(niche || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);
  return path.join(backendDir, ".notebooklm_sessions", `${key}.json`);
}

export function loadNotebooklmSession({ projDir, backendDir, niche }) {
  const filePath = sessionPath(projDir, backendDir, niche);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function saveNotebooklmSession(session, { projDir, backendDir, niche }) {
  const filePath = sessionPath(projDir, backendDir, niche);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf8");
  return session;
}

function mergeAssistantSummaries(turns = []) {
  return turns
    .filter((t) => t.role === "assistant" && String(t.content || "").trim())
    .map((t) => String(t.content).trim())
    .join("\n\n---\n\n")
    .slice(0, 16000);
}

export function assessNotebooklmReadiness(session = {}) {
  const summary = String(session.accumulatedSummary || "").trim();
  const userTurns = (session.turns || []).filter(
    (t) => t.role === "user"
  ).length;
  const factSignals =
    (summary.match(/\d+[\d.,]*\s*(km|m|metros|%|anos?|séculos?)/gi) || [])
      .length + (summary.match(/^\s*\d+[\).\]:]/gm) || []).length;

  if (session.awaitingUser) {
    return {
      ready: false,
      reason:
        "O NotebookLM fez uma pergunta — responda para liberar mais fatos.",
      confidence: 0.2,
    };
  }

  if (summary.length >= 900 && factSignals >= 4) {
    return {
      ready: true,
      reason:
        "Pesquisa rica em fatos e números — pronto para roteiro/narração.",
      confidence: 0.9,
    };
  }

  if (userTurns >= 2 && summary.length >= 500) {
    return {
      ready: true,
      reason: "Várias rodadas de enriquecimento — pode prosseguir.",
      confidence: 0.75,
    };
  }

  if (summary.length >= 400 && factSignals >= 2) {
    return {
      ready: true,
      reason: "Material suficiente para começar o roteiro.",
      confidence: 0.65,
    };
  }

  return {
    ready: false,
    reason:
      "Ainda pouco material factual — continue respondendo ao NotebookLM.",
    confidence: 0.35,
  };
}

export function buildNotebooklmSessionFromResearch({
  research,
  niche,
  format,
  purpose,
  notebookId,
  initialQuestion,
}) {
  const answer = String(research?.summary || "").trim();
  const awaitingUser = Boolean(
    research?.awaitingUser ??
    (research?.interactiveDiscovery ? true : isNotebooklmAwaitingUser(answer))
  );
  const questions =
    research?.questions?.length > 0
      ? research.questions
      : extractNotebooklmQuestions(answer);

  const turns = [
    {
      role: "assistant",
      content: answer,
      questions,
      at: new Date().toISOString(),
    },
  ];

  const session = {
    version: 1,
    niche,
    format,
    purpose,
    notebookId: notebookId || research?.notebookId || null,
    status: awaitingUser ? "pending_user" : "ready",
    awaitingUser,
    questions,
    turns,
    accumulatedSummary: awaitingUser ? "" : answer,
    researchDone: Boolean(research?.researchDone),
    initialQuestion: initialQuestion || null,
    updatedAt: new Date().toISOString(),
  };

  const readiness = assessNotebooklmReadiness(session);
  session.readiness = readiness;
  return session;
}

function userWantsResearch(reply = "") {
  return /^(sim|s|yes|pode|faça|faz|fazer|quero|ok|claro|por favor|pode sim|com certeza)/i.test(
    String(reply || "").trim()
  );
}

export async function replyNotebooklmSession({
  session,
  userReply,
  backendDir,
  queryNotebook,
  runResearch,
}) {
  const reply = String(userReply || "").trim();
  if (!reply) throw new Error("Resposta vazia.");

  const next = {
    ...session,
    turns: [...(session.turns || [])],
    updatedAt: new Date().toISOString(),
  };

  next.turns.push({
    role: "user",
    content: reply,
    at: new Date().toISOString(),
  });

  let researchTriggered = false;
  if (
    userWantsResearch(reply) &&
    !next.researchDone &&
    next.notebookId &&
    typeof runResearch === "function"
  ) {
    try {
      const query =
        next.initialQuestion ||
        `fatos históricos e dados numéricos sobre ${next.niche}`;
      await runResearch(next.notebookId, query, backendDir, "deep");
      next.researchDone = true;
      researchTriggered = true;
    } catch {
      /* pesquisa opcional */
    }
  }

  const followUp = `Resposta do roteirista/editor Lumiera:
${reply}

${researchTriggered ? "Pesquisa web concluída e importada ao notebook.\n\n" : ""}Com base nessa resposta e nas fontes do notebook, entregue agora fatos concretos, números, datas, nomes e ganchos para o roteiro em português brasileiro.
Evite fazer novas perguntas ao editor — priorize material acionável para narração YouTube ${next.format || "SHORTS"}.`;

  const answer = await queryNotebook(next.notebookId, followUp, backendDir);
  const awaitingUser = isNotebooklmAwaitingUser(answer);
  const questions = extractNotebooklmQuestions(answer);

  next.turns.push({
    role: "assistant",
    content: String(answer || "").trim(),
    questions,
    at: new Date().toISOString(),
  });

  next.awaitingUser = awaitingUser;
  next.questions = questions;
  next.status = awaitingUser ? "pending_user" : "ready";
  next.accumulatedSummary = awaitingUser
    ? mergeAssistantSummaries(
        next.turns.filter((t, i) => i < next.turns.length - 1)
      )
    : mergeAssistantSummaries(next.turns);

  next.readiness = assessNotebooklmReadiness(next);
  return { session: next, researchTriggered };
}

export function finalizeNotebooklmSession(session = {}) {
  const summary =
    String(session.accumulatedSummary || "").trim() ||
    mergeAssistantSummaries(session.turns || []);

  const finalized = {
    ...session,
    accumulatedSummary: summary,
    awaitingUser: false,
    status: "finalized",
    questions: [],
    finalizedAt: new Date().toISOString(),
    readiness: {
      ready: summary.length >= 200,
      reason:
        summary.length >= 200
          ? "Pesquisa NotebookLM aplicada — pode gerar roteiro/narração."
          : "Pouco material acumulado — prossiga se preferir.",
      confidence: summary.length >= 600 ? 0.85 : 0.5,
    },
  };
  return finalized;
}
