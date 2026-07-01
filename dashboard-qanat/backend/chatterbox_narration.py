#!/usr/bin/env python3
"""Gera narração com Chatterbox TTS (Resemble AI) — local, GPU."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

VOICE_PRESETS = {
    "multilingual_pt": {"model": "multilingual", "language_id": "pt"},
    "multilingual_en": {"model": "multilingual", "language_id": "en"},
    "turbo_en": {"model": "turbo"},
    "english_default": {"model": "english"},
}

DEFAULT_VOICE = "multilingual_pt"
TEXT_FILE_THRESHOLD = 400
CHUNK_MAX_CHARS = 420


def resolve_device(requested: str | None = None) -> str:
    if requested and requested.strip():
        return requested.strip()
    env = os.environ.get("CHATTERBOX_DEVICE", "").strip()
    if env:
        return env
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


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


def split_text_chunks(text: str, max_chars: int = CHUNK_MAX_CHARS) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    if len(normalized) <= max_chars:
        return [normalized]

    parts = re.split(r"(?<=[.!?…])\s+", normalized)
    chunks: list[str] = []
    buf = ""
    for part in parts:
        piece = part.strip()
        if not piece:
            continue
        candidate = f"{buf} {piece}".strip() if buf else piece
        if len(candidate) > max_chars and buf:
            chunks.append(buf)
            buf = piece
        else:
            buf = candidate
    if buf:
        chunks.append(buf)
    return chunks or [normalized]


def load_model(preset: dict, device: str):
    kind = preset["model"]
    if kind == "multilingual":
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        # chatterbox-tts 0.1.x: from_pretrained(device) only — sem t3_model
        return ChatterboxMultilingualTTS.from_pretrained(device)
    if kind == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        return ChatterboxTurboTTS.from_pretrained(device)
    from chatterbox.tts import ChatterboxTTS

    return ChatterboxTTS.from_pretrained(device)


def generate_chunk(model, preset: dict, text: str, reference_audio: str | None, exaggeration: float, cfg_weight: float, temperature: float):
    kind = preset["model"]
    kwargs = {
        "exaggeration": exaggeration,
        "temperature": temperature,
    }
    if reference_audio and Path(reference_audio).exists():
        kwargs["audio_prompt_path"] = reference_audio

    if kind == "multilingual":
        kwargs["cfg_weight"] = cfg_weight
        kwargs["language_id"] = preset.get("language_id", "pt")
        return model.generate(text, **kwargs)

    if kind == "turbo":
        return model.generate(text, **kwargs)

    kwargs["cfg_weight"] = cfg_weight
    return model.generate(text, **kwargs)


def synthesize(
    text: str,
    voice: str,
    output_path: Path,
    reference_audio: str | None = None,
    exaggeration: float = 0.5,
    cfg_weight: float = 0.5,
    temperature: float = 0.8,
    device: str | None = None,
) -> dict:
    preset = VOICE_PRESETS.get(voice, VOICE_PRESETS[DEFAULT_VOICE])
    dev = resolve_device(device)

    try:
        import numpy as np
        import torch
        import torchaudio as ta
    except ImportError as exc:
        raise RuntimeError(
            "Pacotes Python ausentes. Rode: pip install chatterbox-tts torch torchaudio"
        ) from exc

    model = load_model(preset, dev)
    chunks = split_text_chunks(text)
    if not chunks:
        raise RuntimeError("Texto de narração vazio.")

    wav_parts = []
    for idx, chunk in enumerate(chunks):
        wav = generate_chunk(
            model,
            preset,
            chunk,
            reference_audio,
            exaggeration,
            cfg_weight,
            temperature,
        )
        wav_parts.append(wav.squeeze(0).detach().cpu().numpy())

    merged = np.concatenate(wav_parts) if len(wav_parts) > 1 else wav_parts[0]
    sample_rate = model.sr

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wav_path = output_path
    if output_path.suffix.lower() == ".mp3":
        wav_path = output_path.with_suffix(".wav")

    ta.save(str(wav_path), torch.from_numpy(merged).unsqueeze(0), sample_rate)

    if output_path.suffix.lower() == ".mp3":
        convert_to_mp3(wav_path, output_path)
        try:
            wav_path.unlink(missing_ok=True)
        except OSError:
            pass

    duration = len(merged) / sample_rate
    return {
        "ok": True,
        "voice": voice,
        "model": preset["model"],
        "language_id": preset.get("language_id"),
        "device": dev,
        "chunks": len(chunks),
        "durationSeconds": round(duration, 3),
        "outputPath": str(output_path),
    }


def probe() -> dict:
    try:
        import torch
    except ImportError:
        return {
            "ok": False,
            "error": "PyTorch não instalado. Rode: pip install chatterbox-tts",
        }

    device = resolve_device()
    try:
        import chatterbox  # noqa: F401
    except ImportError as exc:
        return {"ok": False, "error": f"chatterbox-tts ausente: {exc}"}

    return {
        "ok": True,
        "device": device,
        "cuda": bool(torch.cuda.is_available()),
        "voices": list(VOICE_PRESETS.keys()),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--text", default="")
    parser.add_argument("--text-file", default="")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--reference-audio", default="")
    parser.add_argument("--exaggeration", type=float, default=0.5)
    parser.add_argument("--cfg-weight", type=float, default=0.5)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--device", default="")
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    if args.probe:
        print(json.dumps(probe()))
        return 0

    text = args.text.strip()
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8").strip()
    if not text:
        print(json.dumps({"ok": False, "error": "Texto de narração vazio."}))
        return 1
    if not args.output:
        print(json.dumps({"ok": False, "error": "Caminho --output obrigatório."}))
        return 1

    ref = args.reference_audio.strip() or None
    try:
        result = synthesize(
            text=text,
            voice=args.voice,
            output_path=Path(args.output),
            reference_audio=ref,
            exaggeration=args.exaggeration,
            cfg_weight=args.cfg_weight,
            temperature=args.temperature,
            device=args.device or None,
        )
        print(json.dumps(result))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())