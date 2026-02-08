import React, { useState, useRef } from 'react';
import { FileNode } from '../types';
import { 
  ChevronRight, ChevronDown, FileText, Folder, FileType, 
  ListTree, LayoutGrid, ArrowLeft, HardDrive, FolderOpen,
  Image as ImageIcon
} from 'lucide-react';

interface SidebarProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileClick: (file: FileNode) => void;
  onToggleFolder: (folderId: string) => void;
  onSetFiles: (files: FileNode[]) => void;
  theme: 'dark' | 'sepia' | 'light';
}

// Helper to find a node and its parent for navigation
const findNodeAndParent = (
  nodes: FileNode[], 
  targetId: string, 
  parent: FileNode | null = null
): { node: FileNode | null, parent: FileNode | null } => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return { node, parent };
    }
    if (node.children) {
      const result = findNodeAndParent(node.children, targetId, node);
      if (result.node) return result;
    }
  }
  return { node: null, parent: null };
};

// Helper to get file icon
const GetFileIcon = ({ type, className }: { type: string, className?: string }) => {
  if (type === 'pdf') return <FileType size={14} className={`text-red-400 ${className}`} />;
  if (type === 'image') return <ImageIcon size={14} className={`text-purple-400 ${className}`} />;
  return <FileText size={14} className={`text-blue-400 ${className}`} />;
};

const GetGridIcon = ({ type, theme }: { type: string, theme: string }) => {
  if (type === 'folder') return <Folder size={32} fill={theme === 'sepia' ? '#e5e7eb' : '#374151'} fillOpacity={0.5} />;
  if (type === 'pdf') return <FileType size={32} className="text-red-400" />;
  if (type === 'image') return <ImageIcon size={32} className="text-purple-400" />;
  return <FileText size={32} className="text-blue-400" />;
};

