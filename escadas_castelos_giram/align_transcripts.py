import json
import re

# Block start phrases to look for in the transcribed text
# Block start phrases to look for in the transcribed text - dynamically loaded
BLOCK_PHRASES = []

import os
if os.path.exists('config_qanat.json'):
    try:
        import json
        with open('config_qanat.json', 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        if 'block_phrases' in cfg:
            # We want to clean or trim these phrases, or take them directly.
            # To match the window logic, a shorter phrase of 4-6 words is ideal.
            # Let's take the first 4-6 words of the phrase.
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
    
    # 1. Output a formatted word_transcripts.json
    word_transcripts = []
    for idx, seg in enumerate(segments):
        words_list = []
        seg_start = seg['start']
        seg_end = seg['end']
        
        for w in seg.get('words', []):
            # Calculate relative timestamps
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
    print("Successfully wrote formatted word_transcripts.json.")
    
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
