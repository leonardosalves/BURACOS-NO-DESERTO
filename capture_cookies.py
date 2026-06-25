import os
import sys
import json
from playwright.sync_api import sync_playwright

def main():
    if len(sys.argv) < 2:
        print("[ERROR] Plataforma não especificada. Use: python capture_cookies.py [tiktok|kwai]")
        sys.exit(1)
        
    platform = sys.argv[1].lower()
    
    # Determine workspace directory (parent of parent or find run_qanat_dashboard.bat)
    workspace_dir = os.path.abspath(os.getcwd())
    found_ws = False
    for _ in range(5):
        if os.path.exists(os.path.join(workspace_dir, "run_qanat_dashboard.bat")):
            found_ws = True
            break
        workspace_dir = os.path.dirname(workspace_dir)
    if not found_ws:
        workspace_dir = os.path.abspath(os.getcwd())
        
    cookies_path = os.path.join(workspace_dir, f"{platform}_cookies.json")
    
    print(f"[INFO] Iniciando navegador Playwright para {platform.upper()}...")
    
    with sync_playwright() as p:
        # Launch headful browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        if platform == "tiktok":
            print("[INFO] Acessando página de login do TikTok...")
            page.goto("https://www.tiktok.com/login")
        elif platform == "kwai":
            print("[INFO] Acessando página de login do Kwai...")
            page.goto("https://cp.kwai.com/")
        else:
            print(f"[ERROR] Plataforma inválida: {platform}")
            browser.close()
            sys.exit(1)
            
        print("\n" + "="*80)
        print(f"  POR FAVOR, REALIZE O LOGIN NA JANELA DO NAVEGADOR DO {platform.upper()}.")
        print("  Assim que estiver logado e visualizar o painel inicial/feed:")
        print("  Feche a janela do navegador. O script salvará os cookies automaticamente!")
        print("="*80 + "\n")
        
        # Wait for browser to be closed by user or context to close
        try:
            while browser.is_connected() and len(browser.contexts) > 0:
                page.wait_for_timeout(1000)
        except Exception:
            pass # Browser closed
            
        # Try to save cookies if context is still active or retrieve from context before fully closing
        try:
            cookies = context.cookies()
            if cookies:
                with open(cookies_path, 'w', encoding='utf-8') as f:
                    json.dump(cookies, f, indent=2)
                print(f"[SUCESSO] Cookies de sessão de {platform.upper()} salvos com sucesso!")
            else:
                print("[WARNING] Nenhum cookie encontrado ou sessão vazia.")
        except Exception as e:
            print(f"[ERROR] Erro ao obter cookies: {e}")
            
        try:
            browser.close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
