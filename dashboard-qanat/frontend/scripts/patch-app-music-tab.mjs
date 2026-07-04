import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes("{activeTab === 'music'"));
const endIdx = lines.findIndex((l) => l.includes("TAB 4: COMPILATION TERMINAL"));
if (startIdx < 0 || endIdx < 0) {
  console.error("markers not found", startIdx, endIdx);
  process.exit(1);
}

const replacement = `          {activeTab === 'music' && (
            <TabErrorBoundary label="Trilha BGM">
              {!config ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-400 font-sans">
                  <RefreshCw className={\`w-8 h-8 text-gold-500 \${projectDataLoading ? 'animate-spin' : ''}\`} />
                  <p className="text-sm">
                    {projectDataLoading ? 'Carregando trilhas do projeto...' : 'Não foi possível carregar a configuração do projeto.'}
                  </p>
                  {!projectDataLoading && (
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              ) : (
                <AppMusicTab
                  config={config}
                  activeProject={activeProject}
                  mixing={mixing}
                  mixBGM={mixBGM}
                  globalMusicVolume={globalMusicVolume}
                  activeBgmMode={activeBgmMode}
                  isShortVideo={isShortVideo}
                  saveConfig={saveConfig}
                  planningBgmEmotions={planningBgmEmotions}
                  hasApiKey={hasApiKey}
                  handlePlanBgmEmotions={handlePlanBgmEmotions}
                  bgmEmotionRows={bgmEmotionRows}
                  safeMusicFiles={safeMusicFiles}
                  handleEmotionMusicChange={handleEmotionMusicChange}
                  playingMusic={playingMusic}
                  togglePlayMusic={togglePlayMusic}
                  bgmSuggestions={bgmSuggestions}
                  bgmBlockRows={bgmBlockRows}
                  handleMusicChange={handleMusicChange}
                  searchMusic={searchMusic}
                  setSearchMusic={setSearchMusic}
                  handleDeleteAllMusic={handleDeleteAllMusic}
                  getProjectUrl={getProjectUrl}
                  fetchData={fetchData}
                  suggestingBGM={suggestingBGM}
                  handleSuggestBGM={handleSuggestBGM}
                  handleDeleteMusic={handleDeleteMusic}
                  getFormatBytes={getFormatBytes}
                  hasEpidemicKey={hasEpidemicKey}
                  autoSoundtracking={autoSoundtracking}
                  handleAutoSoundtrack={handleAutoSoundtrack}
                  epidemicSearchType={epidemicSearchType}
                  setEpidemicSearchType={setEpidemicSearchType}
                  setEpidemicSearchResults={setEpidemicSearchResults}
                  epidemicSearchQuery={epidemicSearchQuery}
                  setEpidemicSearchQuery={setEpidemicSearchQuery}
                  handleSearchEpidemic={handleSearchEpidemic}
                  searchingEpidemic={searchingEpidemic}
                  safeEpidemicResults={safeEpidemicResults}
                  downloadingEpidemicId={downloadingEpidemicId}
                  handleDownloadEpidemic={handleDownloadEpidemic}
                  storyboardData={storyboardData}
                />
              )}
            </TabErrorBoundary>
          )}

`.split("\n");

const next = [...lines.slice(0, startIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("replaced lines", startIdx, "to", endIdx, "removed", endIdx - startIdx, "added", replacement.length);