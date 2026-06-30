import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useTaskStore } from '../store';
import { CategoryType } from '../types';

export const CategoryTabBar: React.FC = () => {
  const selectedCategory = useTaskStore((state) => state.selectedCategory);
  const setSelectedCategory = useTaskStore((state) => state.setSelectedCategory);
  const categories = useTaskStore((state) => state.categories);
  const addCategory = useTaskStore((state) => state.addCategory);

  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      addCategory(trimmed);
      setSelectedCategory(trimmed); // Select newly created category immediately
      setNewCategoryName('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewCategoryName('');
    setIsAdding(false);
  };

  return (
    <div className="w-full bg-white border-b border-gray-100 px-4 py-2 flex items-center overflow-x-auto scrollbar-none flex-shrink-0">
      <div className="flex items-center space-x-2 whitespace-nowrap pr-4">
        {/* All filter pill */}
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer select-none border
            ${selectedCategory === 'All'
              ? 'bg-[#1A73E8] border-[#1A73E8] text-white shadow-sm font-bold scale-103'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          All
        </button>

        {/* Dynamic Category pills */}
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer select-none border
                ${isActive
                  ? 'bg-[#1A73E8] border-[#1A73E8] text-white shadow-sm font-bold scale-103'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: isActive ? '#ffffff' : cat.color.solid }} 
              />
              <span>{cat.name}</span>
            </button>
          );
        })}

        {/* Dynamic Inline "Add Category" Form or Button */}
        {isAdding ? (
          <form onSubmit={handleAddSubmit} className="flex items-center space-x-1 bg-gray-50 rounded-full border border-blue-300 pl-3 pr-1 py-0.5 shadow-inner transition-all duration-150">
            <input
              ref={inputRef}
              type="text"
              maxLength={20}
              placeholder="New Category..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none w-28 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="p-1 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-30 cursor-pointer transition-colors"
              title="Confirm"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:bg-gray-150 rounded-full cursor-pointer transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 transition-all duration-150 cursor-pointer select-none"
            title="Create new category"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};
