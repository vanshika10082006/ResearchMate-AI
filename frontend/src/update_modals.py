import os

modals_path = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\frontend\src\components\Modals.jsx'

with open(modals_path, 'r', encoding='utf-8') as f:
    modals_code = f.read()

# 1. Fetch custom skills on mount
if "const [customSkills, setCustomSkills] = useState([]);" not in modals_code:
    modals_code = modals_code.replace(
        "const [loadingInsight, setLoadingInsight] = useState(false);",
        "const [loadingInsight, setLoadingInsight] = useState(false);\n  const [customSkills, setCustomSkills] = useState([]);"
    )
    
    fetch_skills_effect = """
  // Fetch custom skills
  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then(res => res.json())
      .then(data => setCustomSkills(data.skills || []))
      .catch(e => console.error(e));
  }, []);
"""
    modals_code = modals_code.replace(
        "// Reset insight cache when paper changes",
        fetch_skills_effect + "\n  // Reset insight cache when paper changes"
    )

# 2. Add dynamic fetchInsight logic
# Replace the old endpointMap to include custom skills dynamically.
# Note: Since string replacement is fragile here, I'll inject logic inside `fetchInsight`.

old_fetch_logic = """    const target = endpointMap[tabKey];
    if (!target) {
      setLoadingInsight(false);
      return;
    }"""

new_fetch_logic = """    let target = endpointMap[tabKey];
    let isCustomSkill = false;
    let customSkillId = null;

    if (!target) {
      const customMatch = customSkills.find(s => s.id === tabKey);
      if (customMatch) {
        isCustomSkill = true;
        customSkillId = customMatch.id;
        target = { url: `${API_BASE}/skills/run`, key: "result" };
      } else {
        setLoadingInsight(false);
        return;
      }
    }"""

modals_code = modals_code.replace(old_fetch_logic, new_fetch_logic)

# Replace fetch body to include skill_id if custom
old_fetch_body = "body: JSON.stringify({ document_id: docId, model: selectedModel }),"
new_fetch_body = "body: JSON.stringify({ document_id: docId, model: selectedModel, ...(isCustomSkill ? {skill_id: customSkillId} : {}) }),"
modals_code = modals_code.replace(old_fetch_body, new_fetch_body)


# 3. Add Custom skills to UI Tabs
# Find the end of standard tabs
standard_tabs_ui = """            <button onClick={() => handleTabSwitch('similar')} className={`flex items-center gap-2 px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${insightTab === 'similar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <ExternalLink className="w-4 h-4" /> Similar Papers
            </button>"""

custom_tabs_ui = """
            {/* Custom Skills Tabs */}
            {customSkills.map(skill => (
              <button 
                key={skill.id}
                onClick={() => handleTabSwitch(skill.id)} 
                className={`flex items-center gap-2 px-4 py-2 font-medium whitespace-nowrap transition-colors border-b-2 ${insightTab === skill.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                <Sparkles className="w-4 h-4" /> {skill.name}
              </button>
            ))}
"""
modals_code = modals_code.replace(standard_tabs_ui, standard_tabs_ui + custom_tabs_ui)

with open(modals_path, 'w', encoding='utf-8') as f:
    f.write(modals_code)

print("Modals updated to support custom skills.")
