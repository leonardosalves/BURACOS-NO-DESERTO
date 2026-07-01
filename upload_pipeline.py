import os
import sys
import subprocess
import json
import glob

def get_project_dir():
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    return os.path.abspath(os.getcwd())

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
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
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
    script_path = os.path.join(project_dir, script_name)
    if not os.path.exists(script_path):
        script_path = os.path.join(os.path.dirname(project_dir), script_name)
    if not os.path.exists(script_path):
        script_path = os.path.abspath(os.path.join(project_dir, "..", "..", script_name))
        
    if not os.path.exists(script_path):
        print(f"[ERROR] Script de upload {script_name} não encontrado.")
        return "NÃO ENCONTRADO"
        
    print(f"\n[INFO] Executando robô: {script_name}...")
    cmd = [sys.executable, script_path, project_dir]
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
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
    
    project_dir = get_project_dir()
    video_path = find_output_video(project_dir)
    
    if not video_path:
        print("[ERROR] Vídeo (.mp4) final não encontrado no projeto.")
        sys.exit(1)
        
    print(f"[INFO] Vídeo de Entrada: {os.path.basename(video_path)}")
    
    # Parse selected platforms if passed as 2nd argument
    selected_platforms = []
    if len(sys.argv) > 2:
        selected_platforms = [p.strip().lower() for p in sys.argv[2].split(",") if p.strip()]
        print(f"[INFO] Plataformas selecionadas pelo usuário: {', '.join(selected_platforms)}")
        
    specs = get_video_specs(video_path)
    is_short = True
    
    if specs:
        duration = specs["duration"]
        width = specs["width"]
        height = specs["height"]
        print(f"[INFO] Especificações detectadas: {width}x{height} | Duração: {duration:.2f}s")
        if height > width and duration <= 90.0:
            is_short = True
            print("[INFO] Classificação: Vídeo CURTO / SHORTS (9:16)")
        else:
            is_short = False
            print("[INFO] Classificação: Vídeo LONGO / HORIZONTAL (16:9)")
    else:
        print("[WARNING] Não foi possível ler especificações. Inferindo tipo...")
        if "videos curtos" in project_dir.lower() or "shorts" in project_dir.lower():
            is_short = True
            print("[INFO] Classificação Inferida: Vídeo CURTO / SHORTS")
        else:
            is_short = False
            print("[INFO] Classificação Inferida: Vídeo LONGO")

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

if __name__ == "__main__":
    main()
