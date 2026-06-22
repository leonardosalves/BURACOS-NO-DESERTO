import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import Toaster and toast
import_stmt = "import toast, { Toaster } from 'react-hot-toast';\n"
if "react-hot-toast" not in content:
    content = content.replace("import React,", import_stmt + "import React,")

# Add <Toaster/> to return
if "<Toaster />" not in content:
    content = content.replace("<div className=\"flex h-screen", "<Toaster position=\"top-right\" />\n    <div className=\"flex h-screen")

# Replace alerts
def replacer(m):
    msg = m.group(1)
    if 'Erro' in msg or 'Falha' in msg or 'falhou' in msg or 'Por favor' in msg:
        return f"toast.error({msg})"
    else:
        return f"toast.success({msg})"

content = re.sub(r'alert\((.*?)\)', replacer, content)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Alerts replaced with toast!")
