import React, { useState, useEffect, useMemo, useCallback } from 'react';
// @ts-ignore
import mammoth from 'mammoth';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { ImageViewer } from './components/ImageViewer';
import { PhraseBank } from './components/PhraseBank';
import { LocalAI } from './components/LocalAI';
import { ZenControls } from './components/ZenControls';
import { TodoList } from './components/TodoList';
import { PdfViewer } from './components/PdfViewer';
import { FileNode, Theme } from './types';
import { 
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, 
  Maximize2, Minimize2, Moon, Sun, Coffee, Book, Bot, Clock, ListTodo
} from 'lucide-react';

export default function App() {
  // State
  const [files, setFiles] = useState<FileNode[]>(() => {
    // 1. Try to load from localStorage
    const savedWorkspace = localStorage.getItem('localthesis_workspace');
    if (savedWorkspace) {
      try {
        return JSON.parse(savedWorkspace);
      } catch (e) {
        console.error("Failed to parse workspace", e);
      }
    }
    // 2. Default to empty (Privacy-First: No mock data)
    return [];
  });

  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [activePdf, setActivePdf] = useState<FileNode | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [zenMode, setZenMode] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'phrases' | 'ai' | 'stats' | 'todos'>('phrases');
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [selectedText, setSelectedText] = useState('');
  const [fontSize, setFontSize] = useState(16);

  // Daily Stats State
  const [dailyStats, setDailyStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('localthesis_daily_stats');
    return saved ? JSON.parse(saved) : {};
  });

  // Derived state
  const wordCount = useMemo(() => {
    // Only count words for text content
    if (activeFile?.type === 'image' || activeFile?.type === 'pdf') return 0;
    return fileContent.split(/\s+/).filter(w => w.length > 0).length;
  }, [fileContent, activeFile]);

  // Effects
  useEffect(() => {
    // Load initial file content if active
    if (activeFile && activeFile.content !== undefined) {
      setFileContent(activeFile.content);
    }
  }, [activeFile]);

  // Save workspace structure whenever files change
  useEffect(() => {
    // We only save the structure (metadata), not the actual file objects if they are blobs
    // For this simple app, we serialize the whole tree.
    // In a real app with File Objects, we'd strip those out before saving.
    const cleanFiles = JSON.stringify(files, (key, value) => {
      if (key === 'fileHandle') return undefined; // Exclude actual File objects
      return value;
    });
    localStorage.setItem('localthesis_workspace', cleanFiles);
  }, [files]);

  // Save Daily Stats
  useEffect(() => {
    localStorage.setItem('localthesis_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Cleanup Object URLs when switching files or unmounting to prevent memory leaks
  useEffect(() => {
    return () => {
      // If the content is a blob URL (starts with blob:), revoke it
      if (fileContent && fileContent.startsWith('blob:')) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [activeFile?.id]); // Run when active file ID changes

  // Helpers
  const countWords = (text: string) => text.split(/\s+/).filter(w => w.length > 0).length;

  const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Central content update handler that tracks productivity
  const handleContentChange = (newContent: string) => {
    // 1. Calculate Delta (Productivity)
    // Only track if we are editing a valid text file
    if (activeFile && activeFile.type !== 'image' && activeFile.type !== 'pdf') {
      const oldWords = countWords(fileContent);
      const newWords = countWords(newContent);
      const delta = newWords - oldWords;

      if (delta !== 0) {
        const today = getLocalDateKey(new Date());
        setDailyStats(prev => {
          const currentTotal = prev[today] || 0;
          return {
            ...prev,
            [today]: currentTotal + delta
          };
        });
      }
    }

    // 2. Update Content State
    setFileContent(newContent);
    
    // 3. Sync to Files Tree (to persist content)
    if (activeFile) {
        setFiles(prev => {
            const updateNode = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                    if (node.id === activeFile.id) {
                        return { ...node, content: newContent };
                    }
                    if (node.children) {
                        return { ...node, children: updateNode(node.children) };
                    }
                    return node;
                });
            };
            return updateNode(prev);
        });
    }
  };

  const handleInsertText = (text: string) => {
    // Append text with a space
    const newContent = fileContent + (fileContent.endsWith(' ') || fileContent === '' ? '' : ' ') + text;
    handleContentChange(newContent);
  };

  const handleToggleFolder = (folderId: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === folderId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setFiles(toggleNode(files));
  };

  // Handlers
  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'pdf') {
      setActivePdf(file);
      // We don't set activeFile for PDF to keep the main editor area available for taking notes
      // unless we want to replace the editor with the PDF. 
      // Current design: PDF opens in split pane, Editor remains.
    } else {
      let content = file.content;
      
      // Load content from file handle if not already loaded or if it needs refreshing (like images)
      if (file.fileHandle) {
         try {
             if (file.type === 'image') {
               // Create a new object URL for the image
               content = URL.createObjectURL(file.fileHandle);
               // We don't strictly need to update the file tree state with the blob URL
               // as it changes per session, but we do update the local content state.
             } else if (content === undefined) {
                // Text/Docx processing
                if (file.name.toLowerCase().endsWith('.docx')) {
                     const arrayBuffer = await file.fileHandle.arrayBuffer();
                     const result = await mammoth.extractRawText({ arrayBuffer });
                     content = result.value;
                 } else {
                     // Default to text for other types
                     content = await file.fileHandle.text();
                 }
                 
                 // Note: We don't call handleContentChange here because loading a file isn't "Productivity"
                 // We manually update the tree cache if needed
                 setFiles(prev => {
                     const updateNode = (nodes: FileNode[]): FileNode[] => {
                         return nodes.map(n => {
                             if (n.id === file.id) return { ...n, content: content };
                             if (n.children) return { ...n, children: updateNode(n.children) };
                             return n;
                         });
                     };
                     return updateNode(prev);
                 });
             }
         } catch (e) {
             console.error(e);
             content = `Error reading file: ${(e as Error).message}`;
         }
      }
      
      setActiveFile({ ...file, content: content || '' });
      setFileContent(content || '');
    }
  };

  const toggleZen = () => {
    setZenMode(!zenMode);
    if (!zenMode) {
      // Enter Zen Mode: Close Left, Ensure Right is Open (as requested)
      setIsLeftOpen(false);
      setIsRightOpen(true);
    } else {
      // Exit Zen Mode: Reset to standard view
      setIsLeftOpen(true);
      setIsRightOpen(true);
    }
  };

  // Styles
  const mainBg = theme === 'sepia' ? 'bg-sepia-50' : 'bg-dark-bg';
  const borderColor = theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border';
  const iconColor = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-400';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${mainBg} ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      
      {/* Left Sidebar */}
      {!zenMode && isLeftOpen && (
        <Sidebar 
          files={files} 
          activeFileId={activeFile?.id || null} 
          onFileClick={handleFileClick} 
          onToggleFolder={handleToggleFolder}
          onSetFiles={setFiles} // Pass the setter
          theme={theme}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Toolbar (Hidden in Zen) */}
        {!zenMode && (
          <div className={`h-10 border-b flex items-center justify-between px-3 flex-shrink-0 ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-300' : 'bg-dark-sidebar border-dark-border'}`}>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsLeftOpen(!isLeftOpen)} className={`p-1 rounded hover:bg-black/10 ${iconColor}`}>
                {isLeftOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
              <span className={`text-xs font-medium ml-2 ${iconColor}`}>{activeFile?.name || 'LocalThesis'}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-black/5 rounded p-0.5">
                <button onClick={() => setTheme('dark')} className={`p-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-700'}`}><Moon size={12} /></button>
                <button onClick={() => setTheme('sepia')} className={`p-1 rounded ${theme === 'sepia' ? 'bg-sepia-400 text-sepia-900' : 'text-gray-500 hover:text-gray-700'}`}><Coffee size={12} /></button>
                <button onClick={() => setTheme('light')} className={`p-1 rounded ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Sun size={12} /></button>
              </div>
              
              <div className="w-px h-4 bg-gray-500/20 mx-1" />

              <button onClick={toggleZen} className={`p-1 rounded hover:bg-black/10 ${iconColor}`} title="Toggle Zen Mode">
                <Maximize2 size={16} />
              </button>
              
              <button onClick={() => setIsRightOpen(!isRightOpen)} className={`p-1 rounded hover:bg-black/10 ${iconColor}`}>
                {isRightOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Content Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer Pane */}
          {activePdf && !zenMode && (
             <PdfViewer 
               file={activePdf} 
               onClose={() => setActivePdf(null)} 
               theme={theme} 
             />
          )}

          {/* Editor/Image Viewer Pane */}
          <div className="flex-1 relative">
            {activeFile?.type === 'image' ? (
              <ImageViewer 
                file={activeFile} 
                src={fileContent} 
                theme={theme} 
              />
            ) : (
              <Editor 
                file={activeFile}
                content={fileContent}
                onChange={handleContentChange} // Use the tracker wrapper
                onSelectText={setSelectedText}
                theme={theme}
                isZen={zenMode}
                fontSize={fontSize}
              />
            )}
            
            {/* Zen Mode Floating Controls */}
            {zenMode && (
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300 z-50">
                  <button onClick={() => setIsRightOpen(!isRightOpen)} className="p-2 bg-gray-800 text-white rounded-full shadow-lg" title="Toggle Sidebar">
                    {isRightOpen ? <PanelRightClose size={16} /> : <PanelLeftOpen size={16} />}
                  </button>
                  <button onClick={toggleZen} className="p-2 bg-gray-800 text-white rounded-full shadow-lg" title="Exit Zen Mode">
                    <Minimize2 size={16} />
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar (Tools) - Now enabled in Zen Mode if toggled */}
      {isRightOpen && (
        <div className={`w-72 border-l flex flex-col flex-shrink-0 ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-200' : 'bg-dark-sidebar border-dark-border'}`}>
          <div className="flex border-b border-inherit">
             <button 
                onClick={() => setRightPanelTab('phrases')}
                className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${rightPanelTab === 'phrases' ? (theme === 'sepia' ? 'border-sepia-800 text-sepia-900' : 'border-blue-500 text-blue-400') : 'border-transparent opacity-50'}`}
                title="Phrasebank"
             >
                <Book size={18} />
             </button>
             <button 
                onClick={() => setRightPanelTab('ai')}
                className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${rightPanelTab === 'ai' ? (theme === 'sepia' ? 'border-sepia-800 text-sepia-900' : 'border-blue-500 text-blue-400') : 'border-transparent opacity-50'}`}
                title="Local AI"
             >
                <Bot size={18} />
             </button>
             <button 
                onClick={() => setRightPanelTab('stats')}
                className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${rightPanelTab === 'stats' ? (theme === 'sepia' ? 'border-sepia-800 text-sepia-900' : 'border-blue-500 text-blue-400') : 'border-transparent opacity-50'}`}
                title="Stats & Timer"
             >
                <Clock size={18} />
             </button>
             <button 
                onClick={() => setRightPanelTab('todos')}
                className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${rightPanelTab === 'todos' ? (theme === 'sepia' ? 'border-sepia-800 text-sepia-900' : 'border-blue-500 text-blue-400') : 'border-transparent opacity-50'}`}
                title="Tasks"
             >
                <ListTodo size={18} />
             </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'phrases' && <PhraseBank onInsert={handleInsertText} theme={theme} />}
            {rightPanelTab === 'ai' && <LocalAI onInsert={handleInsertText} selectedText={selectedText} theme={theme} />}
            {rightPanelTab === 'stats' && <ZenControls theme={theme} wordCount={wordCount} dailyStats={dailyStats} />}
            {rightPanelTab === 'todos' && <TodoList theme={theme} />}
          </div>
        </div>
      )}
    </div>
  );
}