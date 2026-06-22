import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the block where creatorStep === 2 is rendered
start_idx = content.find('{creatorStep === 2 && (')
end_idx = content.find('{creatorStep === 3 && (')
if start_idx != -1 and end_idx != -1:
    step2_code = content[start_idx:end_idx]
    with open('step2_code.txt', 'w', encoding='utf-8') as out:
        out.write(step2_code)
    print("Exported step2_code.txt")
