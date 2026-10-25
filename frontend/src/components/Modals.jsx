import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  Sparkles,
  MessageSquareCode,
  Send,
  BookOpen,
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  ExternalLink,
  HelpCircle,
  BookMarked,
  Lightbulb,
  Compass,
  Link as LinkIcon,
  Terminal,
  Zap,
} from "lucide-react";
import ModelSelector, { MODEL_OPTIONS } from "./ModelSelector.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const BUILT_IN_COMMANDS = [
  {
    id: "summary",
    command: "summary",
    name: "Executive Summary",
    desc: "Concise 150-200 word academic summary",
    icon: "📋",
  },
  {
    id: "gaps",
    command: "gaps",
    name: "Research Gaps",
    desc: "Identify unresolved problems & limitations",
    icon: "🔍",
  },
  {
    id: "future",
    command: "future",
    name: "Future Work",
    desc: "Actionable concrete future research directions",
    icon: "🔮",
  },
  {
    id: "keywords",
    command: "keywords",
    name: "Key Terms",
    desc: "Extract 10-15 technical concepts & keywords",
    icon: "🏷️",
  },
  {
    id: "citations",
    command: "citations",
    name: "Citations Analysis",
    desc: "Analyze references and related work cited",
    icon: "🔗",
  },
  {
    id: "flashcards",
    command: "flashcards",
    name: "Study Flashcards",
    desc: "Generate 5-10 concept flashcards",
    icon: "🗂️",
  },
  {
    id: "glossary",
    command: "glossary",
    name: "Technical Glossary",
    desc: "Extract and define complex acronyms",
    icon: "📖",
  },
];

