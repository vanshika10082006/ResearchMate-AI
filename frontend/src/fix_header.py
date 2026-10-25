import re
import os

filepath = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\frontend\src\components\Header.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Add skills to navItems
code = code.replace(
    '    { id: "library", label: "Document Library" },',
    '    { id: "library", label: "Document Library" },\n    { id: "skills", label: "Skills & Plugins" },'
)

# Remove Model Selector
code = re.sub(
    r'<label className="relative shrink-0">.*?</label>',
    '',
    code,
    flags=re.DOTALL
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
