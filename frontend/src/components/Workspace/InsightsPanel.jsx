import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  HelpCircle,
  BookMarked,
  Lightbulb,
  Compass,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function InsightsPanel({ paper, selectedModel }) {
  const [insightTab, setInsightTab] = useState("summary");
  const [insightData, setInsightData] = useState({});
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [customSkills, setCustomSkills] = useState([]);
  const [loadingInsightModel, setLoadingInsightModel] = useState("auto");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/skills`)
      .then((res) => res.json())
      .then((data) => setCustomSkills(data.skills || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (paper && !insightData[insightTab]) {
      fetchInsight(insightTab, paper.document_id);
    }
  }, [paper, insightTab]);

  const fetchInsight = async (tabKey, docId) => {
    if (!docId || insightData[tabKey]) return;
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
          parsed = JSON.parse(
            parsed
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim(),
          );
        } catch {}
      }
      setInsightData((prev) => ({ ...prev, [tabKey]: parsed }));
    } catch (err) {
      setInsightData((prev) => ({
        ...prev,
        [tabKey]: `Error: ${err.message}`,
      }));
    } finally {
      setLoadingInsight(false);
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

  // Parse summary into structured sections
  const parseSummary = (text) => {
    if (!text || typeof text !== "string") return null;
    const lines = text.split("\n").filter((l) => l.trim());
    const takeaways = [];
    const methods = [];
    const facts = [];

    lines.forEach((line) => {
      const clean = line
        .replace(/^[-*•]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .trim();
      if (!clean) return;
      if (clean.length < 80) {
        facts.push(clean);
      } else if (
        clean.toLowerCase().includes("method") ||
        clean.toLowerCase().includes("architecture") ||
        clean.toLowerCase().includes("model") ||
        clean.toLowerCase().includes("approach")
      ) {
        methods.push(clean);
      } else {
        takeaways.push(clean);
      }
    });

    // Ensure we have content in all sections
    if (takeaways.length === 0 && facts.length > 0) {
      takeaways.push(...facts.splice(0, Math.ceil(facts.length / 2)));
    }
    if (methods.length === 0 && takeaways.length > 2) {
      methods.push(takeaways.pop());
    }

    return {
      takeaways: takeaways.slice(0, 4),
      methods: methods.slice(0, 3),
      facts: facts.slice(0, 5),
    };
  };

  const insightTabsList = [
    { key: "summary", label: "Summary", icon: FileText },
    { key: "keywords", label: "Keywords", icon: BookMarked },
    { key: "citations", label: "Citations", icon: LinkIcon },
    { key: "gaps", label: "Research Gap", icon: HelpCircle },
    { key: "future", label: "Future Work", icon: Lightbulb },
    { key: "flashcards", label: "Flashcards", icon: Sparkles },
    { key: "glossary", label: "Glossary", icon: BookMarked },
    { key: "similar", label: "Related Papers", icon: Compass },
  ];

  const summaryParsed =
    insightTab === "summary" && insightData.summary
      ? parseSummary(insightData.summary)
      : null;

  return (
    <div className="flex flex-col h-full bg-[#131315]">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 bg-[#131315] border-b border-[#2a292d] overflow-x-auto shrink-0 custom-scrollbar">
        {insightTabsList.map((t) => (
          <button
            key={t.key}
            onClick={() => setInsightTab(t.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              insightTab === t.key
                ? "bg-[#8083ff]/15 text-[#c0c1ff] border border-[#8083ff]/30"
                : "text-[#6b6a7a] hover:text-[#c7c4d7] hover:bg-[#1c1b1d] border border-transparent"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
        {customSkills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => setInsightTab(skill.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              insightTab === skill.id
                ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                : "text-[#6b6a7a] hover:text-[#c7c4d7] hover:bg-[#1c1b1d] border border-transparent"
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            {skill.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
        {loadingInsight ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Loader2 className="w-5 h-5 text-[#8083ff] animate-spin" />
            <span className="text-[11px] text-[#908fa0]">
              Analyzing with {loadingInsightModel.toUpperCase()}...
            </span>
          </div>
        ) : !insightData[insightTab] ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <FileText className="w-5 h-5 text-[#6b6a7a]" />
            <p className="text-[11px] text-[#908fa0]">
              No analysis is available for this section yet.
            </p>
            <button
              type="button"
              onClick={() => fetchInsight(insightTab, paper.document_id)}
              className="px-2.5 py-1 rounded-md bg-[#2a2a2c] hover:bg-[#353437] border border-[#353437] text-[10px] font-semibold text-[#c0c1ff] transition-colors cursor-pointer"
            >
              Generate analysis
            </button>
          </div>
        ) : insightTab === "summary" && summaryParsed ? (
          /* Rich 3-Column Summary Layout */
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Key Takeaways */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-bold text-[#e5e1e4] uppercase tracking-wider">
                Key Takeaways
              </h4>
              <div className="flex flex-col gap-1.5">
                {summaryParsed.takeaways.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-[#c7c4d7] leading-relaxed"
                  >
                    <span className="text-[#8083ff] mt-0.5 shrink-0">▸</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Methodology Overview */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-bold text-[#e5e1e4] uppercase tracking-wider">
                Methodology Overview
              </h4>
              <div className="flex flex-wrap gap-2">
                {summaryParsed.methods.length > 0 ? (
                  summaryParsed.methods.map((m, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg bg-[#8083ff]/10 border border-[#8083ff]/20 text-[10px] text-[#c0c1ff] font-medium"
                    >
                      {m.length > 60 ? m.substring(0, 60) + "..." : m}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      "Multi-Head\nAttention",
                      "Feed-\nForward",
                      "Scaled\nDot-Product",
                      "Output\nProbabilities",
                    ].map((step, i) => (
                      <React.Fragment key={i}>
                        <div className="px-3 py-2 rounded-lg bg-[#8083ff]/10 border border-[#8083ff]/20 text-[10px] text-[#c0c1ff] font-medium text-center whitespace-pre-line">
                          {step}
                        </div>
                        {i < 3 && (
                          <span className="text-[#8083ff] text-sm">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Facts */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[11px] font-bold text-[#e5e1e4] uppercase tracking-wider">
                Quick Facts
              </h4>
              <div className="flex flex-col gap-1.5">
                {summaryParsed.facts.length > 0 ? (
                  summaryParsed.facts.map((f, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1.5 rounded-md bg-[#1c1b1d] border border-[#2a292d] text-[10px] text-[#c7c4d7]"
                    >
                      {f}
                    </div>
                  ))
                ) : (
                  <div className="px-2.5 py-1.5 rounded-md bg-[#1c1b1d] border border-[#2a292d] text-[10px] text-[#908fa0]">
                    No quick facts extracted yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : insightTab === "flashcards" &&
          Array.isArray(insightData.flashcards) ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {insightData.flashcards.map((fc, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[#1c1b1d] border border-[#2a292d] flex flex-col gap-1.5"
              >
                <span className="text-[10px] font-mono text-[#8083ff] font-bold">
                  Card #{i + 1}
                </span>
                <h4 className="text-[11px] font-bold text-[#e5e1e4]">
                  {fc.question}
                </h4>
                <p className="text-[11px] text-[#c7c4d7] bg-[#0e0e10] p-2 rounded-md border border-[#2a292d]">
                  {fc.answer}
                </p>
              </div>
            ))}
          </div>
        ) : insightTab === "glossary" && Array.isArray(insightData.glossary) ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {insightData.glossary.map((item, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-[#1c1b1d] border border-[#2a292d]"
              >
                <span className="text-[11px] font-bold text-[#7bd0ff] font-mono">
                  {item.term}
                </span>
                <p className="text-[10px] text-[#c7c4d7] mt-0.5">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        ) : insightTab === "similar" && Array.isArray(insightData.similar) ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {insightData.similar.length === 0 ? (
              <p className="text-[11px] text-[#908fa0]">
                No related papers found.
              </p>
            ) : (
              insightData.similar.map((p, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-[#1c1b1d] border border-[#2a292d]"
                >
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-[11px] font-bold text-[#e5e1e4]">
                      {p.title}
                    </h4>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8083ff] shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-[#908fa0] mt-0.5">
                    {p.authors?.join(", ") || "Unknown"}{" "}
                    {p.year && `• ${p.year}`}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="markdown-content p-3 rounded-lg bg-[#1c1b1d]/40 border border-[#2a292d] text-[11px] text-[#d1d0d9] leading-relaxed">
            <ReactMarkdown>
              {typeof insightData[insightTab] === "string"
                ? insightData[insightTab]
                : JSON.stringify(insightData[insightTab] || "", null, 2)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
