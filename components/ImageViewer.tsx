import React, { useState, useRef, useEffect } from 'react';
import { FileNode } from '../types';
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

interface ImageViewerProps {
  file: FileNode | null;
  src: string;
  theme: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, src, theme }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reset state when file changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  // Use native event listener for wheel to support { passive: false }
  // This is required to prevent the browser's default zoom (Ctrl + Wheel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Critical: Stop browser zoom/scroll
      
      const scaleAdjustment = -e.deltaY * 0.001;
      setScale(prevScale => Math.min(Math.max(0.1, prevScale + scaleAdjustment), 10));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Handlers for Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 10));
  const zoomOut = () => setScale(s => Math.max(0.1, s - 0.25));
  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!file || !src) {
    return null;
  }

  const bgClass = theme === 'sepia' ? 'bg-sepia-50' : 'bg-dark-bg';
  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-300';
  const toolbarClass = theme === 'sepia' ? 'bg-sepia-100 border-sepia-300 text-sepia-900' : 'bg-gray-800 border-gray-700 text-gray-200';

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden ${bgClass}`}>
      
      {/* Toolbar */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-lg border shadow-lg opacity-90 ${toolbarClass}`}>
        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-black/10" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-black/10" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-gray-400/30 mx-1"></div>
        <button onClick={reset} className="p-1.5 rounded hover:bg-black/10" title="Reset View">
          <Maximize size={16} />
        </button>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <img 
          src={src} 
          alt={file.name} 
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: 'none', // Allow image to exceed container when zoomed
            maxHeight: 'none',
          }}
          className="select-none pointer-events-none shadow-lg rounded object-contain"
        />
      </div>

      {/* Footer Info */}
      <div className={`h-8 flex items-center justify-center text-xs opacity-50 border-t ${theme === 'sepia' ? 'border-sepia-200' : 'border-dark-border'} ${textClass} z-10 bg-inherit`}>
        <Move size={12} className="mr-2" />
        {file.name} — Drag to pan, scroll to zoom
      </div>
    </div>
  );
};
