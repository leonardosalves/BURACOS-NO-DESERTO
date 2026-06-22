import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find any map over ideasData.ideas
match = re.search(r'ideasData(?:\.ideas)?\.map', content)
print("ideasData map found:", bool(match))

# Let's find map over generatedScriptData
match = re.search(r'generatedScriptData(?:.*?)\.map', content)
print("generatedScriptData map found:", bool(match))

