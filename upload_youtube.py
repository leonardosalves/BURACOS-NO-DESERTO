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

def initiate_resumable_upload(access_token, video_path, title, description, privacy_status="private"):
    print("[INFO] Iniciando upload resumível no YouTube...")
    file_size = os.path.getsize(video_path)
    
    url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": str(file_size)
    }
    
    metadata = {
        "snippet": {
            "title": title,
            "description": description,
            "categoryId": "22"  # People & Blogs
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }
    
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

def upload_file_chunks(upload_url, video_path):
    print("[INFO] Enviando blocos de vídeo...")
    file_size = os.path.getsize(video_path)
    chunk_size = 10 * 1024 * 1024  # 10 MB chunks
    
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
        
    # Get Workspace Root
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
        
    # Get metadata
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
    
    print(f"[INFO] Título: {title}")
    
    if "upload_metadata" not in proj_config:
        proj_config["upload_metadata"] = {}
    if "youtube" not in proj_config["upload_metadata"]:
        proj_config["upload_metadata"]["youtube"] = {}
        
    proj_config["upload_metadata"]["youtube"]["status"] = "uploading"
    save_json(proj_config_path, proj_config)
    
    try:
        upload_url = initiate_resumable_upload(access_token, video_path, title, description, privacy)
        result = upload_file_chunks(upload_url, video_path)
        video_id = result.get("id")
        
        if video_id:
            print(f"[SUCESSO] Upload concluído com sucesso! ID do YouTube: {video_id}")
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
