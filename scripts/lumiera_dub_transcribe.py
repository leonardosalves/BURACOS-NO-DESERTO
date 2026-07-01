"""Whisper transcription for Lumiera Dub — outputs JSON to stdout."""
import json
import sys

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: lumiera_dub_transcribe.py <audio_or_video> [language] [model]"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] not in ("auto", "") else None
    model_size = sys.argv[3] if len(sys.argv) > 3 else "base"

    import whisper

    model = whisper.load_model(model_size)
    kwargs = {"word_timestamps": True}
    if language:
        kwargs["language"] = language
    result = model.transcribe(audio_path, **kwargs)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()