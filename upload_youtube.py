import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import glob

def get_project_dir():
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    return os.path.abspath(os.getcwd())

def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Falha ao ler {os.path.basename(filepath)}: {e}")
        return None

def save_json(filepath, data):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[ERROR] Falha ao salvar {os.path.basename(filepath)}: {e}")
        return False

def find_output_video(project_dir):
    output_dir = os.path.join(project_dir, "OUTPUT")
    if not os.path.exists(output_dir):
        return None
    mp4_files = glob.glob(os.path.join(output_dir, "**", "*.mp4"), recursive=True)
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

def refresh_access_token(client_id, client_secret, refresh_token):
    print("[INFO] Atualizando token de acesso do YouTube...")
    url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")

    req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["access_token"]
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[ERROR] Falha ao atualizar token de acesso: {err_msg}")
        return None
    except Exception as e:
        print(f"[ERROR] Erro ao autenticar: {e}")
        return None

def parse_tags(raw):
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if str(t).strip()]
    if not raw:
        return []
    return [t.strip() for t in str(raw).replace(";", ",").split(",") if t.strip()]

def build_description(description, chapters_text=""):
    base = (description or "").strip()
    chapters = (chapters_text or "").strip()
    if not chapters:
        return base
    if chapters in base:
        return base
    return f"{base}\n\n{chapters}".strip()

