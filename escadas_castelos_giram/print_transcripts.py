import json

project_dir = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\escadas_castelos_giram"

try:
    with open(f"{project_dir}/word_transcripts.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"Total segments: {len(data)}")
    for idx, item in enumerate(data):
        print(f"{idx+1}: {item.get('text', '').strip()} ({item.get('start_time')}s - {item.get('end_time')}s)")
except Exception as e:
    print(e)
