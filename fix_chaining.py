import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add optional chaining to ideasData
content = content.replace("ideasData.diagnostic.", "ideasData?.diagnostic?.")
content = content.replace("ideasData.ideas.map", "(ideasData?.ideas || []).map")
content = content.replace("ideasData.best_idea_index", "ideasData?.best_idea_index")
content = content.replace("ideasData.best_idea_reason", "ideasData?.best_idea_reason")
content = content.replace("ideasData.strategy.", "ideasData?.strategy?.")

# Add optional chaining to generatedScriptData
content = content.replace("generatedScriptData.checklist.", "generatedScriptData?.checklist?.")
content = content.replace("generatedScriptData.strategy.", "generatedScriptData?.strategy?.")
content = content.replace("generatedScriptData.visual_prompts.length", "(generatedScriptData?.visual_prompts || []).length")

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added optional chaining to prevent crashes!")
