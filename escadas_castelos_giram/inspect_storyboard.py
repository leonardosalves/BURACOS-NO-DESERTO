import json

project_dir = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\escadas_castelos_giram"

try:
    with open(f"{project_dir}/storyboard.json", "r", encoding="utf-8") as f:
        sb = json.load(f)
    print(f"Storyboard prompts count: {len(sb.get('visual_prompts', []))}")
    for idx, vp in enumerate(sb.get('visual_prompts', [])):
        print(f"  Scene {idx+1}: block={vp.get('block')}, scene={vp.get('scene')}, narration_text={vp.get('narration_text', '')[:50]}")
except Exception as e:
    print(e)
