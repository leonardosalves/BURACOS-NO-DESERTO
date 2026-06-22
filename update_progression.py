import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Modify handleSyncTimings definition
old_def = "const handleSyncTimings = () => {"
new_def = "const handleSyncTimings = (fromWizard = false) => {"
content = content.replace(old_def, new_def)

# Prevent jumping to terminal
old_terminal_jump = "setActiveTab('terminal');"
new_terminal_jump = "if (!fromWizard) setActiveTab('terminal');"
# Only replace the one inside handleSyncTimings
content = re.sub(r'(setSyncingTimings\(true\);\s*)setActiveTab\(\'terminal\'\);', r'\1if (!fromWizard) setActiveTab(\'terminal\');', content)

# Advance step on success
# Find where it finishes
old_close = "setSyncingTimings(false);\n        eventSource.close();"
new_close = "setSyncingTimings(false);\n        eventSource.close();\n        if (fromWizard) setCreatorStep(4);"
content = content.replace(old_close, new_close)

# In step 3 render
old_sync_button = "onClick={() => handleSyncTimings()}"
new_sync_button = "onClick={() => handleSyncTimings(true)}"
content = content.replace(old_sync_button, new_sync_button)

# Also update mixBGM and triggerRender in a similar way
# mixBGM
old_mix = "const mixBGM = async () => {"
new_mix = "const mixBGM = async (fromWizard = false) => {"
content = content.replace(old_mix, new_mix)
content = re.sub(r'(setMixing\(true\);\s*)setActiveTab\(\'terminal\'\);', r'\1if (!fromWizard) setActiveTab(\'terminal\');', content)
old_mix_success = "toast.success(data.message);\n      } else {"
new_mix_success = "toast.success(data.message);\n        if (fromWizard) setCreatorStep(5);\n      } else {"
content = content.replace(old_mix_success, new_mix_success)

# triggerRender
old_render = "const triggerRender = (mode: 'standard' | 'highlighted') => {"
new_render = "const triggerRender = (mode: 'standard' | 'highlighted', fromWizard = false) => {"
content = content.replace(old_render, new_render)
content = re.sub(r'(setRendering\(true\);\s*)setActiveTab\(\'terminal\'\);', r'\1if (!fromWizard) setActiveTab(\'terminal\');', content)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated progression functions!")
