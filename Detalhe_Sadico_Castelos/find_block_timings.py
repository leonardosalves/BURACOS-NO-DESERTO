import whisper
import json
import re

# Let's define the first sentences to search for - dynamically loaded
BLOCK_KEYWORDS = []

# The actual start phrases in the user transcription - dynamically loaded
BLOCK_PHRASES = []

import os
if os.path.exists('config_qanat.json'):
    try:
        import json
        with open('config_qanat.json', 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        if 'block_phrases' in cfg:
            BLOCK_PHRASES = [(int(item['block']), item['phrase']) for item in cfg['block_phrases']]
            print("Loaded dynamic block phrases from config_qanat.json")
    except Exception as e:
        print("Warning: Failed to load block phrases from config_qanat.json:", e)

def clean_text(text):
    return re.sub(r'[^a-z0-9 ]', '', text.lower()).strip()

def main():
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    
    print("Transcribing narracao_mestra_premium.mp3...")
    result = model.transcribe(
        "narracao_mestra_premium.mp3",
        word_timestamps=True,
        language="pt"
    )
    
    segments = result['segments']
    
    # We will search the segments for each block start phrase
    block_starts = {}
    
    # Initialize list of search phrases
    search_phrases = [(b[0], clean_text(b[1])) for b in BLOCK_PHRASES]
    
    print("\nScanning Whisper segments for block starts...")
    for idx, segment in enumerate(segments):
        seg_text_clean = clean_text(segment['text'])
        # Also print segment text with start time for debugging
        print(f"[{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text']}")
        
        # Check if any search phrase is in this segment
        for block_num, phrase in search_phrases:
            if phrase in seg_text_clean or any(word in seg_text_clean for word in phrase.split()[:4]):
                # If we match, set the start time of the segment or first word
                if block_num not in block_starts:
                    # Look at words list if available to find exact first word start
                    words = segment.get('words', [])
                    if words:
                        # Find the word that matches the start of our phrase
                        # We can default to segment start
                        block_starts[block_num] = words[0]['start']
                    else:
                        block_starts[block_num] = segment['start']
                    print(f"--> Found BLOCK {block_num} start at {block_starts[block_num]:.2f}s!")
                    
    # Save transcription data
    with open("whisper_raw_transcript.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
        
    print("\nDetected Block Starts:")
    for b in sorted(block_starts.keys()):
        print(f"Block {b}: {block_starts[b]:.2f}s")
        
if __name__ == '__main__':
    main()
