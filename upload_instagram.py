import os
import sys
import json

from lumiera_workspace import resolve_workspace
import urllib.request
import urllib.parse
import urllib.error
import time
import glob
import mimetypes

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

def get_temp_public_url(video_path):
    print("[INFO] Fazendo upload temporário do vídeo para o file.io (necessário para a Graph API do Meta)...")
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    with open(video_path, "rb") as f:
        file_content = f.read()
        
    filename = os.path.basename(video_path)
    content_type = mimetypes.guess_type(video_path)[0] or 'video/mp4'
    
    body = []
    body.append(f"--{boundary}".encode('utf-8'))
    body.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode('utf-8'))
    body.append(f'Content-Type: {content_type}'.encode('utf-8'))
    body.append(b'')
    body.append(file_content)
    body.append(f"--{boundary}--".encode('utf-8'))
    body.append(b'')
    
    data = b'\r\n'.join(body)
    
    req = urllib.request.Request(
        "https://file.io/?expires=1d",
        data=data,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(data))
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            if res_body.get("success"):
                url = res_body.get("link")
                print(f"[SUCCESS] Link temporário gerado: {url}")
                return url
            else:
                print(f"[ERROR] Falha ao gerar link temporário: {res_body}")
                return None
    except Exception as e:
        print(f"[ERROR] Erro ao conectar ao file.io: {e}")
        return None

def create_media_container(ig_account_id, access_token, video_url, caption):
    print("[INFO] Criando container de mídia no Instagram (tipo REELS)...")
    url = f"https://graph.facebook.com/v19.0/{ig_account_id}/media"
    params = urllib.parse.urlencode({
        "media_type": "REELS",
        "video_url": video_url,
        "caption": caption,
        "access_token": access_token
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=params, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res.get("id")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Falha ao criar container: {e.read().decode('utf-8')}")
        return None

def check_container_status(container_id, access_token):
    url = f"https://graph.facebook.com/v19.0/{container_id}?fields=status_code,status&access_token={access_token}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res.get("status_code"), res.get("status")
    except Exception as e:
        print(f"[WARNING] Erro ao checar status do container: {e}")
        return "ERROR", str(e)

def publish_media(ig_account_id, access_token, container_id):
    print("[INFO] Publicando Reels no Instagram...")
    url = f"https://graph.facebook.com/v19.0/{ig_account_id}/media_publish"
    params = urllib.parse.urlencode({
        "creation_id": container_id,
        "access_token": access_token
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=params, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            return res.get("id")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] Falha ao publicar: {e.read().decode('utf-8')}")
        return None

def main():
    print("=== INSTAGRAM REELS UPLOADER ===")
    project_dir = get_project_dir()
    
    video_path = find_output_video(project_dir)
    if not video_path:
        print("[ERROR] Vídeo (.mp4) não encontrado na pasta OUTPUT.")
        sys.exit(1)
        
    workspace_dir = resolve_workspace(project_dir)

    secrets_path = os.path.join(workspace_dir, "instagram_secrets.json")
    secrets = load_json(secrets_path)
    
    if not secrets or not secrets.get("instagram_business_account_id") or not secrets.get("access_token"):
        print("[ERROR] Credenciais ou tokens do Instagram não configurados no workspace.")
        sys.exit(1)
        
    ig_account_id = secrets["instagram_business_account_id"]
    access_token = secrets["access_token"]
    
    # Metadata
    proj_config_path = os.path.join(project_dir, "config_qanat.json")
    proj_config = load_json(proj_config_path) or {}
    
    caption = os.path.basename(project_dir)
    storyboard_path = os.path.join(project_dir, "storyboard.json")
    storyboard = load_json(storyboard_path)
    if storyboard and storyboard.get("strategy"):
        caption = storyboard["strategy"].get("title_main", caption)
        
    upload_meta = proj_config.get("upload_metadata", {}).get("instagram", {})
    caption = upload_meta.get("title", caption)
    
    print(f"[INFO] Legenda: {caption}")
    
    if "upload_metadata" not in proj_config:
        proj_config["upload_metadata"] = {}
    if "instagram" not in proj_config["upload_metadata"]:
        proj_config["upload_metadata"]["instagram"] = {}
        
    proj_config["upload_metadata"]["instagram"]["status"] = "uploading"
    save_json(proj_config_path, proj_config)
    
    # 1. Get temporary public URL
    video_url = get_temp_public_url(video_path)
    if not video_url:
        print("[ERROR] Falha ao expor vídeo local temporariamente.")
        proj_config["upload_metadata"]["instagram"]["status"] = "failed"
        save_json(proj_config_path, proj_config)
        sys.exit(1)
        
    # 2. Create Media Container
    container_id = create_media_container(ig_account_id, access_token, video_url, caption)
    if not container_id:
        proj_config["upload_metadata"]["instagram"]["status"] = "failed"
        save_json(proj_config_path, proj_config)
        sys.exit(1)
        
    # 3. Poll status
    print("[INFO] Aguardando processamento da mídia no Instagram...")
    processing = True
    start_time = time.time()
    while processing:
        time.sleep(10)
        status_code, status = check_container_status(container_id, access_token)
        print(f"[STATUS] Código: {status_code} | Mensagem: {status}")
        
        if status_code == "FINISHED":
            processing = False
        elif status_code == "ERROR":
            print(f"[ERROR] Erro de processamento no Instagram: {status}")
            proj_config["upload_metadata"]["instagram"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
            sys.exit(1)
            
        if time.time() - start_time > 300: # 5 min timeout
            print("[ERROR] Timeout de processamento do vídeo no Instagram.")
            proj_config["upload_metadata"]["instagram"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
            sys.exit(1)
            
    # 4. Publish
    post_id = publish_media(ig_account_id, access_token, container_id)
    if post_id:
        print(f"[SUCESSO] Reels publicado com sucesso! ID do Post: {post_id}")
        proj_config["upload_metadata"]["instagram"]["status"] = "success"
        proj_config["upload_metadata"]["instagram"]["post_id"] = post_id
        save_json(proj_config_path, proj_config)
    else:
        print("[ERROR] Falha ao publicar Reels.")
        proj_config["upload_metadata"]["instagram"]["status"] = "failed"
        save_json(proj_config_path, proj_config)
        sys.exit(1)

if __name__ == "__main__":
    main()
