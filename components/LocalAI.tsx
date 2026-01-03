import React, { useState } from 'react';
import { AIConfig } from '../types';
import { generateText } from '../services/geminiService';
import { Bot, Settings, Sparkles, Send, CloudLightning } from 'lucide-react';

interface LocalAIProps {
  onInsert: (text: string) => void;
  selectedText: string;
  theme: string;
}

export const LocalAI: React.FC<LocalAIProps> = ({ onInsert, selectedText, theme }) => {
  const [config, setConfig] = useState<AIConfig>({
    enabled: true,
    model: 'gemini-3-flash-preview'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handlePolish = async () => {
    if (!selectedText && !prompt) return;
    
    setLoading(true);
    setResponse(null);
    
    const finalPrompt = selectedText 
      ? `Improve the following academic text for clarity and flow. Maintain a formal tone:\n\n"${selectedText}"\n\nAdditional instructions: ${prompt}`
      : prompt;

    try {
      const result = await generateText(finalPrompt, config);
      setResponse(result);
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-200';
  const inputClass = theme === 'sepia' ? 'bg-sepia-50 border-sepia-300 text-sepia-900' : 'bg-gray-800 border-gray-700 text-gray-200';
  const buttonClass = theme === 'sepia' ? 'bg-sepia-400 text-sepia-900 hover:bg-sepia-500' : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <div className="flex flex-col h-full">
      <div className={`p-3 border-b flex justify-between items-center ${theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border'}`}>
        <h3 className={`font-semibold flex items-center gap-2 ${textClass}`}>
          <CloudLightning size={16} /> Gemini Assistant
        </h3>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-1 rounded ${theme === 'sepia' ? 'hover:bg-sepia-200' : 'hover:bg-gray-700'} ${textClass}`}>
          <Settings size={14} />
        </button>
      </div>

      {showSettings && (
        <div className={`p-4 text-sm ${theme === 'sepia' ? 'bg-sepia-100' : 'bg-gray-800'}`}>
          <label className={`block mb-1 text-xs ${textClass}`}>Gemini Model</label>
          <select 
            value={config.model}
            onChange={(e) => setConfig({...config, model: e.target.value})}
            className={`w-full p-1.5 rounded text-xs border ${inputClass}`}
          >
            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro (Complex Reasoning)</option>
          </select>
        </div>
      )}

      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-4">
        {selectedText && (
          <div className={`p-3 rounded text-xs border-l-2 ${theme === 'sepia' ? 'bg-sepia-100 border-sepia-400 text-sepia-800' : 'bg-gray-800 border-blue-500 text-gray-400'}`}>
            <div className="font-bold mb-1 opacity-70">Selected Context:</div>
            <div className="italic line-clamp-3">"{selectedText}"</div>
          </div>
        )}

        <div className="flex-1">
          {response ? (
            <div className={`p-3 rounded text-sm whitespace-pre-wrap ${theme === 'sepia' ? 'bg-white border border-sepia-200 text-sepia-900' : 'bg-gray-800 border border-gray-700 text-gray-200'}`}>
              {response}
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={() => onInsert(response)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${theme === 'sepia' ? 'bg-sepia-200 hover:bg-sepia-300 text-sepia-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                >
                  <Sparkles size={12} /> Use this
                </button>
              </div>
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center text-xs opacity-50 text-center p-4 ${textClass}`}>
              {loading ? (
                <div className="animate-pulse">Gemini is thinking...</div>
              ) : (
                "Select text in editor to polish, or ask a question below."
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`p-3 border-t ${theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border'}`}>
        <div className="relative">
          <input
            type="text"
            placeholder={selectedText ? "Instructions (e.g., 'Make it more concise')" : "Ask Gemini..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePolish()}
            className={`w-full pr-10 pl-3 py-2 rounded text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputClass}`}
          />
          <button 
            onClick={handlePolish}
            disabled={loading}
            className={`absolute right-1 top-1 p-1.5 rounded disabled:opacity-50 ${buttonClass}`}
          >
            <Send size={14} />
          </button>
        </div>
        <div className={`text-[10px] mt-1 text-center opacity-50 ${textClass}`}>
           ✨ Powered by Google Gemini
        </div>
      </div>
    </div>
  );
};