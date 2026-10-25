import React from 'react';
import { Cpu, CheckCircle2, Loader2, Sparkles, FileText } from 'lucide-react';

export default function ActiveIngestionCard({ activeUpload, totalPapers }) {
  return (
    <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#0e0e10]/90 backdrop-blur-2xl border border-[#353437]/70 shadow-[0_12px_40px_rgba(0,0,0,0.5)] h-full">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#8083ff]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#c0c1ff] font-semibold">
              Cognitive Pipeline
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1c1b1d] border border-[#353437] text-[11px] font-mono text-[#7bd0ff]">
            {activeUpload ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff] animate-ping" />
                Processing
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ready
              </>
            )}
          </span>
        </div>

        {/* Status Body */}
        {activeUpload ? (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#1c1b1d]/80 border border-[#8083ff]/30">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#8083ff] shrink-0" />
                <span className="text-xs font-semibold text-[#e5e1e4] truncate">
                  {activeUpload.fileName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#7bd0ff] shrink-0 bg-[#7bd0ff]/10 px-2 py-0.5 rounded">
                Active
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] text-[#c7c4d7]">
                <span>{activeUpload.stage || 'Ingesting chunks...'}</span>
                <span className="font-mono text-[#8083ff]">{activeUpload.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#2a2a2c] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8083ff] to-[#7bd0ff] transition-all duration-300 rounded-full"
                  style={{ width: `${activeUpload.progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 rounded-xl bg-[#1c1b1d]/50 border border-[#353437]/40 gap-2">
            <div className="w-10 h-10 rounded-full bg-[#201f21] flex items-center justify-center text-[#7bd0ff]">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#e5e1e4]">Pipeline Standing By</span>
            <p className="text-[11px] text-[#908fa0] leading-relaxed">
              Upload manuscripts to extract text, build semantic vector indexes, and run AI RAG analysis.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 mt-4 border-t border-[#353437]/50 flex items-center justify-between text-[11px] text-[#908fa0]">
        <span>Indexed in Memory:</span>
        <span className="font-mono text-[#e5e1e4] font-semibold">{totalPapers} papers</span>
      </div>
    </div>
  );
}
