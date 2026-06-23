import os
import json
import build_video

build_video.WORDS_CACHE = {}
build_video.TIMELINE_ASSETS = {}
build_video.BLOCK_DURATIONS = []
build_video.STORYBOARD_PROMPTS = []
build_video.CONFIG_DATA = {}
build_video.MATCHES_CACHE = {}

# Load configs
if os.path.exists('config_qanat.json'):
    with open('config_qanat.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    build_video.CONFIG_DATA = config
    build_video.TIMELINE_ASSETS = {int(k): v for k, v in config.get('timeline_assets', {}).items()}

if os.path.exists('storyboard.json'):
    with open('storyboard.json', 'r', encoding='utf-8') as f:
        sb = json.load(f)
    build_video.STORYBOARD_PROMPTS = sb.get('visual_prompts', [])

if os.path.exists('block_timings.json'):
    with open('block_timings.json', 'r', encoding='utf-8') as f:
        timings = json.load(f)
    build_video.BLOCK_DURATIONS = timings.get('durations', [])

flat_transcript_words = []
if os.path.exists('word_transcripts.json'):
    with open('word_transcripts.json', 'r', encoding='utf-8') as f:
        word_transcripts = json.load(f)
    import re
    for seg_idx, seg in enumerate(word_transcripts):
        seg_start = seg['start_time']
        seg_duration = seg['duration']
        seg_text = seg.get('text', '')
        words = seg.get('words', [])
        if words:
            for w in words:
                w_start = w['start']
                w_end = w['end']
                if w_start < seg_start:
                    w_start += seg_start
                    w_end += seg_start
                w_clean = re.sub(r'[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', w['word']).lower()
                flat_transcript_words.append({
                    "word": w['word'],
                    "clean": w_clean,
                    "start": w_start,
                    "end": w_end,
                    "segmentIndex": seg_idx
                })

build_video.FLAT_TRANSCRIPT_WORDS = flat_transcript_words
build_video.MATCHES_CACHE = build_video.build_narration_matches_cache(build_video.TIMELINE_ASSETS, build_video.STORYBOARD_PROMPTS, build_video.CONFIG_DATA, flat_transcript_words)
build_video.WORDS_CACHE = build_video.build_block_narration_words_cache(build_video.TIMELINE_ASSETS, build_video.STORYBOARD_PROMPTS, build_video.CONFIG_DATA, flat_transcript_words, build_video.MATCHES_CACHE)

print("WORDS_CACHE keys:", list(build_video.WORDS_CACHE.keys()))
for k, v in build_video.WORDS_CACHE.items():
    print(f"Key {k} (type {type(k)}): {len(v)} words")

timeline = build_video.build_timeline()
print(f"Timeline has {len(timeline)} clips.")
for idx, clip in enumerate(timeline):
    block_key = str(clip['block'])
    asset_idx = clip['asset_idx']
    dyn = build_video.get_dynamic_asset_words(block_key, asset_idx, build_video.TIMELINE_ASSETS, build_video.BLOCK_DURATIONS, build_video.WORDS_CACHE)
    if dyn:
        print(f"Clip {idx} (Block {block_key}, Asset {asset_idx}): dur={clip['duration']:.3f}s, start={dyn['assetAudioStart']:.3f}, end={dyn['assetAudioEnd']:.3f}, delayOffset={dyn['delayOffset']:.3f}, text='{dyn['text']}'")
    else:
        print(f"Clip {idx} (Block {block_key}, Asset {asset_idx}): dur={clip['duration']:.3f}s, No dynamic words info!")

