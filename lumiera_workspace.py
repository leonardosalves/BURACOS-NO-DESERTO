"""Resolve Lumiera workspace and script paths for Desktop project folders."""
import os

# YouTube Shorts: vertical/square até 3 min (atualizado 2024)
YOUTUBE_SHORTS_MAX_DURATION_S = 180.0


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
    fmt = (proj_config.get("video_format") or proj_config.get("format_type") or "").upper()
    aspect = str(proj_config.get("aspect_ratio") or "").strip()
    if fmt not in ("SHORTS", "SHORT") and aspect == "9:16":
        fmt = "SHORTS"
    if fmt not in ("SHORTS", "SHORT") and "videos curtos shorts" in project_dir.replace("\\", "/").lower():
        fmt = "SHORTS"

    def _truthy_default(val, default=True):
        if val is None:
            return default
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() not in ("false", "0", "no", "nao", "não", "nao")

    default_lang = upload_meta.get("default_language") or upload_meta.get("defaultLanguage") or "pt-BR"
    default_audio = (
        upload_meta.get("default_audio_language")
        or upload_meta.get("defaultAudioLanguage")
        or default_lang
    )
    playlist_id = _clean_upload_text(upload_meta.get("playlist_id") or upload_meta.get("playlistId"))

    return {
        "title": title[:100],
        "description": description,
        "privacy": upload_meta.get("privacy") or "private",
        "tags_raw": tags_raw,
        "category_id": str(category_id or "22"),
        "publish_at": upload_meta.get("publish_at") or upload_meta.get("publishAt"),
        "chapters": chapters,
        "pinned_comment": pinned,
        "default_language": default_lang,
        "default_audio_language": default_audio,
        "contains_synthetic_media": _truthy_default(upload_meta.get("contains_synthetic_media"), True),
        "playlist_id": playlist_id,
        "thumbnail": upload_meta.get("thumbnail") or upload_meta.get("thumbnail_path"),
        "format": fmt,
    }


def _load_project_config(project_dir):
    import json as _json

    config_path = os.path.join(project_dir, "config_qanat.json")
    if not os.path.isfile(config_path):
        return {}, config_path
    try:
        with open(config_path, "r", encoding="utf-8", errors="ignore") as fh:
            return _json.load(fh) or {}, config_path
    except Exception:
        return {}, config_path


def _save_project_config(config_path, proj_config):
    import json as _json

    try:
        with open(config_path, "w", encoding="utf-8") as fh:
            _json.dump(proj_config, fh, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False


def resolve_platform_caption(project_dir, platform, proj_config=None):
    """Caption for instagram/tiktok/kwai — upload_metadata, YouTube fields, storyboard."""
    platform = (platform or "").strip().lower()
    if platform not in ("instagram", "tiktok", "kwai"):
        return os.path.basename(project_dir)

    if proj_config is None:
        proj_config, _ = _load_project_config(project_dir)

    upload_meta = (proj_config.get("upload_metadata") or {}).get(platform) or {}
    caption = _clean_upload_text(upload_meta.get("title"))
    if caption:
        return caption

    yt_fields = resolve_youtube_upload_fields(project_dir, proj_config)
    caption = _clean_upload_text(yt_fields.get("title"))
    if caption:
        return caption

    import json as _json

    storyboard_path = os.path.join(project_dir, "storyboard.json")
    if os.path.isfile(storyboard_path):
        try:
            with open(storyboard_path, "r", encoding="utf-8", errors="ignore") as fh:
                storyboard = _json.load(fh) or {}
            if isinstance(storyboard.get("strategy"), dict):
                caption = _clean_upload_text(storyboard["strategy"].get("title_main"))
                if caption:
                    return caption
        except Exception:
            pass

    return os.path.basename(project_dir)


def classify_upload_format(project_dir, specs=None, proj_config=None):
    """
    Classifica SHORTS vs vídeo longo para o pipeline de upload.
    Prioridade: config do projeto → ffprobe → pasta do projeto → fallback.
    """
    if proj_config is None:
        proj_config, _ = _load_project_config(project_dir)

    aspect = str(proj_config.get("aspect_ratio") or "").strip()
    fmt = str(proj_config.get("video_format") or proj_config.get("format_type") or "").upper()

    if fmt in ("SHORTS", "SHORT") or aspect == "9:16":
        return {"is_short": True, "source": "config", "aspect_label": "9:16"}
    if fmt in ("LONGO", "LONG") or aspect == "16:9":
        return {"is_short": False, "source": "config", "aspect_label": "16:9"}

    width = height = 0
    duration = 0.0
    if specs:
        width = int(specs.get("width") or 0)
        height = int(specs.get("height") or 0)
        duration = float(specs.get("duration") or 0)

    if width > 0 and height > 0:
        is_vertical = height > width
        is_horizontal = width > height
        if is_vertical and duration <= YOUTUBE_SHORTS_MAX_DURATION_S:
            return {"is_short": True, "source": "ffprobe", "aspect_label": "9:16"}
        if is_vertical:
            return {"is_short": False, "source": "ffprobe", "aspect_label": "9:16 (longo)"}
        if is_horizontal:
            return {"is_short": False, "source": "ffprobe", "aspect_label": "16:9"}
        if duration <= YOUTUBE_SHORTS_MAX_DURATION_S:
            return {"is_short": True, "source": "ffprobe", "aspect_label": "1:1"}

    path_lower = project_dir.replace("\\", "/").lower()
    if "videos curtos shorts" in path_lower or "/shorts/" in path_lower:
        return {"is_short": True, "source": "path", "aspect_label": "9:16"}

    return {"is_short": False, "source": "fallback", "aspect_label": "16:9"}


def ensure_upload_metadata_in_config(project_dir):
    """Backfill upload_metadata from IA cache/storyboard before multi-upload pipeline."""
    proj_config, config_path = _load_project_config(project_dir)
    if not config_path:
        return proj_config

    fields = resolve_youtube_upload_fields(project_dir, proj_config)
    if "upload_metadata" not in proj_config or not isinstance(proj_config["upload_metadata"], dict):
        proj_config["upload_metadata"] = {}

    yt_meta = proj_config["upload_metadata"].get("youtube")
    if not isinstance(yt_meta, dict):
        yt_meta = {}
        proj_config["upload_metadata"]["youtube"] = yt_meta

    updated = False
    yt_backfill = {
        "title": fields["title"],
        "description": fields["description"],
        "tags": fields["tags_raw"],
        "chapters": fields["chapters"],
        "pinned_comment": fields["pinned_comment"],
        "category_id": fields["category_id"],
    }
    for key, value in yt_backfill.items():
        if not value:
            continue
        current = yt_meta.get(key)
        if key == "tags":
            if not _clean_upload_text(current):
                yt_meta[key] = value
                updated = True
        elif not _clean_upload_text(current):
            yt_meta[key] = value
            updated = True

    social_caption = _clean_upload_text(fields.get("title")) or os.path.basename(project_dir)
    for platform in ("instagram", "tiktok", "kwai"):
        plat_meta = proj_config["upload_metadata"].get(platform)
        if not isinstance(plat_meta, dict):
            plat_meta = {}
            proj_config["upload_metadata"][platform] = plat_meta
        if not _clean_upload_text(plat_meta.get("title")):
            plat_meta["title"] = resolve_platform_caption(project_dir, platform, proj_config)
            if not _clean_upload_text(plat_meta["title"]):
                plat_meta["title"] = social_caption
            updated = True

    if updated:
        _save_project_config(config_path, proj_config)

    return proj_config