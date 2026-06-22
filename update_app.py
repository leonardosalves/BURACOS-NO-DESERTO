import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
if 'const [uploadedScenes, setUploadedScenes]' not in content:
    content = content.replace("const [activeTab, setActiveTab] = useState<'dashboard' | 'script' | 'settings'>('dashboard');",
                              "const [activeTab, setActiveTab] = useState<'dashboard' | 'script' | 'settings' | 'editor'>('dashboard');\n  const [uploadedScenes, setUploadedScenes] = useState<Record<number, boolean>>({});")

# Add to handleUploadSceneAsset
if 'setUploadedScenes(prev =>' not in content:
    content = content.replace("toast.success(data.message);\n        fetchData();", 
                              "toast.success(data.message);\n        setUploadedScenes(prev => ({...prev, [sceneNum]: true}));\n        fetchData();")

# Modify rendering for scenes
if 'const isUploaded = uploadedScenes[i + 1]' not in content:
    old_box = "className=\"bg-zinc-950 border border-zinc-800/50 p-4 rounded-lg flex flex-col hover:border-gold-500/20 transition group relative\""
    new_box = "className={g-zinc-950 border p-4 rounded-lg flex flex-col transition group relative }"
    
    content = content.replace(old_box, new_box)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx updated with uploadedScenes state!")
