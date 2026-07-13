import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
import subprocess
import json
import glob

from lumiera_workspace import (
    resolve_workspace,
    resolve_script,
    resolve_project_dir,
    resolve_output_video,
    ensure_upload_metadata_in_config,
    classify_upload_format,
    YOUTUBE_SHORTS_MAX_DURATION_S,
)

def get_video_override():
    if len(sys.argv) > 3 and str(sys.argv[3]).strip():
        return str(sys.argv[3]).strip()
    return os.environ.get("LUMIERA_UPLOAD_VIDEO", "").strip() or None

def get_video_specs(video_path):
    print("[INFO] Analisando especificações do vídeo com ffprobe...")
    cmd = [
        "ffprobe", 
        "-v", "quiet", 
        "-print_format", "json", 
        "-show_streams", 
        "-show_format", 
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', check=True)
        data = json.loads(result.stdout)
        duration = float(data.get("format", {}).get("duration", 0))
        
        width, height = 0, 0
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                width = int(stream.get("width", 0))
                height = int(stream.get("height", 0))
                break
        return {
            "duration": duration,
            "width": width,
            "height": height
        }
    except Exception as e:
        print(f"[WARNING] Erro ao executar ffprobe: {e}. Usando estimativas fallback.")
        return None

def run_upload_script(script_name, project_dir):
    workspace = resolve_workspace(project_dir)
    script_path = resolve_script(project_dir, script_name, workspace)

    if not script_path:
        print(f"[ERROR] Script de upload {script_name} não encontrado.")
        print(f"[ERROR] Workspace Lumiera: {workspace}")
        return "NÃO ENCONTRADO"

    print(f"\n[INFO] Executando robô: {script_name} ({script_path})...")
    env = {**os.environ, "LUMIERA_WORKSPACE": workspace, "LUMIERA_PROJECT_DIR": project_dir}
    upload_video = os.environ.get("LUMIERA_UPLOAD_VIDEO", "").strip()
    if upload_video:
        env["LUMIERA_UPLOAD_VIDEO"] = upload_video
    cmd = [sys.executable, script_path, project_dir]
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', env=env)
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(f"  [{script_name}] {output.strip()}")
        rc = process.poll()
        if rc == 0:
            return "SUCESSO"
        else:
            return "FALHA"
    except Exception as e:
        print(f"[ERROR] Falha ao rodar script {script_name}: {e}")
        return "ERRO EXCEÇÃO"

def main():
    print("====================================================")
    print("        QANAT AUTOMATED MULTI-UPLOAD PIPELINE        ")
    print("====================================================")
    
    project_dir = resolve_project_dir()
    video_override = get_video_override()
    if video_override:
        os.environ["LUMIERA_UPLOAD_VIDEO"] = video_override
    video_path = resolve_output_video(project_dir, video_override)

    if not video_path:
        hint = f" (procurado: {video_override})" if video_override else ""
        print(f"[ERROR] Vídeo (.mp4) final não encontrado no projeto{hint}.")
        print(f"[ERROR] Pasta do projeto: {project_dir}")
        sys.exit(1)
        
    print(f"[INFO] Vídeo de Entrada: {os.path.basename(video_path)}")

    print("[INFO] Sincronizando metadados de upload no config_qanat.json...")
    ensure_upload_metadata_in_config(project_dir)

    # Parse selected platforms if passed as 2nd argument
    selected_platforms = []
    if len(sys.argv) > 2:
        selected_platforms = [p.strip().lower() for p in sys.argv[2].split(",") if p.strip()]
        print(f"[INFO] Plataformas selecionadas pelo usuário: {', '.join(selected_platforms)}")
        
    specs = get_video_specs(video_path)
    classification = classify_upload_format(project_dir, specs)
    is_short = classification["is_short"]

    if specs:
        duration = specs["duration"]
        width = specs["width"]
        height = specs["height"]
        print(f"[INFO] Especificações detectadas: {width}x{height} | Duração: {duration:.2f}s")
        if is_short:
            print(f"[INFO] Classificação: Vídeo CURTO / SHORTS ({classification['aspect_label']}) — fonte: {classification['source']}")
        else:
            print(f"[INFO] Classificação: Vídeo LONGO ({classification['aspect_label']}) — fonte: {classification['source']}")
        if height > width and duration > YOUTUBE_SHORTS_MAX_DURATION_S:
            print(f"[AVISO] Vertical com {duration:.1f}s (> {int(YOUTUBE_SHORTS_MAX_DURATION_S)}s): YouTube não trata como Short.")
    else:
        print("[WARNING] Não foi possível ler especificações. Inferindo tipo pelo projeto/config...")
        if is_short:
            print(f"[INFO] Classificação Inferida: Vídeo CURTO / SHORTS ({classification['aspect_label']})")
        else:
            print(f"[INFO] Classificação Inferida: Vídeo LONGO ({classification['aspect_label']})")

    # Define tasks/queues based on format and user selection
    all_possible_tasks = []
    if is_short:
        all_possible_tasks = [
            ("youtube", "YouTube Shorts", "upload_youtube.py"),
            ("instagram", "Instagram Reels", "upload_instagram.py"),
            ("tiktok", "TikTok", "upload_tiktok_playwright.py"),
            ("kwai", "Kwai", "upload_kwai_playwright.py")
        ]
    else:
        all_possible_tasks = [
            ("youtube", "YouTube Video", "upload_youtube.py")
        ]

    # Filter tasks based on selection
    tasks = []
    for key, label, script in all_possible_tasks:
        # If user specified platforms, only run selected ones
        if selected_platforms:
            if key in selected_platforms:
                tasks.append((label, script))
        else:
            tasks.append((label, script))

    if not tasks:
        print("[WARNING] Nenhuma plataforma correspondente ativa para upload.")
        sys.exit(0)

    # Run tasks and collect status reports
    reports = {}
    for label, script in tasks:
        print(f"\n>>> Agendando upload para {label}...")
        status = run_upload_script(script, project_dir)
        reports[label] = status
        
    print("\n" + "="*50)
    print("             RELATÓRIO FINAL DE UPLOADS")
    print("="*50)
    for label, status in reports.items():
        icon = "✅" if status == "SUCESSO" else "❌" if status in ("FALHA", "ERRO EXCEÇÃO") else "⚠️"
        print(f"  {icon} {label}: {status}")
    print("="*50)

    failed = [label for label, status in reports.items() if status != "SUCESSO"]
    if failed:
        print(f"[PIPELINE_ERROR] Falha no upload: {', '.join(failed)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
