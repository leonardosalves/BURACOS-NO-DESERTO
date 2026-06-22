import os
import json
import wave
import re
import subprocess
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
from PIL import Image

# Audio sample rate and paths
SR = 44100
NARRATION_PATH = 'narracao_mestra_premium.mp3'
DRONE_PATH = 'cinematic_drone.wav'
SUB_PATH = 'subs.ass'
CLIPS_DIR = 'temp_clips'
OUTPUT_DIR = 'OUTPUT/qanat_persa_video_final'

# Ensure output directories exist
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Keywords for highlighting in Gold (case-insensitive) - dynamically loaded from config
HIGHLIGHT_KEYWORDS = []

# Color codes
COLOR_GOLD = "00C5FF"      # Gold/Yellow BGR hex for active keywords
COLOR_WATER = "FFE080"     # Water Blue BGR hex for active regular words
COLOR_WHITE = "FFFFFF"     # White BGR hex for normal text

# Texts of Impact (relative start offset, relative end offset, text) inside each of the blocks
# Dynamically loaded from config
IMPACT_TEXTS_OFFSETS = []

# Default dimensions
WIDTH, HEIGHT = 1920, 1080
ASPECT_RATIO = '16:9'

# Load dynamic central config if present
if os.path.exists('config_qanat.json'):
    try:
        with open('config_qanat.json', 'r', encoding='utf-8') as f:
            _config = json.load(f)
        HIGHLIGHT_KEYWORDS = _config.get('highlight_keywords', HIGHLIGHT_KEYWORDS)
        _raw_impacts = _config.get('impact_texts', [])
        if _raw_impacts:
            IMPACT_TEXTS_OFFSETS = [
                (item['block'], item['start_offset'], item['end_offset'], item['text'])
                for item in _raw_impacts
            ]
        ASPECT_RATIO = _config.get('aspect_ratio', ASPECT_RATIO)
        if ASPECT_RATIO == '9:16':
            WIDTH, HEIGHT = 1080, 1920
        print(f"Successfully loaded config_qanat.json dynamic properties. Aspect Ratio: {ASPECT_RATIO} ({WIDTH}x{HEIGHT})")
    except Exception as e:
        print("Warning: Failed to load config_qanat.json, using hardcoded defaults. Error:", e)

