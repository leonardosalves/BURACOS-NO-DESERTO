with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setActiveTab(\'terminal\');", "setActiveTab('terminal');")
content = content.replace("setActiveTab(\\'terminal\\');", "setActiveTab('terminal');")

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax error!")
