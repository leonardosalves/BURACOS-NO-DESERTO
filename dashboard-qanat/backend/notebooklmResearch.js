import { execSync } from "child_process";

export async function fetchNotebooklmResearch(niche, format, { query } = {}) {
  const topic = query || `${niche} — tendências YouTube ${format}`;
  const notes = [];

  try {
    const output = execSync(`nlm notebook list --json`, {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(output || "[]");
    if (Array.isArray(parsed) && parsed.length) {
      notes.push(`Notebooks disponíveis: ${parsed.slice(0, 3).map((n) => n.title || n.id).join(", ")}`);
    }
  } catch {
    // nlm CLI not installed or not logged in
  }

  return {
    available: notes.length > 0,
    topic,
    summary: notes.length
      ? `Pesquisa NotebookLM: use fontes do nicho "${niche}" para validar ângulos antes do roteiro. ${notes.join(". ")}`
      : `Pesquisa sugerida para "${niche}" (${format}): verifique tendências recentes, perguntas frequentes do público e vídeos concorrentes com alto engajamento.`,
    sources: notes,
    fallback: true,
  };
}