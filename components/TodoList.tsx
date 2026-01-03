import React, { useState, useEffect } from 'react';
import { TodoItem } from '../types';
import { Plus, Trash2, Check, Square, ListTodo } from 'lucide-react';

interface TodoListProps {
  theme: string;
}

export const TodoList: React.FC<TodoListProps> = ({ theme }) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    // Load from local storage on initial render
    const saved = localStorage.getItem('localthesis_todos');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Outline Chapter 1', completed: true },
      { id: '2', text: 'Find references for methodology', completed: false }
    ];
  });
  const [newTodo, setNewTodo] = useState('');

  // Persist to local storage whenever todos change
  useEffect(() => {
    localStorage.setItem('localthesis_todos', JSON.stringify(todos));
  }, [todos]);

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false
    };
    setTodos([...todos, newItem]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const textClass = theme === 'sepia' ? 'text-sepia-900' : 'text-gray-200';
  const mutedClass = theme === 'sepia' ? 'text-sepia-800/50' : 'text-gray-500';
  const inputClass = theme === 'sepia' ? 'bg-sepia-50 border-sepia-300 text-sepia-900 placeholder-sepia-800/40' : 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500';
  const buttonClass = theme === 'sepia' ? 'bg-sepia-400 text-sepia-900 hover:bg-sepia-500' : 'bg-blue-600 text-white hover:bg-blue-700';
  const itemHoverClass = theme === 'sepia' ? 'hover:bg-sepia-200' : 'hover:bg-gray-800';

  return (
    <div className="flex flex-col h-full">
      <div className={`p-3 border-b ${theme === 'sepia' ? 'border-sepia-300' : 'border-dark-border'}`}>
        <h3 className={`font-semibold flex items-center gap-2 ${textClass}`}>
          <ListTodo size={16} /> Research Tasks
        </h3>
        <p className={`text-xs mt-1 opacity-60 ${textClass}`}>Track your writing progress</p>
      </div>

      <div className="p-3 border-b flex gap-2 flex-shrink-0 relative" style={{ borderColor: theme === 'sepia' ? '#e5e7eb' : '#333' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task..."
          className={`flex-1 text-sm rounded px-2 py-1.5 focus:outline-none border ${inputClass}`}
        />
        <button 
          onClick={handleAdd}
          className={`p-1.5 rounded flex items-center justify-center transition-colors ${buttonClass}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {todos.length === 0 && (
           <div className={`text-center py-8 text-xs opacity-50 ${textClass}`}>
             No tasks yet. <br/>Add one above to get started.
           </div>
        )}
        
        {todos.map(todo => (
          <div 
            key={todo.id} 
            className={`group flex items-start gap-3 p-2 rounded transition-all ${itemHoverClass}`}
          >
            <button 
              onClick={() => toggleTodo(todo.id)}
              className={`mt-0.5 flex-shrink-0 ${todo.completed ? (theme === 'sepia' ? 'text-sepia-800' : 'text-blue-500') : (theme === 'sepia' ? 'text-sepia-400' : 'text-gray-600')}`}
            >
              {todo.completed ? <Check size={16} /> : <Square size={16} />}
            </button>
            
            <span 
              onClick={() => toggleTodo(todo.id)}
              className={`flex-1 text-sm cursor-pointer select-none transition-opacity ${todo.completed ? 'line-through opacity-50' : ''} ${textClass}`}
            >
              {todo.text}
            </span>

            <button 
              onClick={() => deleteTodo(todo.id)}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-all ${mutedClass}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};