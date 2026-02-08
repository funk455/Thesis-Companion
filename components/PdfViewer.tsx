import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileNode, AIConfig } from '../types';
import { generateText } from '../services/geminiService';
import { 
  X, Upload, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Hand, MousePointer2, Highlighter, Trash2, Languages, StickyNote, Check,
  Loader2, Copy
} from 'lucide-react';
// @ts-ignore
import * as pdfjsModule from 'pdfjs-dist';

// Resolving the library object safely
const pdfjsLib = pdfjsModule.default || pdfjsModule;

interface PdfViewerProps {
  file: FileNode;
  onClose: () => void;
  theme: string;
}

interface HighlightArea {
  id: string;
  rects: { left: number; top: number; width: number; height: number }[];
  page: number;
}

interface PdfNote {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  page: number;
  text: string;
  isOpen: boolean;
}

interface TranslationState {
  isOpen: boolean;
  sourceText: string;
  translatedText: string;
  loading: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, onClose, theme }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  
  // Tools: 'hand' | 'cursor' | 'note'
  const [toolMode, setToolMode] = useState<'hand' | 'cursor' | 'note'>('cursor');
  const [highlights, setHighlights] = useState<HighlightArea[]>([]);
  const [notes, setNotes] = useState<PdfNote[]>([]);
  
  // Translation State
  const [translation, setTranslation] = useState<TranslationState>({
    isOpen: false,
    sourceText: '',
    translatedText: '',
    loading: false
  });
  
  // Temp state for creating a new note
  const [pendingNote, setPendingNote] = useState<Partial<PdfNote> | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // 1. Initialize Worker
  useEffect(() => {
    const setupWorker = async () => {
      if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
        setWorkerReady(true);
        return;
      }
      try {
        const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        const response = await fetch(workerUrl);
        if (!response.ok) throw new Error('Failed to fetch worker script');
        const workerScript = await response.text();
        const blob = new Blob([workerScript], { type: 'text/javascript' });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        setWorkerReady(true);
      } catch (err) {
        console.error("Worker initialization failed", err);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        setWorkerReady(true);
      }
    };
    setupWorker();
  }, []);

  // 2. Load PDF & Restore Notes
  useEffect(() => {
    if (!workerReady) return;
    let active = true;
    
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setPageNum(1);
      setHighlights([]); 

      // Load notes from local storage
      const savedNotes = localStorage.getItem(`pdf_notes_${file.id}`);
      if (savedNotes) {
        try {
          setNotes(JSON.parse(savedNotes));
        } catch (e) { console.error("Failed to load notes", e); }
      } else {
        setNotes([]);
      }

      try {
        let url = '';
        if (file.fileHandle) {
          url = URL.createObjectURL(file.fileHandle);
        } else {
          setLoading(false);
          return;
        }

        if (!pdfjsLib.getDocument) throw new Error("PDF Engine not initialized.");

        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        const doc = await loadingTask.promise;
        if (active) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        if (active) {
          setError(err.message || "Failed to load PDF");
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [file, workerReady]);

  // Persist notes on change
  useEffect(() => {
    if (file.id) {
      localStorage.setItem(`pdf_notes_${file.id}`, JSON.stringify(notes));
    }
  }, [notes, file.id]);

  // 3. Render Page (Canvas + Text Layer)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current || !contentWrapperRef.current) return;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        const wrapper = contentWrapperRef.current;
        
        if (!canvas || !textLayerDiv || !wrapper) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // --- A. Canvas Rendering (High DPI) ---
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        
        // Update Wrapper Size to match viewport
        wrapper.style.width = `${Math.floor(viewport.width)}px`;
        wrapper.style.height = `${Math.floor(viewport.height)}px`;

        const transform = [dpr, 0, 0, dpr, 0, 0];
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // --- B. Text Layer Rendering ---
        // Clear previous text layer
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
        textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
        // Basic CSS for text alignment
        textLayerDiv.style.setProperty('--scale-factor', `${scale}`);

        const textContent = await page.getTextContent();
        
        // We use the PDF.js text layer render utility
        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: []
        }).promise;

      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error("Render error:", err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  // --- Global Drag Logic (Event Listeners on Document) ---
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current && toolMode === 'hand') {
        e.preventDefault();
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        containerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
        containerRef.current.scrollTop = dragStart.current.scrollTop - dy;
      }
    };

    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDragging, toolMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Start drag only if hand tool is active
    if (toolMode === 'hand' && containerRef.current) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      };
      containerRef.current.style.cursor = 'grabbing';
      return;
    }

    // Add Note Logic
    if (toolMode === 'note' && contentWrapperRef.current) {
      // Don't trigger if clicking existing note
      if ((e.target as HTMLElement).closest('.pdf-note')) return;

      const rect = contentWrapperRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate percentage to handle zoom
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      setPendingNote({
        x: xPercent,
        y: yPercent,
        page: pageNum,
        text: '',
        isOpen: true
      });
    }
  };

  // --- Highlight Logic ---
  const addHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());
    
    // We need coordinates relative to the contentWrapper
    if (!contentWrapperRef.current) return;
    const wrapperRect = contentWrapperRef.current.getBoundingClientRect();

    const relativeRects = rects.map(r => ({
      left: r.left - wrapperRect.left,
      top: r.top - wrapperRect.top,
      width: r.width,
      height: r.height
    }));

    const newHighlight: HighlightArea = {
      id: Date.now().toString(),
      rects: relativeRects,
      page: pageNum
    };

    setHighlights(prev => [...prev, newHighlight]);
    selection.removeAllRanges(); // Clear selection after highlighting
  };

  const clearHighlights = () => {
    setHighlights(prev => prev.filter(h => h.page !== pageNum));
  };

  // --- Note Logic ---
  const savePendingNote = () => {
    if (pendingNote && pendingNote.text?.trim()) {
      const newNote: PdfNote = {
        id: Date.now().toString(),
        x: pendingNote.x!,
        y: pendingNote.y!,
        page: pendingNote.page!,
        text: pendingNote.text!,
        isOpen: false // Close after save
      };
      setNotes(prev => [...prev, newNote]);
    }
    setPendingNote(null);
    setToolMode('cursor'); // Reset to cursor after adding note
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const toggleNoteOpen = (noteId: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isOpen: !n.isOpen } : n));
  };

  // --- Translation Logic (In-App Gemini) ---
  const handleTranslate = async () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (!text) {
      alert("Please select text to translate first.");
      return;
    }

    setTranslation({
      isOpen: true,
      sourceText: text,
      translatedText: '',
      loading: true
    });

    try {
      // Use Gemini to translate
      const config: AIConfig = { enabled: true, model: 'gemini-3-flash-preview' };
      const prompt = `Translate the following text into Chinese (Simplified). Only provide the translation, no explanations:\n\n"${text}"`;
      
      const result = await generateText(prompt, config);
      
      setTranslation(prev => ({
        ...prev,
        translatedText: result,
        loading: false
      }));
    } catch (e) {
      setTranslation(prev => ({
        ...prev,
        translatedText: "Translation failed. Please check your network or API key.",
        loading: false
      }));
    }
  };

  const closeTranslation = () => {
    setTranslation(prev => ({ ...prev, isOpen: false }));
  };

  // --- Controls ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
       // Logic handled externally in real app, simplified here
    }
  };

  const nextPage = () => setPageNum(p => Math.min(p + 1, numPages));
  const prevPage = () => setPageNum(p => Math.max(p - 1, 1));
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 4.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const triggerFileUpload = () => fileInputRef.current?.click();

  const bgClass = theme === 'sepia' ? 'bg-sepia-100 border-sepia-300' : 'bg-gray-900 border-dark-border';
  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-200';
  const buttonHover = theme === 'sepia' ? 'hover:bg-sepia-200' : 'hover:bg-gray-800';
  const activeToolClass = theme === 'sepia' ? 'bg-sepia-300 text-sepia-900' : 'bg-blue-600 text-white';

  return (
    <div className={`w-1/2 border-r flex flex-col h-full ${bgClass} transition-colors duration-300 relative`}>
      {/* 1. Toolbar */}
      <div className={`flex items-center gap-2 p-2 text-xs border-b ${theme === 'sepia' ? 'border-sepia-300 bg-sepia-200' : 'border-dark-border bg-black/20'} overflow-x-auto whitespace-nowrap`}>
        {/* Left: Mode Tools (Moved from right) */}
        <div className="flex gap-1 mr-auto">
            <button 
              onClick={() => setToolMode('hand')} 
              className={`p-1 rounded ${toolMode === 'hand' ? activeToolClass : `${textClass} ${buttonHover}`}`}
              title="Hand Tool (Drag to Pan)"
            >
              <Hand size={14} />
            </button>
            <button 
              onClick={() => setToolMode('cursor')} 
              className={`p-1 rounded ${toolMode === 'cursor' ? activeToolClass : `${textClass} ${buttonHover}`}`}
              title="Selection Tool"
            >
              <MousePointer2 size={14} />
            </button>
            <button 
              onClick={() => setToolMode('note')} 
              className={`p-1 rounded ${toolMode === 'note' ? activeToolClass : `${textClass} ${buttonHover}`}`}
              title="Add Note"
            >
              <StickyNote size={14} />
            </button>
        </div>
        
        {/* Right: Controls (Grouped) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Pagination */}
          <div className="flex items-center gap-1">
            <button onClick={prevPage} disabled={pageNum <= 1} className={`p-1 rounded ${textClass} ${buttonHover}`}><ChevronLeft size={16}/></button>
            <span className={`mx-1 min-w-[3rem] text-center ${textClass}`}>
              {numPages > 0 ? `${pageNum} / ${numPages}` : '--'}
            </span>
            <button onClick={nextPage} disabled={pageNum >= numPages} className={`p-1 rounded ${textClass} ${buttonHover}`}><ChevronRight size={16}/></button>
          </div>

          <div className="w-px h-3 bg-gray-400/30 mx-1"></div>

          {/* Zoom Tools */}
          <div className="flex gap-1">
            <button onClick={zoomOut} className={`p-1 rounded ${textClass} ${buttonHover}`}><ZoomOut size={14}/></button>
            <button onClick={zoomIn} className={`p-1 rounded ${textClass} ${buttonHover}`}><ZoomIn size={14}/></button>
          </div>
          
          <div className="w-px h-3 bg-gray-400/30 mx-1"></div>
          
          {/* Action Tools */}
          <div className="flex gap-1">
            <button 
              onClick={addHighlight} 
              className={`p-1 rounded ${textClass} ${buttonHover} hover:text-yellow-400`}
              title="Highlight Selected Text"
              disabled={toolMode === 'hand' || toolMode === 'note'}
            >
              <Highlighter size={14} />
            </button>
            <button 
                onClick={handleTranslate}
                className={`p-1 rounded ${textClass} ${buttonHover} hover:text-blue-400`}
                title="Translate Selected Text (AI)"
                disabled={toolMode === 'hand' || toolMode === 'note'}
              >
                <Languages size={14} />
            </button>
            <button 
                onClick={clearHighlights}
                className={`p-1 rounded ${textClass} ${buttonHover} hover:text-red-400`}
                title="Clear Highlights"
              >
                <Trash2 size={14} />
            </button>
          </div>

          <div className="w-px h-3 bg-gray-400/30 mx-1"></div>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
          <button onClick={triggerFileUpload} className={`p-1 rounded ${textClass} ${buttonHover}`} title="Upload New PDF"><Upload size={14} /></button>
          <button onClick={onClose} className={`p-1 rounded hover:text-red-500 ${textClass}`} title="Close PDF"><X size={14} /></button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 relative overflow-auto bg-gray-500/10 ${toolMode === 'hand' ? 'cursor-grab active:cursor-grabbing select-none' : (toolMode === 'note' ? 'cursor-crosshair' : 'cursor-text')}`}
      >
        <style>{`
          .textLayer {
            position: absolute;
            left: 0; top: 0; right: 0; bottom: 0;
            overflow: hidden;
            opacity: 0.2;
            line-height: 1.0;
            pointer-events: ${toolMode === 'hand' ? 'none' : 'auto'};
          }
          .textLayer > span {
            color: transparent;
            position: absolute;
            white-space: pre;
            cursor: text;
            transform-origin: 0% 0%;
          }
          ::selection {
            background: rgba(59, 130, 246, 0.3);
          }
        `}</style>

        {/* Centering Wrapper */}
        <div className="min-w-full min-h-full flex items-center justify-center p-8">
            {pdfDoc ? (
            <div className="relative shadow-xl bg-white" ref={contentWrapperRef}>
                {/* Layer 1: Canvas */}
                <canvas ref={canvasRef} className="block w-full h-full absolute top-0 left-0 z-0" />
                
                {/* Layer 2: Highlights */}
                <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
                  {highlights.filter(h => h.page === pageNum).map(h => (
                    <React.Fragment key={h.id}>
                      {h.rects.map((rect, i) => (
                        <div
                          key={i}
                          className="absolute bg-yellow-300 mix-blend-multiply opacity-40"
                          style={{
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height
                          }}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                {/* Layer 3: Notes (Existing) */}
                <div className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none">
                   {notes.filter(n => n.page === pageNum).map(note => (
                     <div 
                       key={note.id} 
                       className="absolute pointer-events-auto flex flex-col items-center pdf-note"
                       style={{ left: `${note.x}%`, top: `${note.y}%` }}
                     >
                        {/* Note Icon */}
                        <button 
                          onClick={() => toggleNoteOpen(note.id)}
                          className="bg-yellow-200 text-yellow-900 p-1 rounded-full shadow hover:bg-yellow-300 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                        >
                          <StickyNote size={20} fill="#fef08a" />
                        </button>

                        {/* Note Content (Popover) */}
                        {note.isOpen && (
                          <div className="absolute top-6 left-0 bg-yellow-100 border border-yellow-300 rounded shadow-lg p-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left text-gray-800">
                             <div className="text-xs mb-1 whitespace-pre-wrap leading-relaxed">{note.text}</div>
                             <div className="flex justify-end pt-1 border-t border-yellow-200/50">
                                <button onClick={() => deleteNote(note.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Delete Note">
                                  <Trash2 size={12} />
                                </button>
                             </div>
                          </div>
                        )}
                     </div>
                   ))}
                </div>

                {/* Layer 4: New Note Input */}
                {pendingNote && pendingNote.page === pageNum && (
                  <div 
                    className="absolute z-40 bg-yellow-100 border border-yellow-300 shadow-xl rounded p-2 w-56 flex flex-col gap-2 pdf-note"
                    style={{ left: `${pendingNote.x}%`, top: `${pendingNote.y}%` }}
                  >
                    <textarea 
                      autoFocus
                      placeholder="Type your thought..."
                      value={pendingNote.text}
                      onChange={e => setPendingNote(prev => ({ ...prev, text: e.target.value }))}
                      onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); savePendingNote(); }}}
                      className="w-full h-20 bg-transparent resize-none outline-none text-xs text-gray-800 placeholder-yellow-800/40"
                    />
                    <div className="flex justify-between items-center">
                       <button onClick={() => setPendingNote(null)} className="text-[10px] text-gray-500 hover:text-gray-700 uppercase tracking-wide">Cancel</button>
                       <button onClick={savePendingNote} className="p-1 bg-yellow-400 text-yellow-900 rounded hover:bg-yellow-500">
                         <Check size={14} />
                       </button>
                    </div>
                  </div>
                )}

                {/* Layer 5: Text Layer */}
                <div ref={textLayerRef} className="textLayer z-20" />
            </div>
            ) : (
            <div className={`flex flex-col items-center justify-center opacity-50 ${textClass}`}>
                {loading ? "Rendering..." : "Loading PDF..."}
            </div>
            )}
        </div>
      </div>

      {/* Floating Translation Window */}
      {translation.isOpen && (
        <div className={`absolute top-12 right-4 z-50 w-72 rounded-lg shadow-2xl border flex flex-col ${theme === 'sepia' ? 'bg-sepia-50 border-sepia-300' : 'bg-gray-800 border-gray-700'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-2 border-b ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-200' : 'bg-gray-900 border-gray-700'}`}>
             <div className={`flex items-center gap-2 text-xs font-semibold ${textClass}`}>
               <Languages size={14} /> Quick Translate
             </div>
             <button onClick={closeTranslation} className={`p-1 rounded hover:bg-red-500/10 hover:text-red-500 ${textClass}`}>
               <X size={14} />
             </button>
          </div>

          {/* Content */}
          <div className="p-3 flex flex-col gap-3 max-h-96 overflow-y-auto">
             {/* Source */}
             <div>
               <div className={`text-[10px] uppercase tracking-wider opacity-50 mb-1 ${textClass}`}>Original</div>
               <div className={`text-xs p-2 rounded bg-opacity-50 italic ${theme === 'sepia' ? 'bg-sepia-200 text-sepia-800' : 'bg-gray-900 text-gray-400'}`}>
                 "{translation.sourceText.length > 150 ? translation.sourceText.substring(0, 150) + '...' : translation.sourceText}"
               </div>
             </div>
             
             {/* Result */}
             <div>
               <div className={`text-[10px] uppercase tracking-wider opacity-50 mb-1 ${textClass}`}>Translation (ZH-CN)</div>
               <div className={`text-sm leading-relaxed ${textClass} min-h-[60px]`}>
                 {translation.loading ? (
                   <div className="flex items-center gap-2 opacity-60">
                     <Loader2 size={16} className="animate-spin" /> Translating...
                   </div>
                 ) : (
                   translation.translatedText
                 )}
               </div>
             </div>
          </div>
          
          {/* Footer actions */}
          <div className={`p-2 border-t flex justify-end gap-2 ${theme === 'sepia' ? 'border-sepia-200' : 'border-gray-700'}`}>
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(translation.translatedText);
               }}
               disabled={translation.loading || !translation.translatedText}
               className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${theme === 'sepia' ? 'hover:bg-sepia-200 text-sepia-900' : 'hover:bg-gray-700 text-gray-300'}`}
               title="Copy Translation"
             >
               <Copy size={12} /> Copy
             </button>
          </div>
        </div>
      )}
    </div>
  );
};