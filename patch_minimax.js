const fs = require("fs");

let server = fs.readFileSync("dashboard-qanat/backend/server.js", "utf8");

// 1. Add MINIMAX_MODELS
const tokenrouterModelsRegex = /(const TOKENROUTER_MODELS = \[.*?\];)/s;
server = server.replace(
  tokenrouterModelsRegex,
  `$1\nconst MINIMAX_MODELS = [\n  "minimax-m3",\n  "minimax-m2.7",\n  "minimax-vl-01",\n  "Hailuo-2.3",\n  "speech-2.8-hd"\n];`
);

// 2. Add helper functions
const getHelpersRegex = /(function getTokenRouterModelChain[\s\S]*?\n\})/s;
const minimaxHelpers = `
function getMinimaxApiKey(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  return config?.minimax_api_key || process.env.MINIMAX_API_KEY || null;
}
function getMinimaxBaseUrl(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  let u = String(config?.minimax_base_url || "").trim();
  if (u) {
    u = u.replace(/\\/+$/, "");
    if (!/^https?:\\/\\//i.test(u)) u = \`https://\${u}\`;
    if (!/\\/v1$/i.test(u)) u = \`\${u}/v1\`;
    return u;
  }
  return "https://api.minimax.chat/v1";
}
function getMinimaxModel(projectDir = WORKSPACE_DIR) {
  const config = readJsonFile(path.join(projectDir, "config_qanat.json"));
  return String(config?.minimax_model || "").trim() || "minimax-m3";
}
function getMinimaxModelChain(projectDir = WORKSPACE_DIR, modelsOverride = null) {
  if (Array.isArray(modelsOverride) && modelsOverride.length) return [...new Set(modelsOverride.map(String))];
  const primary = getMinimaxModel(projectDir);
  return [...new Set([primary, ...MINIMAX_MODELS])];
}
`;
server = server.replace(getHelpersRegex, `$1\n${minimaxHelpers}`);

// 3. Add to getAiProvider
server = server.replace(/"tokenrouter",/g, `"tokenrouter",\n      "minimax",`);
server = server.replace(
  /n === "token-router"\) \{/g,
  `n === "token-router") {\n      return "tokenrouter";\n    }\n    if (n === "minimax" || n === "minimax-m3") {\n      return "minimax";\n    }\n    if (n === "token-router") {`
);

// 4. Test provider logic
server = server.replace(
  /if \(provider === "tokenrouter"\) return getTokenRouterModel\(projectDir\);/g,
  `if (provider === "tokenrouter") return getTokenRouterModel(projectDir);\n    if (provider === "minimax") return getMinimaxModel(projectDir);`
);

// 5. Generate Logic (OpenAI SDK compatible block)
server = server.replace(
  /  if \(provider === "tokenrouter"\) \{\n    const apiKey = getTokenRouterApiKey\(projDir\);[\s\S]*?    \};\n  \}/g,
  `$&

  if (provider === "minimax") {
    const apiKey = getMinimaxApiKey(projDir);
    if (!apiKey) {
      res.status(401).json({
        error: "Chave de API Minimax não configurada.",
      });
      return null;
    }
    return {
      apiKey,
      baseURL: getMinimaxBaseUrl(projDir),
      modelChain: getMinimaxModelChain(projDir, providerModelsOverride),
      systemInstruction: getSystemInstruction(options),
      defaultModel: getMinimaxModel(projDir),
      isGemini: false,
    };
  }`
);

// 6. Configuration /api/ai/configuration
server = server.replace(
  /has_tokenrouter_key: !!getTokenRouterApiKey\(projDir\),/g,
  `has_tokenrouter_key: !!getTokenRouterApiKey(projDir),\n      has_minimax_key: !!getMinimaxApiKey(projDir),`
);
server = server.replace(
  /tokenrouter_model: getTokenRouterModel\(projDir\),/g,
  `tokenrouter_model: getTokenRouterModel(projDir),\n      minimax_model: getMinimaxModel(projDir),\n      minimax_base_url: getMinimaxBaseUrl(projDir),`
);
server = server.replace(
  /tokenrouter_model,/g,
  `tokenrouter_model,\n    minimax_model,\n    minimax_base_url,`
);
server = server.replace(
  /tokenrouter_key,/g,
  `tokenrouter_key,\n    minimax_key,`
);
server = server.replace(
  /provider === "tokenrouter" \|\|/g,
  `provider === "tokenrouter" ||\n        provider === "minimax" ||`
);

server = server.replace(
  /if \(typeof tokenrouter_key === "string" && tokenrouter_key\.trim\(\)\) {[\s\S]*?\n      }/,
  `$&

      if (typeof minimax_key === "string" && minimax_key.trim()) {
        next.minimax_api_key = minimax_key.trim();
      }

      if (typeof minimax_model === "string" && minimax_model.trim()) {
        next.minimax_model = minimax_model.trim();
      }

      if (typeof minimax_base_url === "string" && minimax_base_url.trim()) {
        let u = minimax_base_url.trim().replace(/\\/+$/, "");
        if (!/^https?:\\/\\//i.test(u)) u = \`https://\${u}\`;
        if (!/\\/v1$/i.test(u)) u = \`\${u}/v1\`;
        next.minimax_base_url = u;
      }
`
);

fs.writeFileSync("dashboard-qanat/backend/server.js", server);
console.log("server.js patched");
