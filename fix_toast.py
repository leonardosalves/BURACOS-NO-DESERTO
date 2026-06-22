import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_toast_err = "toast.error('Erro ao gerar roteiro completo: ' + (data.error || 'Erro desconhecido'));"
new_toast_err = "toast.error('Erro na IA: ' + (data.details || data.error || 'Erro desconhecido'));"

content = content.replace(old_toast_err, new_toast_err)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated error toast to show quota details!")
