import os
import sys
import json
import time
from playwright.sync_api import sync_playwright

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

def find_output_video(project_dir):
    output_dir = os.path.join(project_dir, "OUTPUT")
    if not os.path.exists(output_dir):
        return None
    import glob
    mp4_files = glob.glob(os.path.join(output_dir, "**", "*.mp4"), recursive=True)
    if not mp4_files:
        mp4_files = glob.glob(os.path.join(project_dir, "*.mp4"))
    if not mp4_files:
        return None
    
    # Prioritize standard or newest
    for f in mp4_files:
        if os.path.basename(f) == "video_final_60fps.mp4":
            return f
    remotion_files = [f for f in mp4_files if "remotion_" in os.path.basename(f)]
    if remotion_files:
        remotion_files.sort(key=os.path.getmtime, reverse=True)
        return remotion_files[0]
    mp4_files.sort(key=os.path.getmtime, reverse=True)
    return mp4_files[0]

def main():
    print("=== TIKTOK PLAYWRIGHT AUTOMATED UPLOADER ===")
    project_dir = get_project_dir()
    print(f"[INFO] Pasta do projeto: {project_dir}")
    
    video_path = find_output_video(project_dir)
    if not video_path:
        print("[ERROR] Nenhum arquivo de vídeo (.mp4) encontrado na pasta OUTPUT.")
        sys.exit(1)
    print(f"[INFO] Vídeo para upload: {os.path.basename(video_path)}")
    
    # Determine workspace directory
    workspace_dir = project_dir
    found_ws = False
    for _ in range(5):
        if os.path.exists(os.path.join(workspace_dir, "run_qanat_dashboard.bat")):
            found_ws = True
            break
        workspace_dir = os.path.dirname(workspace_dir)
    if not found_ws:
        workspace_dir = os.path.abspath(os.path.join(project_dir, "..", ".."))
        
    cookies_path = os.path.join(workspace_dir, "tiktok_cookies.json")
    
    # Load metadata from config_qanat.json
    proj_config_path = os.path.join(project_dir, "config_qanat.json")
    proj_config = load_json(proj_config_path) or {}
    
    caption = os.path.basename(project_dir)
    storyboard_path = os.path.join(project_dir, "storyboard.json")
    storyboard = load_json(storyboard_path)
    if storyboard and storyboard.get("strategy"):
        caption = storyboard["strategy"].get("title_main", caption)
        
    upload_meta = proj_config.get("upload_metadata", {}).get("tiktok", {})
    caption = upload_meta.get("title", caption)
    
    print(f"[INFO] Legenda: {caption}")
    
    with sync_playwright() as p:
        # Check if cookies exist
        has_cookies = os.path.exists(cookies_path)
        
        # Launch browser. We run headless=False for login setup or visual feedback.
        # It's safer to run headless=False to avoid bot detection during upload.
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        
        if has_cookies:
            print("[INFO] Carregando cookies de sessão salvos...")
            with open(cookies_path, 'r', encoding='utf-8') as f:
                cookies = json.load(f)
            context.add_cookies(cookies)
            
        page = context.new_page()
        
        if not has_cookies:
            print("\n[REQUIRED] Login do TikTok necessário.")
            print("[INFO] Abrindo página de login...")
            page.goto("https://www.tiktok.com/login")
            
            print("\n" + "="*70)
            print("  POR FAVOR, FAÇA LOGIN MANUALMENTE NA JANELA DO NAVEGADOR QUE SE ABRIU.")
            print("  Depois de logar com sucesso e ver o feed do TikTok:")
            print("  Pressione [ENTER] aqui no terminal para salvar os cookies de sessão.")
            print("="*70 + "\n")
            
            input("Pressione Enter após logar para continuar...")
            
            # Save cookies
            cookies = context.cookies()
            with open(cookies_path, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, indent=2)
            print("[SUCCESS] Cookies de sessão salvos com sucesso!")
            
        print("[INFO] Acessando a página de upload do TikTok Studio...")
        page.goto("https://www.tiktok.com/tiktokstudio/upload?from=upload")
        
        # Wait for page to load
        page.wait_for_timeout(5000)
        
        # Check if login is still active, otherwise reset cookies
        if "login" in page.url:
            print("[ERROR] Sessão expirada. Removendo cookies antigos e solicitando login novamente...")
            if os.path.exists(cookies_path):
                os.remove(cookies_path)
            browser.close()
            sys.exit(1)
            
        print("[INFO] Localizando seletor de arquivos...")
        
        # Wait for file input and upload video
        try:
            # Look for file input
            page.wait_for_selector('input[type="file"]', timeout=30000)
            file_input = page.locator('input[type="file"]')
            file_input.set_input_files(video_path)
            print("[INFO] Arquivo de vídeo selecionado e enviado para o navegador.")
        except Exception as e:
            print(f"[ERROR] Não foi possível encontrar o seletor de arquivos de upload: {e}")
            browser.close()
            sys.exit(1)
            
        print("[INFO] Aguardando o carregamento e processamento do vídeo...")
        # Give some time for file parsing
        page.wait_for_timeout(10000)
        
        # Fill in the description/caption
        print("[INFO] Preenchendo a legenda...")
        try:
            # Locate the editor container or text field
            editor_selector = 'div[contenteditable="true"]'
            page.wait_for_selector(editor_selector, timeout=20000)
            # Clear editor if necessary and type caption
            page.focus(editor_selector)
            # We select all text and delete it
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.keyboard.type(caption)
            print("[INFO] Legenda preenchida.")
        except Exception as e:
            print(f"[WARNING] Falha ao preencher legenda automaticamente: {e}. Prossiga manualmente.")
            
        print("\n" + "="*70)
        print("  O vídeo e a legenda foram carregados no navegador.")
        print("  Por favor, revise o vídeo e clique em 'Publicar' (ou 'Post') na janela.")
        print("  Pressione [ENTER] aqui no terminal quando tiver concluído.")
        print("="*70 + "\n")
        
        input("Pressione Enter após postar o vídeo...")
        print("[SUCCESS] Upload concluído e finalizado!")
        browser.close()

if __name__ == "__main__":
    main()
