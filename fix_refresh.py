import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleUploadSceneAsset refresh
old_fetch1 = "toast.success(Mídia adicionada com sucesso (Cena )!);\n        fetchData();"
new_fetch1 = "toast.success(Mídia adicionada com sucesso (Cena )!);\n        if (projectOverride) { loadEditorProject(); } else { fetchData(); }"
content = content.replace(old_fetch1, new_fetch1)

# Fix bgm upload refresh in Editor
old_fetch2 = "toast.success(Trilha do Bloco  atualizada!);\n                                          fetchData();"
new_fetch2 = "toast.success(Trilha do Bloco  atualizada!);\n                                          loadEditorProject();"
content = content.replace(old_fetch2, new_fetch2)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed refresh logic for Project Editor!")
