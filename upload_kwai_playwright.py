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
    print("=== KWAI PLAYWRIGHT AUTOMATED UPLOADER ===")
    project_dir = get_project_dir()
    print(f"[INFO] Pasta do projeto: {project_dir}")
    
    video_path = find_output_video(project_dir)
    if not video_path:
        print("[ERROR] Nenhum arquivo de vídeo (.mp4) encontrado na pasta OUTPUT.")
        sys.exit(1)
    print(f"[INFO] Vídeo para upload: {os.path.basename(video_path)}")
    
    workspace_dir = project_dir
    found_ws = False
    for _ in range(5):
        if os.path.exists(os.path.join(workspace_dir, "run_qanat_dashboard.bat")):
            found_ws = True
            break
        workspace_dir = os.path.dirname(workspace_dir)
    if not found_ws:
        workspace_dir = os.path.abspath(os.path.join(project_dir, "..", ".."))
        
    cookies_path = os.path.join(workspace_dir, "kwai_cookies.json")
    
    # Load metadata
    proj_config_path = os.path.join(project_dir, "config_qanat.json")
    proj_config = load_json(proj_config_path) or {}
    
    caption = os.path.basename(project_dir)
    storyboard_path = os.path.join(project_dir, "storyboard.json")
    storyboard = load_json(storyboard_path)
    if storyboard and storyboard.get("strategy"):
        caption = storyboard["strategy"].get("title_main", caption)
        
    upload_meta = proj_config.get("upload_metadata", {}).get("kwai", {})
    caption = upload_meta.get("title", caption)
    
    print(f"[INFO] Legenda: {caption}")
    
    with sync_playwright() as p:
        has_cookies = os.path.exists(cookies_path)
        
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
            print("\n[REQUIRED] Login do Kwai necessário.")
            print("[INFO] Abrindo página do Kwai Creator Studio...")
            #cp.kwai.com or creator.kwai.com
            page.goto("https://cp.kwai.com/")
            
            print("\n" + "="*70)
            print("  POR FAVOR, FAÇA LOGIN MANUALMENTE NA JANELA DO NAVEGADOR QUE SE ABRIU.")
            print("  Depois de logar com sucesso e ver o dashboard do Kwai Creator:")
            print("  Pressione [ENTER] aqui no terminal para salvar os cookies de sessão.")
            print("="*70 + "\n")
            
            input("Pressione Enter após logar para continuar...")
            
            cookies = context.cookies()
            with open(cookies_path, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, indent=2)
            print("[SUCCESS] Cookies de sessão do Kwai salvos!")
            
        print("[INFO] Acessando Kwai Creator Center...")
        page.goto("https://cp.kwai.com/new/upload")
        
        page.wait_for_timeout(5000)
        
        if "login" in page.url:
            print("[ERROR] Sessão expirada. Removendo cookies antigos do Kwai...")
            if os.path.exists(cookies_path):
                os.remove(cookies_path)
            browser.close()
            sys.exit(1)
            
        print("[INFO] Localizando seletor de arquivos...")
        try:
            page.wait_for_selector('input[type="file"]', timeout=30000)
            file_input = page.locator('input[type="file"]')
            file_input.set_input_files(video_path)
            print("[INFO] Arquivo de vídeo selecionado.")
        except Exception as e:
            print(f"[ERROR] Seletor de arquivos de upload não encontrado: {e}")
            browser.close()
            sys.exit(1)
            
        page.wait_for_timeout(8000)
        
        print("[INFO] Preenchendo a legenda no Kwai...")
        try:
            # Kwai caption input selector
            editor_selector = 'div[contenteditable="true"], textarea'
            page.wait_for_selector(editor_selector, timeout=20000)
            page.focus(editor_selector)
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.keyboard.type(caption)
            print("[INFO] Legenda preenchida.")
        except Exception as e:
            print(f"[WARNING] Falha ao preencher legenda automaticamente: {e}. Faça isso manualmente.")
            
        print("\n" + "="*70)
        print("  O vídeo e legenda foram carregados no Kwai Creator.")
        print("  Revise o vídeo e clique em 'Publicar' no navegador.")
        print("  Pressione [ENTER] aqui no terminal quando tiver concluído.")
        print("="*70 + "\n")
        
        input("Pressione Enter após postar o vídeo...")
        print("[SUCCESS] Upload no Kwai concluído!")
        browser.close()

if __name__ == "__main__":
    main()
