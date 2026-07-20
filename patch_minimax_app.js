const fs = require("fs");
let app = fs.readFileSync("dashboard-qanat/frontend/src/App.tsx", "utf8");

// 1. Add model list
const tokenrouterModelsRegex = /const tokenrouterModelOptions = \[.*?\];/s;
app = app.replace(
  tokenrouterModelsRegex,
  `$&
    const minimaxModelOptions = [
      { id: "minimax-m3", label: "MiniMax-M3 (5B Tokens)", hint: "1M ctx, Claude Sonnet level" },
      { id: "minimax-m2.7", label: "MiniMax-M2.7 (Highspeed)", hint: "General + Turbo" },
      { id: "minimax-vl-01", label: "MiniMax-VL-01", hint: "Vision-Language" },
      { id: "Hailuo-2.3", label: "Hailuo 2.3", hint: "Video Gen" },
      { id: "speech-2.8-hd", label: "Speech-2.8-HD", hint: "TTS" },
    ];`
);

// 2. Add state
app = app.replace(
  /const \[tokenrouterKeyInput, setTokenrouterKeyInput\] = useState\(""\);/g,
  `$&
  const [minimaxKeyInput, setMinimaxKeyInput] = useState("");
  const [minimaxBaseUrlInput, setMinimaxBaseUrlInput] = useState("https://api.minimax.chat/v1");
  const [minimaxModel, setMinimaxModel] = useState("minimax-m3");
  const [minimaxModelOptionsState, setMinimaxModelOptionsState] = useState(minimaxModelOptions);
  const [hasMinimaxKey, setHasMinimaxKey] = useState(false);`
);

// 3. fetchAiSettings
app = app.replace(
  /setHasTokenrouterKey\(!!settingsData\.has_tokenrouter_key\);/g,
  `$&
        setHasMinimaxKey(!!settingsData.has_minimax_key);
        if (settingsData.minimax_model) setMinimaxModel(settingsData.minimax_model);
        if (settingsData.minimax_base_url) setMinimaxBaseUrlInput(String(settingsData.minimax_base_url));`
);

// 4. Provider dropdown Check
app = app.replace(
  /settingsData\.provider === "tokenrouter" \|\|/g,
  `$&
            settingsData.provider === "minimax" ||
            !!settingsData.has_minimax_key ||`
);

// 5. aiProviderOptions mapping
app = app.replace(
  /tokenrouter: "TokenRouter",/g,
  `$&
            minimax: "MiniMax M3",`
);

// 6. Type union for provider options (if any)
app = app.replace(/\| "tokenrouter"/g, `| "tokenrouter" | "minimax"`);

// 7. Save config object payload
app = app.replace(
  /tokenrouter_model: tokenrouterModel,/g,
  `$&
          minimax_model: minimaxModel,
          minimax_base_url: minimaxBaseUrlInput,`
);
app = app.replace(
  /tokenrouter_key: tokenrouterKeyInput,/g,
  `$&
          minimax_key: minimaxKeyInput,`
);

// 8. Apply response logic after save
app = app.replace(
  /if \(data\.tokenrouter_model\) setTokenrouterModel\(data\.tokenrouter_model\);/g,
  `$&
        if (data.minimax_model) setMinimaxModel(data.minimax_model);
        if (data.minimax_base_url) setMinimaxBaseUrlInput(String(data.minimax_base_url));`
);
app = app.replace(
  /setHasTokenrouterKey\(!!data\.has_tokenrouter_key\);/g,
  `$&
        setHasMinimaxKey(!!data.has_minimax_key);
        if (minimaxKeyInput.trim()) setMinimaxKeyInput("");`
);

// 9. Provider Badge (aiProviderBadge)
app = app.replace(
  /if \(aiProvider === "tokenrouter"\) \{[\s\S]*?\}\n    if \(aiProvider === "local"\)/,
  `$&`.replace(
    /if \(aiProvider === "local"\)/,
    `if (aiProvider === "minimax") {
      const modelLabel = minimaxModelOptionsState.find((o) => o.id === minimaxModel)?.label || minimaxModel;
      return { short: "MiniMax", detail: hasMinimaxKey ? \`MiniMax \${modelLabel}\` : "MiniMax sem chave" };
    }\n    if (aiProvider === "local")`
  )
);

// 10. Pass to render function props
app = app.replace(
  /tokenrouterModel,/g,
  `$& minimaxModel, minimaxModelOptionsState, minimaxBaseUrlInput, minimaxKeyInput, setMinimaxModel, setMinimaxBaseUrlInput, setMinimaxKeyInput,`
);
app = app.replace(/hasTokenrouterKey,/g, `$& hasMinimaxKey,`);
app = app.replace(/tokenrouterModelOptions,/g, `$& minimaxModelOptionsState,`);

// 11. Add UI in AiSettings (assuming it maps based on provider)
app = app.replace(
  /      \{aiProvider === "tokenrouter" && \([\s\S]*?      \)\}/,
  `$&

      {aiProvider === "minimax" && (
        <div className="space-y-4 pt-2">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Modelo MiniMax
              </label>
              <select
                value={minimaxModel}
                onChange={(e) => setMinimaxModel(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm text-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {minimaxModelOptionsState.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-[2] space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Base URL
              </label>
              <input
                type="text"
                value={minimaxBaseUrlInput}
                onChange={(e) => setMinimaxBaseUrlInput(e.target.value)}
                placeholder="https://api.minimax.chat/v1"
                className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 text-sm text-slate-300 placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              API Key
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-700 bg-slate-700 px-3 text-slate-400 sm:text-sm">
                <Key className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={minimaxKeyInput}
                onChange={(e) => setMinimaxKeyInput(e.target.value)}
                placeholder={hasMinimaxKey ? "Chave MiniMax salva (digite para alterar)" : "sk-..."}
                className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-slate-700 bg-slate-800 p-2 text-sm text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500">
              Obtenha a chave em Minimax API
            </p>
          </div>
        </div>
      )}`
);

fs.writeFileSync("dashboard-qanat/frontend/src/App.tsx", app);
console.log("App.tsx patched");
