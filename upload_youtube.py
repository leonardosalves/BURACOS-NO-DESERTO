import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
import json
import urllib.request
import urllib.parse
import urllib.error
import glob

from lumiera_workspace import (
    resolve_workspace,
    resolve_project_dir,
    resolve_output_video,
    resolve_youtube_upload_fields,
)

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


def verify_youtube_quality_gate(project_dir, video_path):
    if os.environ.get("LUMIERA_ALLOW_UNVERIFIED_UPLOAD", "").strip() == "1":
        print("[AVISO] Quality Gate ignorado por override administrativo.")
        return True

    report_path = os.path.join(project_dir, "youtube_quality_gate.json")
    report = load_json(report_path)
    if not report:
        print("[ERROR] Quality Gate ausente. Execute a auditoria na aba Upload.")
        return False
    if not report.get("ready"):
        count = report.get("blockingCount") or 1
        print(f"[ERROR] Quality Gate bloqueado por {count} problema(s).")
        return False

    audited = report.get("video") or {}
    try:
        audited_path = os.path.abspath(audited.get("path") or "")
        same_path = (
            os.path.normcase(audited_path) == os.path.normcase(os.path.abspath(video_path))
            or (os.path.exists(audited_path) and os.path.samefile(audited_path, video_path))
        )
        same_size = int(audited.get("size") or -1) == int(os.path.getsize(video_path))
        same_mtime = abs(float(audited.get("mtimeMs") or -1) - (os.path.getmtime(video_path) * 1000.0)) < 2000
    except Exception:
        same_path = same_size = same_mtime = False

    if not (same_path and same_size and same_mtime):
        print("[ERROR] O vídeo mudou depois da auditoria. Execute o Quality Gate novamente.")
        return False

    print(f"[INFO] Quality Gate aprovado: nota {report.get('score', '?')}/100.")
    return True



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

