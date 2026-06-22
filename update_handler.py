import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update signature
old_sig = "const handleUploadSceneAsset = async (sceneNum: number, type: 'video' | 'image', file: File) => {"
new_sig = "const handleUploadSceneAsset = async (sceneNum: number, type: 'video' | 'image', file: File, assetIdx?: number) => {"
content = content.replace(old_sig, new_sig)

# Update URL
old_url = "const res = await fetch(getProjectUrl(/api/upload-scene-asset?scene=&type=&filename=), {"
new_url = "const res = await fetch(getProjectUrl(/api/upload-scene-asset?scene=&type=&filename=), {"
content = content.replace(old_url, new_url)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("handleUploadSceneAsset updated!")
