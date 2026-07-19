import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function getMediaDuration(filePath: string): Promise<number> {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  try {
    const { stdout } = await execAsync(cmd);
    const duration = parseFloat(stdout.trim());
    if (Number.isFinite(duration)) {
      return duration;
    }
    throw new Error("Failed to parse duration from ffprobe stdout");
  } catch (err: any) {
    console.error(
      `[FFprobe] Error reading duration for ${filePath}:`,
      err.message
    );
    // Simple fallback fallback for local testing
    return 5.0;
  }
}

export async function concatVideoClips(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  if (videoPaths.length === 0) return;

  const tempDir = path.dirname(outputPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const listFilePath = path.join(tempDir, `concat_list_${Date.now()}.txt`);
  const listContent = videoPaths
    .map((p) => `file '${p.replace(/\\/g, "/")}'`)
    .join("\n");
  fs.writeFileSync(listFilePath, listContent, "utf8");

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
  try {
    console.log(`[FFmpeg] Concatenating clips:`, cmd);
    await execAsync(cmd);
  } catch (err: any) {
    console.error("[FFmpeg] Concat failed:", err.message);
    throw err;
  } finally {
    try {
      fs.unlinkSync(listFilePath);
    } catch {}
  }
}

export async function mergeAudioTrack(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${outputPath}"`;
  try {
    console.log(`[FFmpeg] Muxing audio track:`, cmd);
    await execAsync(cmd);
  } catch (err: any) {
    console.error("[FFmpeg] Muxing audio track failed:", err.message);
    throw err;
  }
}
