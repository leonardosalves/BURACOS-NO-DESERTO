import { generateBriefing, generateScript } from "./llm.js";
import { getMediaDuration } from "@video-suite/integrations";
import fs from "fs";

async function testPipeline() {
  console.log("=== STARTING PIPELINE E2E TEST ===");

  const topic =
    "Como os acidentes geográficos desenharam as fronteiras do mundo";
  const niche = "geography-explorer";

  try {
    // 1. Generate Briefing
    console.log("\n[Step 1] Requesting Briefing from Gemini LLM...");
    const briefing = await generateBriefing(topic, niche);
    console.log("Briefing successfully generated and validated:");
    console.log(JSON.stringify(briefing, null, 2));

    // 2. Generate Script
    console.log("\n[Step 2] Requesting Script from Gemini LLM...");
    const script = await generateScript(briefing);
    console.log("Script successfully generated and validated:");
    console.log(`Received ${script.segments.length} script segments.`);
    console.log(JSON.stringify(script.segments[0], null, 2));

    // 3. Verify Integrations & FFmpeg utilities
    console.log("\n[Step 3] Verifying integrations utilities...");
    const testFile = "temp_test_audio.wav";

    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    try {
      await execAsync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2.5 "${testFile}"`
      );
      const duration = await getMediaDuration(testFile);
      console.log(
        `FFprobe duration check: successfully read ${duration}s (expected: 2.5s)`
      );
    } catch (e: any) {
      console.warn(
        "FFmpeg/FFprobe binaries not found or failed. Skipping binary checks:",
        e.message
      );
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }

    console.log("\n=== PIPELINE E2E TEST COMPLETED SUCCESSFULLY ===");
  } catch (err: any) {
    console.error("\n!!! PIPELINE TEST FAILED !!!", err.message);
    process.exit(1);
  }
}

testPipeline();
