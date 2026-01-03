
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'pdf' | 'image';
  content?: string; // For markdown/text files, or Blob URL for images
  children?: FileNode[];
  isOpen?: boolean;
  fileHandle?: File; // Native File object for local read
}

export interface PhraseCategory {
  id: string;
  title: string;
  phrases: string[];
}

export type Theme = 'dark' | 'sepia' | 'light';

export interface AIConfig {
  enabled: boolean;
  model: string; // e.g., gemini-3-flash-preview
  endpoint?: string;
}

export interface PomodoroState {
  isActive: boolean;
  timeLeft: number; // seconds
  mode: 'work' | 'break';
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export type EditorMode = 'split' | 'zen' | 'preview';