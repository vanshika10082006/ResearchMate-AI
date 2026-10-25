import re
import os

filepath = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\frontend\src\components\Modals.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

model_selector_ui = """
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none cursor-pointer rounded-xl border border-[#353437]/80 bg-[#1c1b1d]/80 px-3 py-1.5 text-xs text-[#c7c4d7] outline-none transition-all hover:border-[#8083ff]/50 focus:border-[#8083ff]/60"
                  title="Select AI Model"
                >
                  <option value="auto">🤖 Auto</option>
                  <option value="fast">⚡ Fast</option>
                  <option value="groq">🚀 Groq</option>
                  <option value="reasoning">🧠 Deep</option>
                </select>
"""

# Insert into Insights modal header (line 318ish)
code = code.replace(
    '<div className="flex items-center gap-2 shrink-0">',
    '<div className="flex items-center gap-2 shrink-0">' + model_selector_ui
)

# Wait, `setSelectedModel` might not be in the function signature. Let's make sure it is.
if "setSelectedModel" not in code.split(") {")[0]:
    code = code.replace(
        "selectedModel,",
        "selectedModel,\n  setSelectedModel,"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