export default function Modals({
  selectedModel = "auto",
  setSelectedModel,
  selectedPaperForInsights,
  onCloseInsights,
  selectedPaperForChat,
  onCloseChat,
}) {
  // ─── Insights Modal State ───
  const [insightTab, setInsightTab] = useState("summary");
  const [insightData, setInsightData] = useState({});
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [customSkills, setCustomSkills] = useState([]);
  const [loadingInsightModel, setLoadingInsightModel] = useState("auto");
  const [copied, setCopied] = useState(false);

  // ─── Chat Modal State ───
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat]);

  // Fetch custom skills on mount
  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then((res) => res.json())
      .then((data) => setCustomSkills(data.skills || []))
      .catch((e) => console.error("Failed to load skills:", e));
  }, []);

  // Initialize chat when paper opens
  useEffect(() => {
    if (selectedPaperForChat) {
      setChatMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello! I have indexed **${selectedPaperForChat.title}** (${selectedPaperForChat.numChunks} chunks).\n\nAsk me anything, or type **\`/\`** to run a specialized skill (e.g., \`/eli5\`, \`/peer-reviewer\`, \`/summary\`).`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          modelUsed: selectedModel,
        },
      ]);
    }
  }, [selectedPaperForChat]);

  // Reset insight cache when paper changes
  useEffect(() => {
    if (selectedPaperForInsights) {
      setInsightData({});
      setInsightTab("summary");
      fetchInsight("summary", selectedPaperForInsights.document_id);
    }
  }, [selectedPaperForInsights]);

  // Fetch insight for active tab
  const fetchInsight = async (tabKey, docId) => {
    if (!docId) return;
    if (insightData[tabKey]) return; // already cached

    const requestModel = selectedModel;
    setLoadingInsight(true);
    setLoadingInsightModel(requestModel);
    const endpointMap = {
      summary: { url: `${API_BASE}/summarize`, key: "summary" },
      keywords: { url: `${API_BASE}/keywords`, key: "keywords" },
      citations: { url: `${API_BASE}/citations`, key: "citations" },
      gaps: { url: `${API_BASE}/research-gaps`, key: "research_gaps" },
      future: { url: `${API_BASE}/future-work`, key: "future_work" },
      flashcards: { url: `${API_BASE}/flashcards`, key: "flashcards" },
      glossary: { url: `${API_BASE}/glossary`, key: "glossary" },
      similar: { url: `${API_BASE}/similar-papers`, key: "similar_papers" },
    };

    let target = endpointMap[tabKey];
    let isCustomSkill = false;
    let customSkillId = null;

    if (!target) {
      const customMatch = customSkills.find((s) => s.id === tabKey);
      if (customMatch) {
        isCustomSkill = true;
        customSkillId = customMatch.id;
        target = { url: `${API_BASE}/skills/run`, key: "result" };
      } else {
        setLoadingInsight(false);
        return;
      }
    }

    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          model: requestModel,
          ...(isCustomSkill ? { skill_id: customSkillId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch insight");

      let parsed = data[target.key];
      if (
        (tabKey === "flashcards" || tabKey === "glossary") &&
        typeof parsed === "string"
      ) {
        try {
          const clean = parsed
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          parsed = JSON.parse(clean);
        } catch {
          // Keep as string if json parse fails
        }
      }

      setInsightData((prev) => ({
        ...prev,
        [tabKey]: parsed,
      }));
    } catch (err) {
      setInsightData((prev) => ({
        ...prev,
        [tabKey]: `Error: ${err.message}`,
      }));
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleTabSwitch = (key) => {
    setInsightTab(key);
    if (selectedPaperForInsights && !insightData[key]) {
      fetchInsight(key, selectedPaperForInsights.document_id);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(
      typeof text === "string" ? text : JSON.stringify(text, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!selectedPaperForInsights) return;
    const content = `# Research Insights: ${selectedPaperForInsights.title}
File: ${selectedPaperForInsights.fileName}
Chunks Indexed: ${selectedPaperForInsights.numChunks}

---

## Executive Summary
${insightData.summary || "Not loaded"}

## Key Terms & Concepts
${insightData.keywords || "Not loaded"}

## Citation Analysis
${insightData.citations || "Not loaded"}

## Research Gaps
${insightData.gaps || "Not loaded"}

## Suggested Future Work
${insightData.future || "Not loaded"}
`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPaperForInsights.fileName.replace(/\.[^/.]+$/, "")}_Insights.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Slash Commands Handling in Chat ───
  const allSlashCommands = [
    // Custom Skills
    ...customSkills.map((s) => ({
      id: s.id,
      command: s.id.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      name: s.name,
      desc: s.description || "Custom analytical skill",
      isCustom: true,
      icon: "✨",
    })),
    // Built-in Actions
    ...BUILT_IN_COMMANDS,
  ];

  const filteredCommands = allSlashCommands.filter(
    (c) =>
      c.command.toLowerCase().includes(slashQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);

    if (val.startsWith("/")) {
      const query = val.slice(1).split(" ")[0]; // text immediately after /
      setSlashQuery(query);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSlashCommand = (cmd) => {
    setChatInput(`/${cmd.command} `);
    setShowSlashMenu(false);
    chatInputRef.current?.focus();
  };

  // ─── Chat Send Handler ───
  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !selectedPaperForChat || sendingChat) return;

    const userText = chatInput.trim();
    setShowSlashMenu(false);

    const userMsg = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setSendingChat(true);

    const loadingId = (Date.now() + 1).toString();
    setChatMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        sender: "ai",
        text: "Thinking & synthesizing grounded answer...",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        loading: true,
      },
    ]);

    try {
      let answerText = "";
      let skillUsedName = null;
      let sourcesCount = undefined;

      // Check if message starts with a slash command: e.g. "/eli5 explain the intro"
      if (userText.startsWith("/")) {
        const slashMatch = userText.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/s);
        const invokedCmd = slashMatch ? slashMatch[1].toLowerCase() : "";
        const customQuery =
          slashMatch && slashMatch[2] ? slashMatch[2].trim() : "";

        // Check if matching a custom skill
        const matchedSkill = customSkills.find(
          (s) =>
            s.id.toLowerCase() === invokedCmd ||
            s.name.toLowerCase().replace(/\s+/g, "-") === invokedCmd ||
            s.id.toLowerCase().startsWith(invokedCmd),
        );

        if (matchedSkill) {
          skillUsedName = matchedSkill.name;
          const res = await fetch(`${API_BASE}/skills/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_id: selectedPaperForChat.document_id,
              skill_id: matchedSkill.id,
              model: selectedModel,
              custom_query: customQuery,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Skill execution failed");
          answerText = data.result;
        } else {
          // Check built-in commands
          const builtInMap = {
            summary: "/summarize",
            gaps: "/research-gaps",
            future: "/future-work",
            keywords: "/keywords",
            citations: "/citations",
            flashcards: "/flashcards",
            glossary: "/glossary",
          };

          if (builtInMap[invokedCmd]) {
            skillUsedName =
              BUILT_IN_COMMANDS.find((b) => b.command === invokedCmd)?.name ||
              invokedCmd;
            const res = await fetch(`${API_BASE}${builtInMap[invokedCmd]}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                document_id: selectedPaperForChat.document_id,
                model: selectedModel,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to run action");
            const val = Object.values(data)[0];
            answerText =
              typeof val === "object"
                ? JSON.stringify(val, null, 2)
                : String(val);
          } else {
            // Standard fallback RAG with prompt
            const res = await fetch(`${API_BASE}/ask`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                document_id: selectedPaperForChat.document_id,
                question: userText,
                model: selectedModel,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to get answer");
            answerText = data.answer;
            sourcesCount = data.sources_used;
          }
        }
      } else {
        // Normal question (standard RAG)
        const res = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: selectedPaperForChat.document_id,
            question: userText,
            model: selectedModel,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get answer");
        answerText = data.answer;
        sourcesCount = data.sources_used;
      }

      const activeModelInfo = MODEL_OPTIONS.find((m) => m.id === selectedModel);

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: answerText,
                sourcesCount,
                skillUsedName,
                modelUsed: activeModelInfo
                  ? activeModelInfo.label
                  : selectedModel,
                loading: false,
              }
            : m,
        ),
      );
    } catch (err) {
      const errorText = err.message.includes("Document not found")
        ? "This document was uploaded before persistence was enabled. Please upload the PDF file again on the Dashboard."
        : `Error: ${err.message}`;
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: errorText,
                loading: false,
              }
            : m,
        ),
      );
    } finally {
      setSendingChat(false);
    }
  };

  const insightTabs = [
    { key: "summary", label: "Summary", icon: FileText },
    { key: "keywords", label: "Keywords", icon: BookMarked },
    { key: "citations", label: "Citations", icon: LinkIcon },
    { key: "gaps", label: "Research Gaps", icon: HelpCircle },
    { key: "future", label: "Future Work", icon: Lightbulb },
    { key: "flashcards", label: "Flashcards", icon: Sparkles },
    { key: "glossary", label: "Glossary", icon: BookOpen },
    { key: "similar", label: "Related Papers", icon: Compass },
  ];

  return (
    <>
      {/* ─── 1. Paper Insights Modal ─── */}
      {selectedPaperForInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#131315] border border-[#353437] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#353437]/70 bg-[#1c1b1d]/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#e5e1e4] truncate">
                    {selectedPaperForInsights.title}
                  </h3>
                  <p className="text-xs text-[#908fa0] truncate">
                    {selectedPaperForInsights.fileName} •{" "}
                    {selectedPaperForInsights.numChunks} Chunks
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Modern Sleek Model Selector */}
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />

                <button
                  onClick={handleDownloadReport}
                  title="Download Markdown report"
                  className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer border border-[#353437]/60"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={onCloseInsights}
                  className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer border border-[#353437]/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex items-center gap-1.5 p-2 px-5 bg-[#0e0e10] border-b border-[#353437]/50 overflow-x-auto">
              {insightTabs.map((t) => {
                const Icon = t.icon;
                const isActive = insightTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabSwitch(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40"
                        : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#1c1b1d]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}

              {/* Custom Skills Tabs */}
              {customSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleTabSwitch(skill.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    insightTab === skill.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#1c1b1d]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{skill.name}</span>
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto min-h-[320px] max-h-[60vh] text-sm text-[#e5e1e4] leading-relaxed">
              {loadingInsight ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Loader2 className="w-8 h-8 text-[#8083ff] animate-spin" />
                  <span className="text-xs text-[#908fa0]">
                    Generating analysis with {loadingInsightModel.toUpperCase()}{" "}
                    model...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Copy button */}
                  {insightData[insightTab] && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleCopy(insightData[insightTab])}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Content</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Render content based on active tab */}
                  {insightTab === "flashcards" &&
                  Array.isArray(insightData.flashcards) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {insightData.flashcards.map((fc, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-2"
                        >
                          <span className="text-xs font-mono text-[#8083ff] font-semibold">
                            Card #{i + 1}
                          </span>
                          <h4 className="text-xs font-bold text-[#e5e1e4]">
                            {fc.question}
                          </h4>
                          <p className="text-xs text-[#c7c4d7] bg-[#201f21] p-3 rounded-lg border border-[#353437]/50 mt-1">
                            {fc.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : insightTab === "glossary" &&
                    Array.isArray(insightData.glossary) ? (
                    <div className="flex flex-col gap-3">
                      {insightData.glossary.map((item, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-1"
                        >
                          <span className="text-xs font-bold text-[#7bd0ff] font-mono">
                            {item.term}
                          </span>
                          <p className="text-xs text-[#c7c4d7]">
                            {item.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : insightTab === "similar" &&
                    Array.isArray(insightData.similar) ? (
                    <div className="flex flex-col gap-3">
                      {insightData.similar.length === 0 ? (
                        <p className="text-xs text-[#908fa0]">
                          No related papers found on Semantic Scholar.
                        </p>
                      ) : (
                        insightData.similar.map((p, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437] flex flex-col gap-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-[#e5e1e4]">
                                {p.title}
                              </h4>
                              {p.url && (
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#8083ff] hover:text-[#c0c1ff] shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#908fa0]">
                              <span>
                                {p.authors?.join(", ") || "Unknown authors"}
                              </span>
                              {p.year && <span>• {p.year}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="markdown-content p-4 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/50 text-xs sm:text-sm">
                      <ReactMarkdown>
                        {typeof insightData[insightTab] === "string"
                          ? insightData[insightTab]
                          : JSON.stringify(insightData[insightTab], null, 2)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Paper Interactive Chat Modal ─── */}
      {selectedPaperForChat && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl h-full bg-[#131315] border-l border-[#353437] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#353437] bg-[#1c1b1d]/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8083ff] to-[#7bd0ff] flex items-center justify-center text-[#0e0e10] shrink-0 shadow-[0_0_12px_rgba(128,131,255,0.4)]">
                  <MessageSquareCode className="w-5 h-5 font-bold" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#e5e1e4] truncate">
                    {selectedPaperForChat.title}
                  </h3>
                  <span className="text-[11px] text-[#7bd0ff] font-mono">
                    RAG Grounded • {selectedPaperForChat.numChunks} Chunks
                  </span>
                </div>
              </div>

              {/* Chat Header Actions: Model Selector + Close */}
              <div className="flex items-center gap-2 shrink-0">
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  compact={true}
                />
                <button
                  onClick={onCloseChat}
                  className="p-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-[#c7c4d7] hover:text-white transition-colors cursor-pointer border border-[#353437]/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[88%] ${
                    msg.sender === "user"
                      ? "ml-auto items-end"
                      : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-[#8083ff] to-[#7bd0ff] text-[#0e0e10] font-medium rounded-br-none shadow-[0_0_16px_rgba(128,131,255,0.3)]"
                        : "bg-[#1c1b1d] text-[#e5e1e4] border border-[#353437]/80 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 text-[#7bd0ff]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{msg.text}</span>
                      </div>
                    ) : msg.sender === "ai" ? (
                      <div className="markdown-content">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  {/* Message Footnotes: Model badge + Skill badge */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-[#908fa0] font-mono">
                    <span>{msg.time}</span>
                    {msg.skillUsedName && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> {msg.skillUsedName}
                      </span>
                    )}
                    {msg.modelUsed && (
                      <span className="text-[#8083ff]">
                        via {msg.modelUsed}
                      </span>
                    )}
                    {msg.sourcesCount !== undefined && (
                      <span>• {msg.sourcesCount} chunks</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions Strip */}
            <div className="px-4 py-2 bg-[#0e0e10] border-t border-[#353437]/40 flex gap-2 overflow-x-auto items-center">
              <span className="text-[10px] uppercase font-mono text-[#908fa0] shrink-0">
                Try:
              </span>
              {[
                "/eli5 Explain core theory",
                "/peer-reviewer Critique rigor",
                "/summary",
                "What are the main equations?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setChatInput(prompt);
                    chatInputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#1c1b1d] hover:bg-[#2a2a2c] hover:border-[#8083ff]/40 border border-[#353437] text-[11px] text-[#908fa0] hover:text-[#c0c1ff] whitespace-nowrap transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Slash Command Autocomplete Popover */}
            {showSlashMenu && (
              <div className="mx-4 mb-2 bg-[#131315]/95 backdrop-blur-xl border border-[#8083ff]/50 rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-150 max-h-56 overflow-y-auto">
                <div className="px-2.5 py-1.5 border-b border-[#353437]/60 mb-1 flex items-center justify-between text-[11px] text-[#908fa0]">
                  <span className="font-semibold uppercase tracking-wider text-[#c0c1ff] flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Slash Commands & Skills
                  </span>
                  <span>Type to filter • Click to select</span>
                </div>
                {filteredCommands.length === 0 ? (
                  <div className="p-3 text-xs text-[#908fa0] text-center">
                    No matching skill or command found for &quot;/{slashQuery}
                    &quot;
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredCommands.map((cmd) => (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => handleSelectSlashCommand(cmd)}
                        className="w-full text-left p-2 rounded-xl hover:bg-[#201f21] hover:border-[#8083ff]/40 border border-transparent transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base select-none">
                            {cmd.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#8083ff] group-hover:text-[#c0c1ff]">
                                /{cmd.command}
                              </span>
                              <span className="text-xs font-medium text-[#e5e1e4] truncate">
                                {cmd.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#908fa0] truncate">
                              {cmd.desc}
                            </p>
                          </div>
                        </div>
                        {cmd.isCustom && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Custom Skill
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSendChat}
              className="p-4 bg-[#1c1b1d] border-t border-[#353437] flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                {/* Trigger Slash Command Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (showSlashMenu) {
                      setShowSlashMenu(false);
                    } else {
                      setChatInput("/");
                      setSlashQuery("");
                      setShowSlashMenu(true);
                      chatInputRef.current?.focus();
                    }
                  }}
                  title="Trigger slash command / skills"
                  className={`p-2 rounded-xl border transition-all text-xs font-mono flex items-center gap-1 cursor-pointer shrink-0 ${
                    showSlashMenu
                      ? "bg-[#8083ff] text-[#0e0e10] border-[#8083ff]"
                      : "bg-[#131315] hover:bg-[#201f21] border-[#353437] text-[#c0c1ff]"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Skills</span>
                </button>

                {/* Main Input Field */}
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={handleInputChange}
                  placeholder="Ask a question or type '/' to use a skill..."
                  disabled={sendingChat}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#131315] border border-[#353437] text-xs sm:text-sm text-[#e5e1e4] placeholder:text-[#908fa0] focus:outline-none focus:border-[#8083ff] transition-all"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingChat}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#8083ff] to-[#7bd0ff] hover:opacity-95 disabled:opacity-50 text-[#0e0e10] font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(128,131,255,0.4)] shrink-0"
                >
                  {sendingChat ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
