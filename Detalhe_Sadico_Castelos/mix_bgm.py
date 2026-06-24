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
        
        # Ensure sizes are exactly matching expected shapes
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

def main():
    print("Loading block timings...")
    with open('block_timings.json', 'r', encoding='utf-8') as f:
        timings = json.load(f)
    durations = timings['durations']
    total_duration = timings['total_duration']
    
    print(f"Total target video duration: {total_duration:.2f}s across {len(durations)} blocks.")
    
    use_single_bgm = config_data.get('use_single_bgm', False)
    single_bgm = config_data.get('single_bgm', '')
    
    if use_single_bgm and single_bgm and os.path.exists(single_bgm):
        print(f"Single Soundtrack Mode active. Using: {single_bgm}")
        # Mix single audio file to match total duration + 0.5s safety padding
        target_duration = total_duration + 0.5
        audio = load_pcm_wrapped(single_bgm, 0.0, target_duration).astype(np.float32)
        
        # Apply fade-in (2.0s)
        fade_in_len = min(int(2.0 * SR), len(audio))
        fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2
        fade_in_curve = fade_in_curve[:, np.newaxis]
        audio[:fade_in_len] *= fade_in_curve
        
        # Apply fade-out (3.0s) at the end
        fade_out_len = min(int(3.0 * SR), len(audio))
        if len(audio) > fade_out_len:
            fade_out_start = len(audio) - fade_out_len
            fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2
            fade_out_curve = fade_out_curve[:, np.newaxis]
            audio[fade_out_start:] *= fade_out_curve
            
        # Normalize
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = (audio / max_val) * 0.89
            
        output_audio_int16 = (audio * 32767).astype(np.int16)
        print("Writing output to trilha_documentario.mp3...")
        write_pcm_to_mp3(output_audio_int16, "trilha_documentario.mp3")
        print("Single soundtrack mixed and saved successfully!")
        return

    # Block-by-block music mapping
    print("Block-by-block Soundtrack Mode active.")
    block_to_file = {}
    for m in MAPPINGS:
        try:
            block_to_file[int(m['block'])] = m['file']
        except (ValueError, KeyError, TypeError):
            pass
            
    # Reconstruct mapping in correct sequential order (1 to num_blocks)
    ordered_mappings = []
    for idx in range(len(durations)):
        block_num = idx + 1
        filename = block_to_file.get(block_num, '')
        
        # Fallback if file doesn't exist
        if not filename or not os.path.exists(filename):
            # Check for any valid mp3/wav files in active directory
            available = [f for f in os.listdir('.') if f.lower().endswith(('.mp3', '.wav')) and f.lower() not in ('narracao_mestra_premium.mp3', 'trilha_documentario.mp3', 'cinematic_drone.wav', '1.mp3', '2.mp3', '3.mp3')]
            if available:
                filename = available[0]
                print(f"Fallback: Block {block_num} has no mapping or missing file. Using: '{filename}'")
            else:
                filename = 'cinematic_drone.wav'
                print(f"Fallback: Block {block_num} using absolute fallback: 'cinematic_drone.wav'")
        
        ordered_mappings.append({'block': block_num, 'file': filename})

    total_samples = int((total_duration + 5.0) * SR)
    output_audio = np.zeros((total_samples, 2), dtype=np.float32)
    
    cursors = {} # track current playback time in each file
    for m in ordered_mappings:
        if m['file'] not in cursors:
            cursors[m['file']] = 0.0
            
    current_start_sample = 0
    
    for i, m in enumerate(ordered_mappings):
        block_num = m['block']
        filename = m['file']
        dur = durations[block_num - 1]
        
        is_last = (i == len(ordered_mappings) - 1)
        
        # We extract dur + CROSSFADE_SEC samples (unless it is the last block)
        extract_dur = dur if is_last else (dur + CROSSFADE_SEC)
        extract_samples = int(extract_dur * SR)
        
        start_time_in_file = cursors[filename]
        print(f"Processing Block {block_num}: file='{filename}' | start={start_time_in_file:.2f}s | dur={dur:.2f}s | extract={extract_dur:.2f}s")
        
        block_data = load_pcm_wrapped(filename, start_time_in_file, extract_dur).astype(np.float32)
        
        # Make sure size matches extract_samples exactly
        if len(block_data) > extract_samples:
            block_data = block_data[:extract_samples]
        elif len(block_data) < extract_samples:
            pad = np.zeros((extract_samples - len(block_data), 2), dtype=np.float32)
            block_data = np.concatenate([block_data, pad], axis=0)
            
        # Apply fades
        # Fade-in (if not block 1)
        if i > 0:
            fade_in_len = min(CROSSFADE_SAMPLES, len(block_data))
            fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2
            fade_in_curve = fade_in_curve[:, np.newaxis]
            block_data[:fade_in_len] *= fade_in_curve
        else:
            # Block 1 fade-in from absolute 0 to avoid abrupt start
            fade_in_len = min(CROSSFADE_SAMPLES, len(block_data))
            fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2
            fade_in_curve = fade_in_curve[:, np.newaxis]
            block_data[:fade_in_len] *= fade_in_curve
            
        # Fade-out (if not last)
        if not is_last:
            fade_out_start = int(dur * SR)
            fade_out_len = len(block_data) - fade_out_start
            if fade_out_len > 0:
                fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2
                fade_out_curve = fade_out_curve[:, np.newaxis]
                block_data[fade_out_start:] *= fade_out_curve
        else:
            # Last block fade-out at the very end (last 3.0s)
            fade_out_len = int(3.0 * SR)
            if len(block_data) > fade_out_len:
                fade_out_start = len(block_data) - fade_out_len
                fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2
                fade_out_curve = fade_out_curve[:, np.newaxis]
                block_data[fade_out_start:] *= fade_out_curve
                
        # Mix into main buffer
        mix_end = current_start_sample + len(block_data)
        output_audio[current_start_sample:mix_end] += block_data
        
        # Advance file cursor by the actual duration of the block
        cursors[filename] += dur
        # Advance output write position by actual duration of the block
        current_start_sample += int(dur * SR)

    # Mix Sound Effects (SFX) if timeline exists
    if os.path.exists('sfx_timeline.json'):
        print("Mixing Sound Effects (SFX) into timeline...")
        try:
            with open('sfx_timeline.json', 'r', encoding='utf-8') as f:
                sfx_config = json.load(f)
            sfx_events = sfx_config.get('sfx_events', [])
            
            for event in sfx_events:
                sfx_file = event.get('file', '')
                time_s = event.get('time', 0.0)
                vol = event.get('volume', 0.2)
                
                if sfx_file and os.path.exists(sfx_file):
                    sfx_dur = get_duration(sfx_file)
                    print(f"  Mixing SFX '{sfx_file}' at {time_s:.2f}s (dur={sfx_dur:.2f}s, vol={vol})")
                    
                    sfx_pcm = load_pcm(sfx_file, 0.0, sfx_dur).astype(np.float32)
                    
                    start_sample = int(time_s * SR)
                    if start_sample < 0:
                        crop_samples = -start_sample
                        sfx_pcm = sfx_pcm[crop_samples:]
                        start_sample = 0
                        
                    mix_len = min(len(sfx_pcm), len(output_audio) - start_sample)
                    if mix_len > 0:
                        output_audio[start_sample:start_sample+mix_len] += sfx_pcm[:mix_len] * vol
        except Exception as e:
            print(f"Warning: Failed to mix SFX: {e}")

    # Trim output audio to exactly the narration length + a tiny 0.5s safety padding
    final_len = int((total_duration + 0.5) * SR)
    output_audio = output_audio[:final_len]
    
    # Normalize volume to avoid clipping but keep it punchy
    max_val = np.max(np.abs(output_audio))
    if max_val > 0:
        # Scale to max peak of -1dB (approx 0.89)
        output_audio = (output_audio / max_val) * 0.89
        
    # Convert back to 16-bit integer PCM
    output_audio_int16 = (output_audio * 32767).astype(np.int16)
    
    print("Writing output to trilha_documentario.mp3...")
    write_pcm_to_mp3(output_audio_int16, "trilha_documentario.mp3")
    print("Soundtrack mixed and saved successfully!")

if __name__ == '__main__':
    main()
