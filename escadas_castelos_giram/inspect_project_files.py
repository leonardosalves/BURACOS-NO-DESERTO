import json

project_dir = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\escadas_castelos_giram"

def load_json(name):
    try:
        with open(f"{project_dir}/{name}", "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return str(e)

print("--- config_qanat.json ---")
cfg = load_json("config_qanat.json")
if isinstance(cfg, dict):
    print(f"BGM mappings: {cfg.get('bgm_mappings', [])}")
    print(f"Block Phrases: {cfg.get('block_phrases', [])}")
    print(f"Timeline Assets Keys: {list(cfg.get('timeline_assets', {}).keys())}")
    for k, v in cfg.get('timeline_assets', {}).items():
        print(f"  Block {k} assets: {v}")
else:
    print(cfg)

print("\n--- block_timings.json ---")
timings = load_json("block_timings.json")
print(timings)

print("\n--- word_transcripts.json ---")
trans = load_json("word_transcripts.json")
if isinstance(trans, list):
    print(f"Segments count: {len(trans)}")
    for t in trans[:3]:
        print(f"  Segment: {t.get('text', '')} (start: {t.get('start_time')}, end: {t.get('end_time')})")
else:
    print(trans)
