"""Resolve Lumiera workspace and script paths for Desktop project folders."""
import os


def resolve_workspace(project_dir):
    """Find repo root with youtube_token.json / run_qanat_dashboard.bat."""
    env_ws = os.environ.get("LUMIERA_WORKSPACE", "").strip()
    if env_ws and os.path.isdir(env_ws):
        return os.path.abspath(env_ws)

    cur = os.path.abspath(project_dir)
    for _ in range(12):
        if os.path.isfile(os.path.join(cur, "youtube_token.json")):
            return cur
        if os.path.isfile(os.path.join(cur, "run_qanat_dashboard.bat")):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent

    return os.path.abspath(os.path.join(project_dir, "..", ".."))


def resolve_script(project_dir, script_name, workspace=None):
    workspace = workspace or resolve_workspace(project_dir)
    for candidate in (
        os.path.join(project_dir, script_name),
        os.path.join(workspace, script_name),
    ):
        if os.path.isfile(candidate):
            return candidate
    return None


def resolve_project_dir(argv=None, cwd=None):
    """Project folder for upload/render scripts — env wins over argv (Windows-safe)."""
    env_dir = os.environ.get("LUMIERA_PROJECT_DIR", "").strip()
    if env_dir and os.path.isdir(env_dir):
        return os.path.abspath(env_dir)
    argv = argv if argv is not None else __import__("sys").argv
    if len(argv) > 1 and argv[1].strip():
        return os.path.abspath(argv[1])
    if cwd:
        return os.path.abspath(cwd)
    return os.path.abspath(os.getcwd())


def resolve_output_video(project_dir, video_name=None):
    """Locate final mp4 under OUTPUT/ (prefers qanat_persa_video_final/)."""
    if video_name:
        safe_name = os.path.basename(str(video_name).strip())
        if safe_name:
            search_roots = [
                os.path.join(project_dir, "OUTPUT", "qanat_persa_video_final"),
                os.path.join(project_dir, "OUTPUT"),
            ]
            for root in search_roots:
                if not os.path.isdir(root):
                    continue
                direct = os.path.join(root, safe_name)
                if os.path.isfile(direct):
                    return direct
                for dirpath, _, files in os.walk(root):
                    if safe_name in files:
                        return os.path.join(dirpath, safe_name)

    output_dir = os.path.join(project_dir, "OUTPUT")
    if not os.path.exists(output_dir):
        return None

    import glob

    preferred_dir = os.path.join(output_dir, "qanat_persa_video_final")
    scan_roots = [preferred_dir, output_dir] if os.path.isdir(preferred_dir) else [output_dir]
    mp4_files = []
    for root in scan_roots:
        mp4_files.extend(glob.glob(os.path.join(root, "**", "*.mp4"), recursive=True))
        mp4_files.extend(glob.glob(os.path.join(root, "*.mp4")))
    mp4_files = list(dict.fromkeys(mp4_files))
    if not mp4_files:
        mp4_files = glob.glob(os.path.join(project_dir, "*.mp4"))
    if not mp4_files:
        return None
    for f in mp4_files:
        if os.path.basename(f) == "video_final_60fps.mp4":
            return f
    remotion_files = [f for f in mp4_files if "remotion_" in os.path.basename(f)]
    if remotion_files:
        remotion_files.sort(key=os.path.getmtime, reverse=True)
        return remotion_files[0]
    mp4_files.sort(key=os.path.getmtime, reverse=True)
    return mp4_files[0]


def _clean_upload_text(value):
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"", "unknown", "untitled", "sem título", "sem titulo", "none", "null"}:
        return ""
    return text


def _first_title_from_parsed(parsed):
    if not isinstance(parsed, dict):
        return ""
    title = _clean_upload_text(parsed.get("recommendedTitle"))
    if title:
        return title
    for item in parsed.get("titles") or []:
        if isinstance(item, dict):
            title = _clean_upload_text(item.get("text"))
        else:
            title = _clean_upload_text(item)
        if title:
            return title
    return ""


def resolve_youtube_upload_fields(project_dir, proj_config=None):
    """Merge upload_metadata, youtube_metadata_cache, storyboard — never empty/unknown title."""
    import json as _json

    config_path = os.path.join(project_dir, "config_qanat.json")
    if proj_config is None:
        proj_config = {}
        if os.path.isfile(config_path):
            try:
                with open(config_path, "r", encoding="utf-8", errors="ignore") as fh:
                    proj_config = _json.load(fh)
            except Exception:
                proj_config = {}

    upload_meta = (proj_config.get("upload_metadata") or {}).get("youtube") or {}

    cache_parsed = {}
    cache_path = os.path.join(project_dir, "youtube_metadata_cache.json")
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8", errors="ignore") as fh:
                cache_parsed = (_json.load(fh) or {}).get("parsed") or {}
        except Exception:
            cache_parsed = {}

    storyboard = {}
    storyboard_path = os.path.join(project_dir, "storyboard.json")
    if os.path.isfile(storyboard_path):
        try:
            with open(storyboard_path, "r", encoding="utf-8", errors="ignore") as fh:
                storyboard = _json.load(fh) or {}
        except Exception:
            storyboard = {}

    title = _clean_upload_text(upload_meta.get("title"))
    if not title:
        title = _first_title_from_parsed(cache_parsed)
    if not title and isinstance(storyboard.get("strategy"), dict):
        title = _clean_upload_text(storyboard["strategy"].get("title_main"))
    if not title:
        title = os.path.basename(project_dir)

    description = (
        _clean_upload_text(upload_meta.get("description"))
        or _clean_upload_text(cache_parsed.get("description"))
    )
    tags_raw = upload_meta.get("tags")
    if not tags_raw:
        tags_raw = cache_parsed.get("tags") or ""

    pinned = (
        _clean_upload_text(upload_meta.get("pinned_comment"))
        or _clean_upload_text(upload_meta.get("pinnedComment"))
        or _clean_upload_text(cache_parsed.get("pinnedComment"))
    )
    chapters = _clean_upload_text(upload_meta.get("chapters")) or _clean_upload_text(cache_parsed.get("chapters"))
    category_id = (
        upload_meta.get("category_id")
        or upload_meta.get("categoryId")
        or ("22" if (proj_config.get("video_format") == "SHORTS" or proj_config.get("aspect_ratio") == "9:16") else "27")
    )
    fmt = (proj_config.get("video_format") or "").upper()
    if fmt != "SHORTS" and os.path.join("videos curtos shorts") in project_dir.replace("\\", "/").lower():
        fmt = "SHORTS"

    return {
        "title": title[:100],
        "description": description,
        "privacy": upload_meta.get("privacy") or "private",
        "tags_raw": tags_raw,
        "category_id": str(category_id or "22"),
        "publish_at": upload_meta.get("publish_at") or upload_meta.get("publishAt"),
        "chapters": chapters,
        "pinned_comment": pinned,
        "default_language": upload_meta.get("default_language") or "pt",
        "thumbnail": upload_meta.get("thumbnail") or upload_meta.get("thumbnail_path"),
        "format": fmt,
    }