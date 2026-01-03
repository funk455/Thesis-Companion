import React, { useState } from 'react';
import { PhraseCategory } from '../types';
import { ACADEMIC_PHRASES } from '../constants';
import { BookOpen, ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface PhraseBankProps {
  onInsert: (text: string) => void;
  theme: string;
}

export const PhraseBank: React.FC<PhraseBankProps> = ({ onInsert, theme }) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-200';
  const hoverClass = theme === 'sepia' ? 'hover:bg-sepia-200' : 'hover:bg-gray-700';
  const headerClass = theme === 'sepia' ? 'bg-sepia-200' : 'bg-gray-800';

  return (
    <div className="flex flex-col h-full">
      <div className={`p-3 border-b ${theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border'}`}>
        <h3 className={`font-semibold flex items-center gap-2 ${textClass}`}>
          <BookOpen size={16} /> Academic Phrasebank
        </h3>
        <p className={`text-xs mt-1 opacity-60 ${textClass}`}>Click to insert into editor</p>
      </div>
      
      <div className="overflow-y-auto flex-1 p-2">
        {ACADEMIC_PHRASES.map((category) => (
          <div key={category.id} className="mb-2">
            <button
              onClick={() => toggleCategory(category.id)}
              className={`w-full flex items-center justify-between p-2 rounded text-sm font-medium transition-colors ${headerClass} ${textClass}`}
            >
              <span>{category.title}</span>
              {openCategory === category.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {openCategory === category.id && (
              <div className="mt-1 pl-2 space-y-1">
                {category.phrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => onInsert(phrase)}
                    className={`w-full text-left p-2 text-xs rounded transition-colors group flex items-start gap-2 ${hoverClass} ${textClass}`}
                  >
                    <Plus size={12} className="mt-0.5 opacity-0 group-hover:opacity-100 shrink-0" />
                    <span>{phrase}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
