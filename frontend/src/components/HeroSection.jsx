import React from 'react';
import { BookOpen, Layers, Bot, Cpu } from 'lucide-react';

export default function HeroSection({ totalPapers, totalChunks, serverStatus }) {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        {/* Left Column: Heading & Subheading */}
        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2a2c]/90 border border-[#464554]/50 w-fit shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-pulse shadow-[0_0_8px_#7bd0ff]" />
            <span className="font-mono text-xs text-[#7bd0ff] tracking-wide uppercase font-medium">
              Academic Literature Intelligence
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] lg:leading-[52px] text-[#e5e1e4] tracking-tight font-bold">
            Accelerate your research literature synthesis
          </h1>

          <p className="text-sm sm:text-base text-[#c7c4d7] max-w-2xl leading-relaxed">
            Upload PDF research papers to generate contextual summaries, extract key concepts, identify research gaps, generate flashcards, and query your documents via Retrieval-Augmented Generation.
          </p>
        </div>

        {/* Right Column: Real Telemetry Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#0e0e10]/80 border border-[#353437]/70 p-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-xl shrink-0">
          <div className="flex flex-col px-4 py-2.5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/40 min-w-[110px]">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#c0c1ff]" />
              <span className="text-xl sm:text-2xl text-[#c0c1ff] font-bold tracking-tight">
                {totalPapers}
              </span>
            </div>
            <span className="text-[11px] text-[#908fa0] uppercase tracking-wider font-semibold mt-0.5">
              Indexed Papers
            </span>
          </div>

          <div className="flex flex-col px-4 py-2.5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/40 min-w-[110px]">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#7bd0ff]" />
              <span className="text-xl sm:text-2xl text-[#7bd0ff] font-bold tracking-tight">
                {totalChunks}
              </span>
            </div>
            <span className="text-[11px] text-[#908fa0] uppercase tracking-wider font-semibold mt-0.5">
              Vector Chunks
            </span>
          </div>

          <div className="flex flex-col px-4 py-2.5 rounded-xl bg-[#1c1b1d]/60 border border-[#353437]/40 min-w-[110px] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm sm:text-base text-emerald-400 font-bold tracking-tight">
                {serverStatus === 'online' ? 'FAISS Vector RAG' : 'Offline'}
              </span>
            </div>
            <span className="text-[11px] text-[#908fa0] uppercase tracking-wider font-semibold mt-0.5">
              Vector Search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
