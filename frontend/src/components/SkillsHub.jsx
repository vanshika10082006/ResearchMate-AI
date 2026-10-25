import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Upload,
  Loader2,
  Save,
  Wrench,
  CheckCircle,
  Code,
  Plug,
} from "lucide-react";
import ConnectorsPanel from "./ConnectorsPanel.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function SkillsHub({ onImportSuccess, setActiveTab }) {
  const [activeHubTab, setActiveHubTab] = useState("connectors");
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "custom",
    description: "",
    system_prompt: "",
    user_prompt_template: "Paper Text Sample:\n{sample}\n\nTask:",
  });
  const [toast, setToast] = useState(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      const data = await res.json();
      if (res.ok) setSkills(data.skills || []);
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
    if (!newSkill.name.trim() || !newSkill.system_prompt.trim()) {
      setToast({
        type: "error",
        msg: "Skill Name and System Prompt are required.",
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/skills/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });
      if (res.ok) {
        setToast({
          type: "success",
          msg: "Skill successfully uploaded and registered!",
        });
        setNewSkill({
          name: "",
          category: "custom",
          description: "",
          system_prompt: "",
          user_prompt_template: "Paper Text Sample:\n{sample}\n\nTask:",
        });
        fetchSkills();
      } else {
        const errData = await res.json();
        setToast({ type: "error", msg: errData.error || "Upload failed." });
      }
    } catch (e) {
      setToast({ type: "error", msg: "Could not connect to backend." });
    } finally {
      setUploading(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8083ff]/15 border border-[#8083ff]/30 text-[#c0c1ff] text-xs font-mono mb-3">
          <Wrench className="w-3.5 h-3.5" />
          <span>Extensibility Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#e5e1e4] tracking-tight">
          Plugins & Connectors
        </h1>
        <p className="text-sm text-[#908fa0] mt-1">
          Import papers from external sources and create custom AI skills for
          your research workflow.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-[#1c1b1d]/80 border border-[#353437]/60 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveHubTab("connectors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeHubTab === "connectors"
              ? "bg-[#2a2a2c] text-[#e5e1e4] border border-[#464554]/50 shadow-sm"
              : "text-[#908fa0] hover:text-[#c7c4d7]"
          }`}
        >
          <Plug className="w-3.5 h-3.5 text-[#7bd0ff]" />
          Connectors
        </button>
        <button
          onClick={() => setActiveHubTab("skills")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeHubTab === "skills"
              ? "bg-[#2a2a2c] text-[#e5e1e4] border border-[#464554]/50 shadow-sm"
              : "text-[#908fa0] hover:text-[#c7c4d7]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c0c1ff]" />
          Skills
        </button>
      </div>

      {/* Connectors Tab */}
      {activeHubTab === "connectors" && (
        <ConnectorsPanel
          onImportSuccess={onImportSuccess}
          onViewInLibrary={() => setActiveTab && setActiveTab("library")}
        />
      )}

      {/* Skills Tab */}
      {activeHubTab === "skills" && (
        <div>
          {/* Feedback Toast */}
          {toast && (
            <div
              className={`mb-6 p-4 rounded-xl border text-sm flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-950/40 text-rose-300 border-rose-500/40"
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{toast.msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Create New Custom Skill */}
            <div className="bg-[#131315] rounded-2xl border border-[#353437]/70 p-6 shadow-xl">
              <h2 className="text-base sm:text-lg font-bold text-[#e5e1e4] mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#8083ff]" />
                <span>Create Custom Skill</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#c7c4d7] uppercase tracking-wider mb-1.5">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={newSkill.name}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, name: e.target.value })
                    }
                    className="w-full bg-[#1c1b1d] border border-[#353437] rounded-xl px-3.5 py-2 text-sm text-[#e5e1e4] outline-none focus:border-[#8083ff] focus:ring-1 focus:ring-[#8083ff]/30 transition-all placeholder:text-[#908fa0]"
                    placeholder="e.g. NeurIPS Reviewer, LaTeX Simplifier"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c7c4d7] uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newSkill.description}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, description: e.target.value })
                    }
                    className="w-full bg-[#1c1b1d] border border-[#353437] rounded-xl px-3.5 py-2 text-sm text-[#e5e1e4] outline-none focus:border-[#8083ff] focus:ring-1 focus:ring-[#8083ff]/30 transition-all placeholder:text-[#908fa0]"
                    placeholder="e.g. Critiques methodology and experimental rigor."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c7c4d7] uppercase tracking-wider mb-1.5">
                    System Prompt
                  </label>
                  <textarea
                    value={newSkill.system_prompt}
                    onChange={(e) =>
                      setNewSkill({
                        ...newSkill,
                        system_prompt: e.target.value,
                      })
                    }
                    className="w-full bg-[#1c1b1d] border border-[#353437] rounded-xl p-3 text-sm text-[#e5e1e4] outline-none focus:border-[#8083ff] focus:ring-1 focus:ring-[#8083ff]/30 transition-all h-24 placeholder:text-[#908fa0]"
                    placeholder="You are an expert reviewer. Scrutinize the mathematical validity..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c7c4d7] uppercase tracking-wider mb-1.5">
                    User Prompt Template (use{" "}
                    <code className="text-[#8083ff] font-mono">
                      {"{sample}"}
                    </code>{" "}
                    for paper text)
                  </label>
                  <textarea
                    value={newSkill.user_prompt_template}
                    onChange={(e) =>
                      setNewSkill({
                        ...newSkill,
                        user_prompt_template: e.target.value,
                      })
                    }
                    className="w-full bg-[#1c1b1d] border border-[#353437] rounded-xl p-3 text-sm text-[#e5e1e4] outline-none focus:border-[#8083ff] focus:ring-1 focus:ring-[#8083ff]/30 transition-all h-24 font-mono text-xs text-[#c7c4d7]"
                  />
                </div>

                <button
                  onClick={handleSaveSkill}
                  disabled={uploading}
                  className="w-full mt-2 bg-gradient-to-r from-[#8083ff] to-[#7bd0ff] text-[#0e0e10] py-2.5 rounded-xl font-semibold text-sm hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(128,131,255,0.25)]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering Skill...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Register Skill</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Active Skills List */}
            <div className="bg-[#131315] rounded-2xl border border-[#353437]/70 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-[#e5e1e4] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#c0c1ff]" />
                  <span>Active Skills ({skills.length})</span>
                </h2>
                <span className="text-xs font-mono text-[#908fa0]">
                  Available in Insights Modal
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-7 h-7 text-[#8083ff] animate-spin" />
                  <span className="text-xs text-[#908fa0]">
                    Loading registered skills...
                  </span>
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-12 text-[#908fa0] text-sm">
                  No skills registered yet. Create your first skill on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437]/70 hover:border-[#8083ff]/40 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#8083ff]/20 border border-[#8083ff]/30 flex items-center justify-center text-[#c0c1ff] shrink-0">
                            <Code className="w-3.5 h-3.5" />
                          </div>
                          <h3 className="font-semibold text-sm text-[#e5e1e4]">
                            {skill.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2a2a2c] text-[#c0c1ff] border border-[#464554]/40">
                          {skill.id}
                        </span>
                      </div>
                      <p className="text-xs text-[#908fa0] leading-relaxed pl-9">
                        {skill.description || "No description provided."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
