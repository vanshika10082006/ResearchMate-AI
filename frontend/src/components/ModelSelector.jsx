import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Sparkles, Cpu } from "lucide-react";

export const MODEL_OPTIONS = [
  {
    id: "auto",
    label: "Auto-Pilot",
    badge: "Smart",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "🤖",
    provider: "Automatic",
    desc: "Routes simple tasks to fast models, complex queries to reasoning engines.",
  },
  {
    id: "fast",
    label: "Gemini 2.0 Flash",
    badge: "Fast",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: "⚡",
    provider: "Google",
    desc: "Sub-second latency with high precision for Q&A and summaries.",
  },
  {
    id: "groq",
    label: "Qwen 3.8 27B",
    badge: "300+ t/s",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "🚀",
    provider: "Groq Cloud",
    desc: "Ultra-fast open-source model running on ultra-low latency hardware.",
  },
  {
    id: "reasoning",
    label: "DeepSeek Reasoning",
    badge: "Deep Think",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "🧠",
    provider: "DeepSeek",
    desc: "Deep analytical synthesis for equation rigor, peer review and critiques.",
  },
];

export default function ModelSelector({
  selectedModel = "auto",
  onSelectModel,
  compact = false,
  dropUp = false,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeModel =
    MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center ${compact ? "w-[150px] gap-1.5" : "gap-2"} rounded-xl border border-[#353437]/80 bg-[#1c1b1d]/90 hover:bg-[#252427] hover:border-[#8083ff]/60 px-2.5 py-1.5 text-xs text-[#e5e1e4] transition-all cursor-pointer shadow-sm ${
          open ? "ring-2 ring-[#8083ff]/40 border-[#8083ff]" : ""
        }`}
        title="Select AI Model"
      >
        <span className="text-sm select-none">{activeModel.icon}</span>
        <span className="font-medium tracking-tight truncate min-w-0 flex-1 text-left">
          {compact ? activeModel.label.split(" ")[0] : activeModel.label}
        </span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md border ${activeModel.badgeColor} shrink-0 ${compact ? "inline-block" : "hidden sm:inline-block"}`}
        >
          {activeModel.badge}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#908fa0] transition-transform duration-200 ${
            open ? "rotate-180 text-[#c0c1ff]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } right-0 z-50 w-[min(20rem,calc(100vw-1rem))] rounded-2xl bg-[#131315]/95 backdrop-blur-xl border border-[#353437] shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#353437]/60 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#908fa0] uppercase">
              Select AI Engine
            </span>
            <span className="text-[10px] font-mono text-[#c0c1ff] flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Cloud Mix
            </span>
          </div>

          {/* Options */}
          <div className="space-y-1">
            {MODEL_OPTIONS.map((m) => {
              const isSelected = m.id === selectedModel;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (onSelectModel) {
                      onSelectModel(m.id);
                    }
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer group ${
                    isSelected
                      ? "bg-[#8083ff]/15 border border-[#8083ff]/40 text-[#e5e1e4]"
                      : "hover:bg-[#1c1b1d] text-[#c7c4d7] border border-transparent"
                  }`}
                >
                  <div className="text-lg shrink-0 mt-0.5 select-none">
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? "text-[#c0c1ff]" : "text-[#e5e1e4]"
                        }`}
                      >
                        {m.label}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${m.badgeColor}`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#908fa0] leading-snug line-clamp-2">
                      {m.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#8083ff] shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
