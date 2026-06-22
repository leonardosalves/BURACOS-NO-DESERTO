import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for map() calls that could crash without optional chaining
lines = content.split('\n')
for i, line in enumerate(lines):
    if '.map(' in line and '?' not in line:
        pass # We'll just look around manually

print("Let's just look at the component.")
