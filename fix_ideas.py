import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('idea: ideasData.ideas[selectedIdeaIndex],', 'idea: (ideasData?.ideas || [])[selectedIdeaIndex],')

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Protected ideasData.ideas in App.tsx")
