import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Trash2, Bookmark, StickyNote, BookOpen } from 'lucide-react';

const AnnotationSidebar = ({
  highlights,
  bookmarks,
  isOpen,
  activeTab,
  searchQuery,
  onSearchChange,
  onTabChange,
  onJumpToChunk,
  onDeleteHighlight,
  onDeleteBookmark,
  onUpdateBookmarkLabel,
  onClose,
}) => {
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingBookmarkId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingBookmarkId]);

  if (!isOpen) return null;

  const notesList = highlights || [];

  const filteredNotes = notesList.filter((h) => {
    const query = searchQuery.toLowerCase();
    return (
      h.selectedText?.toLowerCase().includes(query) ||
      h.note?.toLowerCase().includes(query) ||
      (h.chunkIndex + 1).toString().includes(query) ||
      h.pageNumber?.toString().includes(query)
    );
  });

  const filteredBookmarks = bookmarks?.filter((b) => {
    const query = searchQuery.toLowerCase();
    return (
      b.label?.toLowerCase().includes(query) ||
      (b.chunkIndex + 1).toString().includes(query)
    );
  }) || [];

  const handleBookmarkLabelClick = (e, b) => {
    e.stopPropagation();
    setEditingBookmarkId(b.bookmarkId);
    setEditLabel(b.label || `Section ${b.chunkIndex + 1}`);
  };

  const handleBookmarkLabelBlurOrEnter = (b) => {
    if (editingBookmarkId === b.bookmarkId) {
      onUpdateBookmarkLabel(b.bookmarkId, editLabel);
      setEditingBookmarkId(null);
    }
  };

  const handleKeyDown = (e, b) => {
    if (e.key === 'Enter') {
      handleBookmarkLabelBlurOrEnter(b);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ', ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#131315] border-r border-[#2a292d] z-30 animate-sidebar-slide flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a292d]">
        <h2 className="text-sm font-semibold text-[#e5e1e4]">Annotations</h2>
        <button
          onClick={onClose}
          className="p-1 text-[#908fa0] hover:text-[#e5e1e4] rounded-md hover:bg-[#2a292d]/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="p-3">
        <div className="bg-[#0e0e10] p-0.5 rounded-lg border border-[#2a292d] flex">
          <button
            onClick={() => onTabChange('notes')}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'notes'
                ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm'
                : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <StickyNote className="w-3 h-3" />
            Highlights ({notesList.length})
          </button>
          <button
            onClick={() => onTabChange('bookmarks')}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-[#2a2a2c] text-[#c0c1ff] shadow-sm'
                : 'text-[#908fa0] hover:text-[#e5e1e4]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Bookmarks ({bookmarks?.length || 0})
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="px-3 pb-3 border-b border-[#2a292d]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6a7a]" />
          <input
            type="text"
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#0e0e10] border border-[#2a292d] rounded-lg text-xs text-[#e5e1e4] placeholder:text-[#6b6a7a] focus:outline-none focus:border-[#8083ff]/50"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'notes' && (
          <>
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-[#e5e1e4] font-medium mb-1">No highlights yet</p>
                <p className="text-[11px] text-[#908fa0]">Select text to add highlights or notes.</p>
              </div>
            ) : (
              filteredNotes.map((h) => (
                <div
                  key={h.highlightId}
                  onClick={() => onJumpToChunk(h.chunkIndex, h.highlightId)}
                  className="bg-[#1c1b1d]/60 p-3 rounded-xl border border-[#2a292d] hover:border-[#8083ff]/30 transition-colors cursor-pointer group flex flex-col"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: h.color ? h.color.replace('0.25', '0.8') : '#8083ff' }}
                      />
                      <span className="text-[11px] font-bold text-[#e5e1e4]">Page {h.chunkIndex + 1}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHighlight(h.highlightId);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#908fa0] hover:text-[#ff8080] transition-all"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {h.selectedText && (
                    <div
                      className="border-l-2 pl-2 text-[10px] italic text-[#908fa0] line-clamp-2 mb-2"
                      style={{ borderColor: h.color ? h.color.replace('0.25', '0.8') : '#8083ff' }}
                    >
                      "{h.selectedText}"
                    </div>
                  )}
                  <p className="text-[11px] text-[#c7c4d7] mt-1">{h.note}</p>
                  <span className="text-[9px] text-[#6b6a7a] mt-1">{formatDate(h.createdAt)}</span>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'bookmarks' && (
          <>
            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-[#e5e1e4] font-medium mb-1">No bookmarks yet</p>
                <p className="text-[11px] text-[#908fa0]">Click the bookmark icon in the toolbar to save locations.</p>
              </div>
            ) : (
              filteredBookmarks.map((b) => (
                <div
                  key={b.bookmarkId}
                  onClick={() => onJumpToChunk(b.chunkIndex)}
                  className="bg-[#1c1b1d]/60 p-3 rounded-xl border border-[#2a292d] hover:border-[#8083ff]/30 transition-colors cursor-pointer group flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Bookmark className="w-3.5 h-3.5 fill-current text-[#8083ff]" />
                      <span className="text-[11px] font-bold text-[#e5e1e4]">Page {b.chunkIndex + 1}</span>
                      <span className="text-[#6b6a7a] text-[10px]">•</span>
                      
                      {editingBookmarkId === b.bookmarkId ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onBlur={() => handleBookmarkLabelBlurOrEnter(b)}
                          onKeyDown={(e) => handleKeyDown(e, b)}
                          className="flex-1 bg-[#0e0e10] border border-[#8083ff]/50 rounded px-1.5 py-0.5 text-[11px] text-[#e5e1e4] outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="flex-1 text-[11px] text-[#c7c4d7] hover:text-[#e5e1e4] truncate px-1.5 py-0.5 rounded hover:bg-[#2a292d]/50 transition-colors"
                          onClick={(e) => handleBookmarkLabelClick(e, b)}
                        >
                          {b.label || `Section ${b.chunkIndex + 1}`}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(b.bookmarkId);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#908fa0] hover:text-[#ff8080] transition-all ml-2"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {b.createdAt && <span className="text-[9px] text-[#6b6a7a] mt-2">{formatDate(b.createdAt)}</span>}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnnotationSidebar;