def update_video_metadata(
    access_token,
    video_id,
    title,
    description,
    tags=None,
    category_id="22",
    default_language="pt-BR",
    default_audio_language="pt-BR",
    contains_synthetic_media=True,
):
    print(f"[INFO] Atualizando metadados do vídeo {video_id} no YouTube...")
    url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,status"
    snippet = {
        "title": title[:100],
        "description": description or "",
        "categoryId": str(category_id or "22"),
        "defaultLanguage": default_language,
        "defaultAudioLanguage": default_audio_language,
    }
    if tags:
        snippet["tags"] = tags[:30]
    body = {
        "id": video_id,
        "snippet": snippet,
        "status": {
            "containsSyntheticMedia": bool(contains_synthetic_media),
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req) as response:
            json.loads(response.read().decode("utf-8"))
            print("[SUCESSO] Metadados atualizados no YouTube.")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[ERROR] Falha ao atualizar metadados: {err_msg}")
        raise

def build_description(description, chapters_text="", is_short=False):
    base = (description or "").strip()
    if is_short:
        chapters = ""
        if "#shorts" not in base.lower():
            base = f"{base}\n\n#Shorts".strip() if base else "#Shorts"
    else:
        chapters = (chapters_text or "").strip()
        if chapters and chapters not in base:
            base = f"{base}\n\n{chapters}".strip()
    return base


def ensure_shorts_tags(tags, is_short=False):
    if not is_short:
        return tags
    out = list(tags or [])
    lower = {str(t).strip().lower() for t in out}
    if "shorts" not in lower:
        out.append("Shorts")
    return out

def add_video_to_playlist(access_token, playlist_id, video_id):
    playlist_id = str(playlist_id or "").strip()
    if not playlist_id or not video_id:
        return False
    print(f"[INFO] Adicionando vídeo à playlist {playlist_id}...")
    url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet"
    body = {
        "snippet": {
            "playlistId": playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": video_id,
            },
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as response:
            response.read()
            print("[SUCESSO] Vídeo adicionado à playlist.")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[AVISO] Falha ao adicionar à playlist (vídeo já está no ar): {err_msg}")
        return False
    except Exception as e:
        print(f"[AVISO] Erro ao adicionar à playlist: {e}")
        return False


def initiate_resumable_upload(
    access_token,
    video_path,
    title,
    description,
    privacy_status="private",
    tags=None,
    category_id="22",
    publish_at=None,
    default_language="pt-BR",
    default_audio_language="pt-BR",
    contains_synthetic_media=True,
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
        "defaultAudioLanguage": default_audio_language,
    }
    if tags:
        snippet["tags"] = tags[:30]

    status = {
        "privacyStatus": privacy_status,
        "selfDeclaredMadeForKids": False,
        "containsSyntheticMedia": bool(contains_synthetic_media),
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
    file_size = os.path.getsize(video_path)
    file_size_mb = file_size / (1024 * 1024)
    chunk_size = 10 * 1024 * 1024
    total_chunks = (file_size + chunk_size - 1) // chunk_size
    print(f"[INFO] Enviando vídeo ({file_size_mb:.1f} MB) em {total_chunks} blocos de 10 MB...", flush=True)

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
                    uploaded_bytes += chunk_len
                    percent = int(uploaded_bytes / file_size * 100)
                    sent_mb = uploaded_bytes / (1024 * 1024)
                    print(f"[PROGRESSO] {percent}%", flush=True)
                    print(f"[INFO] Enviado {sent_mb:.1f} / {file_size_mb:.1f} MB", flush=True)
                    return json.loads(res_body)
            except urllib.error.HTTPError as e:
                if e.code == 308:
                    uploaded_bytes += chunk_len
                    percent = int(uploaded_bytes / file_size * 100)
                    sent_mb = uploaded_bytes / (1024 * 1024)
                    print(f"[PROGRESSO] {percent}%", flush=True)
                    print(f"[INFO] Enviado {sent_mb:.1f} / {file_size_mb:.1f} MB", flush=True)
                    continue
                else:
                    err_msg = e.read().decode('utf-8')
                    print(f"[ERROR] Falha no envio do bloco {content_range}: {err_msg}", flush=True)
                    raise

def main():
    print("=== YOUTUBE RESUMABLE UPLOADER ===")
    project_dir = resolve_project_dir()
    video_override = os.environ.get("LUMIERA_UPLOAD_VIDEO", "").strip() or None
    video_path = resolve_output_video(project_dir, video_override)
    if not video_path:
        print("[ERROR] Vídeo (.mp4) não encontrado na pasta OUTPUT.")
        sys.exit(1)

    workspace_dir = resolve_workspace(project_dir)

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

    fix_video_id = os.environ.get("LUMIERA_FIX_VIDEO_ID", "").strip()
    if len(sys.argv) > 2 and str(sys.argv[2]).strip() == "--fix-metadata":
        fix_video_id = str(sys.argv[3]).strip() if len(sys.argv) > 3 else fix_video_id

    if not fix_video_id and not verify_youtube_quality_gate(project_dir, video_path):
        sys.exit(1)

    fields = resolve_youtube_upload_fields(project_dir, proj_config)
    is_short = str(fields.get("format") or "").upper() in ("SHORTS", "SHORT")
    title = fields["title"]
    description = build_description(
        fields["description"],
        fields["chapters"],
        is_short=is_short,
    )
    privacy = fields["privacy"]
    if privacy != "private":
        print("[INFO] Publicação segura ativa: primeiro envio alterado para PRIVADO.")
        privacy = "private"
    tags = ensure_shorts_tags(parse_tags(fields["tags_raw"]), is_short=is_short)
    category_id = fields["category_id"]
    publish_at = fields["publish_at"]
    pinned_comment = fields["pinned_comment"]
    default_language = fields["default_language"]
    default_audio_language = fields.get("default_audio_language") or default_language
    contains_synthetic_media = bool(fields.get("contains_synthetic_media", True))
    playlist_id = str(fields.get("playlist_id") or "").strip()
    upload_meta = (proj_config.get("upload_metadata") or {}).get("youtube") or {}

    if not title or title.lower() == "unknown":
        print("[ERROR] Título inválido. Salve metadados na aba Upload ou gere em IA · Metadados.")
        sys.exit(1)

    if fix_video_id:
        try:
            update_video_metadata(
                access_token,
                fix_video_id,
                title,
                description,
                tags=tags,
                category_id=category_id,
                default_language=default_language,
                default_audio_language=default_audio_language,
                contains_synthetic_media=contains_synthetic_media,
            )
            thumb_path = resolve_thumbnail_path(project_dir, {**upload_meta, "thumbnail": fields.get("thumbnail")})
            if thumb_path:
                set_video_thumbnail(access_token, fix_video_id, thumb_path)
            if playlist_id:
                add_video_to_playlist(access_token, playlist_id, fix_video_id)
            if pinned_comment:
                post_pinned_comment(access_token, fix_video_id, pinned_comment)
            if "upload_metadata" not in proj_config:
                proj_config["upload_metadata"] = {}
            if "youtube" not in proj_config["upload_metadata"]:
                proj_config["upload_metadata"]["youtube"] = {}
            proj_config["upload_metadata"]["youtube"].update({
                "title": title,
                "description": fields["description"],
                "tags": fields["tags_raw"],
                "chapters": fields["chapters"],
                "pinned_comment": pinned_comment,
                "category_id": category_id,
                "post_id": fix_video_id,
                "status": "success",
            })
            save_json(proj_config_path, proj_config)
            print(f"[SUCESSO] Metadados reaplicados no vídeo {fix_video_id}")
            return
        except Exception as e:
            print(f"[ERROR] Falha ao corrigir metadados: {e}")
            sys.exit(1)

    print(f"[INFO] Título: {title}")
    if description:
        print(f"[INFO] Descrição: {len(description)} caracteres")
    if tags:
        print(f"[INFO] Tags: {', '.join(tags[:8])}{'...' if len(tags) > 8 else ''}")
    if publish_at:
        print(f"[INFO] Agendado para: {publish_at}")
    print(f"[INFO] Idioma: {default_language} | Uso de IA declarado: {'Sim' if contains_synthetic_media else 'Não'}")
    if playlist_id:
        print(f"[INFO] Playlist alvo: {playlist_id}")

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
            default_audio_language=default_audio_language,
            contains_synthetic_media=contains_synthetic_media,
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
            if playlist_id:
                add_video_to_playlist(access_token, playlist_id, video_id)
            # Comentário fixo: postUploadService (Node) após o pipeline — evita duplicata
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