def initiate_resumable_upload(
    access_token,
    video_path,
    title,
    description,
    privacy_status="private",
    tags=None,
    category_id="22",
    publish_at=None,
    default_language="pt",
):
    print("[INFO] Iniciando upload resumível no YouTube...")
    file_size = os.path.getsize(video_path)

    url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": str(file_size)
    }

    snippet = {
        "title": title,
        "description": description,
        "categoryId": str(category_id or "22"),
        "defaultLanguage": default_language,
    }
    if tags:
        snippet["tags"] = tags[:30]

    status = {
        "privacyStatus": privacy_status,
        "selfDeclaredMadeForKids": False,
    }

    if publish_at:
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at

    metadata = {"snippet": snippet, "status": status}

    req = urllib.request.Request(
        url,
        data=json.dumps(metadata).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            return response.getheader("Location")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[ERROR] Falha ao iniciar upload no YouTube: {err_msg}")
        raise
    except Exception as e:
        print(f"[ERROR] Falha de rede: {e}")
        raise

def resolve_thumbnail_path(project_dir, upload_meta):
    thumb_rel = upload_meta.get("thumbnail") or upload_meta.get("thumbnail_path")
    if not thumb_rel:
        return None
    candidates = [
        os.path.join(project_dir, thumb_rel),
        os.path.join(project_dir, "ASSETS", thumb_rel),
        os.path.join(project_dir, "ASSETS", "youtube_thumbnails", os.path.basename(thumb_rel)),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None

def set_video_thumbnail(access_token, video_id, thumbnail_path):
    print(f"[INFO] Enviando thumbnail customizada: {os.path.basename(thumbnail_path)}")
    url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={video_id}"
    ext = os.path.splitext(thumbnail_path)[1].lower()
    content_type = "image/png" if ext == ".png" else "image/jpeg"

    with open(thumbnail_path, "rb") as image_file:
        image_data = image_file.read()

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": content_type,
        "Content-Length": str(len(image_data)),
    }

    req = urllib.request.Request(url, data=image_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            response.read()
            print("[SUCESSO] Thumbnail aplicada no vídeo do YouTube.")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[AVISO] Falha ao enviar thumbnail (vídeo já está no ar): {err_msg}")
        return False
    except Exception as e:
        print(f"[AVISO] Erro ao enviar thumbnail: {e}")
        return False

def post_pinned_comment(access_token, video_id, comment_text):
    if not comment_text or not str(comment_text).strip():
        return False
    print("[INFO] Publicando comentário fixo...")
    url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet"
    payload = {
        "snippet": {
            "videoId": video_id,
            "topLevelComment": {
                "snippet": {"textOriginal": str(comment_text).strip()[:10000]}
            }
        }
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            response.read()
            print("[SUCESSO] Comentário publicado (fixe manualmente no YouTube Studio se necessário).")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"[AVISO] Falha ao publicar comentário: {err_msg}")
        return False
    except Exception as e:
        print(f"[AVISO] Erro ao publicar comentário: {e}")
        return False

def upload_file_chunks(upload_url, video_path):
    print("[INFO] Enviando blocos de vídeo...")
    file_size = os.path.getsize(video_path)
    chunk_size = 10 * 1024 * 1024

    uploaded_bytes = 0
    with open(video_path, "rb") as f:
        while uploaded_bytes < file_size:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            chunk_len = len(chunk)
            content_range = f"bytes {uploaded_bytes}-{uploaded_bytes + chunk_len - 1}/{file_size}"

            headers = {
                "Content-Length": str(chunk_len),
                "Content-Range": content_range,
                "Content-Type": "video/mp4"
            }

            req = urllib.request.Request(
                upload_url,
                data=chunk,
                headers=headers,
                method="PUT"
            )

            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode("utf-8")
                    percent = int((uploaded_bytes + chunk_len) / file_size * 100)
                    print(f"[PROGRESSO] {percent}%")
                    return json.loads(res_body)
            except urllib.error.HTTPError as e:
                if e.code == 308:
                    uploaded_bytes += chunk_len
                    percent = int(uploaded_bytes / file_size * 100)
                    print(f"[PROGRESSO] {percent}%")
                    continue
                else:
                    err_msg = e.read().decode('utf-8')
                    print(f"[ERROR] Falha no envio do bloco {content_range}: {err_msg}")
                    raise

def main():
    print("=== YOUTUBE RESUMABLE UPLOADER ===")
    project_dir = get_project_dir()

    video_path = find_output_video(project_dir)
    if not video_path:
        print("[ERROR] Vídeo (.mp4) não encontrado na pasta OUTPUT.")
        sys.exit(1)

    workspace_dir = project_dir
    found_ws = False
    for _ in range(5):
        if os.path.exists(os.path.join(workspace_dir, "run_qanat_dashboard.bat")):
            found_ws = True
            break
        workspace_dir = os.path.dirname(workspace_dir)
    if not found_ws:
        workspace_dir = os.path.abspath(os.path.join(project_dir, "..", ".."))

    secrets_path = os.path.join(workspace_dir, "youtube_client_secrets.json")
    token_path = os.path.join(workspace_dir, "youtube_token.json")

    secrets = load_json(secrets_path)
    token = load_json(token_path)

    if not secrets or not token:
        print("[ERROR] Credenciais ou tokens do YouTube não configurados no workspace.")
        sys.exit(1)

    access_token = refresh_access_token(
        secrets["client_id"],
        secrets["client_secret"],
        token["refresh_token"]
    )
    if not access_token:
        print("[ERROR] Falha de autenticação com o YouTube.")
        sys.exit(1)

    proj_config_path = os.path.join(project_dir, "config_qanat.json")
    proj_config = load_json(proj_config_path) or {}

    title = os.path.basename(project_dir)
    description = ""
    privacy = "private"

    storyboard_path = os.path.join(project_dir, "storyboard.json")
    storyboard = load_json(storyboard_path)
    if storyboard and storyboard.get("strategy"):
        title = storyboard["strategy"].get("title_main", title)

    upload_meta = proj_config.get("upload_metadata", {}).get("youtube", {})
    title = upload_meta.get("title", title)
    description = upload_meta.get("description", description)
    privacy = upload_meta.get("privacy", privacy)
    tags = parse_tags(upload_meta.get("tags"))
    category_id = upload_meta.get("category_id") or upload_meta.get("categoryId") or "22"
    publish_at = upload_meta.get("publish_at") or upload_meta.get("publishAt")
    chapters = upload_meta.get("chapters") or ""
    pinned_comment = upload_meta.get("pinned_comment") or upload_meta.get("pinnedComment") or ""
    default_language = upload_meta.get("default_language") or "pt"

    description = build_description(description, chapters)

    print(f"[INFO] Título: {title}")
    if tags:
        print(f"[INFO] Tags: {', '.join(tags[:8])}{'...' if len(tags) > 8 else ''}")
    if publish_at:
        print(f"[INFO] Agendado para: {publish_at}")

    if "upload_metadata" not in proj_config:
        proj_config["upload_metadata"] = {}
    if "youtube" not in proj_config["upload_metadata"]:
        proj_config["upload_metadata"]["youtube"] = {}

    proj_config["upload_metadata"]["youtube"]["status"] = "uploading"
    save_json(proj_config_path, proj_config)

    try:
        upload_url = initiate_resumable_upload(
            access_token,
            video_path,
            title,
            description,
            privacy,
            tags=tags,
            category_id=category_id,
            publish_at=publish_at,
            default_language=default_language,
        )
        result = upload_file_chunks(upload_url, video_path)
        video_id = result.get("id")

        if video_id:
            print(f"[SUCESSO] Upload concluído com sucesso! ID do YouTube: {video_id}")
            print(f"[POST_UPLOAD] video_id={video_id}")
            thumb_path = resolve_thumbnail_path(project_dir, upload_meta)
            if thumb_path:
                set_video_thumbnail(access_token, video_id, thumb_path)
            else:
                print("[INFO] Nenhuma thumbnail selecionada em upload_metadata.youtube.thumbnail")
            if pinned_comment:
                post_pinned_comment(access_token, video_id, pinned_comment)
            proj_config["upload_metadata"]["youtube"]["status"] = "success"
            proj_config["upload_metadata"]["youtube"]["post_id"] = video_id
            save_json(proj_config_path, proj_config)
        else:
            print("[ERROR] Upload finalizado mas ID não retornado.")
            proj_config["upload_metadata"]["youtube"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Falha ao enviar vídeo: {e}")
        proj_config["upload_metadata"]["youtube"]["status"] = "failed"
        save_json(proj_config_path, proj_config)
        sys.exit(1)

if __name__ == "__main__":
    main()