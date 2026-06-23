import json
import re

# Block start phrases to look for in the transcribed text
# Block start phrases to look for in the transcribed text - dynamically loaded
BLOCK_PHRASES = []

import os
if os.path.exists('storyboard.json'):
    try:
        import json
        with open('storyboard.json', 'r', encoding='utf-8') as f:
            sb = json.load(f)
        if 'visual_prompts' in sb:
            block_to_phrase = {}
            for vp in sb['visual_prompts']:
                block_num = vp.get('block')
                if block_num and block_num not in block_to_phrase:
                    text = vp.get('narration_text', '')
                    if text:
                        phrase_words = text.split()
                        short_phrase = " ".join(phrase_words[:5])
                        block_to_phrase[block_num] = short_phrase
            BLOCK_PHRASES = sorted([(k, v) for k, v in block_to_phrase.items()], key=lambda x: x[0])
            print("Loaded dynamic block phrases from storyboard.json")
    except Exception as e:
        print("Warning: Failed to load from storyboard.json:", e)

if not BLOCK_PHRASES and os.path.exists('config_qanat.json'):
    try:
        import json
        with open('config_qanat.json', 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        if 'block_phrases' in cfg:
            BLOCK_PHRASES = []
            for item in cfg['block_phrases']:
                phrase_words = item['phrase'].split()
                short_phrase = " ".join(phrase_words[:5])
                BLOCK_PHRASES.append((int(item['block']), short_phrase))
            print("Loaded dynamic block phrases from config_qanat.json")
    except Exception as e:
        print("Warning: Failed to load block phrases from config_qanat.json:", e)

def clean_word(w):
    return re.sub(r'[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', w).lower()

def main():
    with open("whisper_raw_transcript.json", "r", encoding="utf-8") as f:
        raw_data = json.load(f)
        
    segments = raw_data['segments']
    
    # 1. Load correct narration script lines
    correct_lines = None
    if os.path.exists('transcripts_readable.txt'):
        try:
            with open('transcripts_readable.txt', 'r', encoding='utf-8') as f:
                correct_lines = [line.strip() for line in f if line.strip()]
            if correct_lines:
                print(f"Loaded {len(correct_lines)} lines from transcripts_readable.txt for alignment")
        except Exception as e:
            print("Warning: Failed to load transcripts_readable.txt:", e)
            
    if not correct_lines and os.path.exists('storyboard.json'):
        try:
            with open('storyboard.json', 'r', encoding='utf-8') as f:
                sb = json.load(f)
            if 'visual_prompts' in sb:
                correct_lines = []
                for vp in sb['visual_prompts']:
                    text = vp.get('narration_text', '') or vp.get('text_overlay', '')
                    if text:
                        correct_lines.append(text.strip())
                if correct_lines:
                    print(f"Loaded {len(correct_lines)} segments from storyboard.json visual_prompts for alignment")
        except Exception as e:
            print("Warning: Failed to load storyboard.json narration:", e)

    # 1a. If correct script loaded, align correct words with Whisper timestamps!
    if correct_lines:
        import difflib
        
        # Build flat list of correct words preserving original punctuation/casing
        flat_correct_words = []
        for line_idx, line in enumerate(correct_lines):
            # Split sentence into words, keeping punctuation but splitting by spaces
            words = line.split()
            for w in words:
                flat_correct_words.append({
                    "word": w,
                    "sentence_idx": line_idx,
                    "start": None,
                    "end": None
                })
                
        # Build flat list of Whisper words with absolute timestamps
        flat_whisper_words = []
        for seg in segments:
            for w in seg.get('words', []):
                flat_whisper_words.append({
                    "word": w['word'],
                    "start": w['start'],
                    "end": w['end']
                })
                
        # If no words in whisper, fallback to segment timings distributed over segment texts
        if not flat_whisper_words:
            # Let's synthesize some word timings based on segment durations
            for seg in segments:
                seg_start = seg['start']
                seg_end = seg['end']
                seg_words = seg['text'].split()
                n_sw = len(seg_words)
                if n_sw > 0:
                    dur = seg_end - seg_start
                    for k, sw in enumerate(seg_words):
                        flat_whisper_words.append({
                            "word": sw,
                            "start": seg_start + k * (dur / n_sw),
                            "end": seg_start + (k + 1) * (dur / n_sw)
                        })

        # Normalize words for SequenceMatcher comparison
        A_clean = [re.sub(r'[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', w['word']).lower() for w in flat_correct_words]
        B_clean = [re.sub(r'[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]', '', w['word']).lower() for w in flat_whisper_words]
        
        matcher = difflib.SequenceMatcher(None, A_clean, B_clean)
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                for k in range(i2 - i1):
                    flat_correct_words[i1 + k]['start'] = flat_whisper_words[j1 + k]['start']
                    flat_correct_words[i1 + k]['end'] = flat_whisper_words[j1 + k]['end']
            elif tag == 'replace':
                n_A = i2 - i1
                n_B = j2 - j1
                start_val = flat_whisper_words[j1]['start']
                end_val = flat_whisper_words[j2 - 1]['end']
                dur = end_val - start_val
                for k in range(n_A):
                    flat_correct_words[i1 + k]['start'] = start_val + k * (dur / n_A)
                    flat_correct_words[i1 + k]['end'] = start_val + (k + 1) * (dur / n_A)
            elif tag == 'delete':
                # Missed words in Whisper. Interpolate using nearby matched words or segment boundaries.
                n_A = i2 - i1
                
                # Find last valid start before i1
                left_time = 0.0
                for k in range(i1 - 1, -1, -1):
                    if flat_correct_words[k]['end'] is not None:
                        left_time = flat_correct_words[k]['end']
                        break
                        
                # Find first valid start after i2 - 1
                right_time = segments[-1]['end'] if segments else 100.0
                for k in range(i2, len(flat_correct_words)):
                    if flat_correct_words[k]['start'] is not None:
                        right_time = flat_correct_words[k]['start']
                        break
                        
                if right_time < left_time:
                    right_time = left_time + 1.0
                    
                dur = right_time - left_time
                for k in range(n_A):
                    flat_correct_words[i1 + k]['start'] = left_time + k * (dur / n_A)
                    flat_correct_words[i1 + k]['end'] = left_time + (k + 1) * (dur / n_A)
                    
        # Group correct words back into segments/lines
        word_transcripts = []
        for line_idx, line_text in enumerate(correct_lines):
            seg_words = [w for w in flat_correct_words if w['sentence_idx'] == line_idx]
            if not seg_words:
                continue
                
            # Guarantee monotonicity in timings
            starts_sorted = sorted([w['start'] for w in seg_words])
            ends_sorted = sorted([w['end'] for w in seg_words])
            
            for k in range(len(seg_words)):
                s = starts_sorted[k]
                e = ends_sorted[k]
                if e <= s:
                    e = s + 0.15
                seg_words[k]['start'] = s
                seg_words[k]['end'] = e
                
            # The start/end of the segment is defined by its words
            seg_start = seg_words[0]['start']
            seg_end = seg_words[-1]['end']
            
            # Format word entries (adding a space prefix for non-first words if not already present)
            words_formatted = []
            for k, w in enumerate(seg_words):
                w_text = w['word']
                if k > 0 and not w_text.startswith(" ") and not w_text.startswith("-"):
                    w_text = " " + w_text
                words_formatted.append({
                    "word": w_text,
                    "start": max(0.0, w['start'] - seg_start),
                    "end": max(0.0, w['end'] - seg_start)
                })
                
            word_transcripts.append({
                "index": line_idx + 1,
                "filename": f"segment_{line_idx+1:03d}.mp3",
                "start_time": seg_start,
                "duration": max(0.1, seg_end - seg_start),
                "end_time": seg_end,
                "words": words_formatted,
                "text": line_text
            })
            
        with open("word_transcripts.json", "w", encoding="utf-8") as f:
            json.dump(word_transcripts, f, ensure_ascii=False, indent=4)
        print("Successfully aligned and wrote corrected word_transcripts.json!")
        
    else:
        # Fallback to the original logic if no correct script found
        print("No correct narration script found. Falling back to raw Whisper transcript.")
        word_transcripts = []
        for idx, seg in enumerate(segments):
            words_list = []
            seg_start = seg['start']
            seg_end = seg['end']
            
            for w in seg.get('words', []):
                rel_start = max(0.0, w['start'] - seg_start)
                rel_end = max(0.0, w['end'] - seg_start)
                words_list.append({
                    "word": w['word'],
                    "start": rel_start,
                    "end": rel_end
                })
                
            word_transcripts.append({
                "index": idx + 1,
                "filename": f"segment_{idx+1:03d}.mp3",
                "start_time": seg_start,
                "duration": seg_end - seg_start,
                "end_time": seg_end,
                "words": words_list,
                "text": seg['text']
            })
            
        with open("word_transcripts.json", "w", encoding="utf-8") as f:
            json.dump(word_transcripts, f, ensure_ascii=False, indent=4)
        print("Successfully wrote raw word_transcripts.json.")
    
    # 2. Build flat list of all words with absolute timestamps
    flat_words = []
    for seg in segments:
        for w in seg.get('words', []):
            flat_words.append({
                "word": w['word'],
                "clean": clean_word(w['word']),
                "start": w['start'],
                "end": w['end']
            })
            
    # Search for block starts
    block_starts = {}
    
    # Block 1 starts at 0.0s
    block_starts[1] = 0.0
    
    # Search phrases
    # We clean each word in the search phrases
    for block_num, phrase in BLOCK_PHRASES:
        if block_num == 1:
            continue
            
        phrase_words = [clean_word(x) for x in phrase.split()]
        n_p = len(phrase_words)
        
        # We slide a window over flat_words to find the best match
        best_idx = -1
        best_score = 0
        
        for i in range(len(flat_words) - n_p + 1):
            score = 0
            for j in range(n_p):
                if flat_words[i+j]['clean'] == phrase_words[j]:
                    score += 1
            if score > best_score:
                best_score = score
                best_idx = i
                
        # If we found a decent match (at least 60% of words matched)
        if best_score >= max(2, int(n_p * 0.6)):
            block_starts[block_num] = flat_words[best_idx]['start']
            print(f"Block {block_num} start matched: '{phrase}' at {block_starts[block_num]:.3f}s (matched {best_score}/{n_p} words)")
        else:
            print(f"WARNING: Could not find reliable match for Block {block_num}: '{phrase}'")
            # Fallback based on relative position if match fails
            
    # Print out Python code to copy-paste into build_video.py and build_video_destacado.py
    print("\nTIMELINE CODE GENERATION:")
    print("====================================")
    
    # Let's compute durations of each block based on starts
    num_blocks = max(b[0] for b in BLOCK_PHRASES) if BLOCK_PHRASES else 12
    starts = [0.0] * (num_blocks + 1)
    for b in range(1, num_blocks + 1):
        starts[b] = block_starts.get(b, 0.0)
    # The end of the last block is the end of the last segment
    starts.append(segments[-1]['end'])
    
    durations = {}
    for b in range(1, num_blocks + 1):
        durations[b] = starts[b+1] - starts[b]
        print(f"Block {b}: {starts[b]:.2f}s - {starts[b+1]:.2f}s (duration: {durations[b]:.2f}s)")
        
    print("\nPaste this block timeline info:")
    print("------------------------------------")
    # Write a JSON file with durations for automatic reading by the build scripts
    with open("block_timings.json", "w", encoding="utf-8") as f:
        json.dump({
            "starts": starts[1:num_blocks + 1],
            "durations": [durations[b] for b in range(1, num_blocks + 1)],
            "total_duration": starts[-1]
        }, f, ensure_ascii=False, indent=4)
    print("Wrote block_timings.json.")

if __name__ == '__main__':
    main()
