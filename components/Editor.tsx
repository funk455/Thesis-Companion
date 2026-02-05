import React, { useRef, useEffect } from 'react';
import { FileNode } from '../types';

interface EditorProps {
  file: FileNode | null;
  content: string;
  onChange: (text: string) => void;
  onSelectText: (text: string) => void;
  theme: string;
  isZen: boolean;
  fontSize: number;
}

export const Editor: React.FC<EditorProps> = ({ 
  file, 
  content, 
  onChange, 
  onSelectText, 
  theme, 
  isZen,
  fontSize 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle selection changes to update context for AI
  const handleSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        onSelectText(content.substring(start, end));
      } else {
        onSelectText('');
      }
    }
  };

  // Typewriter scrolling effect simulation (simple version)
  const handleScroll = () => {
    // In a production app, we would calculate line height and force scroll
    // to keep cursor centered. For this MVP, standard scrolling is used.
  };

  if (!file) {
    return (
      <div className={`h-full w-full flex items-center justify-center opacity-40 select-none ${theme === 'sepia' ? 'text-sepia-900' : 'text-gray-400'}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">🪶</div>
          <p>Select a file to begin writing</p>
        </div>
      </div>
    );
  }

  const bgClass = theme === 'sepia' ? 'bg-sepia-50' : 'bg-dark-bg';
  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-300';
  
  // Changed: In Zen mode, use w-full and remove max-width/mx-auto to fill space up to the sidebar
  const zenClass = isZen ? 'w-full px-12 pt-20' : 'p-8 max-w-4xl mx-auto';

  return (
    <div className={`h-full w-full overflow-y-auto ${bgClass} transition-colors duration-300 relative`}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onSelect={handleSelect}
        onScroll={handleScroll}
        placeholder="Start writing..."
        spellCheck={false}
        className={`
          w-full h-full resize-none border-none outline-none bg-transparent 
          leading-relaxed transition-all duration-300
          ${zenClass} ${textClass}
        `}
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: theme === 'sepia' ? '"Georgia", serif' : '"Menlo", monospace'
        }}
      />
      
      {/* Footer Info */}
      <div className={`absolute bottom-2 right-4 text-xs opacity-40 pointer-events-none ${textClass}`}>
        {content.length} chars | {content.split(/\s+/).filter(w => w.length > 0).length} words
      </div>
    </div>
  );
};