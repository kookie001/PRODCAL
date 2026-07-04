import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays 
} from 'date-fns';
import { 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Search,
  Calendar,
  ListTodo,
} from 'lucide-react';
import { useTaskStore } from '../store';
import { MiniCalendar } from './MiniCalendar';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  onSearchClick,
}) => {
  const currentDateStr = useTaskStore((state) => state.currentDate);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const selectedView = useTaskStore((state) => state.selectedView);
  const setSelectedView = useTaskStore((state) => state.setSelectedView);
  const tasks = useTaskStore((state) => state.tasks);
  const setTasksOverlayOpen = useTaskStore((state) => state.setTasksOverlayOpen);

  const activeDate = new Date(currentDateStr);
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const pendingToday = useMemo(() => tasks.filter((task) => task.date === todayStr && !task.completed), [tasks, todayStr]);
  const pendingOverdue = useMemo(() => tasks.filter((task) => task.date < todayStr && !task.completed), [tasks, todayStr]);

  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on day change
  useEffect(() => {
    setIsMiniCalendarOpen(false);
  }, [currentDateStr]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarDropdownRef.current && !calendarDropdownRef.current.contains(event.target as Node)) {
        setIsMiniCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrev = useCallback(() => {
    if (selectedView === 'month' || selectedView === 'schedule') {
      setCurrentDate(subMonths(activeDate, 1));
    } else if (selectedView === 'week') {
      setCurrentDate(subWeeks(activeDate, 1));
    } else if (selectedView === 'day') {
      setCurrentDate(subDays(activeDate, 1));
    } else if (selectedView === '3day') {
      setCurrentDate(subDays(activeDate, 3));
    }
  }, [selectedView, activeDate, setCurrentDate]);

  const handleNext = useCallback(() => {
    if (selectedView === 'month' || selectedView === 'schedule') {
      setCurrentDate(addMonths(activeDate, 1));
    } else if (selectedView === 'week') {
      setCurrentDate(addWeeks(activeDate, 1));
    } else if (selectedView === 'day') {
      setCurrentDate(addDays(activeDate, 1));
    } else if (selectedView === '3day') {
      setCurrentDate(addDays(activeDate, 3));
    }
  }, [selectedView, activeDate, setCurrentDate]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const getHeaderDateLabel = () => {
    if (selectedView === 'month') {
      return format(activeDate, 'MMMM yyyy');
    } else if (selectedView === 'week') {
      const start = subDays(activeDate, activeDate.getDay());
      const end = addDays(start, 6);
      if (start.getMonth() === end.getMonth()) {
        return format(activeDate, 'MMMM yyyy');
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`;
      } else {
        return `${format(start, 'MMM yyyy')} - ${format(end, 'MMM yyyy')}`;
      }
    } else if (selectedView === '3day') {
      const start = activeDate;
      const end = addDays(activeDate, 2);
      if (start.getMonth() === end.getMonth()) {
        return format(activeDate, 'MMMM yyyy');
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      } else {
        return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
      }
    } else if (selectedView === 'day') {
      return format(activeDate, 'MMMM d, yyyy');
    } else {
      return format(activeDate, 'yyyy');
    }
  };

  const todayDay = useMemo(() => new Date().getDate(), []);

  return (
    <div className="relative flex flex-col bg-white border-b border-gray-150 select-none z-30">
      <div className="flex items-center justify-between px-3 h-14">
        
        {/* Left Side: Hamburger Menu & Date Toggler with Search icon next to it */}
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors cursor-pointer flex-shrink-0"
            title="Main menu"
          >
            <Menu size={20} />
          </button>

          {/* Month/Year selector */}
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setIsMiniCalendarOpen(!isMiniCalendarOpen)}
              className="flex items-center px-2 py-1.5 hover:bg-gray-100/70 rounded-xl transition-all cursor-pointer min-w-0"
              title="Toggle mini calendar"
            >
              <span className="text-xl font-medium text-gray-900 truncate tracking-normal leading-none">
                {getHeaderDateLabel()}
              </span>
              <ChevronDown size={14} className={`text-gray-500 ml-1 transition-transform flex-shrink-0 ${isMiniCalendarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Search Toggle (immediately after month title) */}
          <button
            onClick={onSearchClick}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors flex-shrink-0 ml-1"
            title="Search tasks"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Right Side: Quick navigation actions, utility count and user avatar */}
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          
          {/* 1. Prev & Next buttons */}
          <button
            onClick={handlePrev}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors"
            title="Previous"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors"
            title="Next"
          >
            <ChevronRight size={18} />
          </button>

          {/* 2. Today Dynamic Calendar Icon */}
          <button
            onClick={handleToday}
            className="p-1.5 hover:bg-[#E8F0FE] rounded-full text-gray-700 relative flex items-center justify-center transition-colors cursor-pointer"
            title="Today"
          >
            <div className="relative w-5.5 h-5.5 border-2 border-gray-700 rounded-md flex flex-col overflow-hidden items-center">
              <div className="bg-[#1A73E8] w-full h-1.5 flex-shrink-0" />
              <span className="text-[9px] font-extrabold text-gray-800 leading-none mt-0.5 select-none">{todayDay}</span>
            </div>
          </button>

          {/* 3. Task Count Check Utility button */}
          <button
            onClick={() => setTasksOverlayOpen(true)}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors relative"
            title="View pending tasks"
          >
            <ListTodo size={18} />
            {(pendingToday.length + pendingOverdue.length) > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center scale-90">
                {pendingToday.length + pendingOverdue.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mini calendar dropdown below Header bar */}
      {isMiniCalendarOpen && (
        <div 
          ref={calendarDropdownRef}
          className="absolute left-1/2 -translate-x-1/2 top-14 w-full max-w-[340px] bg-white border border-gray-150 rounded-b-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <MiniCalendar />
        </div>
      )}
    </div>
  );
};
