#!/usr/bin/env python3
"""Download LTX-2 GGUF models configured for RTX 4060 Ti 8GB."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "ltx_rtx4060_8gb.json"
COMFY_DIR = ROOT / "ComfyUI"


def main():
    if not CONFIG_PATH.exists():
        print(f"Config not found: {CONFIG_PATH}", file=sys.stderr)
        return 1

    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    items = config.get("models_download", [])
    if not items:
        print("No models_download entries in config.", file=sys.stderr)
        return 1

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("Installing huggingface_hub...", flush=True)
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
        from huggingface_hub import hf_hub_download

    if not COMFY_DIR.exists():
        print(f"ComfyUI not installed at {COMFY_DIR}. Run install_comfyui_ltx.bat first.", file=sys.stderr)
        return 1

    ok = 0
    for item in items:
        repo = item["repo"]
        filename = item["file"]
        dest_rel = item["dest"]
        dest = COMFY_DIR / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)

        if dest.exists() and dest.stat().st_size > 1024 * 1024:
            print(f"[skip] {dest_rel} ({dest.stat().st_size // (1024*1024)} MB)")
            ok += 1
            continue

        print(f"[download] {repo} :: {filename} -> {dest_rel}", flush=True)
        try:
            cached = hf_hub_download(repo_id=repo, filename=filename)
            cached_path = Path(cached)
            if cached_path.resolve() != dest.resolve():
                shutil.copy2(cached_path, dest)
            print(f"[done] {dest_rel}", flush=True)
            ok += 1
        except Exception as exc:
            print(f"[error] {dest_rel}: {exc}", file=sys.stderr, flush=True)

    print(f"\nFinished: {ok}/{len(items)} models ready.")
    return 0 if ok == len(items) else 2


if __name__ == "__main__":
    raise SystemExit(main())