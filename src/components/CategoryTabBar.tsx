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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (containerRef.current) {
      // Run in a RAF/timeout to allow layout paints
      const updateIndicator = () => {
        const activeElement = containerRef.current?.querySelector('.active-tab') as HTMLElement;
        if (activeElement) {
          setIndicatorStyle({
            left: activeElement.offsetLeft,
            width: activeElement.clientWidth,
          });
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      };
      
      updateIndicator();
      // Double check shortly after to handle any layout shifts
      const timer = setTimeout(updateIndicator, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, categories, isAdding]);

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
    <div 
      ref={containerRef}
      className="w-full bg-white border-b border-gray-150 px-4 flex items-center overflow-x-auto scrollbar-none flex-shrink-0 h-12"
      style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
    >
      <div className="flex items-center space-x-2 whitespace-nowrap pr-8 relative h-full">
        {/* All filter pill */}
        <button
          onClick={() => setSelectedCategory('All')}
          data-category-tab="All"
          style={{
            height: '32px',
            borderRadius: '20px',
            padding: '0 14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 200ms ease',
          }}
          className={`shrink-0 border transition-all duration-200
            ${selectedCategory === 'All'
              ? 'active-tab bg-[#1A73E8] border-[#1A73E8] text-white'
              : 'bg-blue-50/50 border-blue-100 text-gray-700 hover:bg-blue-100/50 hover:text-gray-900'
            }
          `}
        >
          All
        </button>

        {/* Pending filter pill */}
        <button
          onClick={() => setSelectedCategory('Pending')}
          data-category-tab="Pending"
          style={{
            height: '32px',
            borderRadius: '20px',
            padding: '0 14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 200ms ease',
          }}
          className={`shrink-0 border transition-all duration-200
            ${selectedCategory === 'Pending'
              ? 'active-tab bg-[#F29900] border-[#F29900] text-white'
              : 'bg-amber-50/50 border-amber-100 text-gray-700 hover:bg-amber-100/50 hover:text-gray-900'
            }
          `}
        >
          Pending
        </button>

        {/* Dynamic Category pills */}
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              data-category-tab={cat.id}
              style={{
                height: '32px',
                borderRadius: '20px',
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'all 200ms ease',
                backgroundColor: isActive ? cat.color.solid : undefined,
                borderColor: isActive ? cat.color.solid : undefined,
              }}
              className={`shrink-0 flex items-center space-x-1.5 border transition-all duration-200
                ${isActive
                  ? 'active-tab text-white'
                  : `${cat.color.bgLight} ${cat.color.borderLight} text-gray-700 hover:bg-opacity-80`
                }
              `}
            >
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200" 
                style={{ backgroundColor: isActive ? '#ffffff' : cat.color.solid }} 
              />
              <span>{cat.name}</span>
            </button>
          );
        })}

        {/* Dynamic Inline "Add Category" Form or Button */}
        {isAdding ? (
          <form onSubmit={handleAddSubmit} className="flex items-center space-x-2 bg-white rounded-full border border-[#1A73E8] h-8 pl-3 pr-1 py-0.5 shadow-inner transition-all duration-150">
            <input
              ref={inputRef}
              type="text"
              maxLength={20}
              placeholder="New..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none w-20 placeholder-gray-400"
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
              className="p-1 text-gray-400 hover:bg-gray-50 rounded-full cursor-pointer transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 h-8 px-3 rounded-full text-xs font-semibold text-[#1A73E8] border border-dashed border-[#1A73E8]/30 bg-blue-50/25 hover:bg-blue-50/55 transition-all duration-150 cursor-pointer select-none"
            title="Create new category"
          >
            <Plus size={14} />
            <span>Category</span>
          </button>
        )}
      </div>
    </div>
  );
};
