import json
import re

# Keywords for highlighting in Gold (case-insensitive)
HIGHLIGHT_KEYWORDS = []
SUBTITLE_CORRECTIONS = {}

# Color codes
COLOR_GOLD = "00C5FF"      # Gold/Yellow BGR hex for active keywords
SUB_PATH = 'subs.ass'
COLOR_WATER = "FFE080"     # Water Blue BGR hex for active regular words
COLOR_WHITE = "FFFFFF"     # White BGR hex for normal text

import os
impact_texts_offsets = []

if os.path.exists('config_qanat.json'):
    try:
        with open('config_qanat.json', 'r', encoding='utf-8') as f:
            _config = json.load(f)
        HIGHLIGHT_KEYWORDS = _config.get('highlight_keywords', [])
        SUBTITLE_CORRECTIONS = _config.get('subtitle_corrections', {}) or {}
        
        _raw_impacts = _config.get('impact_texts', [])
        # We need absolute times here if possible, or offsets. The new format usually gives block and offsets.
        # This standalone script lacks block timing context, so we'll just parse whatever we can, or leave empty.
        print("Loaded dynamic config from config_qanat.json")
    except Exception as e:
        print("Warning: Failed to load config:", e)

def to_ass_time(sec):
    """Convert seconds float to ASS timestamp format H:MM:SS.cs"""
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

def repair_mojibake(text):
    """Repair common UTF-8 text that was accidentally decoded as latin-1/cp1252."""
    if not isinstance(text, str) or ("Ã" not in text and "Â" not in text):
        return text
    try:
        repaired = text.encode("latin1").decode("utf-8")
        if repaired.count("Ã") + repaired.count("Â") < text.count("Ã") + text.count("Â"):
            return repaired
    except UnicodeError:
        pass
    return text

def preserve_case(source, replacement):
    if source.isupper():
        return replacement.upper()
    if source[:1].isupper():
        return replacement[:1].upper() + replacement[1:]
    return replacement

def clean_subtitle_word(word):
    """Fix encoding glitches and optional project-specific Portuguese corrections."""
    if not isinstance(word, str):
        return word

    leading = re.match(r'^\s*', word).group(0)
    trailing = re.search(r'\s*$', word).group(0)
    core = word[len(leading):len(word) - len(trailing) if trailing else len(word)]
    core = repair_mojibake(core)

    match = re.match(r'^([^\wÀ-ÿ]*)(.*?)([^\wÀ-ÿ]*)$', core, flags=re.UNICODE)
    if not match:
        return leading + core + trailing

    prefix, token, suffix = match.groups()
    replacement = SUBTITLE_CORRECTIONS.get(token.lower())
    if replacement:
        token = preserve_case(token, str(replacement))

    return leading + prefix + token + suffix + trailing

def generate_dynamic_subs():
    with open('word_transcripts.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    ass_content = [
        "[Script Info]",
        "Title: Qanat Documentary Dynamic Subtitles",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "WrapStyle: 0",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        # Default styling: size 48 white, black outline, bottom-center alignment
        "Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,30,30,80,1",
        # Impact styling: size 72 Gold, thick outline, middle-center alignment
        "Style: Impact,Arial,72,&H0000C5FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,5,30,30,30,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
    ]
    
    events = []
    max_words_per_chunk = 4  # Keep subtitle lines extremely short and clean!
    
    # Generate word-by-word dynamic events inside small chunks
    for item in data:
        segment_start = item['start_time']
        words = item['words']
        
        # If Whisper found no word timestamps, fallback to a standard static segment
        if not words:
            fallback_text = item.get('text', '')
            fallback_text = repair_mojibake(fallback_text)
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
            
        # Group words into chunks of up to 4 words
        chunks = [words[i:i+max_words_per_chunk] for i in range(0, len(words), max_words_per_chunk)]
        
        for chunk in chunks:
            n_c = len(chunk)
            for i in range(n_c):
                active_word = chunk[i]
                w_start = segment_start + active_word['start']
                
                # Determine end time to avoid visual gaps or flickering
                if i < n_c - 1:
                    w_end = segment_start + chunk[i+1]['start']
                else:
                    w_end = segment_start + active_word['end']
                
                # Construct the chunk text with the current word active
                line_parts = []
                for j in range(n_c):
                    w_dict = chunk[j]
                    w_text = clean_subtitle_word(w_dict['word'])
                    
                    if j == i:
                        # Determine active color
                        color = COLOR_GOLD if is_keyword(w_text) else COLOR_WATER
                        # Style: Active color, opaque (\1a&H00&), scaled up size (\fs58)
                        # Check leading space
                        if w_text.startswith(" "):
                            line_parts.append(f" {{\\c&H{color}&}}{{\\1a&H00&}}{{\\fs58}}{w_text[1:]}{{\\c&H{COLOR_WHITE}&}}{{\\1a&H44&}}{{\\fs48}}")
                        else:
                            line_parts.append(f"{{\\c&H{color}&}}{{\\1a&H00&}}{{\\fs58}}{w_text}{{\\c&H{COLOR_WHITE}&}}{{\\1a&H44&}}{{\\fs48}}")
                    else:
                        line_parts.append(w_text)
                        
                # Join words and prepend default style (translucent white, size 48)
                full_text = "".join(line_parts)
                full_line = f"{{\\1a&H44&}}{{\\fs48}}{full_text}"
                
                # Append Dialogue event
                events.append(f"Dialogue: 0,{to_ass_time(w_start)},{to_ass_time(w_end)},Default,,0,0,0,,{full_line}")
            
    # Add large Texts of Impact (Impact style center screen) at specific times
    impact_texts = []
    
    for start_t, end_t, text in impact_texts:
        start = to_ass_time(start_t)
        end = to_ass_time(end_t)
        events.append(f"Dialogue: 0,{start},{end},Impact,,0,0,0,,{text}")
        
    with open(SUB_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(ass_content) + "\n" + "\n".join(events) + "\n")
        
    print(f"ASS dynamic subtitles file successfully saved to {SUB_PATH}.")

if __name__ == '__main__':
    generate_dynamic_subs()
