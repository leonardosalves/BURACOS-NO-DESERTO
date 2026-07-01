#!/usr/bin/env python3
"""Gera narração com Kokoro-82M (local, gratuito)."""

from __future__ import annotations

import argparse
import inspect
import json
import os
import subprocess
import sys
from pathlib import Path

CACHE_DIR = Path.home() / ".cache" / "hyperframes" / "tts"
MODEL_PATH = CACHE_DIR / "models" / "kokoro-v1.0.onnx"
VOICES_PATH = CACHE_DIR / "voices" / "voices-v1.0.bin"

VOICE_LANG = {
    "p": "pt-br",
    "a": "en-us",
    "b": "en-gb",
    "e": "es",
    "f": "fr-fr",
    "h": "hi",
    "i": "it",
    "j": "ja",
    "z": "zh",
}


def resolve_lang(voice: str, override: str | None = None) -> str:
    if override:
        return override
    return VOICE_LANG.get(voice[:1], "en-us")


def ensure_models() -> None:
    if MODEL_PATH.exists() and VOICES_PATH.exists():
        return
    raise RuntimeError(
        "Modelos Kokoro não encontrados. Rode no terminal: "
        "npx hyperframes tts --list "
        "(baixa ~300 MB na primeira vez)."
    )


def convert_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    ffmpeg = os.environ.get("FFMPEG_BINARY", "ffmpeg")
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(wav_path),
        "-codec:a",
        "libmp3lame",
        "-qscale:a",
        "2",
        str(mp3_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "ffmpeg falhou")


def synthesize(text: str, voice: str, speed: float, output_path: Path, lang: str | None = None) -> dict:
    ensure_models()

    try:
        import soundfile as sf
        import kokoro_onnx
    except ImportError as exc:
        raise RuntimeError(
            "Pacotes Python ausentes. Rode: pip install kokoro-onnx soundfile"
        ) from exc

    model = kokoro_onnx.Kokoro(str(MODEL_PATH), str(VOICES_PATH))
    lang_code = resolve_lang(voice, lang)

    kwargs = {"voice": voice, "speed": speed}
    if "lang" in inspect.signature(model.create).parameters:
        kwargs["lang"] = lang_code

    samples, sample_rate = model.create(text, **kwargs)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wav_path = output_path
    if output_path.suffix.lower() == ".mp3":
        wav_path = output_path.with_suffix(".wav")

    sf.write(str(wav_path), samples, sample_rate)

    if output_path.suffix.lower() == ".mp3":
        convert_to_mp3(wav_path, output_path)
        try:
            wav_path.unlink(missing_ok=True)
        except OSError:
            pass

    duration = len(samples) / sample_rate
    return {
        "ok": True,
        "voice": voice,
        "speed": speed,
        "lang": lang_code,
        "durationSeconds": round(duration, 3),
        "outputPath": str(output_path),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", default="")
    parser.add_argument("--text-file", default="")
    parser.add_argument("--voice", default="pm_alex")
    parser.add_argument("--speed", type=float, default=0.82)
    parser.add_argument("--output", required=True)
    parser.add_argument("--lang", default="")
    args = parser.parse_args()

    text = args.text.strip()
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8").strip()
    if not text:
        print(json.dumps({"ok": False, "error": "Texto de narração vazio."}))
        return 1

    try:
        result = synthesize(
            text=text,
            voice=args.voice,
            speed=args.speed,
            output_path=Path(args.output),
            lang=args.lang or None,
        )
        print(json.dumps(result))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())