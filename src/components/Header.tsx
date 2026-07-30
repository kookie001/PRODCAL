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
  X,
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
  const deletedTasks = useTaskStore((state) => state.deletedTasks);
  const setTasksOverlayOpen = useTaskStore((state) => state.setTasksOverlayOpen);
  const setBinOpen = useTaskStore((state) => state.setBinOpen);

  const activeDate = new Date(currentDateStr);
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);

  const isTodayActive = useMemo(() => {
    const today = new Date();
    return (
      activeDate.getDate() === today.getDate() &&
      activeDate.getMonth() === today.getMonth() &&
      activeDate.getFullYear() === today.getFullYear()
    );
  }, [activeDate]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const pendingCount = useMemo(() => tasks.filter((task) => !task.completed && task.date && (task.date < todayStr || task.isPending === true)).length, [tasks, todayStr]);

  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  // Filter tasks and subtasks across all dates and bin for the search results list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const allTasksCombined = [...tasks, ...deletedTasks];
    const results: Array<{
      key: string;
      type: 'task' | 'subtask';
      title: string;
      parentTitle?: string;
      category: string;
      location: 'bin' | 'pending' | 'completed' | 'timeline';
      date?: string;
      time?: string;
      task: any;
      subtask?: any;
    }> = [];

    allTasksCombined.forEach((task) => {
      const isDeleted = 'deletedAt' in task && Boolean(task.deletedAt);
      const isTaskPending = !task.completed && !isDeleted && (task.isPending === true || Boolean(task.date && task.date < todayStr));
      const isTaskCompleted = Boolean(task.completed);

      const taskLocation: 'bin' | 'pending' | 'completed' | 'timeline' = 
        isDeleted ? 'bin' : isTaskPending ? 'pending' : isTaskCompleted ? 'completed' : 'timeline';

      // 1. Check task title match
      if (task.title.toLowerCase().includes(query)) {
        results.push({
          key: `task-${task.id}`,
          type: 'task',
          title: task.title,
          category: task.category,
          location: taskLocation,
          date: task.date,
          time: task.time,
          task,
        });
      }

      // 2. Check subtasks matches
      if (task.subtasks) {
        task.subtasks.forEach((sub: any) => {
          if (sub.title.toLowerCase().includes(query)) {
            const isSubCompleted = Boolean(sub.completed) || isTaskCompleted;
            const subLocation: 'bin' | 'pending' | 'completed' | 'timeline' = 
              isDeleted ? 'bin' : isSubCompleted ? 'completed' : isTaskPending ? 'pending' : 'timeline';

            results.push({
              key: `subtask-${task.id}-${sub.id}`,
              type: 'subtask',
              title: sub.title,
              parentTitle: task.title,
              category: task.category,
              location: subLocation,
              date: task.date,
              time: task.time,
              task,
              subtask: sub,
            });
          }
        });
      }
    });

    return results;
  }, [tasks, deletedTasks, searchQuery, todayStr]);

  const handleSearchResultClick = useCallback((item: any) => {
    setSearchQuery('');
    const task = item.task;

    const scrollToElement = (elementId: string) => {
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(() => {
        attempts++;
        const el = document.getElementById(elementId);
        if (el) {
          clearInterval(interval);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 2000);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 50);
    };

    // Priority 1: Deleted task in Bin
    if (item.location === 'bin') {
      setBinOpen(true);
      scrollToElement(`bin-task-${task.id}`);
      return;
    }

    // Priority 2: Pending task
    if (item.location === 'pending') {
      (window as any).__pendingScrollTargetId = { taskId: task.id, isCompleted: false };
      setTasksOverlayOpen(true);
      window.dispatchEvent(new CustomEvent('expand-and-scroll-task', { detail: { taskId: task.id } }));
      return;
    }

    // Priority 3: Completed task
    if (item.location === 'completed') {
      (window as any).__pendingScrollTargetId = { taskId: task.id, isCompleted: true };
      setTasksOverlayOpen(true);
      window.dispatchEvent(new CustomEvent('reveal-completed-task', { detail: { taskId: task.id } }));
      return;
    }

    // Priority 4: Normal timeline task
    if (task.date) {
      const [yr, mo, dy] = task.date.split('-').map(Number);
      const dateObj = new Date(yr, mo - 1, dy);
      setCurrentDate(dateObj);
      setSelectedView('day');
      scrollToElement(`timeline-task-${task.id}`);
      if (task.time) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('scroll-to-task', { detail: { time: task.time } }));
        }, 150);
      }
    }
  }, [setSearchQuery, setBinOpen, setTasksOverlayOpen, setCurrentDate, setSelectedView]);

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
        
        {/* Left Side: Hamburger Menu & Today's Date formatted as "MMMM d" */}
        <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors cursor-pointer flex-shrink-0"
            title="Main menu"
          >
            <Menu size={20} />
          </button>

          {/* Today's date text with highlight for today, and plain tile style for other days */}
          {isTodayActive ? (
            <span 
              onClick={() => setCurrentDate(new Date())}
              className="text-xs sm:text-sm font-semibold bg-[#1A73E8] text-white select-none px-3 py-1.5 rounded-full flex-shrink-0 cursor-pointer shadow-xs hover:bg-blue-700 active:scale-95 transition-all duration-150 flex items-center"
              title="Today"
            >
              {format(activeDate, 'EEE, MMMM d')}
            </span>
          ) : (
            <span 
              onClick={() => setCurrentDate(new Date())}
              className="text-xs sm:text-sm font-semibold bg-gray-50 border border-gray-200 text-gray-800 select-none px-3 py-1.5 rounded-full flex-shrink-0 cursor-pointer shadow-xs hover:bg-gray-100 hover:text-blue-600 active:scale-95 transition-all duration-150 flex items-center"
              title="Go to Today"
            >
              {format(activeDate, 'EEE, MMMM d')}
            </span>
          )}
        </div>

        {/* Center/Right Side: Actual wide search bar taking remaining width */}
        <div className="flex-1 ml-4 mr-1 max-w-md md:max-w-lg relative flex items-center bg-gray-100 hover:bg-gray-150 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600 focus-within:shadow-sm rounded-full h-9.5 px-3.5 transition-all">
          <Search size={16} className="text-gray-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer ml-1"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {/* Search dropdown results */}
          {searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-[1000] overflow-hidden max-h-72 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-4 text-center text-xs text-gray-400 font-medium">
                  No matching tasks found
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleSearchResultClick(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-none flex flex-col transition-colors cursor-pointer"
                    >
                      {item.type === 'subtask' ? (
                        <>
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              Subtask
                            </span>
                            <span className="text-xs font-semibold text-gray-800 truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            in <span className="font-medium text-gray-700">{item.parentTitle}</span>
                          </p>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {item.title}
                        </span>
                      )}

                      <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-1">
                        <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded-full text-[9px] font-bold text-gray-500">
                          {item.category}
                        </span>
                        <span>•</span>
                        {item.location === 'bin' ? (
                          <span className="text-rose-500 font-bold">Bin</span>
                        ) : item.location === 'pending' ? (
                          <span className="text-amber-600 font-bold">Pending</span>
                        ) : item.location === 'completed' ? (
                          <span className="text-emerald-600 font-bold">Completed</span>
                        ) : (
                          <span>{item.date}</span>
                        )}
                        {item.time && item.location === 'timeline' && (
                          <>
                            <span>•</span>
                            <span>{item.time}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* HIDDEN 2026-07-07 — removed from header per request, keep for future re-enable */}
        {false && (
          <div className="hidden-header-elements-debug">
            {/* Original Month/Year selector with chevron */}
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

            {/* Original Search Toggle */}
            <button
              onClick={onSearchClick}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors flex-shrink-0 ml-1"
              title="Search tasks"
            >
              <Search size={18} />
            </button>

            {/* Original Right Side: Prev & Next, Today, and Task Count Badge */}
            <div className="flex items-center space-x-0.5 flex-shrink-0">
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

              <button
                onClick={() => setTasksOverlayOpen(true)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 cursor-pointer transition-colors relative"
                title="View pending tasks"
              >
                <ListTodo size={18} />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center scale-90">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mini calendar dropdown */}
            {isMiniCalendarOpen && (
              <div 
                ref={calendarDropdownRef}
                className="absolute left-1/2 -translate-x-1/2 top-14 w-full max-w-[340px] bg-white border border-gray-150 rounded-b-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <MiniCalendar />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
