import React, { useState, useEffect, useRef } from 'react';
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

  const activeDate = new Date(currentDateStr);
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  const calendarDropdownRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

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
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrev = () => {
    if (selectedView === 'month' || selectedView === 'schedule') {
      setCurrentDate(subMonths(activeDate, 1));
    } else if (selectedView === 'week') {
      setCurrentDate(subWeeks(activeDate, 1));
    } else if (selectedView === 'day') {
      setCurrentDate(subDays(activeDate, 1));
    }
  };

  const handleNext = () => {
    if (selectedView === 'month' || selectedView === 'schedule') {
      setCurrentDate(addMonths(activeDate, 1));
    } else if (selectedView === 'week') {
      setCurrentDate(addWeeks(activeDate, 1));
    } else if (selectedView === 'day') {
      setCurrentDate(addDays(activeDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

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
    } else if (selectedView === 'day') {
      return format(activeDate, 'MMMM d, yyyy');
    } else {
      return format(activeDate, 'yyyy');
    }
  };

  const todayDay = new Date().getDate();

  const viewLabels: Record<string, string> = {
    schedule: 'Schedule',
    day: 'Day',
    week: 'Week',
    month: 'Month',
  };

  return (
    <div className="relative flex flex-col bg-white border-b border-gray-150 select-none z-30">
      <div className="flex items-center justify-between px-3 h-14">
        
        {/* Left Side: Hamburger Menu & Date Toggler */}
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors cursor-pointer flex-shrink-0"
            title="Main menu"
          >
            <Menu size={20} />
          </button>

          {/* Month/Year selector toggle dropdown */}
          <button
            onClick={() => setIsMiniCalendarOpen(!isMiniCalendarOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg text-gray-800 transition-colors cursor-pointer min-w-0 max-w-[190px] md:max-w-xs"
          >
            <span className="text-sm font-bold truncate">
              {getHeaderDateLabel()}
            </span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform flex-shrink-0 ${isMiniCalendarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Right Side: Quick navigation actions */}
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
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 relative flex items-center justify-center transition-colors cursor-pointer"
            title="Today"
          >
            <div className="relative w-5.5 h-5.5 border-2 border-gray-700 rounded-md flex flex-col overflow-hidden items-center">
              <div className="bg-blue-600 w-full h-1.5 flex-shrink-0" />
              <span className="text-[9px] font-extrabold text-gray-800 leading-none mt-0.5 select-none">{todayDay}</span>
            </div>
          </button>

          {/* 3. Search Toggle */}
          <button
            onClick={onSearchClick}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors"
            title="Search tasks"
          >
            <Search size={18} />
          </button>

          {/* 4. Active View Dropdown Selector */}
          <div className="relative" ref={viewDropdownRef}>
            <button
              onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-700 cursor-pointer transition-colors"
            >
              <span>{viewLabels[selectedView]}</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>

            {/* View switcher dropdown menu */}
            {isViewDropdownOpen && (
              <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50 text-xs">
                {Object.entries(viewLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedView(key as any);
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-semibold hover:bg-gray-50 cursor-pointer transition-colors
                      ${selectedView === key ? 'text-blue-600 bg-blue-50/40' : 'text-gray-700'}
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
