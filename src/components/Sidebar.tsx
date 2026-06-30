import React from 'react';
import { Plus, CheckCircle2, CircleDot, TrendingUp, Sparkles, Award, ListTodo, Clock, CalendarDays, Grid } from 'lucide-react';
import { useTaskStore } from '../store';
import { MiniCalendar } from './MiniCalendar';
import { CATEGORIES } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const tasks = useTaskStore((state) => state.tasks);
  const selectedCategory = useTaskStore((state) => state.selectedCategory);
  const setSelectedCategory = useTaskStore((state) => state.setSelectedCategory);
  const selectedView = useTaskStore((state) => state.selectedView);
  const setSelectedView = useTaskStore((state) => state.setSelectedView);

  // Calculate task statistics for the user
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

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

  return (
    <>
      {/* Backdrop overlay for drawer */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/30 backdrop-blur-3xs z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-64 border-r border-gray-100 bg-white flex flex-col flex-shrink-0 select-none overflow-y-auto overflow-x-hidden transition-transform duration-300 ease-in-out absolute inset-y-0 left-0 z-50 h-full shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        
        {/* Mobile drawer header to close */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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

        {/* 1. Large "Create" Pill Button (FAB style in Sidebar) */}
        <div className="p-4 flex-shrink-0">
          <button
            onClick={() => {
              setFABOpen(true);
              onClose();
            }}
            className="flex items-center space-x-3 px-6 py-4 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-blue-700 rounded-2xl shadow-xs hover:shadow-md transition-material font-semibold text-sm cursor-pointer w-full group"
          >
            <Plus size={22} className="group-hover:scale-110 transition-transform" />
            <span>Create Task</span>
          </button>
        </div>

        {/* 1b. Views Switcher (Google Calendar Style) */}
        <div className="py-2 border-b border-gray-100 flex-shrink-0">
          <div className="px-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">
            Views
          </div>
          <div className="space-y-0.5 pr-3">
            {[
              { id: 'schedule', name: 'Schedule', icon: ListTodo },
              { id: 'day', name: 'Day', icon: Clock },
              { id: 'week', name: 'Week', icon: CalendarDays },
              { id: 'month', name: 'Month', icon: Grid },
            ].map((item) => {
              const isSelected = selectedView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedView(item.id as any);
                    onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-xs font-semibold cursor-pointer select-none transition-all rounded-r-full
                    ${isSelected
                      ? 'bg-[#e8f0fe] text-blue-700 font-bold border-l-4 border-blue-600 pl-3'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                    }
                  `}
                >
                  <Icon size={16} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Mini Monthly Picker Calendar */}
        <div className="border-b border-gray-100 pb-3 flex-shrink-0">
          <div className="px-4 text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
            Navigation Picker
          </div>
          <MiniCalendar />
        </div>

        {/* 3. Task Stats & Analytics Panel */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center space-x-1">
            <TrendingUp size={12} />
            <span>Task Insights</span>
          </div>
          
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>Completion Progress</span>
                <span className="text-blue-600 font-bold">{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Done</span>
                <span className="text-sm font-bold text-emerald-600 flex items-center mt-1">
                  <CheckCircle2 size={14} className="mr-1 flex-shrink-0" />
                  {completedTasksCount}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Pending</span>
                <span className="text-sm font-bold text-amber-600 flex items-center mt-1">
                  <CircleDot size={14} className="mr-1 flex-shrink-0" />
                  {pendingTasksCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Category Interactive Filters */}
        <div className="p-4 flex-shrink-0 border-b border-gray-100">
          <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3 flex items-center space-x-1">
            <Sparkles size={12} />
            <span>Category Filters</span>
          </div>
          <div className="space-y-1">
            {/* All row */}
            <button
              onClick={() => handleCategorySelect('All')}
              className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-all cursor-pointer
                ${selectedCategory === 'All'
                  ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600 pl-2'
                  : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                }
              `}
            >
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full mr-3 border border-gray-300" />
                <span>All Categories</span>
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

        {/* Footer Motivator card */}
        <div className="p-4 mt-auto flex-shrink-0">
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-4 border border-indigo-100/50 rounded-2xl flex items-start space-x-3">
            <Award className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-gray-800">Stay organized</h4>
              <p className="text-[11px] text-gray-500 leading-normal">
                Break tasks down into manageable subtasks and organize by category.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
