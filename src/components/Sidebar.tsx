import React from 'react';
import { Plus, Settings, Grid, ListTodo, Square, Columns3, Calendar, CalendarDays } from 'lucide-react';
import { useTaskStore } from '../store';
import { MiniCalendar } from './MiniCalendar';
import { CATEGORIES, ViewType } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const tasks = useTaskStore((state) => state.tasks);
  const selectedCategory = useTaskStore((state) => state.selectedCategory);
  const setSelectedCategory = useTaskStore((state) => state.setSelectedCategory);
  const selectedView = useTaskStore((state) => state.selectedView);
  const setSelectedView = useTaskStore((state) => state.setSelectedView);

  // Track swipe-left on sidebar drawer to close
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (diffX < -40) {
      onClose();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handleCategorySelect = (category: typeof selectedCategory) => {
    setSelectedCategory(category);
    onClose(); // Auto close drawer on click
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const viewsList = [
    { id: 'schedule' as ViewType, name: 'Schedule', icon: ListTodo },
    { id: 'day' as ViewType, name: 'Day', icon: Square },
    { id: '3day' as ViewType, name: '3-Day', icon: Columns3 },
    { id: 'week' as ViewType, name: 'Week', icon: Grid },
    { id: 'month' as ViewType, name: 'Month', icon: Calendar },
  ];

  return (
    <>
      {/* Backdrop overlay for drawer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black z-40"
        onClick={onClose}
      />

      <motion.aside 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        initial={{ x: -280, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -280, opacity: 0.6 }}
        transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 0.8 }}
        className="w-[280px] bg-white flex flex-col flex-shrink-0 select-none absolute inset-y-0 left-0 z-50 h-full"
        style={{
          borderRadius: '0 24px 24px 0',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }}
      >
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden h-full">
          {/* Mobile drawer header to close */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-150 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#1A73E8] rounded-lg flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">✓</span>
              </div>
              <span className="font-bold text-gray-800">Google Calendar</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 cursor-pointer transition-colors"
            >
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          {/* View Switcher List (GCal Android style) */}
          <div className="py-2 border-b border-gray-150 flex-shrink-0 bg-white">
            {viewsList.map((v) => {
              const isActive = selectedView === v.id;
              const IconComponent = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedView(v.id);
                    onClose();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(12);
                    }
                  }}
                  className={`w-full h-12 flex items-center px-4 relative cursor-pointer transition-all duration-150 text-left
                    ${isActive 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-medium' 
                      : 'text-[#5F6368] hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Active Indicator Bar (3px blue bar on left edge) */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1A73E8]" />
                  )}
                  
                  <IconComponent 
                    size={20} 
                    className={`mr-4 ${isActive ? 'text-[#1A73E8] stroke-[2px]' : 'text-[#5F6368] stroke-[1.5px]'}`} 
                  />
                  <span className="text-sm font-sans">{v.name}</span>
                </button>
              );
            })}
          </div>

          {/* 1. Mini Monthly Picker Calendar */}
          <div className="p-4 bg-white border-b border-gray-150 flex-shrink-0">
            <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">
              Mini Calendar
            </div>
            <MiniCalendar />
          </div>

          {/* 2. Category / My Calendars Section */}
          <div className="p-4 bg-white flex-shrink-0 border-b border-gray-150">
            <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center space-x-1">
              <Grid size={12} className="text-gray-400" />
              <span>My Calendars</span>
            </div>
            <div className="space-y-1">
              {/* All row */}
              <button
                onClick={() => handleCategorySelect('All')}
                className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-all cursor-pointer
                  ${selectedCategory === 'All'
                    ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold border-l-4 border-[#1A73E8] pl-2'
                    : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                  }
                `}
              >
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full mr-3 border border-gray-300 bg-gray-100" />
                  <span>All Calendars</span>
                </div>
                <span className="text-[10px] text-gray-400 font-bold bg-gray-100/50 px-1.5 py-0.5 rounded-md">
                  {tasks.length}
                </span>
              </button>

              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const categoryCount = tasks.filter((t) => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-all cursor-pointer
                      ${isSelected
                        ? `${cat.color.bgLight} ${cat.color.light} font-bold border-l-4 pl-2`
                        : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                      }
                    `}
                    style={isSelected ? { borderLeftColor: cat.color.solid } : undefined}
                  >
                    <div className="flex items-center">
                      <span 
                        className="w-2.5 h-2.5 rounded-full mr-3 shadow-2xs flex-shrink-0" 
                        style={{ backgroundColor: cat.color.solid }} 
                      />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold bg-gray-100/50 px-1.5 py-0.5 rounded-md">
                      {categoryCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Settings Link at bottom */}
          <div className="p-4 bg-white mt-auto border-t border-gray-150 flex-shrink-0">
            <button
              onClick={() => {
                alert('Google Calendar Settings');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
            >
              <Settings size={16} className="text-gray-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
