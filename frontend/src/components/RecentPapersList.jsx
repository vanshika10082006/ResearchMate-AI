import React from "react";
import {
  FileText,
  MessageSquare,
  Sparkles,
  Trash2,
  ArrowUpRight,
  Clock,
  Layers,
} from "lucide-react";

export default function RecentPapersList({
  papers,
  onOpenInsights,
  onOpenChat,
  onDeletePaper,
  onExportInsights,
}) {
  return (
    <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-2xl bg-[#0e0e10]/90 backdrop-blur-2xl border border-[#353437]/70 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#353437]/50">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#e5e1e4] tracking-tight">
            Indexed Manuscripts ({papers.length})
          </h3>
          <p className="text-xs text-[#908fa0] mt-0.5">
            Active papers loaded in memory ready for synthesis and question
            answering
          </p>
        </div>

        {papers.length > 0 && (
          <button
            onClick={onExportInsights}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs font-medium text-[#c0c1ff] transition-all cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Export Synthesis</span>
          </button>
        )}
      </div>

      {/* Papers List */}
      {papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl bg-[#1c1b1d]/40 border border-[#353437]/40 border-dashed">
          <div className="w-12 h-12 rounded-2xl bg-[#201f21] flex items-center justify-center text-[#908fa0] mb-3 border border-[#353437]">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#e5e1e4]">
            No manuscripts indexed yet
          </h4>
          <p className="text-xs text-[#908fa0] max-w-sm mt-1 mb-4">
            Upload your first research paper PDF using the dropzone above to
            extract citations, generate summaries, and interact with the AI
            assistant.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-[#1c1b1d]/70 hover:bg-[#201f21] border border-[#353437]/60 hover:border-[#8083ff]/40 transition-all gap-4 group"
            >
              {/* Paper Meta */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#2a2a2c] border border-[#464554]/40 flex items-center justify-center text-[#c0c1ff] shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#e5e1e4] truncate group-hover:text-[#c0c1ff] transition-colors">
                      {paper.title}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Indexed
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#908fa0]">
                    <span className="truncate max-w-50">{paper.fileName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#7bd0ff]" />
                      {paper.numChunks} Chunks
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {paper.uploadedAt || "Just now"}
                    </span>
                    <span>•</span>
                    <span>{paper.fileSize}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  onClick={() => onOpenInsights(paper)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#8083ff]/20 hover:text-[#c0c1ff] border border-[#464554]/50 text-xs font-medium text-[#e5e1e4] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" />
                  <span>Analysis</span>
                </button>

                <button
                  onClick={() => onOpenChat(paper)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_12px_rgba(128,131,255,0.4)] transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => onDeletePaper(paper.id)}
                  title="Remove manuscript"
                  className="p-1.5 rounded-lg text-[#908fa0] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
