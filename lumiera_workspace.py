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