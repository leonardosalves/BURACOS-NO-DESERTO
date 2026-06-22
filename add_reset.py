import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_header = """<Sparkles className="w-5 h-5 text-gold-500 animate-pulse" /> CRIADOR DE VÍDEOS AUTOMATIZADO COM IA
                </h3>"""

new_header = """<Sparkles className="w-5 h-5 text-gold-500 animate-pulse" /> CRIADOR DE VÍDEOS AUTOMATIZADO COM IA
                </h3>
                <button 
                  onClick={() => {
                    if (window.confirm("Isso apagará o rascunho atual. Deseja começar um novo vídeo do zero?")) {
                      localStorage.removeItem('qanat_creator_state');
                      setCreatorStep(1);
                      setNicheInput('');
                      setIdeasData(null);
                      setSelectedIdeaIndex(-1);
                      setGeneratedScriptData(null);
                      setFormatSelector('LONGO');
                    }
                  }}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[10px] px-3 py-1.5 rounded uppercase font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Limpar Progresso e Novo
                </button>"""

if "Limpar Progresso e Novo" not in content:
    content = content.replace(old_header, new_header)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Reset button!")
