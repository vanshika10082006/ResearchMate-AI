import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Sparkles,
  Trash2,
  Search,
  Layers,
  Clock,
  LayoutGrid,
  List,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  CheckSquare,
  Square,
  ChevronDown,
  Tag,
  FileBarChart2,
  Highlighter,
  StickyNote,
  ArrowRight,
  X,
  Upload,
  Zap,
  Eye,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function timeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return dateStr;
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getStatusConfig(status) {
  switch (status) {
    case "processing":
      return {
        label: "Processing",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        icon: Loader2,
        spin: true,
      };
    case "failed":
      return {
        label: "Failed",
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: AlertCircle,
      };
    case "needs_reindex":
      return {
        label: "Needs Reindex",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        icon: RefreshCw,
      };
    default:
      return {
        label: "Indexed",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        icon: Zap,
      };
  }
}

/* ─────────────────────────────────────────────
   AI Status Badge
───────────────────────────────────────────── */
function StatusBadge({ status, size = "sm" }) {
  const cfg = getStatusConfig(status || "indexed");
  const Icon = cfg.icon;
  const px =
    size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${px} font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}
    >
      <Icon className={`w-2.5 h-2.5 ${cfg.spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Activity Indicators
───────────────────────────────────────────── */
function ActivityIndicators({ paper }) {
  const highlights =
    paper.highlightsCount ?? Math.floor((paper.numChunks || 0) * 0.4 + 3);
  const notes =
    paper.notesCount ?? Math.floor((paper.numChunks || 0) * 0.2 + 1);
  const bookmarks =
    paper.bookmarksCount ?? Math.floor((paper.numChunks || 0) * 0.15 + 1);

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex items-center gap-1 text-[11px] text-[#908fa0]"
        title="Highlights"
      >
        <Highlighter className="w-3 h-3 text-yellow-400/70" />
        <span className="font-mono text-yellow-400/70">{highlights}</span>
      </span>
      <span
        className="flex items-center gap-1 text-[11px] text-[#908fa0]"
        title="Notes"
      >
        <StickyNote className="w-3 h-3 text-[#7bd0ff]/70" />
        <span className="font-mono text-[#7bd0ff]/70">{notes}</span>
      </span>
      <span
        className="flex items-center gap-1 text-[11px] text-[#908fa0]"
        title="Bookmarks"
      >
        <Bookmark className="w-3 h-3 text-[#c0c1ff]/70" />
        <span className="font-mono text-[#c0c1ff]/70">{bookmarks}</span>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PDF Thumbnail
───────────────────────────────────────────── */
function PdfThumbnail({ paper, onClick, size = "md" }) {
  const dim = size === "sm" ? "w-12 h-16" : "w-full h-32";
  const [loadError, setLoadError] = useState(false);
  const colors = [
    "from-[#8083ff]/20 to-[#7bd0ff]/10",
    "from-violet-500/20 to-purple-500/10",
    "from-indigo-500/20 to-blue-500/10",
    "from-[#8083ff]/30 to-fuchsia-500/10",
  ];
  const colorIdx = paper?.id ? paper.id.charCodeAt(0) % colors.length : 0;
  const docId = paper?.id || paper?.document_id;
  const pdfUrl = docId ? `http://localhost:5000/api/documents/${docId}/pdf` : null;

  return (
    <button
      onClick={onClick}
      className={`${dim} rounded-lg bg-gradient-to-br ${colors[colorIdx]} border border-[#353437]/60 flex items-center justify-center shrink-0 overflow-hidden group/thumb hover:border-[#8083ff]/50 transition-all cursor-pointer relative bg-[#131315]`}
      title="Quick preview"
    >
      {pdfUrl && !loadError ? (
        <div className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none relative">
          <Document
            file={pdfUrl}
            onLoadError={() => setLoadError(true)}
            loading={
              <div className="flex items-center justify-center w-full h-full">
                <FileText className="w-6 h-6 text-[#8083ff]/40 animate-pulse" />
              </div>
            }
            className="flex items-center justify-center w-full h-full"
          >
            <Page
              pageNumber={1}
              width={size === "sm" ? 48 : 280}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="object-cover shadow-sm opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
            />
          </Document>
        </div>
      ) : (
        <FileText className="w-6 h-6 text-[#8083ff]/60 group-hover/thumb:text-[#8083ff] transition-colors" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover/thumb:opacity-100 z-10">
        <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Quick Preview Panel (inline, not fullscreen)
───────────────────────────────────────────── */
function QuickPreview({ paper, onOpenInsights, onOpenChat, onClose }) {
  if (!paper) return null;
  const pages =
    paper.numPages ?? Math.max(8, Math.floor((paper.numChunks || 5) * 3.2));
  const docId = paper?.id || paper?.document_id;
  const pdfUrl = docId ? `http://localhost:5000/api/documents/${docId}/pdf` : null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#0e0e10] border border-[#353437]/80 shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-5 flex flex-col gap-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex gap-3 items-start pr-6">
          <div className="w-14 h-18 rounded-lg bg-[#131315] border border-[#353437]/60 flex items-center justify-center shrink-0 overflow-hidden relative">
            {pdfUrl ? (
              <Document
                file={pdfUrl}
                loading={<FileText className="w-6 h-6 text-[#8083ff]/80" />}
                error={<FileText className="w-6 h-6 text-[#8083ff]/80" />}
                className="w-full h-full flex items-center justify-center"
              >
                <Page
                  pageNumber={1}
                  width={56}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            ) : (
              <FileText className="w-6 h-6 text-[#8083ff]/80" />
            )}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-sm font-bold text-[#e5e1e4] line-clamp-2 leading-tight">
              {paper.title}
            </h3>
            <p className="text-[11px] text-[#908fa0] truncate">
              {paper.fileName}
            </p>
            <StatusBadge status={paper.status} size="xs" />
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            {
              label: "Pages",
              value: pages,
              icon: FileBarChart2,
              color: "text-[#c0c1ff]",
            },
            {
              label: "Chunks",
              value: paper.numChunks || "—",
              icon: Layers,
              color: "text-[#7bd0ff]",
            },
            {
              label: "Opened",
              value: timeAgo(paper.lastOpenedAt || paper.uploadedAt),
              icon: Clock,
              color: "text-[#908fa0]",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl bg-[#1c1b1d] border border-[#353437]/60 p-2.5"
            >
              <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${color}`} />
              <div className={`text-xs font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-[#908fa0]">{label}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {(paper.tags || ["Research", "PDF"]).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] bg-[#8083ff]/10 text-[#c0c1ff] border border-[#8083ff]/20"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#353437]/40">
          <button
            onClick={() => {
              onOpenInsights(paper);
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs font-semibold text-[#e5e1e4] hover:text-[#c0c1ff] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" /> Analysis
          </button>
          <button
            onClick={() => {
              onOpenChat(paper);
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_16px_rgba(128,131,255,0.4)] transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Open Chat
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Recent Activity Strip
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Empty State
───────────────────────────────────────────── */
function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 rounded-2xl bg-[#0e0e10]/60 border border-[#353437]/40 border-dashed text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8083ff]/20 to-[#7bd0ff]/10 border border-[#8083ff]/20 flex items-center justify-center">
          <FileText className="w-9 h-9 text-[#8083ff]/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#8083ff] flex items-center justify-center shadow-[0_0_12px_rgba(128,131,255,0.5)]">
          <span className="text-white text-[10px] font-bold">0</span>
        </div>
      </div>
      <h3 className="text-base font-bold text-[#e5e1e4] mb-2">
        Your research library is empty
      </h3>
      <p className="text-xs text-[#908fa0] max-w-xs mb-6 leading-relaxed">
        Upload PDF papers to index them with AI. Get instant summaries, semantic
        search, and chat.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_16px_rgba(128,131,255,0.3)] transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" /> Upload PDF
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs font-semibold text-[#e5e1e4] transition-all cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" /> Try Sample Paper
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Grid Card
───────────────────────────────────────────── */
function GridCard({
  paper,
  isSelected,
  onSelect,
  onPreview,
  onOpenInsights,
  onOpenChat,
  onDelete,
  onBookmark,
}) {
  const [hovered, setHovered] = useState(false);
  const pages =
    paper.numPages ?? Math.max(8, Math.floor((paper.numChunks || 5) * 3.2));
  const isBookmarked = paper.bookmarked ?? false;

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-[#0e0e10]/90 border transition-all duration-150 shadow-[0_8px_24px_rgba(0,0,0,0.3)] group overflow-hidden
        ${
          isSelected
            ? "border-[#8083ff]/70 shadow-[0_0_0_2px_rgba(128,131,255,0.15),0_8px_32px_rgba(0,0,0,0.4)]"
            : "border-[#353437]/70 hover:border-[#8083ff]/50 hover:shadow-[0_0_0_1px_rgba(128,131,255,0.1),0_16px_48px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox (on hover or selected) */}
      {(hovered || isSelected) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(paper.id);
          }}
          className="absolute top-3 left-3 z-10 p-0.5 rounded-md bg-[#1c1b1d]/80 border border-[#353437] hover:border-[#8083ff]/60 transition-all cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-[#8083ff]" />
          ) : (
            <Square className="w-4 h-4 text-[#908fa0]" />
          )}
        </button>
      )}

      {/* Thumbnail area */}
      <div className="relative p-4 pb-3">
        <PdfThumbnail
          paper={paper}
          onClick={() => onPreview(paper)}
          size="lg"
        />
        {/* Status badge on thumbnail */}
        <div className="absolute bottom-5 left-6">
          <StatusBadge status={paper.status} size="xs" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 px-4 pb-4 flex-1">
        {/* Title */}
        <div>
          <h3 className="text-sm font-bold text-[#e5e1e4] group-hover:text-[#c0c1ff] transition-colors line-clamp-2 leading-snug">
            {paper.title}
          </h3>
          <p className="text-[11px] text-[#908fa0] truncate mt-0.5">
            {paper.fileName}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-[#908fa0] flex-wrap">
          <span className="flex items-center gap-1">
            <FileBarChart2 className="w-3 h-3 text-[#c0c1ff]" />
            {pages} pages
          </span>
          <span className="text-[#353437]">·</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#7bd0ff]" />
            {paper.numChunks} chunks
          </span>
          <span className="text-[#353437]">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(paper.lastOpenedAt || paper.uploadedAt)}
          </span>
        </div>

        {/* Tags */}
        {(paper.tags || ["Research"]).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(paper.tags || ["Research"]).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#1c1b1d] text-[#908fa0] border border-[#353437]/60"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Activity indicators */}
        <ActivityIndicators paper={paper} />

        {/* Divider */}
        <div className="border-t border-[#353437]/40" />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenInsights(paper)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1b1d] hover:bg-[#2a2a2c] border border-[#353437] text-xs font-semibold text-[#e5e1e4] hover:text-[#c0c1ff] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" />
            Analysis
          </button>
          <button
            onClick={() => onOpenChat(paper)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_12px_rgba(128,131,255,0.3)] transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
        </div>
      </div>

      {/* Hover quick actions (top-right) */}
      {hovered && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(paper.id);
            }}
            className="p-1.5 rounded-lg bg-[#1c1b1d]/90 border border-[#353437]/80 hover:border-[#8083ff]/50 text-[#908fa0] hover:text-[#c0c1ff] transition-all cursor-pointer"
            title="Bookmark"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-[#8083ff]" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(paper.id);
            }}
            className="p-1.5 rounded-lg bg-[#1c1b1d]/90 border border-[#353437]/80 hover:border-red-500/40 text-[#908fa0] hover:text-red-400 transition-all cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   List Row
───────────────────────────────────────────── */
function ListRow({
  paper,
  isSelected,
  onSelect,
  onPreview,
  onOpenInsights,
  onOpenChat,
  onDelete,
  onBookmark,
}) {
  const [hovered, setHovered] = useState(false);
  const pages =
    paper.numPages ?? Math.max(8, Math.floor((paper.numChunks || 5) * 3.2));
  const isBookmarked = paper.bookmarked ?? false;

  return (
    <div
      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 group
        ${
          isSelected
            ? "bg-[#1c1b1d]/80 border-[#8083ff]/60 shadow-[0_0_0_1px_rgba(128,131,255,0.1)]"
            : "bg-[#0e0e10]/70 border-[#353437]/60 hover:bg-[#1c1b1d]/50 hover:border-[#8083ff]/40"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onSelect(paper.id)}
        className={`p-0.5 rounded-md border transition-all cursor-pointer shrink-0 ${
          isSelected || hovered
            ? "border-[#8083ff]/50 opacity-100"
            : "border-[#353437] opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-[#8083ff]" />
        ) : (
          <Square className="w-4 h-4 text-[#908fa0]" />
        )}
      </button>

      {/* Thumbnail */}
      <PdfThumbnail paper={paper} onClick={() => onPreview(paper)} size="sm" />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="text-sm font-bold text-[#e5e1e4] group-hover:text-[#c0c1ff] transition-colors truncate">
            {paper.title}
          </h4>
          <StatusBadge status={paper.status} size="xs" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#908fa0] flex-wrap">
          <span className="flex items-center gap-1">
            <FileBarChart2 className="w-3 h-3 text-[#c0c1ff]" /> {pages} pages
          </span>
          <span className="text-[#353437]">·</span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#7bd0ff]" /> {paper.numChunks}{" "}
            chunks
          </span>
          <span className="text-[#353437]">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{" "}
            {timeAgo(paper.lastOpenedAt || paper.uploadedAt)}
          </span>
          <span className="text-[#353437]">·</span>
          <ActivityIndicators paper={paper} />
        </div>
      </div>

      {/* Actions (always show on hover) */}
      <div
        className={`flex items-center gap-2 shrink-0 transition-opacity ${hovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        <button
          onClick={() => onBookmark(paper.id)}
          className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#c0c1ff] transition-all cursor-pointer"
          title="Bookmark"
        >
          {isBookmarked ? (
            <BookmarkCheck className="w-4 h-4 text-[#8083ff]" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onOpenInsights(paper)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2c] hover:bg-[#8083ff]/20 hover:text-[#c0c1ff] border border-[#464554]/50 text-xs font-semibold text-[#e5e1e4] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" /> Analysis
        </button>
        <button
          onClick={() => onOpenChat(paper)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8083ff] hover:bg-[#8083ff]/90 text-white text-xs font-semibold shadow-[0_0_12px_rgba(128,131,255,0.3)] transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          onClick={() => onDelete(paper.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#908fa0] hover:text-red-400 transition-colors cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Bulk Action Bar
───────────────────────────────────────────── */
function BulkActionBar({ count, onClear, onDelete, onExport }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#1c1b1d]/95 border border-[#8083ff]/40 shadow-[0_8px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-xs font-bold text-[#c0c1ff]">{count} selected</span>
      <div className="w-px h-4 bg-[#353437]" />
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-all cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] border border-[#353437] text-xs font-semibold text-[#e5e1e4] transition-all cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#8083ff]" /> Export Notes
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] border border-[#353437] text-xs font-semibold text-[#e5e1e4] transition-all cursor-pointer">
        <FileText className="w-3.5 h-3.5 text-[#7bd0ff]" /> Compare
      </button>
      <button
        onClick={onClear}
        className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sort Dropdown
───────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "recent_opened", label: "Recently Opened" },
  { value: "recent_added", label: "Recently Added" },
  { value: "az", label: "A – Z" },
  { value: "most_pages", label: "Most Pages" },
];

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current =
    SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1b1d] border border-[#353437] hover:border-[#8083ff]/40 text-xs font-semibold text-[#e5e1e4] transition-all cursor-pointer"
      >
        <span className="text-[#908fa0]">Sort:</span>
        <span>{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#908fa0]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-[#1c1b1d] border border-[#353437] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                opt.value === value
                  ? "bg-[#8083ff]/15 text-[#c0c1ff]"
                  : "text-[#e5e1e4] hover:bg-[#2a2a2c] hover:text-[#c0c1ff]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Filter Chips
───────────────────────────────────────────── */
const FILTER_CHIPS = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "with_notes", label: "With Notes" },
  { value: "indexed", label: "Indexed" },
  { value: "processing", label: "Processing" },
];

/* ─────────────────────────────────────────────
   Main LibraryView
───────────────────────────────────────────── */
export default function LibraryView({
  papers,
  onOpenInsights,
  onOpenChat,
  onDeletePaper,
  onUpload,
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent_added");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewPaper, setPreviewPaper] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("researchmate_bookmarks"));
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "researchmate_bookmarks",
      JSON.stringify([...bookmarkedIds]),
    );
  }, [bookmarkedIds]);

  // Filter + search + sort
  const filteredPapers = useMemo(() => {
    let result = [...papers];

    // Text search
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || p.filename || "").toLowerCase().includes(q) ||
          (p.fileName || p.filename || "").toLowerCase().includes(q),
      );
    }

    // Chip filter
    switch (activeFilter) {
      case "recent":
        result = result.slice(0, 10);
        break;
      case "bookmarked":
        result = result.filter((p) => bookmarkedIds.has(p.id));
        break;
      case "with_notes":
        result = result.filter((p) => (p.notesCount ?? 1) > 0);
        break;
      case "indexed":
        result = result.filter((p) => !p.status || p.status === "indexed");
        break;
      case "processing":
        result = result.filter((p) => p.status === "processing");
        break;
      default:
        break;
    }

    // Sort
    switch (sortBy) {
      case "az":
        result.sort((a, b) =>
          (a.title || a.filename || "").localeCompare(
            b.title || b.filename || "",
          ),
        );
        break;
      case "most_pages":
        result.sort((a, b) => {
          const ap = a.numPages ?? a.numChunks * 3;
          const bp = b.numPages ?? b.numChunks * 3;
          return bp - ap;
        });
        break;
      case "recent_opened":
      case "recent_added":
      default:
        // Already in upload order (newest first)
        break;
    }

    return result;
  }, [papers, filterQuery, activeFilter, sortBy, bookmarkedIds]);

  const handleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBookmark = (id) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onDeletePaper(id));
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    // placeholder export
    setSelectedIds(new Set());
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* ── Library Header + Controls ── */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[#0e0e10]/90 border border-[#353437]/70 backdrop-blur-xl">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#e5e1e4] tracking-tight">
              Document Library
              <span className="ml-2 text-sm font-normal text-[#908fa0]">
                ({papers.length})
              </span>
            </h2>
            <p className="text-xs text-[#908fa0] mt-0.5">
              Browse, filter, and manage your research papers
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1c1b1d] border border-[#353437]">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/30"
                  : "text-[#908fa0] hover:text-[#e5e1e4]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/30"
                  : "text-[#908fa0] hover:text-[#e5e1e4]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#908fa0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search papers..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1c1b1d] border border-[#353437] text-xs text-[#e5e1e4] placeholder:text-[#908fa0] focus:outline-none focus:border-[#8083ff]/60 transition-colors"
            />
          </div>
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setActiveFilter(chip.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeFilter === chip.value
                  ? "bg-[#8083ff]/20 text-[#c0c1ff] border-[#8083ff]/50 shadow-[0_0_12px_rgba(128,131,255,0.15)]"
                  : "bg-[#1c1b1d] text-[#908fa0] border-[#353437] hover:border-[#8083ff]/30 hover:text-[#e5e1e4]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Document Grid / List ── */}
      {filteredPapers.length === 0 ? (
        <EmptyState onUpload={onUpload || (() => {})} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.map((paper) => (
            <GridCard
              key={paper.id}
              paper={{ ...paper, bookmarked: bookmarkedIds.has(paper.id) }}
              isSelected={selectedIds.has(paper.id)}
              onSelect={handleSelect}
              onPreview={setPreviewPaper}
              onOpenInsights={onOpenInsights}
              onOpenChat={onOpenChat}
              onDelete={onDeletePaper}
              onBookmark={handleBookmark}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPapers.map((paper) => (
            <ListRow
              key={paper.id}
              paper={{ ...paper, bookmarked: bookmarkedIds.has(paper.id) }}
              isSelected={selectedIds.has(paper.id)}
              onSelect={handleSelect}
              onPreview={setPreviewPaper}
              onOpenInsights={onOpenInsights}
              onOpenChat={onOpenChat}
              onDelete={onDeletePaper}
              onBookmark={handleBookmark}
            />
          ))}
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
        />
      )}

      {/* ── Quick Preview ── */}
      {previewPaper && (
        <QuickPreview
          paper={previewPaper}
          onOpenInsights={onOpenInsights}
          onOpenChat={onOpenChat}
          onClose={() => setPreviewPaper(null)}
        />
      )}
    </div>
  );
}
