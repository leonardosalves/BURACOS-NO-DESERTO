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