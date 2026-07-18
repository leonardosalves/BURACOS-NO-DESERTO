import os
import sys
import argparse
import json
from huggingface_hub import snapshot_download

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", type=str, required=True, help="HF Token")
    parser.add_argument("--output_dir", type=str, default="./models/MobileWAN-T2V-1.3B-FP16")
    args = parser.parse_args()

    print(f"Downloading Qualcomm-AI-Research/mobilewan checkpoint to {args.output_dir}...", flush=True)
    try:
        os.makedirs(args.output_dir, exist_ok=True)
        # Download checkpoints from Qualcomm-AI-Research/mobilewan space/repo
        snapshot_download(
            repo_id="Qualcomm-AI-Research/mobilewan",
            token=args.token,
            local_dir=args.output_dir,
            local_dir_use_symlinks=False
        )
        print(json.dumps({"success": True, "path": args.output_dir}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
