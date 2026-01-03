import React, { useState, useEffect, useMemo } from 'react';
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
  
  // Default open on desktop, closed on mobile? Let's default to open, but use responsive CSS
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  
  const [selectedText, setSelectedText] = useState('');
  const [fontSize, setFontSize] = useState(16);

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
    const cleanFiles = JSON.stringify(files, (key, value) => {
      if (key === 'fileHandle') return undefined; // Exclude actual File objects
      return value;
    });
    localStorage.setItem('localthesis_workspace', cleanFiles);
  }, [files]);

  // Cleanup Object URLs when switching files or unmounting to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fileContent && fileContent.startsWith('blob:')) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [activeFile?.id]);

  // Auto-close sidebars on mobile when selecting a file (optional UX improvement)
  const handleMobileSidebarClose = () => {
    if (window.innerWidth < 768) {
      setIsLeftOpen(false);
    }
  };

  // Helpers
  const updateFileContent = (fileId: string, newContent: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === fileId) {
          return { ...node, content: newContent };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFiles(prev => updateNode(prev));
  };

  // Handlers
  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'pdf') {
      setActivePdf(file);
      handleMobileSidebarClose();
    } else {
      let content = file.content;
      
      // Load content from file handle if not already loaded or if it needs refreshing
      if (file.fileHandle) {
         try {
             if (file.type === 'image') {
               content = URL.createObjectURL(file.fileHandle);
             } else if (content === undefined) {
                if (file.name.toLowerCase().endsWith('.docx')) {
                     const arrayBuffer = await file.fileHandle.arrayBuffer();
                     const result = await mammoth.extractRawText({ arrayBuffer });
                     content = result.value;
                 } else {
                     content = await file.fileHandle.text();
                 }
                 updateFileContent(file.id, content || '');
             }
         } catch (e) {
             console.error(e);
             content = `Error reading file: ${(e as Error).message}`;
         }
      }
      
      setActiveFile({ ...file, content: content || '' });
      setFileContent(content || '');
      handleMobileSidebarClose();
    }
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

  const handleInsertText = (text: string) => {
    setFileContent(prev => prev + ' ' + text);
    // On mobile, close right panel after insert to see content
    if (window.innerWidth < 768) setIsRightOpen(false);
  };

  const toggleZen = () => {
    setZenMode(!zenMode);
    if (!zenMode) {
      setIsLeftOpen(false);
      setIsRightOpen(false);
    } else {
      setIsLeftOpen(true);
      setIsRightOpen(true);
    }
  };

  // Styles
  const mainBg = theme === 'sepia' ? 'bg-sepia-50' : 'bg-dark-bg';
  const iconColor = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-400';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${mainBg} ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
      
      {/* 
        LEFT SIDEBAR: 
        - Mobile: Absolute, z-50, overlay
        - Desktop: Relative, flex item
      */}
      {!zenMode && isLeftOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl md:relative md:shadow-none h-full flex-shrink-0 transition-all duration-300">
          <Sidebar 
            files={files} 
            activeFileId={activeFile?.id || null} 
            onFileClick={handleFileClick} 
            onToggleFolder={handleToggleFolder}
            onSetFiles={setFiles}
            theme={theme}
          />
        </div>
      )}
      {/* Mobile Backdrop for Left Sidebar */}
      {!zenMode && isLeftOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsLeftOpen(false)} 
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Toolbar */}
        <div className={`h-12 md:h-10 border-b flex items-center justify-between px-3 flex-shrink-0 z-20 ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-300' : 'bg-dark-sidebar border-dark-border'}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsLeftOpen(!isLeftOpen)} className={`p-1.5 rounded hover:bg-black/10 ${iconColor}`}>
              {isLeftOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <span className={`text-xs md:text-sm font-medium ml-1 truncate max-w-[120px] md:max-w-none ${iconColor}`}>
              {activeFile?.name || 'LocalThesis'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center bg-black/5 rounded p-0.5">
              <button onClick={() => setTheme('dark')} className={`p-1.5 md:p-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-700'}`}><Moon size={14} /></button>
              <button onClick={() => setTheme('sepia')} className={`p-1.5 md:p-1 rounded ${theme === 'sepia' ? 'bg-sepia-400 text-sepia-900' : 'text-gray-500 hover:text-gray-700'}`}><Coffee size={14} /></button>
              <button onClick={() => setTheme('light')} className={`p-1.5 md:p-1 rounded ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Sun size={14} /></button>
            </div>
            
            <div className="w-px h-4 bg-gray-500/20 mx-1 hidden md:block" />

            <button onClick={toggleZen} className={`p-1.5 rounded hover:bg-black/10 hidden md:block ${iconColor}`} title="Toggle Zen Mode">
              {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            
            <button onClick={() => setIsRightOpen(!isRightOpen)} className={`p-1.5 rounded hover:bg-black/10 ${iconColor}`}>
              {isRightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>
        </div>

        {/* 
           Content Split View 
           - Mobile: Flex-col (Stacked vertically if both present)
           - Desktop: Flex-row (Side by side)
        */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* PDF Pane */}
          {activePdf && !zenMode && (
             <PdfViewer 
               file={activePdf} 
               onClose={() => setActivePdf(null)} 
               theme={theme} 
             />
          )}

          {/* Editor/Image Pane */}
          <div className="flex-1 relative h-full w-full">
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
                onChange={setFileContent}
                onSelectText={setSelectedText}
                theme={theme}
                isZen={zenMode}
                fontSize={fontSize}
              />
            )}
            
            {/* Zen Mode Floating Controls */}
            {zenMode && (
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <button onClick={toggleZen} className="p-2 bg-gray-800 text-white rounded-full shadow-lg"><Minimize2 size={16} /></button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 
        RIGHT SIDEBAR:
        - Mobile: Absolute, z-50, overlay
        - Desktop: Relative, flex item
      */}
      {!zenMode && isRightOpen && (
        <div className={`fixed inset-y-0 right-0 z-50 w-72 md:w-72 shadow-2xl md:relative md:shadow-none border-l flex flex-col flex-shrink-0 h-full ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-200' : 'bg-dark-sidebar border-dark-border'}`}>
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
            {rightPanelTab === 'stats' && <ZenControls theme={theme} wordCount={wordCount} />}
            {rightPanelTab === 'todos' && <TodoList theme={theme} />}
          </div>
        </div>
      )}
      {/* Mobile Backdrop for Right Sidebar */}
      {!zenMode && isRightOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsRightOpen(false)} 
        />
      )}
    </div>
  );
}