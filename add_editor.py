import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Editor to the sidebar
if "setActiveTab('editor')" not in content:
    sidebar_button = """
                          <button 
                            onClick={() => setActiveTab('editor')}
                            className={w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium transition flex items-center gap-2 cursor-pointer }
                          >
                            <Settings className="w-3.5 h-3.5 shrink-0" />
                            Editor de Projetos
                          </button>
"""
    content = content.replace("<button \n                            onClick={() => setActiveTab('settings')", sidebar_button + "                          <button \n                            onClick={() => setActiveTab('settings')")

# Add the Editor View
if "activeTab === 'editor'" not in content:
    editor_view = """
          {/* TAB: PROJECT EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-6 animate-fade-in font-sans">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-gold-500" /> EDITOR DE PROJETOS
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  Selecione um projeto existente para substituir imagens, vídeos ou trilhas sonoras por bloco.
                </p>
                
                <div className="mt-6 flex gap-4">
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-gold-500 w-64"
                  >
                    <option value="">Selecione um projeto...</option>
                    {projects.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button 
                    onClick={fetchData}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Carregar Projeto
                  </button>
                </div>
              </div>

              {config && config.timeline_assets && (
                <div className="space-y-6">
                  {Object.keys(config.timeline_assets).sort((a,b) => parseInt(a)-parseInt(b)).map((blockKey) => (
                    <div key={blockKey} className="glass-panel p-6 rounded-3xl">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-cinzel text-md font-bold text-gold-500">Bloco {blockKey}</h4>
                        
                        {/* Audio Upload for this block */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">BGM:</span>
                          <input type="file" accept="audio/mpeg,audio/mp3,audio/wav" className="hidden" id={gm-upload-}
                                 onChange={async (e) => {
                                   if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      try {
                                        const res = await fetch(getProjectUrl(/api/upload-bgm?block=), {
                                          method: 'POST', body: formData
                                        });
                                        if (res.ok) {
                                          toast.success(Trilha do Bloco  atualizada!);
                                          fetchData();
                                        } else {
                                          toast.error('Erro ao enviar trilha sonora.');
                                        }
                                      } catch(err) {
                                        toast.error('Falha de conexão.');
                                      }
                                   }
                                 }} />
                          <label htmlFor={gm-upload-} className="bg-zinc-900 border border-zinc-800 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer flex items-center gap-2">
                            <Upload className="w-3 h-3" /> Upload Trilha
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(config.timeline_assets[blockKey] || []).map((asset: any, idx: number) => (
                          <div key={idx} className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col justify-between">
                            <div className="truncate text-xs text-gray-300 mb-2" title={asset.asset}>{asset.asset}</div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] text-zinc-400 font-mono uppercase">{asset.type}</span>
                              <input type="file" accept={asset.type === 'video' ? "video/mp4" : "image/png,image/jpeg"} className="hidden" id={sset-upload--}
                                 onChange={(e) => {
                                   if (e.target.files && e.target.files[0]) {
                                      handleUploadSceneAsset(parseInt(blockKey), asset.type, e.target.files[0], idx);
                                   }
                                 }} />
                              <label htmlFor={sset-upload--} className="text-gold-500 text-[10px] cursor-pointer hover:underline flex items-center gap-1">
                                <Upload className="w-3 h-3" /> Substituir
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
"""
    content = content.replace("{/* TAB 6: AI VIDEO CREATOR */}", editor_view + "\n          {/* TAB 6: AI VIDEO CREATOR */}")

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Project Editor tab injected.")
