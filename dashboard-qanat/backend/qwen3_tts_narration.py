#!/usr/bin/env python3
"""Gera narração com Qwen3-TTS CustomVoice (local, PT/EN).

Modelo: Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
Pacote: pip install -U qwen-tts
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# voice_id → (speaker, language)
VOICE_PRESETS: dict[str, dict[str, str]] = {
    # Português (idioma suportado; speakers premium multilíngues)
    "ryan_pt": {
        "speaker": "Ryan",
        "language": "Portuguese",
        "label": "Ryan — PT masculino dinâmico",
    },
    "aiden_pt": {
        "speaker": "Aiden",
        "language": "Portuguese",
        "label": "Aiden — PT masculino claro",
    },
    "vivian_pt": {
        "speaker": "Vivian",
        "language": "Portuguese",
        "label": "Vivian — PT feminino brilhante",
    },
    "serena_pt": {
        "speaker": "Serena",
        "language": "Portuguese",
        "label": "Serena — PT feminino suave",
    },
    "uncle_fu_pt": {
        "speaker": "Uncle_Fu",
        "language": "Portuguese",
        "label": "Uncle Fu — PT masculino maduro",
    },
    # English (falantes nativos EN)
    "ryan_en": {
        "speaker": "Ryan",
        "language": "English",
        "label": "Ryan — EN dynamic male",
    },
    "aiden_en": {
        "speaker": "Aiden",
        "language": "English",
        "label": "Aiden — EN sunny male",
    },
    "vivian_en": {
        "speaker": "Vivian",
        "language": "English",
        "label": "Vivian — EN bright female",
    },
    "serena_en": {
        "speaker": "Serena",
        "language": "English",
        "label": "Serena — EN warm female",
    },
    "uncle_fu_en": {
        "speaker": "Uncle_Fu",
        "language": "English",
        "label": "Uncle Fu — EN mellow male",
    },
}

DEFAULT_VOICE = "ryan_pt"
DEFAULT_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
CHUNK_MAX_CHARS = 480

# Cache do modelo em processo (reuso entre chamadas se o script for long-lived)
_MODEL_CACHE: dict = {}


def resolve_device(requested: str | None = None) -> str:
    if requested and requested.strip():
        return requested.strip()
    env = os.environ.get("QWEN3_TTS_DEVICE", "").strip()
    if env:
        return env
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda:0"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def resolve_model_id() -> str:
    local = os.environ.get("QWEN3_TTS_MODEL_DIR", "").strip()
    if local and Path(local).is_dir():
        return local
    return os.environ.get("QWEN3_TTS_MODEL_ID", DEFAULT_MODEL_ID).strip() or DEFAULT_MODEL_ID


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
    # Hard-split leftovers that are still too long
    final: list[str] = []
    for chunk in chunks:
        if len(chunk) <= max_chars:
            final.append(chunk)
            continue
        words = chunk.split(" ")
        buf2 = ""
        for w in words:
            cand = f"{buf2} {w}".strip() if buf2 else w
            if len(cand) > max_chars and buf2:
                final.append(buf2)
                buf2 = w
            else:
                buf2 = cand
        if buf2:
            final.append(buf2)
    return final or [normalized]


def resolve_voice(voice: str) -> dict[str, str]:
    key = (voice or DEFAULT_VOICE).strip().lower().replace("-", "_")
    if key in VOICE_PRESETS:
        return dict(VOICE_PRESETS[key])

    # Aceita "Ryan:Portuguese" ou "Ryan/English"
    if ":" in voice or "/" in voice:
        sep = ":" if ":" in voice else "/"
        speaker, language = [p.strip() for p in voice.split(sep, 1)]
        if speaker and language:
            return {"speaker": speaker, "language": language, "label": voice}

    # Speaker nativo sozinho → English se Ryan/Aiden, senão Portuguese
    speaker_map = {
        "ryan": ("Ryan", "English"),
        "aiden": ("Aiden", "English"),
        "vivian": ("Vivian", "Portuguese"),
        "serena": ("Serena", "Portuguese"),
        "uncle_fu": ("Uncle_Fu", "Portuguese"),
        "unclefu": ("Uncle_Fu", "Portuguese"),
    }
    if key in speaker_map:
        sp, lang = speaker_map[key]
        return {"speaker": sp, "language": lang, "label": voice}

    return dict(VOICE_PRESETS[DEFAULT_VOICE])


def load_model(device: str, model_id: str):
    cache_key = f"{model_id}::{device}"
    if cache_key in _MODEL_CACHE:
        return _MODEL_CACHE[cache_key]

    try:
        import torch
        from qwen_tts import Qwen3TTSModel
    except ImportError as exc:
        raise RuntimeError(
            "Pacotes Python ausentes. Rode no venv: pip install -U qwen-tts soundfile"
        ) from exc

    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    kwargs = {
        "device_map": device if device.startswith("cuda") else None,
        "dtype": dtype,
    }

    # FlashAttention 2 só em GPU + float16/bfloat16; opcional
    if device.startswith("cuda"):
        try:
            import flash_attn  # noqa: F401

            kwargs["attn_implementation"] = "flash_attention_2"
        except Exception:
            pass

    print(f"[Qwen3-TTS] Carregando {model_id} em {device}…", file=sys.stderr)
    if device.startswith("cuda"):
        model = Qwen3TTSModel.from_pretrained(model_id, **kwargs)
    else:
        # CPU: carregar e mover
        model = Qwen3TTSModel.from_pretrained(model_id, dtype=dtype)
        try:
            model = model.to(device)
        except Exception:
            pass

    _MODEL_CACHE[cache_key] = model
    return model


def synthesize(
    text: str,
    voice: str,
    output_path: Path,
    instruct: str = "",
    device: str | None = None,
    model_id: str | None = None,
) -> dict:
    import numpy as np
    import soundfile as sf

    preset = resolve_voice(voice)
    speaker = preset["speaker"]
    language = preset["language"]
    dev = resolve_device(device)
    mid = (model_id or "").strip() or resolve_model_id()

    model = load_model(dev, mid)
    chunks = split_text_chunks(text)
    if not chunks:
        raise RuntimeError("Texto de narração vazio.")

    wav_parts = []
    sample_rate = None
    instruct_arg = (instruct or "").strip() or None

    for idx, chunk in enumerate(chunks):
        print(
            f"[Qwen3-TTS] chunk {idx + 1}/{len(chunks)} ({len(chunk)} chars) "
            f"speaker={speaker} lang={language}",
            file=sys.stderr,
        )
        gen_kwargs = {
            "text": chunk,
            "language": language,
            "speaker": speaker,
        }
        if instruct_arg:
            gen_kwargs["instruct"] = instruct_arg
        wavs, sr = model.generate_custom_voice(**gen_kwargs)
        sample_rate = sr
        part = wavs[0]
        if hasattr(part, "cpu"):
            part = part.detach().cpu().numpy()
        wav_parts.append(np.asarray(part).reshape(-1))

    merged = np.concatenate(wav_parts) if len(wav_parts) > 1 else wav_parts[0]
    if sample_rate is None:
        raise RuntimeError("Sample rate ausente na saída do modelo.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wav_path = output_path
    if output_path.suffix.lower() == ".mp3":
        wav_path = output_path.with_suffix(".wav")

    sf.write(str(wav_path), merged, int(sample_rate))

    if output_path.suffix.lower() == ".mp3":
        convert_to_mp3(wav_path, output_path)
        try:
            wav_path.unlink(missing_ok=True)
        except OSError:
            pass

    duration = float(len(merged)) / float(sample_rate)
    return {
        "ok": True,
        "voice": voice,
        "speaker": speaker,
        "language": language,
        "model": mid,
        "device": dev,
        "chunks": len(chunks),
        "durationSeconds": round(duration, 3),
        "outputPath": str(output_path),
        "sampleRate": int(sample_rate),
    }


def probe() -> dict:
    try:
        import torch
    except ImportError:
        return {
            "ok": False,
            "error": "PyTorch não instalado. Rode: pip install -U qwen-tts",
        }

    try:
        import qwen_tts  # noqa: F401
    except ImportError as exc:
        return {"ok": False, "error": f"qwen-tts ausente: {exc}"}

    device = resolve_device()
    model_id = resolve_model_id()
    return {
        "ok": True,
        "device": device,
        "cuda": bool(torch.cuda.is_available()),
        "model": model_id,
        "voices": list(VOICE_PRESETS.keys()),
        "speakers": sorted({v["speaker"] for v in VOICE_PRESETS.values()}),
        "languages": sorted({v["language"] for v in VOICE_PRESETS.values()}),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Qwen3-TTS CustomVoice narration")
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--text", default="")
    parser.add_argument("--text-file", default="")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--instruct", default="")
    parser.add_argument("--device", default="")
    parser.add_argument("--model", default="")
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    if args.probe:
        print(json.dumps(probe(), ensure_ascii=False))
        return 0

    text = args.text.strip()
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8").strip()
    if not text:
        print(json.dumps({"ok": False, "error": "Texto de narração vazio."}, ensure_ascii=False))
        return 1
    if not args.output:
        print(json.dumps({"ok": False, "error": "Caminho --output obrigatório."}, ensure_ascii=False))
        return 1

    try:
        result = synthesize(
            text=text,
            voice=args.voice,
            output_path=Path(args.output),
            instruct=args.instruct,
            device=args.device or None,
            model_id=args.model or None,
        )
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
