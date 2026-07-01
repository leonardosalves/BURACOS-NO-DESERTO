"""Mux dubbed voice blocks with original BGM and source video (ffmpeg)."""
import json
import subprocess
import sys
import os


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def probe_duration(path):
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", path,
        ],
        stderr=subprocess.DEVNULL,
    )
    return float(out.decode().strip())


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: lumiera_dub_render.py <config.json>"}))
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        cfg = json.load(f)

    video = cfg["video"]
    blocks = cfg.get("blocks") or []
    output = cfg["output"]
    bgm_volume = float(cfg.get("bgm_volume", 0.35))

    work = cfg.get("work_dir") or os.path.dirname(output)
    os.makedirs(work, exist_ok=True)

    duration = probe_duration(video)
    orig_wav = os.path.join(work, "_dub_orig_audio.wav")
    final_wav = os.path.join(work, "_dub_final_audio.wav")

    run([
        "ffmpeg", "-y", "-i", video, "-vn",
        "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", orig_wav,
    ])

    if not blocks:
        raise SystemExit("no dubbed blocks")

    inputs = ["ffmpeg", "-y", "-i", orig_wav]
    for b in blocks:
        inputs.extend(["-i", b["audio"]])

    filter_parts = [f"[0:a]volume={bgm_volume}[bg]"]
    voice_labels = []
    for i, b in enumerate(blocks):
        ms = max(0, int(float(b["start"]) * 1000))
        label = f"v{i}"
        filter_parts.append(
            f"[{i + 1}:a]adelay={ms}|{ms},apad=whole_len={duration:.3f}[{label}]"
        )
        voice_labels.append(f"[{label}]")

    n = len(voice_labels)
    filter_parts.append("".join(voice_labels) + f"amix=inputs={n}:duration=longest:dropout_transition=0[voice]")
    filter_parts.append("[bg][voice]amix=inputs=2:duration=first:dropout_transition=0[aout]")

    run(inputs + [
        "-filter_complex", ";".join(filter_parts),
        "-map", "[aout]", "-t", f"{duration:.3f}",
        "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", final_wav,
    ])

    run([
        "ffmpeg", "-y", "-i", video, "-i", final_wav,
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", output,
    ])

    print(json.dumps({"ok": True, "output": output, "duration": duration}))

if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as e:
        err = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
        print(json.dumps({"error": err[:800]}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)