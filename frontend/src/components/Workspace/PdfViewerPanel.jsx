import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Edit3,
  Copy,
  Sparkles,
  Bookmark,
  Highlighter,
  StickyNote,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import AnnotationSidebar from "./AnnotationSidebar.jsx";
import MiniBookmarkStrip from "./MiniBookmarkStrip.jsx";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const cMapUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`;
const standardFontDataUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`;
const HIGHLIGHT_COLORS = {
  Important: "rgba(168, 85, 247, 0.25)",
  Definition: "rgba(59, 130, 246, 0.25)",
  Methodology: "rgba(6, 182, 212, 0.25)",
  Results: "rgba(16, 185, 129, 0.25)",
};

export default function PdfViewerPanel({ paper }) {
  const docId = paper.document_id || paper.id;
  const pdfUrl = `${API_BASE}/documents/${docId}/pdf`;

  const [numPages, setNumPages] = useState(null);
  const [hasPdf, setHasPdf] = useState(true);
  const [loading, setLoading] = useState(true);

  // Highlights — persisted per document
  const [highlights, setHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem(`highlights_${docId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Bookmarks — persisted per document
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem(`bookmarks_${docId}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter(
            (bookmark) =>
              Number.isInteger(bookmark.chunkIndex) && bookmark.chunkIndex >= 0,
          )
        : [];
    } catch {
      return [];
    }
  });

  const [contentData, setContentData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!hasPdf && !loading && !contentData) {
      setLoadingContent(true);
      fetch(`${API_BASE}/documents/${docId}/content`)
        .then((res) => res.json())
        .then((data) => {
          if (data.chunks) setContentData(data);
        })
        .catch((err) => console.error("Failed to load chunks", err))
        .finally(() => setLoadingContent(false));
    }
  }, [hasPdf, loading, docId, contentData]);

  useEffect(() => {
    if (docId)
      localStorage.setItem(`highlights_${docId}`, JSON.stringify(highlights));
  }, [highlights, docId]);

  useEffect(() => {
    if (docId)
      localStorage.setItem(`bookmarks_${docId}`, JSON.stringify(bookmarks));
  }, [bookmarks, docId]);

  // UI State
  const [toolbar, setToolbar] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: "",
    pageIndex: 0,
    rects: [],
  });
  const [notePopover, setNotePopover] = useState({
    visible: false,
    highlightId: null,
    x: 0,
    y: 0,
    text: "",
  });
  const [highlightMode, setHighlightMode] = useState(false);
  const [lastUsedColor, setLastUsedColor] = useState(
    HIGHLIGHT_COLORS.Important,
  );
  const [pulsingHighlightId, setPulsingHighlightId] = useState(null);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("notes");
  const [sidebarSearch, setSidebarSearch] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasPdf]);

  // Custom CSS for absolute highlights
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .pdf-container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        background-color: #525659;
        padding: 20px;
        overflow-y: auto;
        height: 100%;
      }
      .react-pdf__Page__canvas {
        margin: 0 auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }
      .highlight-rect {
        position: absolute;
        cursor: pointer;
        transition: opacity 0.2s, box-shadow 0.2s;
        z-index: 10;
      }
      .highlight-rect:hover { filter: brightness(0.9); }
      .highlight-note-indicator {
        position: absolute;
        top: -4px; right: -4px;
        width: 10px; height: 10px;
        background: #f59e0b;
        border-radius: 50%;
        border: 2px solid #131315;
        z-index: 11;
      }
      .react-pdf__Page { 
        position: relative;
        margin-bottom: 24px; 
        border-radius: 4px; 
        overflow: hidden; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
        background: white;
      }
      .react-pdf__Document { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
      }
      .react-pdf__Page__textContent {
        user-select: text;
        cursor: text;
      }
      .react-pdf__Page__textContent ::selection {
        background: rgba(128, 131, 255, 0.3) !important;
        color: transparent !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setHasPdf(true);
  };

  const onDocumentLoadError = () => {
    setHasPdf(false);
    setLoading(false);
  };

  const scrollToPage = useCallback((pageIndex, highlightId) => {
    setTimeout(() => {
      if (highlightId) {
        const highlightEl = document.getElementById(`highlight-${highlightId}`);
        if (highlightEl) {
          highlightEl.scrollIntoView({ behavior: "smooth", block: "center" });
          setPulsingHighlightId(highlightId);
          setTimeout(() => setPulsingHighlightId(null), 1000);
          return;
        }
      }

      const pageEl = document.querySelector(`[data-page-index="${pageIndex}"]`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, []);

  // Events from chat
  useEffect(() => {
    const handleHighlightFromChat = (e) => {
      const { chunkIndex, text } = e.detail;
      scrollToPage(chunkIndex, null);

      setTimeout(() => {
        if (window.find && text) {
          window.getSelection().removeAllRanges();
          // Fallback selection to jump attention
          window.find(text.substring(0, 40));
        }
      }, 500);
    };

    const handleSaveNoteFromChat = (e) => {
      const { chunkIndex, text, noteContent } = e.detail;
      const newId = uuidv4();

      const newHighlight = {
        documentId: docId,
        highlightId: newId,
        pageNumber: chunkIndex + 1,
        selectedText: text,
        rects: [],
        color: HIGHLIGHT_COLORS.Important,
        createdAt: new Date().toISOString(),
        chunkIndex,
        note: noteContent || "",
      };

      setHighlights((prev) => [...prev, newHighlight]);
      scrollToPage(chunkIndex, newId);
    };

    window.addEventListener("highlight-from-chat", handleHighlightFromChat);
    window.addEventListener("save-note-from-chat", handleSaveNoteFromChat);
    return () => {
      window.removeEventListener(
        "highlight-from-chat",
        handleHighlightFromChat,
      );
      window.removeEventListener("save-note-from-chat", handleSaveNoteFromChat);
    };
  }, [docId, scrollToPage]);

  const handleMouseUp = (e) => {
    if (
      e.target.closest("#selection-toolbar") ||
      e.target.closest("#note-popover")
    )
      return;

    const selection = window.getSelection();
    if (
      selection &&
      selection.toString().trim().length > 0 &&
      selection.rangeCount > 0
    ) {
      const range = selection.getRangeAt(0);
      let pageEl =
        range.commonAncestorContainer.parentElement?.closest(
          "[data-page-index]",
        );
      if (!pageEl && range.startContainer.parentElement) {
        pageEl =
          range.startContainer.parentElement.closest("[data-page-index]");
      }

      if (pageEl) {
        const pageIndex = Number(pageEl.getAttribute("data-page-index"));
        if (!Number.isInteger(pageIndex) || pageIndex < 0) {
          setToolbar((prev) => ({ ...prev, visible: false }));
          return;
        }
        const pageRect = pageEl.getBoundingClientRect();
        const clientRects = Array.from(range.getClientRects());

        const relativeRects = clientRects.map((r) => ({
          top: (r.top - pageRect.top) / scale,
          left: (r.left - pageRect.left) / scale,
          width: r.width / scale,
          height: r.height / scale,
        }));

        const text = selection.toString();
        const bounds = range.getBoundingClientRect();

        if (highlightMode) {
          const newId = uuidv4();
          setHighlights((prev) => [
            ...prev,
            {
              documentId: docId,
              highlightId: newId,
              pageNumber: pageIndex + 1,
              selectedText: text,
              rects: relativeRects,
              color: lastUsedColor,
              createdAt: new Date().toISOString(),
              chunkIndex: pageIndex,
              note: "",
            },
          ]);
          window.getSelection().removeAllRanges();
          return;
        }

        setToolbar({
          visible: true,
          x: bounds.left + bounds.width / 2,
          y: Math.max(bounds.top - 50, 10),
          text,
          pageIndex,
          rects: relativeRects,
        });
        setNotePopover({
          visible: false,
          highlightId: null,
          x: 0,
          y: 0,
          text: "",
        });
      } else {
        setToolbar((prev) => ({ ...prev, visible: false }));
      }
    } else {
      setToolbar((prev) => ({ ...prev, visible: false }));
    }
  };

  const addHighlight = (color) => {
    setLastUsedColor(color);
    const newId = uuidv4();
    setHighlights((prev) => [
      ...prev,
      {
        documentId: docId,
        highlightId: newId,
        pageNumber: toolbar.pageIndex + 1,
        selectedText: toolbar.text,
        rects: toolbar.rects,
        color,
        createdAt: new Date().toISOString(),
        chunkIndex: toolbar.pageIndex,
        note: "",
      },
    ]);
    setToolbar((prev) => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const openNotePopover = () => {
    const newId = uuidv4();
    setHighlights((prev) => [
      ...prev,
      {
        documentId: docId,
        highlightId: newId,
        pageNumber: toolbar.pageIndex + 1,
        selectedText: toolbar.text,
        rects: toolbar.rects,
        color: HIGHLIGHT_COLORS.Important,
        createdAt: new Date().toISOString(),
        chunkIndex: toolbar.pageIndex,
        note: "",
      },
    ]);
    setNotePopover({
      visible: true,
      highlightId: newId,
      x: toolbar.x,
      y: toolbar.y,
      text: "",
    });
    setToolbar((prev) => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const saveNote = () => {
    setHighlights((prev) =>
      prev.map((h) =>
        h.highlightId === notePopover.highlightId
          ? { ...h, note: notePopover.text }
          : h,
      ),
    );
    setNotePopover({ visible: false, highlightId: null, x: 0, y: 0, text: "" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toolbar.text);
    setToolbar((prev) => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const handleAskAI = () => {
    window.dispatchEvent(new CustomEvent("ask-ai", { detail: toolbar.text }));
    setToolbar((prev) => ({ ...prev, visible: false }));
    window.getSelection().removeAllRanges();
  };

  const getCurrentVisibleChunk = () => {
    if (!containerRef.current) return 0;
    const pages = containerRef.current.querySelectorAll("[data-page-index]");
    const containerTop = containerRef.current.getBoundingClientRect().top;
    let best = 0;
    pages.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // If the top of the page is above the middle of the viewport
      if (rect.top - containerTop <= 300) {
        const pageIndex = Number(el.getAttribute("data-page-index"));
        if (Number.isInteger(pageIndex) && pageIndex >= 0) best = pageIndex;
      }
    });
    return best;
  };

  const toggleBookmark = () => {
    const chunkIdx = getCurrentVisibleChunk();
    const existing = bookmarks.find((b) => b.chunkIndex === chunkIdx);
    if (existing) {
      setBookmarks((prev) =>
        prev.filter((b) => b.bookmarkId !== existing.bookmarkId),
      );
    } else {
      setBookmarkAnimating(true);
      setTimeout(() => setBookmarkAnimating(false), 200);
      setBookmarks((prev) => [
        ...prev,
        {
          bookmarkId: uuidv4(),
          chunkIndex: chunkIdx,
          label: `Page ${chunkIdx + 1}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const annotationCount =
    highlights.filter((h) => h.note?.trim()).length + bookmarks.length;

  const renderChunkText = (text, chunkIdx) => {
    // For text fallback, we rely on string search or start/end offsets if available
    const chunkHighlights = highlights
      .filter((h) => h.chunkIndex === chunkIdx)
      .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

    if (chunkHighlights.length === 0)
      return (
        <span className="whitespace-pre-wrap leading-relaxed">{text}</span>
      );

    // We don't have accurate offsets anymore since we wiped them,
    // so we'll just use string replacement for the first occurrence.
    let elements = [];
    let lastIndex = 0;

    // Quick fallback highlight string matching
    let currentText = text;
    let indexOffset = 0;

    chunkHighlights.forEach((h) => {
      if (!h.selectedText) return;
      const snippet = h.selectedText.trim();
      if (!snippet) return;

      const idx = currentText.indexOf(snippet, lastIndex - indexOffset);
      if (idx >= 0) {
        elements.push(currentText.substring(lastIndex - indexOffset, idx));
        const isPulsing = pulsingHighlightId === h.highlightId;
        elements.push(
          <span
            key={h.highlightId}
            id={`highlight-${h.highlightId}`}
            className={`relative inline rounded px-0.5 cursor-pointer transition-colors hover:brightness-110 ${isPulsing ? "animate-pulse-highlight" : ""}`}
            style={{ backgroundColor: h.color }}
            title={h.note ? `Note: ${h.note}` : ""}
          >
            {snippet}
            {h.note && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-[#131315]"></span>
              </span>
            )}
          </span>,
        );
        lastIndex = idx + snippet.length + indexOffset;
      }
    });

    if (lastIndex - indexOffset < currentText.length) {
      elements.push(currentText.substring(lastIndex - indexOffset));
    }

    if (elements.length === 0)
      return (
        <span className="whitespace-pre-wrap leading-relaxed">{text}</span>
      );
    return (
      <span className="whitespace-pre-wrap leading-relaxed">{elements}</span>
    );
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-[#131315] min-h-0 relative">
      <div className="h-11 border-b border-[#2a292d] flex items-center justify-between px-3 shrink-0 bg-[#1a191c]">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 bg-[#2a2a2c] text-[#c0c1ff] shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
            PDF Annotator
          </div>
          <div className="flex items-center gap-1 bg-[#0e0e10] rounded border border-[#2a292d] p-0.5 ml-2">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              className="p-1 hover:bg-[#2a2a2c] text-[#908fa0] rounded transition-colors"
            >
              -
            </button>
            <span className="text-[10px] font-mono text-[#e5e1e4] px-2 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-1 hover:bg-[#2a2a2c] text-[#908fa0] rounded transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasPdf && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#2a2a2c] text-[#908fa0] hover:text-[#e5e1e4] flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <div className="h-4 w-px bg-[#353437] mx-0.5" />
          <button
            onClick={toggleBookmark}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${bookmarks.some((b) => b.chunkIndex === getCurrentVisibleChunk()) ? "text-[#8083ff] hover:bg-[#2a2a2c]" : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]"} ${bookmarkAnimating ? "animate-bookmark-fill" : ""}`}
            title="Bookmark"
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${bookmarks.some((b) => b.chunkIndex === getCurrentVisibleChunk()) ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={() => setHighlightMode(!highlightMode)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${highlightMode ? "bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40" : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]"}`}
            title="Highlight mode"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${sidebarOpen ? "bg-[#8083ff]/20 text-[#c0c1ff]" : "text-[#908fa0] hover:text-[#e5e1e4] hover:bg-[#2a2a2c]"}`}
            title="Annotations"
          >
            <StickyNote className="w-3.5 h-3.5" />
            {annotationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#8083ff] text-[8px] font-bold text-white flex items-center justify-center">
                {annotationCount > 9 ? "9+" : annotationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-[#0e0e10]">
        {!hasPdf ? (
          <div className="h-full relative flex">
            <AnnotationSidebar
              highlights={highlights}
              bookmarks={bookmarks}
              isOpen={sidebarOpen}
              activeTab={sidebarTab}
              searchQuery={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onTabChange={setSidebarTab}
              onJumpToChunk={(chunkIndex, highlightId) => {
                scrollToPage(chunkIndex, highlightId);
                setSidebarOpen(false);
              }}
              onDeleteHighlight={(id) =>
                setHighlights((prev) =>
                  prev.filter((h) => h.highlightId !== id),
                )
              }
              onDeleteBookmark={(id) =>
                setBookmarks((prev) => prev.filter((b) => b.bookmarkId !== id))
              }
              onUpdateBookmarkLabel={(id, label) =>
                setBookmarks((prev) =>
                  prev.map((b) => (b.bookmarkId === id ? { ...b, label } : b)),
                )
              }
              onClose={() => setSidebarOpen(false)}
            />

            <div
              ref={containerRef}
              className={`flex-1 h-full overflow-y-auto p-6 sm:p-8 custom-scrollbar relative ${highlightMode ? "cursor-text" : ""}`}
              onMouseUp={handleMouseUp}
            >
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="border-b border-[#2a292d] pb-4 mb-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  <p className="text-sm font-semibold text-[#e5e1e4]">
                    Raw PDF binary not available
                  </p>
                  <p className="text-xs text-[#908fa0] mt-1">
                    Displaying extracted text from the database.
                  </p>
                </div>
                {loadingContent ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#908fa0] gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#8083ff]" />
                    <span className="text-xs">Loading text...</span>
                  </div>
                ) : contentData?.chunks ? (
                  contentData.chunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      data-page-index={idx}
                      className="chunk-container text-xs sm:text-sm text-[#c7c4d7] bg-[#1c1b1d]/60 p-4 rounded-xl border border-[#2a292d] hover:border-[#8083ff]/30 transition-colors"
                    >
                      <span className="text-[10px] font-mono text-[#8083ff] font-semibold block mb-1 opacity-70 select-none">
                        CHUNK {idx + 1}
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed m-0">
                        {renderChunkText(chunk, idx)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#908fa0] text-center mt-10">
                    Failed to load document text.
                  </p>
                )}
              </div>
            </div>
            <MiniBookmarkStrip
              highlights={highlights}
              bookmarks={bookmarks}
              totalChunks={contentData?.chunks?.length || 0}
              onJumpToChunk={scrollToPage}
              containerRef={containerRef}
            />
          </div>
        ) : (
          <div className="h-full relative flex">
            <AnnotationSidebar
              highlights={highlights}
              bookmarks={bookmarks}
              isOpen={sidebarOpen}
              activeTab={sidebarTab}
              searchQuery={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onTabChange={setSidebarTab}
              onJumpToChunk={(chunkIndex, highlightId) => {
                scrollToPage(chunkIndex, highlightId);
                setSidebarOpen(false);
              }}
              onDeleteHighlight={(id) =>
                setHighlights((prev) =>
                  prev.filter((h) => h.highlightId !== id),
                )
              }
              onDeleteBookmark={(id) =>
                setBookmarks((prev) => prev.filter((b) => b.bookmarkId !== id))
              }
              onUpdateBookmarkLabel={(id, label) =>
                setBookmarks((prev) =>
                  prev.map((b) => (b.bookmarkId === id ? { ...b, label } : b)),
                )
              }
              onClose={() => setSidebarOpen(false)}
            />

            <div
              ref={containerRef}
              className={`pdf-container pdf-reader-selection flex-1 h-full overflow-y-auto p-8 custom-scrollbar ${highlightMode ? "cursor-text" : ""}`}
              onMouseUp={handleMouseUp}
            >
              <Document
                file={pdfUrl}
                cMapUrl={cMapUrl}
                standardFontDataUrl={standardFontDataUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center py-20 text-[#908fa0] gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#8083ff]" />
                    <span className="text-xs">Loading PDF...</span>
                  </div>
                }
              >
                {Array.from(new Array(numPages || 0), (el, index) => (
                  <div
                    key={`page_${index + 1}`}
                    className="relative mb-6 mx-auto w-max"
                    data-page-index={index}
                  >
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      width={
                        containerWidth
                          ? Math.min(containerWidth - 32, 800)
                          : undefined
                      }
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-xl"
                    />

                    {/* Render Highlights for this page */}
                    {highlights
                      .filter((h) => h.chunkIndex === index)
                      .map((h) => (
                        <React.Fragment key={h.highlightId}>
                          {h.rects?.map((rect, i) => (
                            <div
                              key={i}
                              id={
                                i === 0
                                  ? `highlight-${h.highlightId}`
                                  : undefined
                              }
                              className={`highlight-rect ${pulsingHighlightId === h.highlightId ? "animate-pulse-highlight" : ""}`}
                              style={{
                                top: rect.top * scale,
                                left: rect.left * scale,
                                width: rect.width * scale,
                                height: rect.height * scale,
                                backgroundColor: h.color,
                              }}
                              title={h.note ? `Note: ${h.note}` : ""}
                            >
                              {i === h.rects.length - 1 && h.note && (
                                <div className="highlight-note-indicator" />
                              )}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                  </div>
                ))}
              </Document>
            </div>
            <MiniBookmarkStrip
              highlights={highlights}
              bookmarks={bookmarks}
              totalChunks={numPages || 0}
              onJumpToChunk={scrollToPage}
              containerRef={containerRef}
            />
          </div>
        )}
      </div>

      {toolbar.visible && (
        <div
          id="selection-toolbar"
          className="fixed z-50 flex items-center gap-1 p-1 bg-[#1c1b1d]/90 backdrop-blur-md border border-[#2a292d] rounded-lg shadow-xl"
          style={{
            top: toolbar.y,
            left: toolbar.x,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="flex items-center gap-1 border-r border-[#2a292d] pr-1 mr-1"
            onMouseDown={(event) => event.preventDefault()}
          >
            {Object.entries(HIGHLIGHT_COLORS).map(([label, color]) => (
              <button
                key={label}
                type="button"
                title={`Highlight: ${label}`}
                onClick={() => addHighlight(color)}
                className="w-4 h-4 rounded-full border border-[#2a292d] hover:scale-110 transition-transform shadow-inner cursor-pointer"
                style={{ backgroundColor: color.replace("0.25", "0.8") }}
              />
            ))}
          </div>
          <button
            onClick={openNotePopover}
            className="p-1.5 text-[#c7c4d7] hover:text-white hover:bg-[#2a292d] rounded-md transition-colors cursor-pointer"
            title="Add Note"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-[#c7c4d7] hover:text-white hover:bg-[#2a292d] rounded-md transition-colors cursor-pointer"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleAskAI}
            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-[#2a292d] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Ask AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold pr-1">Ask AI</span>
          </button>
        </div>
      )}

      {notePopover.visible && (
        <div
          id="note-popover"
          className="fixed z-50 flex flex-col gap-2 p-3 bg-[#1c1b1d]/95 backdrop-blur-md border border-[#2a292d] rounded-xl shadow-2xl w-64 animate-note-popover"
          style={{
            top: notePopover.y,
            left: notePopover.x,
            transform: "translateX(-50%) translateY(10px)",
          }}
        >
          <div className="text-[11px] font-semibold text-[#c7c4d7] mb-0.5">
            Add Note
          </div>
          <div className="text-[10px] italic text-[#908fa0] border-l-2 border-[#8083ff] pl-2 mb-2 truncate bg-[#0e0e10]/50 p-1 rounded-r">
            "
            {
              highlights.find((h) => h.highlightId === notePopover.highlightId)
                ?.selectedText
            }
            "
          </div>
          <textarea
            autoFocus
            value={notePopover.text}
            onChange={(e) =>
              setNotePopover({ ...notePopover, text: e.target.value })
            }
            placeholder="Write your thought..."
            className="w-full h-20 bg-[#0e0e10] border border-[#2a292d] rounded-md p-2 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#8083ff] resize-none"
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() =>
                setNotePopover({
                  visible: false,
                  highlightId: null,
                  x: 0,
                  y: 0,
                  text: "",
                })
              }
              className="px-2 py-1 text-[10px] text-[#908fa0] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={saveNote}
              className="px-3 py-1 text-[10px] bg-[#8083ff] hover:bg-[#8083ff]/90 text-white rounded-md font-semibold transition-colors cursor-pointer"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
