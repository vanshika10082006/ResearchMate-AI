import React, { useState, useEffect } from "react";
import {
  Search,
  Sparkles,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import LanguageSelector from "./LanguageSelector.jsx";

export default function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedModel,
  setSelectedModel,
  selectedLanguage,
  setSelectedLanguage,
  serverStatus,
  onCheckHealth,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "library", label: "Document Library" },
    { id: "skills", label: "Plugins & Connectors" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e10]/95 backdrop-blur-xl border-b border-[#353437]/60 shadow-[0_1px_8px_rgba(0,0,0,0.4)] transition-all">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#8083ff] to-[#7bd0ff] p-px shadow-[0_0_16px_rgba(128,131,255,0.4)] group-hover:shadow-[0_0_24px_rgba(128,131,255,0.6)] transition-all">
              <div className="w-full h-full bg-[#131315] rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#c0c1ff]" />
              </div>
            </div>
            <span className="font-semibold text-base sm:text-lg text-[#e5e1e4] tracking-tight flex items-center">
              ResearchMate
              <span className="font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded bg-[#2a2a2c] text-[#c0c1ff] font-medium border border-[#464554]/40">
                AI
              </span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[#1c1b1d]/80 border border-[#353437]/60 backdrop-blur-md">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#2a2a2c] text-[#e5e1e4] shadow-[0_0_16px_rgba(192,193,255,0.15)] border border-[#464554]/50"
                      : "text-[#c7c4d7] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Model Selector + Search + Server Status */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-md justify-end">
          {/* Search input field */}
          <div className="relative w-full max-w-xs hidden md:block">
            <div className="flex items-center w-full px-3 py-1.5 rounded-xl bg-[#1c1b1d]/80 border border-[#353437]/80 focus-within:border-[#8083ff]/60 focus-within:bg-[#201f21] transition-all">
              <Search className="w-4 h-4 text-[#908fa0] mr-2 shrink-0 select-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uploaded papers..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#e5e1e4] placeholder:text-[#908fa0]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#908fa0] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Language Selector */}
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />

          {/* Real Server Status Indicator */}
          <button
            onClick={onCheckHealth}
            title="Click to recheck backend connection"
            className="flex w-7 h-7 items-center justify-center rounded-full bg-[#1c1b1d] border border-[#353437] text-xs font-mono transition-colors hover:border-[#8083ff]/50"
          >
            {serverStatus === "online" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-emerald-300 font-medium"></span>
              </>
            ) : serverStatus === "checking" ? (
              <>
                <RefreshCw className="w-3 h-3 text-[#7bd0ff] animate-spin" />
                <span className="text-[#7bd0ff]"></span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                <span className="text-rose-300 font-medium"></span>
              </>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg text-[#c7c4d7] hover:text-[#e5e1e4] hover:bg-[#2a2a2c] transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 py-3 bg-[#131315] border-b border-[#353437] flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-[#2a2a2c] text-[#e5e1e4] font-semibold"
                  : "text-[#c7c4d7] hover:bg-[#201f21]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
