import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  FilePlus2,
  FileText,
  X,
  ArrowRightLeft,
  Sparkles,
  CheckCircle2,
  Download,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function ComparePapersCard({
  indexedPapers = [],
  showToast = () => {},
  selectedLanguage = "English",
}) {
  const [paperA, setPaperA] = useState(null);
  const [paperB, setPaperB] = useState(null);
  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [compareError, setCompareError] = useState(null);

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);

  // File Handlers for Paper A
  const handleFileChangeA = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Please upload a valid PDF file for Paper A.");
        return;
      }
      setPaperA({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file: file,
      });
      e.target.value = "";
    }
  };

  const handleDropA = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingA(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Please drop a valid PDF file for Paper A.");
        return;
      }
      setPaperA({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file: file,
      });
    }
  };

  // File Handlers for Paper B
  const handleFileChangeB = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Please upload a valid PDF file for Paper B.");
        return;
      }
      setPaperB({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file: file,
      });
      e.target.value = "";
    }
  };

  const handleDropB = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingB(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Please drop a valid PDF file for Paper B.");
        return;
      }
      setPaperB({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file: file,
      });
    }
  };

  const handleCompare = async () => {
    if (!paperA && !paperB) {
      showToast("Please select Paper A and Paper B to compare.");
      return;
    }
    if (!paperA) {
      showToast("Please select Paper A.");
      return;
    }
    if (!paperB) {
      showToast("Please select Paper B.");
      return;
    }
    if (!paperA.id || !paperB.id) {
      showToast(
        "Please select papers from the indexed library dropdown instead of uploading raw files.",
      );
      return;
    }

    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await fetch(`${API_BASE}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_a_id: paperA.id || paperA.document_id,
          document_b_id: paperB.id || paperB.document_id,
          model: "auto",
          language: selectedLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");

      setComparisonResult(data.comparison);
      setShowComparisonModal(true);
    } catch (err) {
      setCompareError(err.message);
      showToast("Failed to compare: " + err.message);
    } finally {
      setIsComparing(false);
    }
  };

  // Copy comparison markdown
  const handleCopyMarkdown = () => {
    if (!comparisonResult) return;
    navigator.clipboard.writeText(comparisonResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Comparison copied to clipboard.");
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRefA}
        onChange={handleFileChangeA}
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRefB}
        onChange={handleFileChangeB}
        accept=".pdf"
        className="hidden"
      />

      {/* Main Compare Papers Card Container */}
      <div className="relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#0e0e10]/90 backdrop-blur-2xl border border-[#353437]/70 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#464554] overflow-hidden group">
        {/* Ambient Glow Accent */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#8083ff]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#8083ff]/15 transition-colors" />

        {/* Card Header */}
        <div className="flex items-start justify-between gap-4 mb-4 z-10">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#e5e1e4] tracking-tight">
              Compare Papers
            </h3>
            <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
              Upload two PDFs and generate a side-by-side comparison.
            </p>
          </div>
        </div>

        {/* Side-by-side Upload Dropzones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 z-10">
          {/* Paper A Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingA(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingA(false);
            }}
            onDrop={handleDropA}
            onClick={() => fileInputRefA.current?.click()}
            className={`relative flex flex-col items-center justify-center p-5 rounded-xl border border-dashed cursor-pointer transition-all duration-200 select-none min-h-[110px] ${
              isDraggingA
                ? "border-[#8083ff] bg-[#8083ff]/10 shadow-[0_0_20px_rgba(128,131,255,0.25)]"
                : paperA
                  ? "border-[#8083ff]/60 bg-[#1c1b1d]/90 shadow-inner"
                  : "border-[#464554]/70 bg-[#161518]/70 hover:bg-[#1a191d] hover:border-[#8083ff]/50"
            }`}
          >
            {paperA ? (
              <div className="flex flex-col items-center text-center gap-1.5 w-full px-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#7bd0ff] font-semibold bg-[#7bd0ff]/10 px-2 py-0.5 rounded">
                    Paper A
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaperA(null);
                    }}
                    className="p-1 text-[#908fa0] hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors cursor-pointer"
                    title="Remove Paper A"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 max-w-full">
                  <FileText className="w-4 h-4 text-[#c0c1ff] shrink-0" />
                  <span className="text-xs font-semibold text-[#e5e1e4] truncate max-w-[190px]">
                    {paperA.title || paperA.name}
                  </span>
                </div>
                <span className="text-[11px] text-[#908fa0] font-mono">
                  {paperA.size}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <FilePlus2 className="w-5 h-5 text-[#c7c4d7]" />
                <span className="text-xs sm:text-sm font-medium text-[#e5e1e4]">
                  Paper A
                </span>
                <select
                  className="mt-2 w-full max-w-[200px] bg-[#141316] border border-[#353437] rounded px-2 py-1.5 text-xs text-[#e5e1e4] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const selected = indexedPapers.find(
                      (p) => p.id === e.target.value,
                    );
                    if (selected) setPaperA(selected);
                  }}
                  value=""
                >
                  <option value="">Select Indexed Paper...</option>
                  {indexedPapers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.fileName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Paper B Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingB(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingB(false);
            }}
            onDrop={handleDropB}
            onClick={() => fileInputRefB.current?.click()}
            className={`relative flex flex-col items-center justify-center p-5 rounded-xl border border-dashed cursor-pointer transition-all duration-200 select-none min-h-[110px] ${
              isDraggingB
                ? "border-[#8083ff] bg-[#8083ff]/10 shadow-[0_0_20px_rgba(128,131,255,0.25)]"
                : paperB
                  ? "border-[#8083ff]/60 bg-[#1c1b1d]/90 shadow-inner"
                  : "border-[#464554]/70 bg-[#161518]/70 hover:bg-[#1a191d] hover:border-[#8083ff]/50"
            }`}
          >
            {paperB ? (
              <div className="flex flex-col items-center text-center gap-1.5 w-full px-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c0c1ff] font-semibold bg-[#8083ff]/10 px-2 py-0.5 rounded">
                    Paper B
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaperB(null);
                    }}
                    className="p-1 text-[#908fa0] hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors cursor-pointer"
                    title="Remove Paper B"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 max-w-full">
                  <FileText className="w-4 h-4 text-[#c0c1ff] shrink-0" />
                  <span className="text-xs font-semibold text-[#e5e1e4] truncate max-w-[190px]">
                    {paperB.title || paperB.name}
                  </span>
                </div>
                <span className="text-[11px] text-[#908fa0] font-mono">
                  {paperB.size}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <FilePlus2 className="w-5 h-5 text-[#c7c4d7]" />
                <span className="text-xs sm:text-sm font-medium text-[#e5e1e4]">
                  Paper B
                </span>
                <select
                  className="mt-2 w-full max-w-[200px] bg-[#141316] border border-[#353437] rounded px-2 py-1.5 text-xs text-[#e5e1e4] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const selected = indexedPapers.find(
                      (p) => p.id === e.target.value,
                    );
                    if (selected) setPaperB(selected);
                  }}
                  value=""
                >
                  <option value="">Select Indexed Paper...</option>
                  {indexedPapers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.fileName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Compare Papers */}
        <button
          type="button"
          onClick={handleCompare}
          disabled={isComparing}
          className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-white text-black font-semibold text-sm sm:text-base hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none z-10 disabled:opacity-75"
        >
          {isComparing ? (
            <>
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Analyzing & Synthesizing...</span>
            </>
          ) : (
            <span>Compare Papers</span>
          )}
        </button>
      </div>

      {/* Side-by-Side Comparison Modal (Frontend UI Preview) */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#141316] border border-[#353437] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#353437]/70 bg-[#1c1b1d]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#8083ff]/15 border border-[#8083ff]/30 flex items-center justify-center text-[#c0c1ff]">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[#e5e1e4]">
                      Side-by-Side Comparative Matrix
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Synthesis Complete
                    </span>
                  </div>
                  <p className="text-xs text-[#908fa0] mt-0.5">
                    Multi-dimensional comparative analysis powered by FAISS
                    Vector RAG
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-xs font-medium text-[#c0c1ff] transition-colors cursor-pointer"
                  title="Copy comparison markdown"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? "Copied!" : "Copy Report"}
                  </span>
                </button>

                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="p-1.5 rounded-lg text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Comparison Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Paper Header Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#1c1b1d]/70 border border-[#8083ff]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase text-[#7bd0ff] font-bold">
                      Paper A
                    </span>
                    <span className="text-[11px] text-[#908fa0] font-mono">
                      {paperA?.size || "Indexed"}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#e5e1e4]">
                    {paperA?.title || paperA?.name || "Paper A"}
                  </h4>
                </div>

                <div className="p-4 rounded-xl bg-[#1c1b1d]/70 border border-[#c0c1ff]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase text-[#c0c1ff] font-bold">
                      Paper B
                    </span>
                    <span className="text-[11px] text-[#908fa0] font-mono">
                      {paperB?.size || "Indexed"}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#e5e1e4]">
                    {paperB?.title || paperB?.name || "Paper B"}
                  </h4>
                </div>
              </div>

              {compareError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {compareError}
                </div>
              ) : comparisonResult ? (
                <div className="markdown-content prose prose-invert max-w-none text-sm text-[#c7c4d7]">
                  <ReactMarkdown>{comparisonResult}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center text-[#908fa0] py-10">
                  No comparison generated.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#353437]/70 bg-[#1c1b1d]/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-xs font-medium text-[#e5e1e4] transition-colors cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
