import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0e0e10]/80 border-t border-[#353437]/50 backdrop-blur-xl mt-12 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#c7c4d7] text-xs">
        <div className="flex items-center gap-3">
          <span>ResearchMate AI • Cognitive Engine v2.4</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2a2a2c] text-[#7bd0ff] font-medium border border-[#464554]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff] animate-pulse" />
            Ready
          </span>
        </div>
        <div className="text-[#908fa0]">
          © 2025 ResearchMate AI Architecture. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