def generate_drone(duration=792):
    """Synthesize a deep, evolving cinematic drone track using numpy."""
    print("Synthesizing cinematic drone audio...")
    t = np.arange(0, duration, 1.0 / SR)
    f1, f2, f3 = 55.0, 110.0, 165.0
    lfo1 = 0.5 + 0.4 * np.sin(2 * np.pi * 0.02 * t)
    lfo2 = 0.5 + 0.4 * np.sin(2 * np.pi * 0.035 * t)
    lfo3 = 0.5 + 0.4 * np.sin(2 * np.pi * 0.015 * t)

    drone = (
        0.4 * np.sin(2 * np.pi * f1 * t) * lfo1 +
        0.3 * np.sin(2 * np.pi * f2 * t) * lfo2 +
        0.2 * np.sin(2 * np.pi * f3 * t) * lfo3
    )

    noise = np.random.normal(0, 0.04, len(t))
    window = 220
    noise_padded = np.pad(noise, (window, 0), mode='edge')
    cumsum = np.cumsum(noise_padded)
    filtered_noise = (cumsum[window:] - cumsum[:-window]) / window

    drone += filtered_noise
    drone = drone / np.max(np.abs(drone)) * 0.5
    audio_bytes = (drone * 32767).astype(np.int16).tobytes()

    with wave.open(DRONE_PATH, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(audio_bytes)
    print(f"Drone track saved to {DRONE_PATH}.")

def to_ass_time(sec):
    """Convert float seconds to ASS format H:MM:SS.cs"""
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    cs = int(round((sec % 1) * 100))
    if cs == 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def is_keyword(word):
    """Check if the word is in the keyword list."""
    w_clean = re.sub(r'[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', word).lower()
    return w_clean in HIGHLIGHT_KEYWORDS or any(kw == w_clean for kw in HIGHLIGHT_KEYWORDS)

def generate_subtitles():
    """Build the Advanced SubStation Alpha subtitle file with dynamic highlight hopping."""
    print("Generating ASS dynamic subtitles file with text overlays...")

    play_res_x = WIDTH
    play_res_y = HEIGHT
    margin_v = 320 if ASPECT_RATIO == '9:16' else 80

    ass_content = [
        "[Script Info]",
        "Title: Qanat Documentary Subtitles",
        "ScriptType: v4.00+",
        f"PlayResX: {play_res_x}",
        f"PlayResY: {play_res_y}",
        "WrapStyle: 0",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        # Default: Arial 48, Translucent Black background shadow
        f"Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,30,30,{margin_v},1",
        # Impact: Arial 72 bold, Gold/Yellow color, Middle Center alignment
        "Style: Impact,Arial,72,&H0000C5FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,5,30,30,30,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
    ]

    with open('word_transcripts.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    events = []
    max_words_per_chunk = 4

    for item in data:
        segment_start = item['start_time']
        words = item['words']

        if not words:
            fallback_text = item.get('text', '')
            words_static = re.split(r'(\s+)', fallback_text)
            highlighted = []
            for w in words_static:
                w_clean = re.sub(r'[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', w).lower()
                if w_clean in HIGHLIGHT_KEYWORDS:
                    highlighted.append(f"{{\\c&H00C5FF&}}{w}{{\\c&HFFFFFF&}}")
                else:
                    highlighted.append(w)
            text = "".join(highlighted)
            start = to_ass_time(segment_start)
            end = to_ass_time(item['end_time'])
            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")
            continue

        chunks = [words[i:i+max_words_per_chunk] for i in range(0, len(words), max_words_per_chunk)]

        for chunk in chunks:
            n_c = len(chunk)
            for i in range(n_c):
                active_word = chunk[i]
                w_start = segment_start + active_word['start']

                if i < n_c - 1:
                    w_end = segment_start + chunk[i+1]['start']
                else:
                    w_end = segment_start + active_word['end']

                line_parts = []
                for j in range(n_c):
                    w_dict = chunk[j]
                    w_text = w_dict['word']

                    if j == i:
                        color = COLOR_GOLD if is_keyword(w_text) else COLOR_WATER
                        if w_text.startswith(" "):
                            line_parts.append(f" {{\\c&H{color}&}}{{\\1a&H00&}}{{\\fs58}}{w_text[1:]}{{\\c&H{COLOR_WHITE}&}}{{\\1a&H44&}}{{\\fs48}}")
                        else:
                            line_parts.append(f"{{\\c&H{color}&}}{{\\1a&H00&}}{{\\fs58}}{w_text}{{\\c&H{COLOR_WHITE}&}}{{\\1a&H44&}}{{\\fs48}}")
                    else:
                        line_parts.append(w_text)

                full_text = "".join(line_parts)
                full_line = f"{{\\1a&H44&}}{{\\fs48}}{full_text}"
                events.append(f"Dialogue: 0,{to_ass_time(w_start)},{to_ass_time(w_end)},Default,,0,0,0,,{full_line}")

    # Load block timings
    with open('block_timings.json', 'r', encoding='utf-8') as f:
        timings = json.load(f)
    starts = [0.0] + timings['starts']

    for block_num, start_offset, end_offset, text in IMPACT_TEXTS_OFFSETS:
        block_start = starts[block_num]
        block_end = starts[block_num + 1] if block_num < len(timings['starts']) else timings['total_duration']

        abs_start = block_start + start_offset
        abs_end = block_start + end_offset
        if abs_end > block_end:
            abs_end = block_end

        start_str = to_ass_time(abs_start)
        end_str = to_ass_time(abs_end)
        events.append(f"Dialogue: 0,{start_str},{end_str},Impact,,0,0,0,,{text}")

    with open(SUB_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(ass_content) + "\n" + "\n".join(events) + "\n")
    print(f"ASS dynamic subtitles file successfully saved to {SUB_PATH}.")

def build_timeline():
    """Define the sequential sub-clips timeline dynamically based on block_timings.json, incorporating storyboard editor notes."""
    with open('block_timings.json', 'r', encoding='utf-8') as f:
        timings = json.load(f)
    block_durations = timings['durations']

    # Load storyboard prompts if present
    storyboard_prompts = []
    if os.path.exists('storyboard.json'):
        try:
            with open('storyboard.json', 'r', encoding='utf-8') as f:
                _storyboard = json.load(f)
            storyboard_prompts = _storyboard.get('visual_prompts', [])
            print(f"Loaded {len(storyboard_prompts)} storyboard scene instructions.")
        except Exception as e:
            print("Warning: Failed to load storyboard.json:", e)

    timeline = []

    block_configs = {
        1: [
            {"asset": "videos/video_1.mp4", "type": "video", "fixed": 8.00},
            {"asset": "videos/video_2.mp4", "type": "video", "fixed": 8.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(1, 7)]),
            {"asset": "svg/svg_7.png", "type": "svg", "fixed": 4.39},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(7, 11)])
        ],
        2: [
            {"asset": "videos/video_3.mp4", "type": "video", "fixed": 8.00},
            {"asset": "videos/video_5.mp4", "type": "video", "fixed": 8.00},
            {"asset": "svg/svg_1.png", "type": "svg", "fixed": 10.00},
            {"asset": "svg/svg_3.png", "type": "svg", "fixed": 10.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(11, 16)])
        ],
        3: [
            {"asset": "videos/video_6.mp4", "type": "video", "fixed": 10.00},
            {"asset": "svg/svg_2.png", "type": "svg", "fixed": 12.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(16, 21)])
        ],
        4: [
            {"asset": "svg/svg_6.png", "type": "svg", "fixed": 12.00},
            {"asset": "svg/svg_1.png", "type": "svg", "fixed": 10.00},
            *([{"asset": f"images/img_{idx}.jpeg", "type": "image"} for idx in [21, 24, 25, 30, 46, 47, 61]])
        ],
        5: [
            {"asset": "videos/video_1.mp4", "type": "video", "fixed": 8.00},
            {"asset": "videos/video_4.mp4", "type": "video", "fixed": 10.00},
            *([{"asset": f"images/img_{idx}.jpeg", "type": "image"} for idx in [2, 4, 9, 14, 21, 22, 23, 48, 49, 62, 63, 64]])
        ],
        6: [
            {"asset": "videos/video_5.mp4", "type": "video", "fixed": 12.00},
            {"asset": "svg/svg_3.png", "type": "svg", "fixed": 12.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(26, 31)])
        ],
        7: [
            {"asset": "videos/video_7.mp4", "type": "video", "fixed": 10.00},
            *([
                {"asset": "clip_highlight.mp4", "type": "highlight_video", "fixed": 4.692} if (idx == 32 and not os.path.exists('config_qanat.json')) else
                {"asset": f"images/img_{idx}.jpeg", "type": "image"}
                for idx in [31, 32, 33, 34, 35, 50, 56, 59, 60, 65, 66, 67, 68]
            ])
        ],
        8: [
            {"asset": "videos/video_8.mp4", "type": "video", "fixed": 10.00},
            {"asset": "svg/svg_5.png", "type": "svg", "fixed": 12.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in range(36, 41)])
        ],
        9: [
            {"asset": "videos/video_9.mp4", "type": "video", "fixed": 12.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in list(range(41, 46)) + [69]])
        ],
        10: [
            {"asset": "svg/svg_4.png", "type": "svg", "fixed": 12.00},
            {"asset": "svg/svg_6.png", "type": "svg", "fixed": 10.00},
            *([{"asset": f"images/img_{idx}.jpeg", "type": "image"} for idx in [11, 13, 14, 15, 46, 47, 48, 49, 50]])
        ],
        11: [
            {"asset": "videos/video_10.mp4", "type": "video", "fixed": 10.00},
            {"asset": "svg/svg_8.png", "type": "svg", "fixed": 10.00},
            *([{"asset": f"images/img_{i}.jpeg", "type": "image"} for i in list(range(51, 56)) + [70]])
        ],
        12: [
            {"asset": "svg/svg_8.png", "type": "svg", "fixed": 8.00},
            {"asset": "images/img_70.jpeg", "type": "image"}
        ]
    }

    if os.path.exists('config_qanat.json'):
        try:
            with open('config_qanat.json', 'r', encoding='utf-8') as f:
                _config = json.load(f)
            if 'timeline_assets' in _config:
                block_configs = {int(k): v for k, v in _config['timeline_assets'].items()}
                print("Loaded dynamic timeline_assets from config_qanat.json")
        except Exception as e:
            print("Warning: Failed to load timeline_assets from config:", e)

    num_blocks = len(block_durations)
    for block_num in range(1, num_blocks + 1):
        block_duration = block_durations[block_num - 1]
        configs = block_configs.get(block_num, [])

        sum_fixed = sum(c.get("fixed", 0.0) for c in configs)
        flexible_clips = [c for c in configs if "fixed" not in c]
        n_flex = len(flexible_clips)

        # Fase 1: Calcular durações baseadas nas preferências do usuário
        block_clips = []
        for c_idx, c in enumerate(configs):
            editor_notes = ""
            block_prompts = [p for p in storyboard_prompts if p.get('block') == block_num]
            if c_idx < len(block_prompts):
                editor_notes = block_prompts[c_idx].get('editor_notes', "")

            if "fixed" in c and c["fixed"] is not None:
                dur = c["fixed"]
            else:
                if n_flex > 0:
                    remaining = max(0.5 * n_flex, block_duration - sum_fixed)
                    dur = remaining / n_flex
                else:
                    dur = 0.5

            block_clips.append({
                "block": block_num,
                "asset": c["asset"],
                "type": c["type"],
                "duration": dur,
                "editor_notes": editor_notes
            })

        # Fase 2: NORMALIZAR para que o total do bloco bata EXATAMENTE com a narração
        # Isso garante que a narração e o vídeo fiquem 100% sincronizados
        block_total = sum(clip["duration"] for clip in block_clips)
        if block_total > 0 and abs(block_total - block_duration) > 0.01:
            scale = block_duration / block_total
            for clip in block_clips:
                clip["duration"] = round(clip["duration"] * scale, 3)
            # Ajustar o último clip para compensar erros de arredondamento
            adjusted_total = sum(clip["duration"] for clip in block_clips)
            if block_clips:
                block_clips[-1]["duration"] += (block_duration - adjusted_total)
            print(f"  Bloco {block_num}: normalizado {block_total:.1f}s → {block_duration:.1f}s (escala: {scale:.3f})")

        timeline.extend(block_clips)

    return timeline

