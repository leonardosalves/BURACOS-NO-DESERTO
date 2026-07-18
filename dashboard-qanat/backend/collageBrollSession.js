/**
 * Persistência leve de sessão Collage B-roll (Gate 1 cards).
 * Arquivo JSON em data/collage-broll-sessions/ — sem DB.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, "data", "collage-broll-sessions");

function ensureDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function safeId(id) {
  return String(id || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
}

export function sessionPath(sessionId) {
  const id = safeId(sessionId);
  if (!id) throw new Error("sessionId inválido.");
  return path.join(SESSION_DIR, `${id}.json`);
}

export function loadCollageSession(sessionId) {
  const id = safeId(sessionId);
  if (!id) return null;
  const p = sessionPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function saveCollageSession(sessionId, data = {}) {
  ensureDir();
  const id = safeId(sessionId);
  if (!id) throw new Error("sessionId inválido.");
  const prev = loadCollageSession(id) || {};
  const next = {
    ...prev,
    ...data,
    sessionId: id,
    items: Array.isArray(data.items)
      ? data.items
      : Array.isArray(prev.items)
        ? prev.items
        : [],
    updatedAt: new Date().toISOString(),
    createdAt: prev.createdAt || new Date().toISOString(),
  };
  fs.writeFileSync(sessionPath(id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

/**
 * Atualiza um único card na sessão (imutável no restante).
 */
export function patchCollageSessionCard(sessionId, cardId, patch = {}) {
  const session = loadCollageSession(sessionId);
  if (!session) {
    throw new Error(
      `Sessão ${sessionId} não encontrada. Salve o Gate 1 antes de rejeitar.`
    );
  }
  const items = Array.isArray(session.items) ? session.items : [];
  const idx = items.findIndex((i) => String(i.id) === String(cardId));
  if (idx < 0) {
    // Se o card ainda não está na sessão, aceita upsert mínimo
    const upsert = {
      id: cardId,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const nextItems = [...items, upsert];
    return saveCollageSession(sessionId, { ...session, items: nextItems });
  }
  const nextItems = items.map((item, i) =>
    i === idx
      ? {
          ...item,
          ...patch,
          id: item.id,
          updatedAt: new Date().toISOString(),
        }
      : item
  );
  return saveCollageSession(sessionId, { ...session, items: nextItems });
}

export function rejectCollageCard({
  sessionId,
  cardId,
  reason = "",
  note = "",
  reasons = [],
  regenerate = false,
  currentItem = null,
} = {}) {
  const id = String(cardId || "").trim();
  if (!id) throw new Error("cardId obrigatório.");

  const reasonList = [
    ...(Array.isArray(reasons) ? reasons.map(String) : []),
    ...(reason ? [String(reason)] : []),
  ].filter(Boolean);

  const patch = {
    status: "rejected",
    approvalStatus: "rejected",
    rejectionReason: reasonList[0] || reason || "other",
    rejectionReasons: reasonList,
    rejectionNote: String(note || "").trim(),
    rejectedAt: new Date().toISOString(),
  };

  if (currentItem && typeof currentItem === "object") {
    // Garante que a sessão tenha o card completo se ainda não existir
    const session = sessionId ? loadCollageSession(sessionId) : null;
    if (sessionId && session) {
      const has = (session.items || []).some((i) => String(i.id) === id);
      if (!has) {
        saveCollageSession(sessionId, {
          ...session,
          items: [...(session.items || []), { ...currentItem, id, ...patch }],
        });
      } else {
        patchCollageSessionCard(sessionId, id, {
          ...patch,
          // não sobrescreve a proposta visual
        });
      }
    } else if (sessionId) {
      saveCollageSession(sessionId, {
        items: [{ ...currentItem, id, ...patch }],
      });
    }
  } else if (sessionId) {
    patchCollageSessionCard(sessionId, id, patch);
  }

  const session = sessionId ? loadCollageSession(sessionId) : null;
  const card = (session?.items || []).find((i) => String(i.id) === id) || {
    id,
    ...patch,
  };

  return {
    ok: true,
    cardId: id,
    status: "rejected",
    rejectionReason: patch.rejectionReason,
    rejectionReasons: patch.rejectionReasons,
    rejectionNote: patch.rejectionNote,
    regenerate: Boolean(regenerate),
    updatedAt: patch.rejectedAt,
    card,
    sessionId: sessionId || null,
  };
}
