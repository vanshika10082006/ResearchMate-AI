import React from "react";
import { Globe } from "lucide-react";

export const LANGUAGE_OPTIONS = [
  { id: "English", label: "English 🇺🇸" },
  { id: "Spanish", label: "Español 🇪🇸" },
  { id: "French", label: "Français 🇫🇷" },
  { id: "German", label: "Deutsch 🇩🇪" },
  { id: "Chinese", label: "中文 🇨🇳" },
  { id: "Hindi", label: "हिन्दी 🇮🇳" },
  { id: "Japanese", label: "日本語 🇯🇵" },
  { id: "Arabic", label: "العربية 🇸🇦" },
  { id: "Portuguese", label: "Português 🇧🇷" },
  { id: "Russian", label: "Русский 🇷🇺" },
  { id: "Korean", label: "한국어 🇰🇷" },
  { id: "Italian", label: "Italiano 🇮🇹" },
];

export default function LanguageSelector({ selectedLanguage, setSelectedLanguage }) {
  return (
    <div className="relative flex items-center">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1c1b1d]/80 border border-[#353437]/80 hover:border-[#8083ff]/50 transition-all text-xs text-[#e5e1e4]">
        <Globe className="w-3.5 h-3.5 text-[#7bd0ff] shrink-0" />
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="bg-transparent border-none outline-none cursor-pointer text-xs font-medium text-[#e5e1e4] py-0 pr-1 select-none"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.id} value={lang.id} className="bg-[#141316] text-[#e5e1e4]">
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
