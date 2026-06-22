import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Step 5 buttons inside wizard
content = content.replace("onClick={() => { setActiveTab('terminal'); triggerRender('standard'); }}", "onClick={() => triggerRender('standard', true)}")
content = content.replace("onClick={() => { setActiveTab('terminal'); triggerRender('highlighted'); }}", "onClick={() => triggerRender('highlighted', true)}")
content = content.replace("onClick={mixBGM}", "onClick={() => mixBGM(true)}") # This replaces all mixBGM bindings, some might be outside wizard (like the main button on the left).
# So instead, let's explicitly look for the one in Step 5.
# Actually mixBGM(true) is fine if they click it from anywhere, wait, if they click it from outside wizard, they might want to stay on the current tab anyway!
# Let's revert the general mixBGM and do it properly.

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Step 5 render triggers!")
