import os
import sys
import json

from lumiera_workspace import resolve_workspace, resolve_project_dir, resolve_output_video, resolve_platform_caption
import time
from playwright.sync_api import sync_playwright

def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Falha ao ler {os.path.basename(filepath)}: {e}")
        return None

def main():
    print("=== TIKTOK PLAYWRIGHT AUTOMATED UPLOADER ===")
    project_dir = resolve_project_dir()
    print(f"[INFO] Pasta do projeto: {project_dir}")
    video_override = os.environ.get("LUMIERA_UPLOAD_VIDEO", "").strip() or None
    video_path = resolve_output_video(project_dir, video_override)
    if not video_path:
        print("[ERROR] Nenhum arquivo de vídeo (.mp4) encontrado na pasta OUTPUT.")
        sys.exit(1)
    print(f"[INFO] Vídeo para upload: {os.path.basename(video_path)}")
    
    workspace_dir = resolve_workspace(project_dir)

    cookies_path = os.path.join(workspace_dir, "tiktok_cookies.json")
    
    if not os.path.exists(cookies_path):
        print("[ERROR] Sessão do TikTok não conectada. Por favor, conecte a conta no painel primeiro.")
        sys.exit(1)
        
    proj_config_path = os.path.join(project_dir, "config_qanat.json")
    proj_config = load_json(proj_config_path) or {}
    
    caption = resolve_platform_caption(project_dir, "tiktok", proj_config)

    print(f"[INFO] Legenda: {caption}")
    
    # We update status to 'uploading'
    if "upload_metadata" not in proj_config:
        proj_config["upload_metadata"] = {}
    if "tiktok" not in proj_config["upload_metadata"]:
        proj_config["upload_metadata"]["tiktok"] = {}
    proj_config["upload_metadata"]["tiktok"]["status"] = "uploading"
    save_json(proj_config_path, proj_config)
    
    with sync_playwright() as p:
        # Launch headful so user can see it on desktop if needed, or headless
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        
        print("[INFO] Carregando cookies de sessão salvos...")
        with open(cookies_path, 'r', encoding='utf-8') as f:
            cookies = json.load(f)
        context.add_cookies(cookies)
            
        page = context.new_page()
        
        print("[INFO] Acessando a página de upload do TikTok Studio...")
        page.goto("https://www.tiktok.com/tiktokstudio/upload?from=upload")
        page.wait_for_timeout(5000)
        
        if "login" in page.url:
            print("[ERROR] Sessão do TikTok expirada. Por favor, reconecte no painel.")
            if os.path.exists(cookies_path):
                os.remove(cookies_path)
            proj_config["upload_metadata"]["tiktok"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
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
            proj_config["upload_metadata"]["tiktok"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
            browser.close()
            sys.exit(1)
            
        print("[INFO] Aguardando processamento inicial do vídeo...")
        page.wait_for_timeout(10000)
        
        print("[INFO] Preenchendo a legenda...")
        try:
            editor_selector = 'div[contenteditable="true"]'
            page.wait_for_selector(editor_selector, timeout=20000)
            page.focus(editor_selector)
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.keyboard.type(caption)
            print("[INFO] Legenda preenchida.")
        except Exception as e:
            print(f"[WARNING] Falha ao preencher legenda: {e}")
            
        page.wait_for_timeout(5000)
        
        # Click publish
        print("[INFO] Clicando no botão Publicar...")
        try:
            # TikTok publish button selector
            publish_button = page.locator('button:has-text("Publicar"), button:has-text("Post")')
            publish_button.wait_for(state="visible", timeout=15000)
            publish_button.click()
            print("[SUCCESS] Botão de publicação clicado com sucesso!")
            page.wait_for_timeout(10000)
            
            proj_config["upload_metadata"]["tiktok"]["status"] = "success"
            save_json(proj_config_path, proj_config)
        except Exception as e:
            print(f"[ERROR] Falha ao clicar no botão Publicar: {e}")
            proj_config["upload_metadata"]["tiktok"]["status"] = "failed"
            save_json(proj_config_path, proj_config)
            browser.close()
            sys.exit(1)
            
        browser.close()

if __name__ == "__main__":
    main()