def get_video_duration(file_path):
    """Retrieve actual duration of a video file using ffprobe."""
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file_path]
        res = json.loads(subprocess.check_output(cmd).decode('utf-8'))
        return float(res['format']['duration'])
    except Exception as e:
        print(f"Error getting video duration for {file_path}: {e}")
        return 0.0

def resolve_asset_path(asset_path):
    """Resolve asset paths to handle case typos, spaces, and missing files with robust fallbacks."""
    if os.path.exists(asset_path):
        return asset_path

    dir_name = os.path.dirname(asset_path)
    base_name = os.path.basename(asset_path)
    name_no_ext, ext = os.path.splitext(base_name)

    if '_' in name_no_ext:
        spaced_name = name_no_ext.replace('_', ' ') + ext
        spaced_path = os.path.join(dir_name, spaced_name)
        if os.path.exists(spaced_path):
            return spaced_path

    nums = re.findall(r'\d+', name_no_ext)
    if nums:
        target_num = int(nums[0])
        if os.path.exists(dir_name):
            for f in os.listdir(dir_name):
                f_nums = re.findall(r'\d+', f)
                if f_nums and int(f_nums[0]) == target_num:
                    return os.path.join(dir_name, f)

    if os.path.exists(dir_name):
        files = sorted([f for f in os.listdir(dir_name) if f.lower().endswith(ext.lower())])
        if files:
            return os.path.join(dir_name, files[0])

    raise FileNotFoundError(f"Could not resolve asset path: {asset_path}")

