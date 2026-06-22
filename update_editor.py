import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update getProjectUrl to accept an optional projectOverride
old_getUrl = "const getProjectUrl = (endpoint: string) => {"
new_getUrl = "const getProjectUrl = (endpoint: string, projectOverride?: string) => {\n    const p = projectOverride || activeProject;"
content = content.replace(old_getUrl, new_getUrl)
content = content.replace("encodeURIComponent(activeProject)", "encodeURIComponent(p)")

# Update handleUploadSceneAsset to accept projectOverride
old_uploadScene = "const handleUploadSceneAsset = async (sceneNum: number, type: 'video' | 'image', file: File, assetIdx?: number) => {"
new_uploadScene = "const handleUploadSceneAsset = async (sceneNum: number, type: 'video' | 'image', file: File, assetIdx?: number, projectOverride?: string) => {"
content = content.replace(old_uploadScene, new_uploadScene)

# Inside handleUploadSceneAsset
content = content.replace("getProjectUrl(/api/upload-scene-asset?scene=&type=)", "getProjectUrl(/api/upload-scene-asset?scene=&type=, projectOverride)")

# In Project Editor, pass selectedProject to getProjectUrl for BGM and handleUploadSceneAsset
# BGM upload:
content = content.replace("fetch(getProjectUrl(/api/upload-bgm?block=&filename=)", "fetch(getProjectUrl(/api/upload-bgm?block=&filename=, selectedProject)")
# Scene upload:
content = content.replace("handleUploadSceneAsset(parseInt(blockKey), asset.type, e.target.files[0], idx)", "handleUploadSceneAsset(parseInt(blockKey), asset.type, e.target.files[0], idx, selectedProject)")

# For fetchData, we want to fetch the config for the selectedProject when in the editor tab!
# Wait, fetchData fetches everything. If we are in 'editor' tab, we want to fetch data for selectedProject.
# But it's easier to just fetch config for selectedProject when they click "Carregar Projeto"
# The button currently says onClick={fetchData}
# Let's change it to a custom function that fetches config for selectedProject.
custom_load_project = """
  const loadEditorProject = async () => {
    if (!selectedProject) return;
    try {
      const configRes = await fetch(getProjectUrl('/api/config', selectedProject));
      if (configRes.ok) setConfig(await configRes.json());
      toast.success(Projeto  carregado no editor!);
    } catch(err) {
      toast.error("Erro ao carregar projeto.");
    }
  };
"""
content = content.replace("const loadDashboard = async () => {", custom_load_project + "\n  const loadDashboard = async () => {")
content = content.replace("onClick={fetchData}\n                    className=\"bg-zinc-800", "onClick={loadEditorProject}\n                    className=\"bg-zinc-800")


with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Project Editor to respect selectedProject!")
