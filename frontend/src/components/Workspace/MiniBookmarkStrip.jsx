import React, { useState } from 'react';

export default function MiniBookmarkStrip({ highlights, bookmarks, totalChunks, onJumpToChunk, containerRef }) {
  const [hoveredMarker, setHoveredMarker] = useState(null);

  if (!totalChunks || totalChunks === 0) return null;

  // Build markers array
  const markers = [];

  // Add bookmark markers
  bookmarks.forEach(b => {
    markers.push({
      id: 'bm-' + b.bookmarkId,
      chunkIndex: b.chunkIndex,
      color: '#8083ff',
      label: `Page ${b.chunkIndex + 1} — ${b.label || 'Bookmark'}`,
      type: 'bookmark',
    });
  });

  // Add highlight/note markers
  highlights.forEach(h => {
    markers.push({
      id: 'hl-' + h.highlightId,
      chunkIndex: h.chunkIndex,
      color: h.note ? '#f59e0b' : h.color.replace('0.25', '0.8'),
      label: `Page ${h.chunkIndex + 1} — ${h.note || h.selectedText?.substring(0, 40) + '...' || 'Highlight'}`,
      type: h.note ? 'note' : 'highlight',
    });
  });

  return (
    <div className="absolute right-0 top-0 bottom-0 w-2.5 z-20 flex flex-col pointer-events-auto">
      {markers.map(marker => {
        const topPercent = ((marker.chunkIndex + 0.5) / totalChunks) * 100;
        return (
          <div
            key={marker.id}
            className="absolute right-0.5 cursor-pointer group"
            style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
            onClick={() => onJumpToChunk(marker.chunkIndex)}
            onMouseEnter={() => setHoveredMarker(marker.id)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            <div
              className="w-1.5 h-[3px] rounded-full transition-all duration-150 hover:w-2 hover:h-1"
              style={{ backgroundColor: marker.color }}
            />
            {hoveredMarker === marker.id && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-[#1c1b1d]/95 backdrop-blur-md border border-[#2a292d] text-[10px] text-[#e5e1e4] shadow-xl z-50 pointer-events-none">
                {marker.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
