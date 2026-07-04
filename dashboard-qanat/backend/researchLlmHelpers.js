/**
 * Helpers LLM compartilhados para pesquisa (competitor + deep research).
 */

export function buildCompetitorLlmFns(deps, { useAi = true, timeoutMs = 90000 } = {}) {
  const {
    workspaceDir,
    getAiProvider,
    getApiKey,
    callGeminiWithRetry,
    callNvidiaWithRetry,
    NVIDIA_MODELS = [],
  } = deps;

  const withTimeout = (promise, label) => Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

  const tryLlm = async (label, fn) => {
    try {
      const text = String(await withTimeout(fn(), label) || "").trim();
      if (text) return text;
      console.warn(`[ResearchLLM] ${label}: resposta vazia`);
    } catch (err) {
      console.warn(`[ResearchLLM] ${label} falhou:`, err.message);
    }
    return null;
  };

  const llmFn = useAi
    ? async (prompt) => {
        let text = null;
        if (getAiProvider(workspaceDir) === "nvidia") {
          for (const model of NVIDIA_MODELS.slice(0, 4)) {
            text = await tryLlm(`nvidia-${model}`, () => callNvidiaWithRetry(prompt, {
              maxRetries: 1,
              models: [model],
              temperature: 0.2,
              projectDir: workspaceDir,
            }));
            if (text) break;
          }
        } else {
          text = await tryLlm("provider", () => callGeminiWithRetry(getApiKey(workspaceDir), prompt, {
            maxRetries: 1,
            temperature: 0.2,
            projectDir: workspaceDir,
          }));
        }
        return text;
      }
    : null;

  const repairJsonFn = useAi
    ? async (candidate) => {
        const repairPrompt = `Corrija o JSON abaixo para sintaxe 100% válida. Preserve todos os textos. Retorne APENAS o JSON, sem markdown.\n\n${candidate}`;
        let text = null;
        for (const model of ["qwen/qwen3.5-397b-a17b", "moonshotai/kimi-k2.6", "deepseek/deepseek-v4-flash"]) {
          text = await tryLlm(`json-repair-${model}`, () => callNvidiaWithRetry(repairPrompt, {
            maxRetries: 1,
            models: [model],
            temperature: 0,
            projectDir: workspaceDir,
          }));
          if (text) break;
        }
        if (!text) {
          text = await tryLlm("json-repair-gemini", () => callGeminiWithRetry(getApiKey(workspaceDir), repairPrompt, {
            maxRetries: 1,
            models: ["gemini-2.0-flash"],
            temperature: 0,
            projectDir: workspaceDir,
            forceProvider: "gemini",
          }));
        }
        return text;
      }
    : null;

  return { llmFn, repairJsonFn };
}