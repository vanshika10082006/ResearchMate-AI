import React, { useState, useRef } from 'react';
import { UploadCloud, FolderOpen, Loader2 } from 'lucide-react';

export default function UploadSection({ onFileUpload, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  const handleBrowseClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#0e0e10]/90 backdrop-blur-2xl border transition-all duration-300 overflow-hidden group ${
        isDragging
          ? 'border-[#8083ff] shadow-[0_0_32px_rgba(128,131,255,0.4)] bg-[#1c1b1d]'
          : 'border-[#353437]/70 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:border-[#464554]'
      }`}
    >
      {/* Ambient Glow Corner Accent */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#8083ff]/10 rounded-full blur-3xl group-hover:bg-[#8083ff]/20 pointer-events-none transition-colors" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#00a6e0]/10 rounded-full blur-3xl pointer-events-none transition-colors" />

      {/* Hidden File Input for Browse Button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        disabled={isUploading}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 px-2 sm:px-4 z-10">
        {/* Pulsing Floating Icon Container */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8083ff] to-[#00a6e0] blur-xl opacity-40 group-hover:opacity-80 group-hover:scale-110 transition-all duration-500" />
          <div className="relative w-20 h-20 rounded-full bg-[#2a2a2c] border border-[#464554]/50 flex items-center justify-center shadow-[0_0_24px_rgba(128,131,255,0.35)] group-hover:-translate-y-1 transition-transform duration-300">
            {isUploading ? (
              <Loader2 className="w-9 h-9 text-[#7bd0ff] animate-spin" />
            ) : (
              <UploadCloud className="w-9 h-9 text-[#c0c1ff] select-none" />
            )}
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl text-[#e5e1e4] font-semibold mb-2 tracking-tight">
          {isUploading ? 'Processing research manuscript...' : 'Drag & drop research manuscripts here'}
        </h2>

        <p className="text-xs sm:text-sm text-[#c7c4d7] max-w-md mb-5 leading-relaxed">
          {isUploading
            ? 'Extracting text content, computing dense vector embeddings, and creating FAISS index...'
            : 'Upload any academic PDF manuscript to extract semantic vectors, generate summaries, keywords, citations, and interactive flashcards.'}
        </p>

        {/* Supported Extensions Badges */}
        <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          <span className="px-3 py-1 rounded-full bg-[#2a2a2c] border border-[#464554]/40 font-mono text-xs text-[#7bd0ff] font-medium">
            PDF Manuscripts
          </span>
          <span className="px-3 py-1 rounded-full bg-[#2a2a2c] border border-[#464554]/40 font-mono text-xs text-[#c7c4d7] font-medium">
            FAISS In-Memory Index
          </span>
          <span className="px-3 py-1 rounded-full bg-[#2a2a2c] border border-[#464554]/40 font-mono text-xs text-[#c7c4d7] font-medium">
            Multi-LLM Synthesis
          </span>
        </div>

        {/* Upload Action Button */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-lg">
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={isUploading}
            className="flex-1 min-w-[220px] max-w-sm flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8083ff] to-[#00a6e0] text-[#0d0096] text-sm sm:text-base font-semibold shadow-[0_0_24px_rgba(128,131,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Document...</span>
              </>
            ) : (
              <>
                <FolderOpen className="w-5 h-5" />
                <span>Browse PDF Files</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
