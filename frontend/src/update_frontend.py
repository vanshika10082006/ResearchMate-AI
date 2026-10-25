import re
import os

frontend_dir = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\frontend\src'

# 1. Update App.jsx
app_jsx_path = os.path.join(frontend_dir, 'App.jsx')
with open(app_jsx_path, 'r') as f:
    app_code = f.read()

# Add selectedModel state
if 'const [selectedModel, setSelectedModel] = useState(\'auto\');' not in app_code:
    app_code = app_code.replace(
        "const [searchQuery, setSearchQuery] = useState('');",
        "const [searchQuery, setSearchQuery] = useState('');\n  const [selectedModel, setSelectedModel] = useState('auto');"
    )

# Update Header props
app_code = app_code.replace(
    '<Header activeTab={activeTab} setActiveTab={setActiveTab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />',
    '<Header activeTab={activeTab} setActiveTab={setActiveTab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />'
)

# Update Modals props
app_code = app_code.replace(
    '<Modals\n        selectedPaperForInsights={selectedPaperForInsights}',
    '<Modals\n        selectedModel={selectedModel}\n        selectedPaperForInsights={selectedPaperForInsights}'
)

with open(app_jsx_path, 'w') as f:
    f.write(app_code)

# 2. Update Header.jsx
header_jsx_path = os.path.join(frontend_dir, 'components', 'Header.jsx')
with open(header_jsx_path, 'r') as f:
    header_code = f.read()

# Add new props
header_code = header_code.replace(
    'export default function Header({ activeTab, setActiveTab, searchQuery, setSearchQuery }) {',
    'export default function Header({ activeTab, setActiveTab, searchQuery, setSearchQuery, selectedModel, setSelectedModel }) {'
)

# Add dropdown UI
dropdown_ui = """
        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 hidden sm:block">Model:</label>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">🤖 Auto-Pilot</option>
            <option value="fast">⚡ Fast (Gemini Flash)</option>
            <option value="groq">🚀 Ultra-Fast (Llama 3)</option>
            <option value="reasoning">🧠 Deep Reasoning (DeepSeek)</option>
          </select>
        </div>
"""

# Insert dropdown before Search input if it's there
header_code = re.sub(
    r'(<div className=\"relative hidden md:block\">)',
    dropdown_ui + r'\n        \1',
    header_code
)

with open(header_jsx_path, 'w') as f:
    f.write(header_code)

# 3. Update Modals.jsx
modals_jsx_path = os.path.join(frontend_dir, 'components', 'Modals.jsx')
with open(modals_jsx_path, 'r') as f:
    modals_code = f.read()

# Add selectedModel prop
modals_code = modals_code.replace(
    'selectedPaperForInsights,',
    'selectedModel,\n  selectedPaperForInsights,'
)

# Update fetchInsight body
modals_code = modals_code.replace(
    'body: JSON.stringify({ document_id: docId }),',
    'body: JSON.stringify({ document_id: docId, model: selectedModel }),'
)

# Update handleChatSend
modals_code = modals_code.replace(
    'body: JSON.stringify({ document_id: selectedPaperForChat.document_id, question: text }),',
    'body: JSON.stringify({ document_id: selectedPaperForChat.document_id, question: text, model: selectedModel }),'
)

with open(modals_jsx_path, 'w') as f:
    f.write(modals_code)

print("Frontend updated successfully!")