// Tree View Item Component
const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  activeFileId: string | null;
  onFileClick: (file: FileNode) => void;
  onToggleFolder: (folderId: string) => void;
  theme: string;
}> = ({ node, level, activeFileId, onFileClick, onToggleFolder, theme }) => {
  const isFolder = node.type === 'folder';
  const isActive = activeFileId === node.id;
  
  const hoverClass = theme === 'sepia' ? 'hover:bg-sepia-200 text-sepia-900' : 'hover:bg-gray-700 text-gray-300';
  const activeClass = theme === 'sepia' ? 'bg-sepia-300 font-medium text-sepia-900' : 'bg-blue-900/50 text-blue-100';
  
  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer text-sm select-none transition-colors duration-150 ${
          isActive ? activeClass : hoverClass
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => isFolder ? onToggleFolder(node.id) : onFileClick(node)}
      >
        <span className="mr-1.5 opacity-70 flex-shrink-0">
          {isFolder ? (
            node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <GetFileIcon type={node.type} />
          )}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {isFolder && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeFileId={activeFileId}
              onFileClick={onFileClick}
              onToggleFolder={onToggleFolder}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Grid View Item Component
const FileGridItem: React.FC<{
  node: FileNode;
  activeFileId: string | null;
  onInteraction: (node: FileNode) => void;
  theme: string;
}> = ({ node, activeFileId, onInteraction, theme }) => {
  const isFolder = node.type === 'folder';
  const isActive = activeFileId === node.id;

  const bgClass = theme === 'sepia' 
    ? (isActive ? 'bg-sepia-300 border-sepia-400' : 'bg-sepia-50 border-sepia-200 hover:bg-sepia-200')
    : (isActive ? 'bg-blue-900/50 border-blue-800' : 'bg-gray-800 border-gray-700 hover:bg-gray-700');
  
  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-300';

  return (
    <div 
      onClick={() => onInteraction(node)}
      className={`
        aspect-square rounded border p-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
        ${bgClass}
      `}
    >
      <div className={theme === 'sepia' ? 'text-sepia-800' : 'text-gray-400'}>
        <GetGridIcon type={node.type} theme={theme} />
      </div>
      <span className={`text-[10px] text-center leading-tight line-clamp-2 w-full break-words ${textClass}`}>
        {node.name}
      </span>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ files, activeFileId, onFileClick, onToggleFolder, onSetFiles, theme }) => {
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [currentGridFolderId, setCurrentGridFolderId] = useState<string>('root');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const bgClass = theme === 'sepia' ? 'bg-sepia-100 border-sepia-200' : 'bg-dark-sidebar border-dark-border';
  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-400';
  const iconHover = theme === 'sepia' ? 'hover:bg-sepia-200 hover:text-sepia-900' : 'hover:bg-gray-700 hover:text-white';

  // --- Folder Import Logic ---
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Allowed extensions whitelist
    const allowedExtensions = new Set([
      'pdf', 'txt', 'md', 'docx', 
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'
    ]);

    // Helper to find or create a child folder
    const findOrCreateFolder = (parent: FileNode, name: string): FileNode => {
      let child = parent.children?.find(c => c.name === name && c.type === 'folder');
      if (!child) {
        child = {
          id: `${parent.id}-${name}-${Date.now()}`,
          name,
          type: 'folder',
          children: [],
          isOpen: false
        };
        parent.children = parent.children || [];
        parent.children.push(child);
      }
      return child;
    };

    // 1. Create a conceptual root to hold the imported structure
    // We assume the input gives us a folder like "Project/File.txt"
    const rootName = (fileList[0] as any).webkitRelativePath.split('/')[0] || 'Imported Workspace';
    const newRoot: FileNode = {
      id: 'root',
      name: rootName,
      type: 'folder',
      isOpen: true,
      children: []
    };

    let hasValidFiles = false;

    // 2. Iterate files and build tree
    Array.from(fileList).forEach((file: any) => {
      // Filter Logic:
      // 1. Skip system files (starting with dot)
      if (file.name.startsWith('.')) return;

      // 2. Check extension against allowed list
      const lowerName = file.name.toLowerCase();
      const ext = lowerName.split('.').pop();
      if (!ext || !allowedExtensions.has(ext)) return;

      // Mark that we found at least one valid file
      hasValidFiles = true;

      const parts = file.webkitRelativePath.split('/');
      // parts[0] is the root folder name
      
      let currentNode = newRoot;

      // Start from index 1 because index 0 is the root folder name which `newRoot` represents
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        
        // If it's the last part, it's a file
        if (i === parts.length - 1) {
          const isPdf = lowerName.endsWith('.pdf');
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(lowerName);
          
          let fileType: 'file' | 'pdf' | 'image' = 'file';
          if (isPdf) fileType = 'pdf';
          if (isImage) fileType = 'image';

          currentNode.children = currentNode.children || [];
          currentNode.children.push({
            id: `file-${Date.now()}-${Math.random()}`,
            name: part,
            type: fileType,
            fileHandle: file, // Store the native File object
            content: undefined // Content will be loaded on demand in App.tsx
          });
        } else {
          // It's a subfolder
          currentNode = findOrCreateFolder(currentNode, part);
        }
      }
    });

    if (hasValidFiles) {
      onSetFiles([newRoot]);
      setCurrentGridFolderId('root');
    } else {
      alert("No supported files found (Allowed: PDF, TXT, MD, DOCX, Images)");
    }
  };

  // --- Grid View Logic ---
  const { node: currentFolderNode, parent: parentNode } = findNodeAndParent(files, currentGridFolderId);
  const gridItems = currentFolderNode?.children || (currentGridFolderId === 'root' ? files[0]?.children : []);

  const handleGridInteraction = (node: FileNode) => {
    if (node.type === 'folder') {
      setCurrentGridFolderId(node.id);
    } else {
      onFileClick(node);
    }
  };

  const handleGridBack = () => {
    if (parentNode) {
      setCurrentGridFolderId(parentNode.id);
    } else {
      setCurrentGridFolderId('root');
    }
  };

  return (
    <div className={`h-full w-64 flex-shrink-0 border-r flex flex-col ${bgClass}`}>
      {/* Hidden Input for Folder Selection */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        className="hidden"
        // @ts-ignore: webkitdirectory is non-standard but supported
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Sidebar Header with Toggle */}
      <div className={`p-3 flex items-center justify-between border-b ${theme === 'sepia' ? 'border-sepia-200' : 'border-dark-border'}`}>
        <div className={`text-xs font-bold uppercase tracking-wider opacity-50 ${textClass}`}>
          Local Vault
        </div>
        <div className="flex bg-black/5 rounded p-0.5">
           <button 
            onClick={() => folderInputRef.current?.click()}
            className={`p-1 rounded ${iconHover} mr-1`}
            title="Open Local Folder as Workspace"
          >
            <FolderOpen size={14} />
          </button>
          <div className="w-px h-3 bg-gray-400/30 mx-0.5 self-center"></div>
          <button 
            onClick={() => setViewMode('tree')}
            className={`p-1 rounded transition-colors ${viewMode === 'tree' ? (theme === 'sepia' ? 'bg-white text-sepia-900 shadow-sm' : 'bg-gray-600 text-white') : iconHover}`}
            title="Tree View"
          >
            <ListTree size={14} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded transition-colors ${viewMode === 'grid' ? (theme === 'sepia' ? 'bg-white text-sepia-900 shadow-sm' : 'bg-gray-600 text-white') : iconHover}`}
            title="Matrix View"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {viewMode === 'tree' ? (
          // --- Tree View Render ---
          <div>
            {files.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                level={0}
                activeFileId={activeFileId}
                onFileClick={onFileClick}
                onToggleFolder={onToggleFolder}
                theme={theme}
              />
            ))}
          </div>
        ) : (
          // --- Grid View Render ---
          <div className="flex flex-col h-full">
            {/* Grid Breadcrumb / Nav */}
            <div className={`flex items-center gap-2 p-2 text-xs border-b ${theme === 'sepia' ? 'border-sepia-200 bg-sepia-50' : 'border-dark-border bg-black/20'}`}>
               {currentGridFolderId !== 'root' ? (
                 <button onClick={handleGridBack} className={`p-1 rounded ${iconHover}`}>
                   <ArrowLeft size={14} />
                 </button>
               ) : (
                 <div className="p-1 opacity-50"><HardDrive size={14} /></div>
               )}
               <span className={`font-medium truncate ${textClass}`}>
                 {currentFolderNode?.name || 'Root'}
               </span>
            </div>

            {/* Grid Items */}
            <div className="p-2 grid grid-cols-2 gap-2 content-start">
              {gridItems && gridItems.length > 0 ? (
                gridItems.map(node => (
                  <FileGridItem 
                    key={node.id}
                    node={node}
                    activeFileId={activeFileId}
                    onInteraction={handleGridInteraction}
                    theme={theme}
                  />
                ))
              ) : (
                <div className={`col-span-2 text-center py-8 text-xs opacity-50 ${textClass}`}>
                  {currentGridFolderId === 'root' && files.length === 0 ? "No Folder Loaded" : "Empty Folder"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};