import React, { useState, useEffect, useMemo } from 'react';
import { PomodoroState } from '../types';
import { Timer, Activity, Play, Pause, RotateCcw } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

interface ZenControlsProps {
  theme: string;
  wordCount: number; // Keep this for "Total File Words" if needed
  dailyStats: Record<string, number>; // New prop: History of productivity
}

export const ZenControls: React.FC<ZenControlsProps> = ({ theme, wordCount, dailyStats }) => {
  const [pomodoro, setPomodoro] = useState<PomodoroState>({
    isActive: false,
    timeLeft: 25 * 60,
    mode: 'work'
  });

  useEffect(() => {
    let interval: number;
    if (pomodoro.isActive && pomodoro.timeLeft > 0) {
      interval = window.setInterval(() => {
        setPomodoro(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (pomodoro.timeLeft === 0) {
      setPomodoro(prev => ({ 
        ...prev, 
        isActive: false, 
        mode: prev.mode === 'work' ? 'break' : 'work',
        timeLeft: prev.mode === 'work' ? 5 * 60 : 25 * 60
      }));
    }
    return () => clearInterval(interval);
  }, [pomodoro.isActive, pomodoro.timeLeft, pomodoro.mode]);

  const toggleTimer = () => setPomodoro(prev => ({ ...prev, isActive: !prev.isActive }));
  const resetTimer = () => setPomodoro({ isActive: false, timeLeft: 25 * 60, mode: 'work' });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to get local date string YYYY-MM-DD to match App.tsx
  const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate dynamic chart data for the last 7 days
  const { chartData, todayWords } = useMemo(() => {
    const data = [];
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = getLocalDateKey(d);
      // Use 'short' (Mon, Tue) instead of 'narrow' (M, T) to avoid ambiguity between Sat/Sun (S/S) or Tue/Thu (T/T)
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }); 
      
      data.push({
        day: dayLabel,
        fullDate: dateKey,
        words: dailyStats[dateKey] || 0
      });
    }

    return { 
      chartData: data, 
      todayWords: dailyStats[todayKey] || 0 
    };
  }, [dailyStats]);

  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-200';

  return (
    <div className="flex flex-col h-full">
      {/* Pomodoro Section */}
      <div className={`p-4 border-b ${theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border'}`}>
        <h3 className={`font-semibold flex items-center gap-2 mb-4 ${textClass}`}>
          <Timer size={16} /> Focus Timer
        </h3>
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-mono font-bold mb-2 ${textClass}`}>
            {formatTime(pomodoro.timeLeft)}
          </div>
          <div className={`text-xs uppercase tracking-widest mb-4 ${pomodoro.mode === 'work' ? 'text-red-400' : 'text-green-400'}`}>
            {pomodoro.mode === 'work' ? 'Work Session' : 'Short Break'}
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTimer} className={`p-2 rounded-full ${theme === 'sepia' ? 'bg-sepia-300 hover:bg-sepia-400 text-sepia-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
              {pomodoro.isActive ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={resetTimer} className={`p-2 rounded-full ${theme === 'sepia' ? 'bg-sepia-200 hover:bg-sepia-300 text-sepia-800' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className={`font-semibold flex items-center gap-2 mb-4 ${textClass}`}>
          <Activity size={16} /> Productivity
        </h3>
        
        <div className={`mb-6 p-3 rounded text-center ${theme === 'sepia' ? 'bg-sepia-100' : 'bg-gray-800'}`}>
          <div className={`text-xs opacity-70 mb-1 ${textClass}`}>Today's Output</div>
          <div className={`text-2xl font-bold ${textClass}`}>
            {todayWords > 0 ? '+' : ''}{todayWords} <span className="text-xs font-normal">words</span>
          </div>
        </div>

        <div className="flex-1 min-h-[160px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData}>
               <XAxis 
                 dataKey="day" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fill: theme === 'sepia' ? '#5c4b1e' : '#888', fontSize: 10 }}
               />
               <Tooltip 
                 contentStyle={{ 
                   backgroundColor: theme === 'sepia' ? '#fbf7ef' : '#252526',
                   border: '1px solid ' + (theme === 'sepia' ? '#ebdcb0' : '#444'),
                   borderRadius: '4px',
                   color: theme === 'sepia' ? '#382e14' : '#fff',
                   fontSize: '12px'
                 }}
                 cursor={{fill: theme === 'sepia' ? 'rgba(92, 75, 30, 0.1)' : 'rgba(255, 255, 255, 0.1)'}}
                 formatter={(value: number) => [`${value} words`, 'Written']}
                 labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
               />
               <Bar dataKey="words" fill={theme === 'sepia' ? '#dec282' : '#3b82f6'} radius={[2, 2, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};