import argparse
import os
import shutil
import sys
import json
from gradio_client import Client

def main():
    parser = argparse.ArgumentParser(description="Generate video using MobileWAN Hugging Face space")
    parser.add_argument("--prompt", type=str, required=True, help="Video prompt")
    parser.add_argument("--negative_prompt", type=str, default="blurry, low quality", help="Negative prompt")
    parser.add_argument("--aspect_ratio", type=str, default="9:16", help="Aspect ratio (e.g. 9:16 or 16:9)")
    parser.add_argument("--steps", type=int, default=20, help="Inference steps")
    parser.add_argument("--guidance_scale", type=float, default=6.0, help="Guidance scale")
    parser.add_argument("--output", type=str, required=True, help="Destination output file path")

    args = parser.parse_args()

    print(f"Connecting to Qualcomm-AI-research/MobileWAN Hugging Face Space...", flush=True)
    try:
        client = Client("Qualcomm-AI-research/MobileWAN")
        print(f"Sending prompt: {args.prompt} (Aspect Ratio: {args.aspect_ratio})", flush=True)
        
        result = client.predict(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            num_inference_steps=args.steps,
            guidance_scale=args.guidance_scale,
            aspect_ratio=args.aspect_ratio,
            api_name="/predict"
        )
        
        if not result or not os.path.exists(result):
            raise Exception("Gradio client returned empty or non-existent path")
            
        print(f"Generation successful. Temp file: {result}", flush=True)
        
        # Ensure destination directory exists
        dest_dir = os.path.dirname(args.output)
        if dest_dir:
            os.makedirs(dest_dir, exist_ok=True)
            
        # Copy to output
        shutil.copy2(result, args.output)
        print(f"Copied output to: {args.output}", flush=True)
        
        # Output success JSON
        print(json.dumps({"success": True, "output_path": args.output}))
        
    except Exception as e:
        print(f"Error generating video: {str(e)}", file=sys.stderr, flush=True)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