def render_subclip(clip_id, clip_info):
    """Render a single subclip in the timeline with advanced IA effects (pan, zoom, shake, vignette, speed)."""
    import hashlib
    asset_type = clip_info['type']
    duration = clip_info['duration']

    if asset_type == 'highlight_video':
        asset_path = clip_info['asset']
    else:
        asset_path = resolve_asset_path(os.path.join('ASSETS', clip_info['asset']))

    editor_notes = clip_info.get('editor_notes', "")
    notes = editor_notes.lower()

    # Generate a unique hash for cache verification based on asset path, duration, editor notes and asset modification time
    asset_mtime = os.path.getmtime(asset_path) if os.path.exists(asset_path) else 0.0
    hash_payload = f"{asset_path}_{duration:.3f}_{notes}_{asset_mtime}"
    clip_hash = hashlib.md5(hash_payload.encode('utf-8')).hexdigest()[:10]
    output_path = os.path.join(CLIPS_DIR, f"clip_{clip_id:03d}_{clip_hash}.mp4")

    if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
        return output_path, True

    if asset_type == 'highlight_video':
        cmd = [
            'ffmpeg', '-y', '-i', asset_path, '-t', f"{duration:.3f}",
            '-vf', f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=60",
            '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '60', output_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not os.path.exists(output_path) or os.path.getsize(output_path) < 1000:
            shutil.copyfile(asset_path, output_path)

    elif asset_type == 'video':
        vf_filters = [f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=60"]

        speed_multiplier = 1.0
        if "fast motion" in notes or "speed up" in notes or "fast-motion" in notes:
            vf_filters.append("setpts=0.5*PTS")
            speed_multiplier = 0.5
        elif "slow motion" in notes or "slow down" in notes or "slow-motion" in notes:
            vf_filters.append("setpts=2.0*PTS")
            speed_multiplier = 2.0

        if "shake" in notes or "shaking" in notes or "vibration" in notes:
            # Removed single quotes to prevent literal parsing syntax errors in subprocess list calls
            vf_filters.append(f"crop=w={WIDTH-40}:h={HEIGHT-40}:x=(iw-ow)/2+15*sin(2*PI*8*t):y=(ih-oh)/2+15*cos(2*PI*11*t)")
            vf_filters.append(f"scale={WIDTH}:{HEIGHT}")

        if "vignette" in notes or "simulate a hit" in notes:
            if "red" in notes or "hit" in notes:
                vf_filters.append("vignette=angle=0.5")
                vf_filters.append("colorchannelmixer=rr=1.3:gg=0.8:bb=0.8")
            else:
                vf_filters.append("vignette=angle=0.5")

        vf_string = ",".join(vf_filters)

        video_dur = get_video_duration(asset_path)
        effective_dur = video_dur * speed_multiplier

        # Se o vídeo é mais curto que a duração pedida, congelar no último frame
        # com efeito de slow pan lateral + gentle zoom para não ficar estático
        if effective_dur > 0 and effective_dur < duration:
            pad_duration = duration - effective_dur
            # Congelar último frame
            vf_string += f",tpad=stop_mode=clone:stop_duration={pad_duration:.3f}"
            # Slow pan lateral durante a parte congelada
            # Crop levemente menor e move pro lado - efeito cinematográfico suave
            pan_px = 30
            # Pan linear suave ao longo de toda a duração (quase imperceptível no vídeo real,
            # mas visível e bonito na parte congelada)
            crop_expr = f"crop=w=iw-{pan_px}:h=ih-{pan_px//2}:x={pan_px}*t/{duration:.3f}:y={pan_px//4}"
            vf_string += f",{crop_expr},scale={WIDTH}:{HEIGHT}"

        cmd = [
            'ffmpeg', '-y',
            '-i', asset_path, '-t', f"{duration:.3f}",
            '-vf', vf_string,
            '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '60', output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            err_msg = res.stderr.decode('utf-8', errors='ignore')
            raise RuntimeError(f"FFmpeg video render failed on clip {clip_id:03d} -> {asset_path}. Error: {err_msg}")

    elif asset_type in ('image', 'svg'):
        movement_type = None
        if "pan up" in notes or "pan-up" in notes:
            movement_type = "pan_up"
        elif "pan down" in notes or "pan-down" in notes:
            movement_type = "pan_down"
        elif "pan right" in notes or "pan-right" in notes:
            movement_type = "pan_right"
        elif "pan left" in notes or "pan-left" in notes:
            movement_type = "pan_left"
        elif "zoom in" in notes or "zoom-in" in notes or "close-up" in notes or "close up" in notes:
            movement_type = "zoom_in"
        elif "zoom out" in notes or "zoom-out" in notes:
            movement_type = "zoom_out"

        if not movement_type:
            movements = ['zoom_in', 'zoom_out', 'pan_right', 'pan_left']
            movement_type = movements[clip_id % len(movements)] if asset_type == 'image' else 'gentle_zoom'

        image_filters = []
        if "shake" in notes or "shaking" in notes or "vibration" in notes:
            # Removed single quotes to prevent literal parsing syntax errors in subprocess list calls
            image_filters.append(f"crop=w={WIDTH-40}:h={HEIGHT-40}:x=(iw-ow)/2+15*sin(2*PI*8*t):y=(ih-oh)/2+15*cos(2*PI*11*t)")
            image_filters.append(f"scale={WIDTH}:{HEIGHT}")
        if "vignette" in notes or "simulate a hit" in notes:
            if "red" in notes or "hit" in notes:
                image_filters.append("vignette=angle=0.5")
                image_filters.append("colorchannelmixer=rr=1.3:gg=0.8:bb=0.8")
            else:
                image_filters.append("vignette=angle=0.5")

        vf_args = []
        if image_filters:
            vf_args = ['-vf', ",".join(image_filters)]

        cmd = [
            'ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f"{WIDTH}x{HEIGHT}", '-r', '60',
            '-i', '-', '-t', f"{duration:.3f}"
        ] + vf_args + [
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '60', output_path
        ]

        log_path = os.path.join(CLIPS_DIR, f"clip_{clip_id:03d}_ffmpeg.log")
        log_file = open(log_path, 'wb')

        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log_file)

        try:
            im = Image.open(asset_path)
            if im.mode != 'RGB':
                im = im.convert('RGB')

            orig_w, orig_h = im.size
            target_aspect = float(WIDTH) / float(HEIGHT)
            orig_aspect = orig_w / orig_h

            if orig_aspect > target_aspect:
                crop_h = orig_h
                crop_w = orig_h * target_aspect
            else:
                crop_w = orig_w
                crop_h = orig_w / target_aspect

            cx, cy = orig_w / 2.0, orig_h / 2.0
            total_frames = int(duration * 60)

            for i in range(total_frames):
                # Check if process died early
                if proc.poll() is not None:
                    log_file.close()
                    try:
                        with open(log_path, 'r', encoding='utf-8', errors='ignore') as lf:
                            err_msg = lf.read()
                    except Exception:
                        err_msg = "Could not read FFmpeg log file."
                    raise RuntimeError(f"FFmpeg image render crashed early with code {proc.returncode}. Stderr: {err_msg}")

                t = i / max(1, total_frames - 1)

                if movement_type == 'zoom_in':
                    scale = 1.0 + 0.04 * t
                    w = crop_w / scale
                    h = crop_h / scale
                    x, y = cx, cy
                elif movement_type == 'zoom_out':
                    scale = 1.04 - 0.04 * t
                    w = crop_w / scale
                    h = crop_h / scale
                    x, y = cx, cy
                elif movement_type == 'pan_right':
                    scale = 1.04
                    w = crop_w / scale
                    h = crop_h / scale
                    max_shift = (crop_w - w) / 2.0
                    x = cx - max_shift + 2.0 * max_shift * t
                    y = cy
                elif movement_type == 'pan_left':
                    scale = 1.04
                    w = crop_w / scale
                    h = crop_h / scale
                    max_shift = (crop_w - w) / 2.0
                    x = cx + max_shift - 2.0 * max_shift * t
                    y = cy
                elif movement_type == 'pan_up':
                    scale = 1.04
                    w = crop_w / scale
                    h = crop_h / scale
                    max_shift = (crop_h - h) / 2.0
                    x = cx
                    y = cy + max_shift - 2.0 * max_shift * t
                elif movement_type == 'pan_down':
                    scale = 1.04
                    w = crop_w / scale
                    h = crop_h / scale
                    max_shift = (crop_h - h) / 2.0
                    x = cx
                    y = cy - max_shift + 2.0 * max_shift * t
                elif movement_type == 'gentle_zoom':
                    scale = 1.0 + 0.02 * t
                    w = crop_w / scale
                    h = crop_h / scale
                    x, y = cx, cy
                else:
                    w, h = crop_w, crop_h
                    x, y = cx, cy

                left = x - w / 2.0
                top = y - h / 2.0
                right = x + w / 2.0
                bottom = y + h / 2.0

                cropped = im.crop((left, top, right, bottom))
                resized = cropped.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
                proc.stdin.write(resized.tobytes())

            proc.stdin.close()
            proc.wait()
            log_file.close()
            if proc.returncode != 0:
                try:
                    with open(log_path, 'r', encoding='utf-8', errors='ignore') as lf:
                        err_msg = lf.read()
                except Exception:
                    err_msg = "Could not read FFmpeg log file."
                raise RuntimeError(f"FFmpeg image render failed with code {proc.returncode}. Stderr: {err_msg}")
            else:
                try:
                    os.remove(log_path)
                except Exception:
                    pass
        except Exception as e:
            try:
                log_file.close()
            except Exception:
                pass
            if proc.stdin:
                try:
                    proc.stdin.close()
                except Exception:
                    pass
            proc.kill()
            raise e
    else:
        raise ValueError(f"Unknown asset type: {asset_type}")

    return output_path, False

def main():
    if not os.path.exists(DRONE_PATH):
        generate_drone(792)

    # 1. Build Subtitles
    print("[PROGRESSO] FASE 1/5 - Gerando legendas dinâmicas...")
    print("[PROGRESSO] 5%")
    generate_subtitles()

    # 2. Build Timeline
    print("[PROGRESSO] FASE 2/5 - Montando linha do tempo...")
    print("[PROGRESSO] 10%")
    timeline = build_timeline()
    total_dur = sum(c['duration'] for c in timeline)
    print(f"Timeline compilada: {len(timeline)} clips, duração total: {total_dur:.2f}s.")

    # 3. Render sub-clips (bulk of the work - 10% to 80%)
    print("[PROGRESSO] FASE 3/5 - Renderizando sub-clips...")
    max_workers = min(os.cpu_count() or 4, 6)
    rendered_paths = [None] * len(timeline)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(render_subclip, idx, clip): idx for idx, clip in enumerate(timeline)}
        completed_count = 0
        for future in as_completed(futures):
            idx = futures[future]
            try:
                path, cached = future.result()
                rendered_paths[idx] = path
                completed_count += 1
                pct = 10 + int(70 * completed_count / len(timeline))
                status = "Cache" if cached else "Renderizado"
                print(f"[PROGRESSO] {pct}%")
                print(f"  [{completed_count}/{len(timeline)}] {status} clip {idx:03d} → {os.path.basename(path)}")
            except Exception as e:
                print(f"ERRO no clip {idx}: {e}")
                raise e

    # 4. Concatenate + Audio Mix
    print("[PROGRESSO] FASE 4/5 - Concatenando clips e mixando áudio...")
    print("[PROGRESSO] 82%")
    concat_list_path = 'clips_list.txt'
    with open(concat_list_path, 'w', encoding='utf-8') as f:
        for p in rendered_paths:
            f.write(f"file '{p.replace(chr(92), '/')}'\\n")

    clean_video_no_audio = 'clean_video_no_audio.mp4'
    concat_cmd = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list_path,
        '-c', 'copy', clean_video_no_audio
    ]
    subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    print("[PROGRESSO] 85%")
    no_subs_path = os.path.join(OUTPUT_DIR, 'video_final_60fps_sem_legendas.mp4')

    # Check if custom premium BGM track exists, else fallback to synthetic drone
    bgm_path = 'trilha_documentario.mp3' if os.path.exists('trilha_documentario.mp3') else DRONE_PATH

    audio_filter = (
        "[2:a]volume=0.08[bgm];"
        "[bgm][1:a]sidechaincompress=threshold=0.015:ratio=8.0:attack=50:release=1000[bgm_ducked];"
        "[bgm_ducked][1:a]amix=inputs=2:normalize=0[aout]"
    )

    mix_cmd = [
        'ffmpeg', '-y', '-i', clean_video_no_audio,
        '-i', NARRATION_PATH,
        '-i', bgm_path,
        '-filter_complex', audio_filter,
        '-map', '0:v', '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        no_subs_path
    ]
    subprocess.run(mix_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # 5. Burn Subtitles
    print("[PROGRESSO] FASE 5/5 - Gravando legendas no vídeo...")
    print("[PROGRESSO] 90%")

    with_subs_path = os.path.join(OUTPUT_DIR, 'video_final_60fps_com_legendas.mp4')
    sub_filter_path = SUB_PATH.replace('\\', '/').replace(':', '\\:')

    burn_cmd = [
        'ffmpeg', '-y', '-i', no_subs_path,
        '-vf', f"subtitles={sub_filter_path}",
        '-c:v', 'libx264', '-crf', '18', '-preset', 'faster',
        '-c:a', 'copy',
        with_subs_path
    ]
    subprocess.run(burn_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    main_delivery_path = os.path.join(OUTPUT_DIR, 'video_final_60fps.mp4')
    print(f"\nCreating main delivery copy: {main_delivery_path}")
    shutil.copyfile(with_subs_path, main_delivery_path)

    # Cleanup
    print("\nCleaning up intermediate build products...")
    try:
        shutil.rmtree(CLIPS_DIR)
        os.remove(concat_list_path)
        os.remove(clean_video_no_audio)
        print("Cleanup completed.")
    except Exception as e:
        print(f"Warning: Cleanup failed to remove some files: {e}")

    print("\n=======================================================")
    print("[PROGRESSO] 100%")
    print("SUCCESS! Video generation pipeline complete!")
    print(f"Clean Video: {no_subs_path}")
    print(f"Subtitled Video: {with_subs_path}")
    print(f"Main Video: {main_delivery_path}")
    print("=======================================================")

if __name__ == '__main__':
    main()