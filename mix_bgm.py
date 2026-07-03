import os

import json

import subprocess

import numpy as np

SR = 44100

CROSSFADE_SEC = 2.0

CROSSFADE_SAMPLES = int(CROSSFADE_SEC * SR)

if os.path.exists('config_qanat.json'):

    with open('config_qanat.json', 'r', encoding='utf-8') as f:

        config_data = json.load(f)

    MAPPINGS = config_data.get('bgm_mappings', [])

else:

    MAPPINGS = []

    config_data = {}

def get_duration(filename):

    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filename]

    res = json.loads(subprocess.check_output(cmd).decode('utf-8'))

    return float(res['format']['duration'])

def load_pcm(filename, start_s, duration_s, target_sr=SR):

    cmd = [

        'ffmpeg', '-y', '-ss', f"{start_s:.3f}", '-i', filename, '-t', f"{duration_s:.3f}",

        '-ar', str(target_sr), '-ac', '2', '-f', 's16le', '-'

    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    raw_bytes, _ = proc.communicate()

    data = np.frombuffer(raw_bytes, dtype=np.int16)

    if len(data) == 0:

        return np.zeros((int(duration_s * target_sr), 2), dtype=np.int16)

    return data.reshape(-1, 2)

def load_pcm_wrapped(filename, start_s, duration_s, target_sr=SR):

    total_d = get_duration(filename)

    start_s = start_s % total_d

    if start_s + duration_s <= total_d:

        return load_pcm(filename, start_s, duration_s, target_sr)

    else:

        part1_dur = total_d - start_s

        part2_dur = duration_s - part1_dur

        part1 = load_pcm(filename, start_s, part1_dur, target_sr)

        part2 = load_pcm_wrapped(filename, 0.0, part2_dur, target_sr)

        target_len = int(duration_s * target_sr)

        combined = np.concatenate([part1, part2], axis=0)

        if len(combined) > target_len:

            combined = combined[:target_len]

        elif len(combined) < target_len:

            pad = np.zeros((target_len - len(combined), 2), dtype=np.int16)

            combined = np.concatenate([combined, pad], axis=0)

        return combined

def write_pcm_to_mp3(data, output_filename, sr=SR):

    cmd = [

        'ffmpeg', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '2', '-i', '-',

        '-c:a', 'libmp3lame', '-q:a', '2', output_filename

    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    proc.communicate(data.tobytes())

# Dynamic Ducking Helper using narration envelope


def find_best_climax_start(filename, duration_s, target_sr=SR, mood='peak'):
    """
    Escolhe o offset de entrada na faixa conforme a sonoplastia do bloco.
    mood: peak (máxima energia), rise (crescendo), soft (entrada suave), neutral (meio estável).
    """
    try:
        if not filename or not os.path.exists(filename):
            return 0.0
        cmd = [
            'ffmpeg', '-y', '-i', filename,
            '-ar', '11025', '-ac', '1', '-f', 'f32le', '-'
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        raw_bytes, _ = proc.communicate()
        data = np.frombuffer(raw_bytes, dtype=np.float32)
        if len(data) == 0:
            return 0.0

        win_size = 11025
        rms = []
        for i in range(0, len(data) - win_size, win_size):
            rms.append(np.sqrt(np.mean(data[i:i+win_size]**2) + 1e-9))

        if not rms:
            return 0.0

        dur_sec = max(1, int(duration_s))
        if len(rms) <= dur_sec:
            return 0.0

        mode = str(mood or 'peak').lower()
        if mode in ('epic', 'tension', 'climax', 'action'):
            mode = 'peak'

        best_start = 0
        best_score = -1e18
        track_len = len(rms)

        for i in range(track_len - dur_sec):
            window = rms[i:i + dur_sec]
            total = sum(window)
            mean_e = total / max(1, len(window))
            start_e = window[0]
            end_e = window[-1]
            mid_e = window[len(window) // 2]
            variance = float(np.var(window)) if len(window) > 1 else 0.0
            late_penalty = max(0.0, (i / max(1, track_len)) - 0.55) * 2.5
            quiet_penalty = max(0.0, 0.012 - mean_e) * 120.0

            if mode == 'soft':
                score = mean_e * 2.4 - variance * 1.2 - late_penalty * 0.6
            elif mode == 'rise':
                score = (end_e - start_e) * 2.0 + mean_e * 1.8 + end_e * 0.35 - late_penalty - quiet_penalty
            elif mode == 'neutral':
                score = -(variance * 3.0) + mean_e * 2.2 - late_penalty * 0.4
            else:  # peak
                score = total + mean_e * 1.2 - late_penalty

            if score > best_score:
                best_score = score
                best_start = i

        print(f"Climax detection ({mode}): best start offset is {best_start}s (score={best_score:.4f})")
        return float(best_start)
    except Exception as e:
        print(f"Error detecting climax: {e}")
        return 0.0


def apply_sidechain_ducking(bgm_audio, narration_file, total_duration, target_sr=SR, threshold=0.012, duck_factor=0.35, attack_s=0.06, release_s=0.8):

    if not os.path.exists(narration_file):

        print("Narration file not found for ducking, skipping sidechain.")

        return bgm_audio

    print(f"Loading narration '{narration_file}' for ducking envelope (dur={total_duration:.2f}s)...")

    narration_pcm = load_pcm(narration_file, 0.0, total_duration, target_sr)

    narration = narration_pcm.astype(np.float32) / 32768.0

    if len(narration.shape) > 1:

        narration_mono = np.mean(narration, axis=1)

    else:

        narration_mono = narration

    # Align lengths

    target_len = len(bgm_audio)

    if len(narration_mono) < target_len:

        narration_mono = np.pad(narration_mono, (0, target_len - len(narration_mono)))

    else:

        narration_mono = narration_mono[:target_len]

    print("Running envelope follower and applying ducking factor...")

    envelope = np.zeros(target_len, dtype=np.float32)

    current = 0.0

    attack_coef = np.exp(-1.0 / (attack_s * target_sr))

    release_coef = np.exp(-1.0 / (release_s * target_sr))

    abs_vals = np.abs(narration_mono)

    for i in range(target_len):

        val = abs_vals[i]

        if val > current:

            current = val + attack_coef * (current - val)

        else:

            current = val + release_coef * (current - val)

        envelope[i] = current

    gain = np.ones(target_len, dtype=np.float32)

    for i in range(target_len):

        if envelope[i] > threshold:

            ratio = min(1.0, (envelope[i] - threshold) / 0.04)

            gain[i] = 1.0 - ratio * (1.0 - duck_factor)

    return bgm_audio * gain[:, np.newaxis]

def main():

    print("Loading block timings...")

    with open('block_timings.json', 'r', encoding='utf-8') as f:

        timings = json.load(f)

    durations = timings['durations']

    total_duration = timings['total_duration']

    print(f"Total target video duration: {total_duration:.2f}s across {len(durations)} blocks.")

    use_single_bgm = config_data.get('use_single_bgm', False)

    single_bgm = config_data.get('single_bgm', '')

    bgm_mode = str(config_data.get('bgm_mode', '') or '').lower()

    emotion_mappings = config_data.get('bgm_emotion_mappings', []) or []

    total_samples = int((total_duration + 5.0) * SR)

    bgm_audio = np.zeros((total_samples, 2), dtype=np.float32)

    if bgm_mode == 'emotion' and emotion_mappings:

        print("Emotion-based Soundtrack Mode active.")

        ordered = sorted(
            emotion_mappings,
            key=lambda m: float(m.get('start', 0) or 0),
        )

        for m in ordered:

            filename = m.get('file', '')

            if not filename or not os.path.exists(filename):

                print(f"Skipping emotion segment '{m.get('segment_id', '')}': missing file '{filename}'")

                continue

            start_s = float(m.get('start', 0) or 0)

            duration_s = float(m.get('duration', max(0.5, total_duration - start_s)) or 0.5)

            climax_mode = m.get('climax_mode', 'rise')

            print(
                f"Processing emotion segment {m.get('segment_id', '')}: "
                f"file='{filename}' | start={start_s:.2f}s | dur={duration_s:.2f}s | mode={climax_mode}"
            )

            start_offset_s = find_best_climax_start(filename, duration_s, mood=climax_mode)

            block_data = load_pcm_wrapped(filename, start_offset_s, duration_s).astype(np.float32)

            fade_in_len = min(int(2.0 * SR), len(block_data))

            if fade_in_len > 0:

                fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2

                block_data[:fade_in_len] *= fade_in_curve[:, np.newaxis]

            fade_out_len = min(int(2.5 * SR), len(block_data))

            if fade_out_len > 0:

                fade_out_start = len(block_data) - fade_out_len

                fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2

                block_data[fade_out_start:] *= fade_out_curve[:, np.newaxis]

            current_start_sample = int(start_s * SR)

            mix_end = current_start_sample + len(block_data)

            if mix_end > len(bgm_audio):

                pad_len = mix_end - len(bgm_audio)

                bgm_audio = np.concatenate([bgm_audio, np.zeros((pad_len, 2), dtype=np.float32)], axis=0)

            end_sample = min(mix_end, len(bgm_audio))

            actual_len = max(0, end_sample - current_start_sample)

            if actual_len > 0:

                bgm_audio[current_start_sample:end_sample] += block_data[:actual_len]

    elif use_single_bgm and single_bgm and os.path.exists(single_bgm):

        print(f"Single Soundtrack Mode active. Loading: {single_bgm}")

        target_dur = total_duration + 0.5

        # Find best starting point (climax)
        start_offset_s = find_best_climax_start(single_bgm, total_duration)
        bgm_audio_raw = load_pcm_wrapped(single_bgm, start_offset_s, target_dur).astype(np.float32)

        # Trim/pad to total_samples

        if len(bgm_audio_raw) > total_samples:

            bgm_audio_raw = bgm_audio_raw[:total_samples]

        elif len(bgm_audio_raw) < total_samples:

            pad = np.zeros((total_samples - len(bgm_audio_raw), 2), dtype=np.float32)

            bgm_audio_raw = np.concatenate([bgm_audio_raw, pad], axis=0)

        bgm_audio = bgm_audio_raw

        # Apply BGM fade-in (2.0s)

        fade_in_len = min(int(2.0 * SR), len(bgm_audio))

        fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2

        bgm_audio[:fade_in_len] *= fade_in_curve[:, np.newaxis]

    else:

        print("Block-by-block Soundtrack Mode active.")

        block_to_file = {}

        for m in MAPPINGS:

            try:

                block_to_file[int(m['block'])] = m['file']

            except (ValueError, KeyError, TypeError):

                pass

        ordered_mappings = []

        for idx in range(len(durations)):

            block_num = idx + 1

            filename = block_to_file.get(block_num, '')

            if not filename or not os.path.exists(filename):

                available = [f for f in os.listdir('.') if f.lower().endswith(('.mp3', '.wav')) and f.lower() not in ('narracao_mestra_premium.mp3', 'trilha_documentario.mp3', 'cinematic_drone.wav', '1.mp3', '2.mp3', '3.mp3')]

                if available:

                    filename = available[0]

                    print(f"Fallback: Block {block_num} has no mapping. Using: '{filename}'")

                else:

                    filename = 'cinematic_drone.wav'

                    print(f"Fallback: Block {block_num} using absolute fallback: 'cinematic_drone.wav'")

            ordered_mappings.append({'block': block_num, 'file': filename})

        cursors = {}

        for m in ordered_mappings:

            if m['file'] not in cursors:

                cursors[m['file']] = 0.0

        current_start_sample = 0

        for i, m in enumerate(ordered_mappings):

            block_num = m['block']

            filename = m['file']

            dur = durations[block_num - 1]

            is_last = (i == len(ordered_mappings) - 1)

            extract_dur = dur if is_last else (dur + CROSSFADE_SEC)

            extract_samples = int(extract_dur * SR)

            start_time_in_file = cursors[filename]

            print(f"Processing Block {block_num}: file='{filename}' | start={start_time_in_file:.2f}s | dur={dur:.2f}s")

            block_data = load_pcm_wrapped(filename, start_time_in_file, extract_dur).astype(np.float32)

            if len(block_data) > extract_samples:

                block_data = block_data[:extract_samples]

            elif len(block_data) < extract_samples:

                pad = np.zeros((extract_samples - len(block_data), 2), dtype=np.float32)

                block_data = np.concatenate([block_data, pad], axis=0)

            # Fades for blocks

            fade_in_len = min(CROSSFADE_SAMPLES, len(block_data))

            fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2

            block_data[:fade_in_len] *= fade_in_curve[:, np.newaxis]

            if not is_last:

                fade_out_start = int(dur * SR)

                fade_out_len = len(block_data) - fade_out_start

                if fade_out_len > 0:

                    fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2

                    block_data[fade_out_start:] *= fade_out_curve[:, np.newaxis]

            mix_end = current_start_sample + len(block_data)

            if mix_end > len(bgm_audio):

                # Extend BGM audio buffer if needed

                pad_len = mix_end - len(bgm_audio)

                bgm_audio = np.concatenate([bgm_audio, np.zeros((pad_len, 2), dtype=np.float32)], axis=0)

            bgm_audio[current_start_sample:mix_end] += block_data

            cursors[filename] += dur

            current_start_sample += int(dur * SR)

    # Apply strict background music volume scaling (0.10 = -20 dB below voiceover)

    print("Scaling background music volume...")

    music_volume = 0.10

    config_paths = [

        os.path.join('..', 'dashboard-qanat', 'backend', 'render_config_global.json'),

        os.path.join('..', '..', 'dashboard-qanat', 'backend', 'render_config_global.json'),

        os.path.join('dashboard-qanat', 'backend', 'render_config_global.json')

    ]

    for path in config_paths:

        if os.path.exists(path):

            try:

                with open(path, 'r', encoding='utf-8') as f:

                    global_config = json.load(f)

                music_volume = global_config.get('musicVolume', 0.15)

                # Scale 0.15 global volume to the 0.10 scale used here

                # Formula: music_volume = global_volume * (0.10 / 0.15)

                music_volume = music_volume * (0.10 / 0.15)

                print(f"Loaded global music volume: {music_volume:.3f} (scaled from global config)")

                break

            except Exception as e:

                print(f"Error loading global config: {e}")

    bgm_audio = bgm_audio * music_volume

    # Apply dynamic sidechain ducking under narration

    narration_file = "narracao_mestra_premium.mp3"

    bgm_audio = apply_sidechain_ducking(bgm_audio, narration_file, total_duration)

    # Mix Sound Effects (SFX) after BGM ducking so SFX stays clean and crisp

    if os.path.exists('sfx_timeline.json'):

        print("Mixing Sound Effects (SFX) into timeline...")

        try:

            with open('sfx_timeline.json', 'r', encoding='utf-8') as f:

                sfx_config = json.load(f)

            sfx_events = sfx_config.get('sfx_events', [])

            for event in sfx_events:

                sfx_file = event.get('file', '')

                time_s = event.get('time', 0.0)

                vol = event.get('volume', 0.18)

                if sfx_file and os.path.exists(sfx_file):

                    sfx_dur = get_duration(sfx_file)

                    print(f"  Mixing SFX '{sfx_file}' at {time_s:.2f}s (dur={sfx_dur:.2f}s, vol={vol})")

                    sfx_pcm = load_pcm(sfx_file, 0.0, sfx_dur).astype(np.float32)

                    start_sample = int(time_s * SR)

                    if start_sample < 0:

                        crop_samples = -start_sample

                        sfx_pcm = sfx_pcm[crop_samples:]

                        start_sample = 0

                    mix_len = min(len(sfx_pcm), len(bgm_audio) - start_sample)

                    if mix_len > 0:

                        # Add SFX to the BGM audio

                        bgm_audio[start_sample:start_sample+mix_len] += sfx_pcm[:mix_len] * vol

        except Exception as e:

            print(f"Warning: Failed to mix SFX: {e}")

    # Trim output audio to exactly the narration length + a tiny 0.5s safety padding

    final_len = int((total_duration + 0.5) * SR)

    bgm_audio = bgm_audio[:final_len]

    # Apply global fade-out (3.0s) at the very end of the video

    fade_out_len = int(3.0 * SR)

    if len(bgm_audio) > fade_out_len:

        fade_out_start = len(bgm_audio) - fade_out_len

        fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2

        bgm_audio[fade_out_start:] *= fade_out_curve[:, np.newaxis]

    # Prevent digital clipping and preserve the intended low background volumes

    # bgm_audio is on the raw scale [-32768, 32767]. We do NOT normalize/boost it to 0.89,

    # as that would override the configured BGM/SFX scaling and make it extremely loud.

    # We clip it to the 16-bit PCM range and cast directly.

    bgm_audio = np.clip(bgm_audio, -32768.0, 32767.0)

    output_audio_int16 = bgm_audio.astype(np.int16)

    print("Writing output to trilha_documentario.mp3...")

    write_pcm_to_mp3(output_audio_int16, "trilha_documentario.mp3")

    print("Soundtrack and SFX mixed and saved successfully!")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--detect-climax':
        if len(sys.argv) < 4:
            print("0.0")
            sys.exit(0)
        filename = sys.argv[2]
        duration = float(sys.argv[3])
        mood = sys.argv[4] if len(sys.argv) > 4 else 'peak'
        import numpy as np
        print(find_best_climax_start(filename, duration, mood=mood))
        sys.exit(0)
    main()
