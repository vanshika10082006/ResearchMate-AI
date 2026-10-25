import os

frontend_dir = r'c:\Users\ma\Downloads\researchmate-ai (1)\researchmate-ai\frontend\src'

# 1. Create SkillsHub.jsx
skills_hub_code = """import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, Loader2, Save } from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function SkillsHub() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'custom',
    description: '',
    system_prompt: '',
    user_prompt_template: 'Paper Text Sample:\\n{sample}\\n\\nTask:'
  });
  const [toast, setToast] = useState(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      const data = await res.json();
      if (res.ok) setSkills(data.skills);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSaveSkill = async () => {
    if (!newSkill.name || !newSkill.system_prompt) {
      setToast('Name and System Prompt are required.');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/skills/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill)
      });
      if (res.ok) {
        setToast('Skill uploaded successfully!');
        setNewSkill({
          name: '', category: 'custom', description: '',
          system_prompt: '', user_prompt_template: 'Paper Text Sample:\\n{sample}\\n\\nTask:'
        });
        fetchSkills();
      }
    } catch (e) {
      setToast('Upload failed.');
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Connectors & Skills Hub</h1>
        <p className="text-slate-600">Install and create custom Agent skills to process your papers.</p>
      </div>
      
      {toast && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Upload New Skill */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" /> Create Custom Skill
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skill Name</label>
              <input type="text" value={newSkill.name} onChange={(e)=>setNewSkill({...newSkill, name: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. Peer Reviewer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input type="text" value={newSkill.description} onChange={(e)=>setNewSkill({...newSkill, description: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Critiques the methodology of a paper." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt</label>
              <textarea value={newSkill.system_prompt} onChange={(e)=>setNewSkill({...newSkill, system_prompt: e.target.value})} className="w-full border p-2 rounded-lg h-24" placeholder="You are an expert NeurIPS reviewer..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User Prompt Template (use {sample} for paper text)</label>
              <textarea value={newSkill.user_prompt_template} onChange={(e)=>setNewSkill({...newSkill, user_prompt_template: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
            </div>
            <button onClick={handleSaveSkill} disabled={uploading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Skill
            </button>
          </div>
        </div>

        {/* Right Col: Available Skills */}
        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" /> Active Skills ({skills.length})
          </h2>
          {loading ? (
             <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : (
            <div className="grid gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{skill.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{skill.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"""

with open(os.path.join(frontend_dir, 'components', 'SkillsHub.jsx'), 'w', encoding='utf-8') as f:
    f.write(skills_hub_code)

# 2. Update App.jsx to render SkillsHub
with open(os.path.join(frontend_dir, 'App.jsx'), 'r', encoding='utf-8') as f:
    app_code = f.read()

if "import SkillsHub from" not in app_code:
    app_code = app_code.replace("import Modals from './components/Modals.jsx';", "import Modals from './components/Modals.jsx';\nimport SkillsHub from './components/SkillsHub.jsx';")

# Add the SkillsHub to the main conditional render inside main content
render_block = """
        {activeTab === 'dashboard' && (
          <>
            <HeroSection />
            <UploadSection 
              handleFileUpload={handleFileUpload} 
              isUploading={isUploading} 
              activeUpload={activeUpload} 
            />
            <RecentPapersList papers={papers} />
          </>
        )}
        {activeTab === 'library' && (
          <LibraryView papers={papers} searchQuery={searchQuery} onInsights={(p) => setSelectedPaperForInsights(p)} onChat={(p) => setSelectedPaperForChat(p)} />
        )}
"""
if "activeTab === 'skills'" not in app_code:
    new_render = render_block + "\n        {activeTab === 'skills' && <SkillsHub />}"
    app_code = app_code.replace(render_block, new_render)

with open(os.path.join(frontend_dir, 'App.jsx'), 'w', encoding='utf-8') as f:
    f.write(app_code)

# 3. Update Header.jsx to show Skills tab
with open(os.path.join(frontend_dir, 'components', 'Header.jsx'), 'r', encoding='utf-8') as f:
    header_code = f.read()

# Make sure we add a nav item for Skills
nav_tabs = """
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'library' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
"""
if "activeTab === 'skills'" not in header_code:
    new_tabs = nav_tabs + """
          <button 
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'skills' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Skills & Plugins</span>
          </button>
"""
    header_code = header_code.replace(nav_tabs, new_tabs)

with open(os.path.join(frontend_dir, 'components', 'Header.jsx'), 'w', encoding='utf-8') as f:
    f.write(header_code)

print("Frontend components updated for Skills Hub.")
