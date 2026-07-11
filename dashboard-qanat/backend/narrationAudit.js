import fs from "fs";
import path from "path";
import crypto from "crypto";

export const NARRATION_AUDIT_FILE = "narration_audit.json";

export function readNarrationAudit(projDir) {
  const file = path.join(projDir, NARRATION_AUDIT_FILE);
  if (!fs.existsSync(file)) return { version: 1, events: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      version: 1,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { version: 1, events: [] };
  }
}

export function appendNarrationAuditEvent(projDir, event = {}) {
  const audit = readNarrationAudit(projDir);
  const entry = {
    id: event.id || crypto.randomUUID(),
    at: event.at || new Date().toISOString(),
    ...event,
  };
  audit.events = [...audit.events, entry].slice(-1000);
  const file = path.join(projDir, NARRATION_AUDIT_FILE);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(audit, null, 2), "utf8");
  fs.renameSync(temp, file);
  return entry;
}

export function latestNarrationReviews(events = []) {
  const reviews = {};
  for (const event of events) {
    if (event.type === "review" && event.chunk_id)
      reviews[event.chunk_id] = event;
  }
  return reviews;
}
