import os
import json
import subprocess
import shutil
import re

import build_video

build_video.WORDS_CACHE = {}
build_video.TIMELINE_ASSETS = {}
build_video.BLOCK_DURATIONS = []
build_video.STORYBOARD_PROMPTS = []
build_video.CONFIG_DATA = {}
build_video.MATCHES_CACHE = {}

# Load config
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
        elif seg_text:
            raw_words = seg_text.split()
            if raw_words:
                word_dur = seg_duration / len(raw_words)
                for w_idx, word in enumerate(raw_words):
                    w_clean = re.sub(r'[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', word).lower()
                    flat_transcript_words.append({
                        "word": word,
                        "clean": w_clean,
                        "start": seg_start + w_idx * word_dur,
                        "end": seg_start + (w_idx + 1) * word_dur,
                        "segmentIndex": seg_idx
                    })

build_video.FLAT_TRANSCRIPT_WORDS = flat_transcript_words
build_video.MATCHES_CACHE = build_video.build_narration_matches_cache(build_video.TIMELINE_ASSETS, build_video.STORYBOARD_PROMPTS, build_video.CONFIG_DATA, flat_transcript_words)
build_video.WORDS_CACHE = build_video.build_block_narration_words_cache(build_video.TIMELINE_ASSETS, build_video.STORYBOARD_PROMPTS, build_video.CONFIG_DATA, flat_transcript_words, build_video.MATCHES_CACHE)

timeline = build_video.build_timeline()
print(f"Timeline size: {len(timeline)}")

# Render clip 0 manually but print output
clip_info = timeline[0]
print("Clip info:", clip_info)

# Let's run render_subclip(0, clip_info)
out_path, cached = build_video.render_subclip(0, clip_info)
print(f"Rendered to {out_path}, cached: {cached}")

# Check streams of the output file
cmd = ['ffprobe', '-show_streams', '-of', 'json', out_path]
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print("FFPROBE output:")
print(res.stdout.decode('utf-8'))
