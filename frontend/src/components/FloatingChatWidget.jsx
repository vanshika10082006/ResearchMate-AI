import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import ReactMarkdown from "react-markdown";
import {
  MessageSquareCode,
  Send,
  Loader2,
  Sparkles,
  Terminal,
  Zap,
  X,
  Maximize2,
  Minimize2,
  FileText,
  Highlighter,
  StickyNote,
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

const QUICK_ACTIONS = [
  {
    label: "Main contribution",
    command: "What is the main contribution of this paper?",
    color:
      "bg-[#8083ff]/15 text-[#c0c1ff] border-[#8083ff]/30 hover:bg-[#8083ff]/25",
    icon: "💬",
  },
  {
    label: "Explain the methodology simply",
    command: "Explain the methodology in simple words.",
    color:
      "bg-[#8083ff]/15 text-[#c0c1ff] border-[#8083ff]/30 hover:bg-[#8083ff]/25",
    icon: "💬",
  },
  {
    label: "Compare with BERT",
    command: "Compare this paper with BERT.",
    color:
      "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25",
    icon: "💬",
  },
  {
    label: "Identify limitations",
    command: "What are the limitations of this paper?",
    color:
      "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25",
    icon: "💬",
  },
];

export default function FloatingChatWidget({
  paper,
  availablePapers = [],
  onSelectPaper,
  selectedModel,
  setSelectedModel,
  selectedLanguage = "English",
  isPoppedOut,
  setIsPoppedOut,
  isVisible,
  setIsVisible,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [showPaperMenu, setShowPaperMenu] = useState(false);
  const [paperQuery, setPaperQuery] = useState("");
  const [customSkills, setCustomSkills] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [dockTarget, setDockTarget] = useState(null);

  useEffect(() => {
    // Find the dock target when rendering if docked
    if (!isPoppedOut && isVisible) {
      const target = document.getElementById("chat-dock-target");
      if (target) {
        setDockTarget(target);
      } else {
        // Retry after a short delay to allow WorkspaceView to mount
        const timer = setTimeout(() => {
          setDockTarget(document.getElementById("chat-dock-target"));
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      setDockTarget(null);
    }
  }, [isPoppedOut, isVisible]);

  useEffect(() => {
    const handleAskAIEvent = (e) => {
      const text = e.detail;
      setChatInput(text);
      setIsVisible(true);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 50);
    };
    window.addEventListener("ask-ai", handleAskAIEvent);
    return () => window.removeEventListener("ask-ai", handleAskAIEvent);
  }, [setIsVisible]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sendingChat, isVisible, isPoppedOut]);

  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then((res) => res.json())
      .then((data) => setCustomSkills(data.skills || []))
      .catch(() => {});
  }, []);

  // Set welcome message for current paper context
  useEffect(() => {
    if (paper && chatMessages.length === 0) {
      setChatMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello! I've indexed this paper (${paper.numChunks} chunks):\n**${paper.title}**\n\nAsk me anything, or try one of the suggestions below.`,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          modelUsed: selectedModel,
        },
      ]);
    }
  }, [paper]);

  const allSlashCommands = [
    ...customSkills.map((s) => ({
      id: s.id,
      command: s.id.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      name: s.name,
      desc: s.description || "Custom skill",
      isCustom: true,
      icon: "✨",
    })),
    ...BUILT_IN_COMMANDS,
  ];

  const filteredCommands = allSlashCommands.filter(
    (c) =>
      c.command.toLowerCase().includes(slashQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  const filteredPapers = availablePapers.filter((candidate) =>
    (candidate.title || candidate.fileName || "")
      .toLowerCase()
      .includes(paperQuery.toLowerCase()),
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);
    if (val.startsWith("/")) {
      setSlashQuery(val.slice(1).split(" ")[0]);
      setShowSlashMenu(true);
      setShowPaperMenu(false);
    } else if (/(^|\s)@[^\s]*$/.test(val)) {
      const match = val.match(/(^|\s)@([^\s]*)$/);
      setPaperQuery(match?.[2] || "");
      setShowPaperMenu(true);
      setShowSlashMenu(false);
    } else {
      setShowSlashMenu(false);
      setShowPaperMenu(false);
    }
  };

  const handleSelectSlashCommand = (cmd) => {
    setChatInput(`/${cmd.command} `);
    setShowSlashMenu(false);
    chatInputRef.current?.focus();
  };

  const [mentionedPapers, setMentionedPapers] = useState([]);

  const handleSelectPaper = (selectedPaper) => {
    const title = selectedPaper.title || selectedPaper.fileName;
    // Replace the @[query] with @Title
    const replaced = chatInput.replace(/(^|\s)@([^\s]*)$/, `$1@${title} `);
    setChatInput(replaced);

    // Add to mentioned list if not already there
    setMentionedPapers((prev) => {
      if (
        !prev.find(
          (p) =>
            (p.document_id || p.id) ===
            (selectedPaper.document_id || selectedPaper.id),
        )
      ) {
        return [...prev, selectedPaper];
      }
      return prev;
    });

    setPaperQuery("");
    setShowPaperMenu(false);
    chatInputRef.current?.focus();
  };

  const submitMessage = async (text) => {
    if (!text.trim() || sendingChat) return;
    const userText = text.trim();
    setShowSlashMenu(false);
    setShowQuickActions(false);
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: userText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
    setSendingChat(true);

    const loadingId = (Date.now() + 1).toString();
    setChatMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        sender: "ai",
        text: "Thinking...",
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
      let sourceChunks = undefined;

      const activeDocId = paper?.document_id || paper?.id;

      // Extract and resolve all @mentioned papers across availablePapers and mentionedPapers
      const allCandidatePapers = [...(availablePapers || [])];
      if (
        paper &&
        !allCandidatePapers.some((p) => (p.document_id || p.id) === activeDocId)
      ) {
        allCandidatePapers.push(paper);
      }
      if (mentionedPapers && mentionedPapers.length > 0) {
        mentionedPapers.forEach((mp) => {
          if (
            !allCandidatePapers.some(
              (p) => (p.document_id || p.id) === (mp.document_id || mp.id),
            )
          ) {
            allCandidatePapers.push(mp);
          }
        });
      }

      const matchedDocIds = [];
      const lowerUserText = userText.toLowerCase();

      // Check full title / filename matches
      allCandidatePapers.forEach((p) => {
        const id = p.document_id || p.id;
        const title = (p.title || "").toLowerCase();
        const fileName = (
          p.fileName ||
          p.filename ||
          p.name ||
          ""
        ).toLowerCase();
        const baseName = fileName.replace(/\.pdf$/i, "").toLowerCase();

        if (
          (title && lowerUserText.includes(`@${title}`)) ||
          (fileName && lowerUserText.includes(`@${fileName}`)) ||
          (baseName && lowerUserText.includes(`@${baseName}`)) ||
          (id && lowerUserText.includes(`@${id.toLowerCase()}`))
        ) {
          if (id && !matchedDocIds.includes(id)) {
            matchedDocIds.push(id);
          }
        }
      });

      // Also check individual @tokens
      const mentionTokens = userText.match(/@([^\s,]+)/g) || [];
      mentionTokens.forEach((token) => {
        const query = token
          .slice(1)
          .toLowerCase()
          .replace(/^["']|["']$/g, "");
        if (query.length > 1) {
          allCandidatePapers.forEach((p) => {
            const id = p.document_id || p.id;
            const title = (p.title || "").toLowerCase();
            const fileName = (
              p.fileName ||
              p.filename ||
              p.name ||
              ""
            ).toLowerCase();
            if (
              title.includes(query) ||
              fileName.includes(query) ||
              query.includes(fileName) ||
              query.includes(title)
            ) {
              if (id && !matchedDocIds.includes(id)) {
                matchedDocIds.push(id);
              }
            }
          });
        }
      });

      // Target document IDs: If user specifically mentioned paper(s), use ONLY those! Otherwise fallback to active document.
      const docIds =
        matchedDocIds.length > 0
          ? matchedDocIds
          : activeDocId
            ? [activeDocId]
            : [];
      const primaryDocId = docIds[0] || activeDocId;

      if (!primaryDocId) {
        throw new Error(
          "No document context found. Please select a paper or @mention an indexed paper.",
        );
      }

      if (userText.startsWith("/")) {
        const slashMatch = userText.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/s);
        const invokedCmd = slashMatch ? slashMatch[1].toLowerCase() : "";
        const customQuery =
          slashMatch && slashMatch[2] ? slashMatch[2].trim() : "";

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
              document_id: primaryDocId,
              skill_id: matchedSkill.id,
              model: selectedModel,
              language: selectedLanguage,
              custom_query: customQuery,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Skill execution failed");
          answerText = data.result;
        } else {
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
                document_id: primaryDocId,
                model: selectedModel,
                language: selectedLanguage,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            const val = Object.values(data)[0];
            answerText =
              typeof val === "object"
                ? JSON.stringify(val, null, 2)
                : String(val);
          } else {
            // Gather notes for these docs
            let notes = [];
            docIds.forEach((id) => {
              try {
                const storedHighlights =
                  JSON.parse(localStorage.getItem(`highlights_${id}`)) || [];
                const storedBookmarks =
                  JSON.parse(localStorage.getItem(`bookmarks_${id}`)) || [];
                storedHighlights.forEach((h) => {
                  if (h.note)
                    notes.push(`Note on "${h.selectedText}": ${h.note}`);
                  else notes.push(`Highlight: "${h.selectedText}"`);
                });
                storedBookmarks.forEach((b) => {
                  notes.push(`Bookmark: ${b.label}`);
                });
              } catch {}
            });

            const res = await fetch(`${API_BASE}/ask`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                document_ids: docIds,
                notes: notes,
                question: userText,
                model: selectedModel,
                language: selectedLanguage,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            answerText = data.answer;
            sourcesCount = data.sources_used;
            sourceChunks = data.source_chunks;
          }
        }
      } else {
        // Gather notes for these docs
        let notes = [];
        docIds.forEach((id) => {
          try {
            const storedHighlights =
              JSON.parse(localStorage.getItem(`highlights_${id}`)) || [];
            const storedBookmarks =
              JSON.parse(localStorage.getItem(`bookmarks_${id}`)) || [];
            storedHighlights.forEach((h) => {
              if (h.note) notes.push(`Note on "${h.selectedText}": ${h.note}`);
              else notes.push(`Highlight: "${h.selectedText}"`);
            });
            storedBookmarks.forEach((b) => {
              notes.push(`Bookmark: ${b.label}`);
            });
          } catch {}
        });

        const res = await fetch(`${API_BASE}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_ids: docIds,
            notes: notes,
            question: userText,
            model: selectedModel,
            language: selectedLanguage,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        answerText = data.answer;
        sourcesCount = data.sources_used;
        sourceChunks = data.source_chunks;
      }
      const activeModelInfo = MODEL_OPTIONS.find((m) => m.id === selectedModel);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: answerText,
                sourcesCount,
                sourceChunks,
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
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: `Error: ${err.message}`,
                loading: false,
              }
            : m,
        ),
      );
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendChat = (e) => {
    e?.preventDefault();
    submitMessage(chatInput);
  };

  const handleCloseChat = () => {
    setIsVisible(false);
    if (isPoppedOut) setIsPoppedOut(false);
  };

  // Do not render a floating reopen button when chat is hidden.
  if (!isVisible && isPoppedOut) {
    return null;
  }

  // If entirely hidden and not popped out (e.g. docked but closed), render nothing
  if (!isVisible && !isPoppedOut) {
    return null;
  }

  const chatContent = (
    <div className="flex flex-col h-full bg-[#0e0e10] border-[#2a292d] shadow-2xl overflow-hidden w-full">
      {/* Chat Header */}
      <div className="drag-handle flex items-center justify-between px-4 h-11 border-b border-[#2a292d] bg-[#1a191c] shrink-0 cursor-move">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-[#e5e1e4] flex items-center gap-1.5">
            <MessageSquareCode className="w-3.5 h-3.5 text-[#8083ff]" /> Chat
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            compact={true}
          />
          <div className="h-4 w-px bg-[#353437] mx-1" />

          <button
            onClick={() => setIsPoppedOut(!isPoppedOut)}
            className="text-[#908fa0] hover:text-[#e5e1e4] transition-colors p-1 rounded hover:bg-[#2a2a2c] cursor-pointer"
            title={
              isPoppedOut ? "Dock into workspace" : "Pop out to floating window"
            }
          >
            {isPoppedOut ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleCloseChat}
            className="text-[#908fa0] hover:text-[#e5e1e4] transition-colors p-1 rounded hover:bg-[#2a2a2c] cursor-pointer"
            title="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar relative bg-[#0e0e10]">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[92%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-[#8083ff] to-[#6c6fff] text-white font-medium rounded-br-sm shadow-sm"
                  : "bg-[#1c1b1d] text-[#e5e1e4] border border-[#2a292d] rounded-bl-sm"
              }`}
            >
              {msg.loading ? (
                <div className="flex items-center gap-1.5 text-[#7bd0ff]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{msg.text}</span>
                </div>
              ) : msg.sender === "ai" ? (
                <div className="markdown-content text-[12px] leading-relaxed">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
            {/* Footnote badges */}
            <div className="flex items-center gap-1.5 mt-1 px-1 text-[9px] text-[#908fa0] font-mono">
              {msg.sourcesCount !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-[#8083ff]/10 text-[#c0c1ff] border border-[#8083ff]/20">
                  {msg.sourcesCount} sources
                </span>
              )}
              {msg.skillUsedName && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center gap-0.5">
                  <Sparkles className="w-2 h-2" /> {msg.skillUsedName}
                </span>
              )}
            </div>

            {/* Evidence Cards */}
            {msg.sourceChunks &&
              msg.sourceChunks.length > 0 &&
              !msg.loading && (
                <div className="mt-1.5 space-y-1.5 w-full">
                  {msg.sourceChunks.slice(0, 1).map((sc, scIdx) => (
                    <div
                      key={scIdx}
                      className="bg-[#0e0e10] border border-[#2a292d] rounded-lg p-2.5"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FileText className="w-3 h-3 text-[#8083ff]" />
                        <span
                          className="text-[10px] font-semibold text-[#c0c1ff] truncate max-w-[120px]"
                          title={sc.paper_title || "Source"}
                        >
                          {sc.paper_title || "Source"}
                        </span>
                        <span className="text-[9px] text-[#908fa0]">·</span>
                        <span className="text-[10px] font-medium text-[#e5e1e4]">
                          Page {sc.page_number}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#908fa0] italic border-l-2 border-[#8083ff]/40 pl-2 mb-2 line-clamp-2">
                        "{sc.text_snippet}"
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const activeDocId = paper?.document_id || paper?.id;
                            if (
                              sc.document_id &&
                              sc.document_id !== activeDocId
                            ) {
                              const switchPaper = availablePapers.find(
                                (p) =>
                                  (p.id || p.document_id) === sc.document_id,
                              );
                              if (switchPaper) {
                                onSelectPaper?.(switchPaper);
                                // Wait for switch before jumping
                                setTimeout(() => {
                                  window.dispatchEvent(
                                    new CustomEvent("highlight-from-chat", {
                                      detail: {
                                        chunkIndex: sc.chunk_index,
                                        text: sc.text_snippet,
                                      },
                                    }),
                                  );
                                }, 500);
                              }
                            } else {
                              window.dispatchEvent(
                                new CustomEvent("highlight-from-chat", {
                                  detail: {
                                    chunkIndex: sc.chunk_index,
                                    text: sc.text_snippet,
                                  },
                                }),
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#8083ff]/10 border border-[#8083ff]/25 text-[#c0c1ff] text-[9px] font-semibold hover:bg-[#8083ff]/20 transition-colors cursor-pointer"
                        >
                          <Highlighter className="w-2.5 h-2.5" />
                          {sc.document_id &&
                          sc.document_id !== (paper?.document_id || paper?.id)
                            ? "Switch & Highlight"
                            : "Highlight in PDF"}
                        </button>
                        <button
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent("save-note-from-chat", {
                                detail: {
                                  chunkIndex: sc.chunk_index,
                                  text: sc.text_snippet,
                                  noteContent: `AI Evidence: "${msg.text?.substring(0, 80)}..."`,
                                },
                              }),
                            );
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[9px] font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                          <StickyNote className="w-2.5 h-2.5" />
                          Save as Note
                        </button>
                      </div>
                    </div>
                  ))}
                  {msg.sourceChunks.length > 1 && (
                    <details className="group">
                      <summary className="text-[9px] text-[#908fa0] cursor-pointer hover:text-[#c0c1ff] transition-colors px-1">
                        Show {msg.sourceChunks.length - 1} more source
                        {msg.sourceChunks.length > 2 ? "s" : ""}
                      </summary>
                      <div className="mt-1.5 space-y-1.5">
                        {msg.sourceChunks.slice(1).map((sc, scIdx) => (
                          <div
                            key={scIdx + 1}
                            className="bg-[#0e0e10] border border-[#2a292d] rounded-lg p-2.5"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FileText className="w-3 h-3 text-[#8083ff]" />
                              <span
                                className="text-[10px] font-semibold text-[#c0c1ff] truncate max-w-[120px]"
                                title={sc.paper_title || "Source"}
                              >
                                {sc.paper_title || "Source"}
                              </span>
                              <span className="text-[9px] text-[#908fa0]">
                                ·
                              </span>
                              <span className="text-[10px] font-medium text-[#e5e1e4]">
                                Page {sc.page_number}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#908fa0] italic border-l-2 border-[#8083ff]/40 pl-2 mb-2 line-clamp-2">
                              "{sc.text_snippet}"
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const activeDocId =
                                    paper?.document_id || paper?.id;
                                  if (
                                    sc.document_id &&
                                    sc.document_id !== activeDocId
                                  ) {
                                    const switchPaper = availablePapers.find(
                                      (p) =>
                                        (p.id || p.document_id) ===
                                        sc.document_id,
                                    );
                                    if (switchPaper) {
                                      onSelectPaper?.(switchPaper);
                                      setTimeout(() => {
                                        window.dispatchEvent(
                                          new CustomEvent(
                                            "highlight-from-chat",
                                            {
                                              detail: {
                                                chunkIndex: sc.chunk_index,
                                                text: sc.text_snippet,
                                              },
                                            },
                                          ),
                                        );
                                      }, 500);
                                    }
                                  } else {
                                    window.dispatchEvent(
                                      new CustomEvent("highlight-from-chat", {
                                        detail: {
                                          chunkIndex: sc.chunk_index,
                                          text: sc.text_snippet,
                                        },
                                      }),
                                    );
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#8083ff]/10 border border-[#8083ff]/25 text-[#c0c1ff] text-[9px] font-semibold hover:bg-[#8083ff]/20 transition-colors cursor-pointer"
                              >
                                <Highlighter className="w-2.5 h-2.5" />
                                {sc.document_id &&
                                sc.document_id !==
                                  (paper?.document_id || paper?.id)
                                  ? "Switch & Highlight"
                                  : "Highlight in PDF"}
                              </button>
                              <button
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent("save-note-from-chat", {
                                      detail: {
                                        chunkIndex: sc.chunk_index,
                                        text: sc.text_snippet,
                                        noteContent: `AI Evidence: "${msg.text?.substring(0, 80)}..."`,
                                      },
                                    }),
                                  );
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[9px] font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
                              >
                                <StickyNote className="w-2.5 h-2.5" />
                                Save as Note
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
          </div>
        ))}

        {/* Quick Action Buttons */}
        {showQuickActions && chatMessages.length <= 1 && (
          <div className="grid grid-cols-1 gap-2 mt-1">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => submitMessage(action.command)}
                className={`flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${action.color}`}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                  <span className="text-sm leading-none">{action.icon}</span>
                  <span>AI command</span>
                </span>
                <span className="text-xs font-medium leading-snug text-[#e5e1e4]">
                  &quot;{action.command}&quot;
                </span>
              </button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />

        {/* Slash Command Autocomplete */}
        {showSlashMenu && (
          <div className="absolute bottom-2 left-2 right-2 bg-[#131315]/95 backdrop-blur-xl border border-[#8083ff]/40 rounded-xl p-1.5 shadow-2xl z-10 max-h-48 overflow-y-auto">
            <div className="px-2 py-1 border-b border-[#353437]/50 mb-1 text-[10px] text-[#908fa0] flex items-center gap-1">
              <Terminal className="w-2.5 h-2.5" /> Slash Commands
            </div>
            {filteredCommands.length === 0 ? (
              <div className="p-2 text-[10px] text-center text-[#908fa0]">
                No match
              </div>
            ) : (
              filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleSelectSlashCommand(cmd)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-[#201f21] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm">{cmd.icon}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-[#8083ff]">
                      /{cmd.command}
                    </span>
                    <span className="text-[11px] text-[#e5e1e4] truncate">
                      {cmd.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Paper Switch Menu */}
        {showPaperMenu && (
          <div className="absolute bottom-2 left-2 right-2 bg-[#131315]/95 backdrop-blur-xl border border-[#8083ff]/40 rounded-xl p-1.5 shadow-2xl z-10 max-h-48 overflow-y-auto">
            <div className="px-2 py-1 border-b border-[#353437]/50 mb-1 text-[10px] text-[#908fa0] flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" /> Switch active document...
            </div>
            {filteredPapers.length === 0 ? (
              <div className="p-2 text-[10px] text-center text-[#908fa0]">
                No papers found
              </div>
            ) : (
              filteredPapers.map((p) => (
                <button
                  key={p.document_id || p.id}
                  type="button"
                  onClick={() => handleSelectPaper(p)}
                  className="w-full text-left p-2 rounded-lg hover:bg-[#201f21] transition-all flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="text-[11px] text-[#e5e1e4] font-medium truncate">
                    {p.title}
                  </span>
                  <span className="text-[9px] text-[#908fa0] truncate">
                    {p.fileName}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendChat}
        className="p-2.5 bg-[#1a191c] border-t border-[#2a292d] shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (showSlashMenu) setShowSlashMenu(false);
              else {
                setChatInput("/");
                setSlashQuery("");
                setShowSlashMenu(true);
                chatInputRef.current?.focus();
              }
            }}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${showSlashMenu ? "bg-[#8083ff] text-[#0e0e10] border-[#8083ff]" : "bg-[#131315] hover:bg-[#201f21] border-[#353437] text-[#c0c1ff]"}`}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={handleInputChange}
            placeholder="Ask a question or type '/'..."
            disabled={sendingChat}
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#131315] border border-[#2a292d] text-xs text-[#e5e1e4] placeholder:text-[#6b6a7a] focus:outline-none focus:border-[#8083ff]/50 transition-all"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || sendingChat}
            className="p-1.5 rounded-lg bg-gradient-to-r from-[#8083ff] to-[#6c6fff] hover:opacity-90 disabled:opacity-40 text-white transition-all cursor-pointer shadow-sm shrink-0"
          >
            {sendingChat ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (!isPoppedOut) {
    // Docked inside WorkspaceView target
    if (dockTarget) {
      return createPortal(chatContent, dockTarget);
    }
    return null;
  }

  // Floating/Popped Out Mode
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <Rnd
        default={{
          x: window.innerWidth - 450,
          y: window.innerHeight - 600,
          width: 400,
          height: 550,
        }}
        minWidth={300}
        minHeight={400}
        bounds="window"
        className="pointer-events-auto rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#353437]"
        dragHandleClassName="drag-handle"
      >
        {chatContent}
      </Rnd>
    </div>
  );
}
