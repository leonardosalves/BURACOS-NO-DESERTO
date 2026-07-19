import {
  BriefingOutput,
  BriefingOutputSchema,
  ScriptOutput,
  ScriptOutputSchema,
} from "@video-suite/prompt-engine";

import fs from "fs";

function getApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const configPath =
    "c:/Users/Leo/Documents/VIDEOS PROFISSIONAIS/LONGOS/LUMIERA/config_qanat.json";
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return config.gemini_api_key || config.gemini_api_keys?.[0] || "";
    } catch {
      return "";
    }
  }
  return "";
}

export async function callGeminiLlm(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined in environment variables or config_qanat.json"
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as any;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Invalid or empty response from Gemini API");
  }

  return content;
}

export async function generateBriefing(
  topic: string,
  niche: string
): Promise<BriefingOutput> {
  const { generateBriefingPrompt } = await import("@video-suite/prompt-engine");
  const prompt = generateBriefingPrompt(topic, niche);
  const responseText = await callGeminiLlm(prompt);

  try {
    const parsed = JSON.parse(responseText);
    return BriefingOutputSchema.parse(parsed);
  } catch (err) {
    console.error("Failed to parse Gemini briefing response:", responseText);
    throw err;
  }
}

export async function generateScript(
  briefing: BriefingOutput
): Promise<ScriptOutput> {
  const { generateScriptPrompt } = await import("@video-suite/prompt-engine");
  const prompt = generateScriptPrompt(briefing);
  const responseText = await callGeminiLlm(prompt);

  try {
    const parsed = JSON.parse(responseText);
    return ScriptOutputSchema.parse(parsed);
  } catch (err) {
    console.error("Failed to parse Gemini script response:", responseText);
    throw err;
  }
}
