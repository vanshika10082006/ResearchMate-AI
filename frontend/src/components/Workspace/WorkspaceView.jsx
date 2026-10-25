import React, { useState } from "react";
import {
  ArrowLeft,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
  Play,
  MessageSquare,
  Maximize2,
} from "lucide-react";
import PdfViewerPanel from "./PdfViewerPanel.jsx";
import InsightsPanel from "./InsightsPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function WorkspaceView({
  paper,
  availablePapers,
  onSelectPaper,
  initialTab,
  onClose,
  selectedModel,
  setSelectedModel,
  serverStatus,
  onDeletePaper,
  isChatPoppedOut,
  isChatVisible,
  onToggleChat,
}) {
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = React.useRef(false);
  const documentId = paper?.document_id || paper?.id;
  const pdfUrl = documentId ? `${API_BASE}/documents/${documentId}/pdf` : "";

  const handleToggleRead = async () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      isReadingRef.current = false;
      showActionMessage("Stopped reading.");
      return;
    }

    if (!documentId) return;

    showActionMessage("Preparing to read...");
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}/content`);
      const data = await res.json();

      if (!data.chunks || data.chunks.length === 0) {
        showActionMessage("No text found.");
        return;
      }

      window.speechSynthesis.cancel();
      let currentIndex = 0;

      const speakNextChunk = () => {
        if (!isReadingRef.current) return;
        if (currentIndex >= data.chunks.length) {
          setIsReading(false);
          isReadingRef.current = false;
          showActionMessage("Finished reading.");
          return;
        }

        const utterance = new SpeechSynthesisUtterance(
          data.chunks[currentIndex],
        );
        utterance.rate = 1.0;

        utterance.onend = () => {
          currentIndex++;
          speakNextChunk();
        };

        utterance.onerror = (e) => {
          console.error("TTS Error", e);
          setIsReading(false);
          isReadingRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
      };

      setIsReading(true);
      isReadingRef.current = true;
      speakNextChunk();
      showActionMessage("Reading started...");
    } catch (e) {
      showActionMessage("Failed to load text.");
    }
  };

  const showActionMessage = (message) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 2500);
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("PDF is not available");

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = (
        paper?.fileName ||
        paper?.filename ||
        paper?.title ||
        "document"
      )
        .replace(/\.pdf$/i, "")
        .replace(/[<>:"/\\|?*]+/g, "-")
        .trim();
      link.href = downloadUrl;
      link.download = `${filename || "document"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      showActionMessage("PDF downloaded");
    } catch (error) {
      showActionMessage(error.message);
    }
  };

  const handleShare = async () => {
    if (!pdfUrl) return;

    const shareData = {
      title: paper?.title || "Research paper",
      text: "Research paper from ResearchMate AI",
      url: pdfUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showActionMessage("Share sheet opened");
      } else {
        await navigator.clipboard.writeText(pdfUrl);
        showActionMessage("PDF link copied");
      }
    } catch (error) {
      if (error.name !== "AbortError") showActionMessage("Unable to share PDF");
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-[#0e0e10]">
      {/* Workspace Sub-Header */}
      <div className="h-11 shrink-0 bg-[#1a191c] border-b border-[#2a292d] flex items-center justify-between px-4 gap-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="h-4 w-px bg-[#353437]" />
          <h2 className="text-sm font-bold text-[#e5e1e4] truncate">
            {paper?.title || "Document"}
          </h2>
          <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8083ff]/10 text-[#c0c1ff] border border-[#8083ff]/20">
            {paper?.numChunks || 0} Chunks
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] transition-colors cursor-pointer"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[#353437]" />

          {/* Start/Stop Reading */}
          <button
            onClick={handleToggleRead}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-linear-to-r from-[#8083ff] to-[#6c6fff] hover:opacity-90 text-white text-[11px] font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(128,131,255,0.3)]"
          >
            {isReading ? (
              <span className="w-2.5 h-2.5 bg-white rounded-sm" />
            ) : (
              <Play className="w-3 h-3 fill-white" />
            )}
            {isReading ? "Stop" : "Start"}
          </button>
          {actionMessage && (
            <span className="text-[10px] text-[#7bd0ff] whitespace-nowrap">
              {actionMessage}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: PDF Viewer */}
        <div className="flex-1 min-w-0 border-r border-[#2a292d] overflow-hidden flex flex-col">
          {paper && (
            <PdfViewerPanel key={paper.id || paper.document_id} paper={paper} />
          )}
        </div>

        {/* RIGHT: Chat Panel Dock Target */}
        {paper && isChatVisible && !isChatPoppedOut && (
          <div
            id="chat-dock-target"
            className="basis-[420px] w-[420px] min-w-[420px] max-w-[420px] grow-0 shrink-0 overflow-hidden relative"
          />
        )}
      </div>

      {!isChatVisible && !isChatPoppedOut && (
        <button
          type="button"
          onClick={onToggleChat}
          className="absolute right-7 top-40 z-60 flex items-center gap-2 rounded-xl bg-[#8083ff] px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-[#7073ef] transition-colors cursor-pointer"
          title="Open chat"
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
      )}

      {/* BOTTOM: Analysis / Insights Panel */}
      <div
        className={`shrink-0 border-t border-[#2a292d] bg-[#131315] transition-all duration-300 flex flex-col ${
          insightsExpanded ? "h-[260px] lg:h-[280px]" : "h-10"
        }`}
      >
        {/* Analysis Header Bar */}
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-[#1a191c] border-b border-[#2a292d]">
          <span className="text-xs font-bold text-[#e5e1e4] tracking-wide">
            Analysis
          </span>
          <button
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#c0c1ff] text-[11px] font-semibold transition-colors cursor-pointer border border-[#353437]/60"
          >
            {insightsExpanded ? "Collapse" : "Expand"}
            {insightsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
        {/* Insights Content */}
        {insightsExpanded && (
          <div className="flex-1 overflow-hidden">
            {paper && (
              <InsightsPanel paper={paper} selectedModel={selectedModel} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
