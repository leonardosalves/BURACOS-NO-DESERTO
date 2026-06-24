import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "../..");
const configPath = path.join(projectDir, "config_qanat.json");

async function runTest() {
  console.log("Starting OpenRouter integration test (using native fetch)...");

  // 1. Read existing config to back it up
  let originalConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      originalConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {
      console.warn("Could not read original config:", e.message);
    }
  }

  // 2. Set provider to openrouter in config_qanat.json
  const testConfig = {
    ...originalConfig,
    ai_provider: "openrouter"
  };
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2), "utf8");
  console.log("Configured config_qanat.json to use OpenRouter.");

  try {
    // Wait 1 second for any file watchers to settle if any, though none should block
    await new Promise(r => setTimeout(r, 1000));

    // 3. Call the /api/ai/chat endpoint
    console.log("Sending chat request to http://localhost:3005/api/ai/chat...");
    const response = await fetch("http://localhost:3005/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Diga a palavra 'Conexão' e nada mais para testar a integração." }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    console.log("\n================ TEST SUCCESS ================");
    console.log("Response from server:", JSON.stringify(data, null, 2));
    console.log("==============================================");

  } catch (error) {
    console.error("\n================ TEST FAILED =================");
    console.error("Error during test:", error.message);
    console.error("==============================================");
  } finally {
    // 4. Restore original config
    fs.writeFileSync(configPath, JSON.stringify(originalConfig, null, 2), "utf8");
    console.log("Restored original config_qanat.json.");
  }
}

runTest();
