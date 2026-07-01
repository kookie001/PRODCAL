import React, { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Clock, 
  CheckSquare, 
  Square, 
  CalendarDays,
  GripVertical,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ListTodo,
  ArrowLeft,
  Search,
  Plus,
  X,
  MoreVertical
} from 'lucide-react';
import { useTaskStore } from '../store';
import { Task, CATEGORIES, Subtask, CategoryType } from '../types';
import { QuickCreatePopover } from './QuickCreatePopover';
import { motion, AnimatePresence } from 'motion/react';
import { Ripple } from './Ripple';

interface CalendarViewsProps {
  searchQuery: string;
}

export const CalendarViews: React.FC<CalendarViewsProps> = ({ searchQuery }) => {
  const tasks = useTaskStore((state) => state.tasks);
  const currentDateStr = useTaskStore((state) => state.currentDate);
  const selectedView = useTaskStore((state) => state.selectedView);
  const selectedCategory = useTaskStore((state) => state.selectedCategory);
  
  const setSelectedTaskForDetails = useTaskStore((state) => state.setSelectedTaskForDetails);
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const addTask = useTaskStore((state) => state.addTask);
  const setPrefilledTime = useTaskStore((state) => state.setPrefilledTime);

  // Quick-create popover states
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverDate, setPopoverDate] = useState<Date>(new Date());
  const [popoverHour, setPopoverHour] = useState<number>(9);

  const activeDate = new Date(currentDateStr);

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Persistent collapsed/expanded subtasks on the timeline
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('gcal-timeline-collapsed-tasks');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      localStorage.setItem('gcal-timeline-collapsed-tasks', JSON.stringify(next));
      return next;
    });
  };

  // Drag states for timeline task pointer dragging
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragStartTop, setDragStartTop] = useState<number>(0);
  const [pointerStartY, setPointerStartY] = useState<number>(0);
  const [dragCurrentOffset, setDragCurrentOffset] = useState<number>(0);
  const [tempTimeStr, setTempTimeStr] = useState<string | null>(null);

  const updateTask = useTaskStore((state) => state.updateTask);

  const handleTaskDragStart = (taskId: string, initialTop: number, clientY: number) => {
    setDraggedTaskId(taskId);
    setDragStartTop(initialTop);
    setPointerStartY(clientY);
    setDragCurrentOffset(0);

    const task = tasks.find(t => t.id === taskId);
    if (task && task.time) {
      setTempTimeStr(task.time);
    }
  };

  const handleTaskDragMove = (clientY: number) => {
    if (!draggedTaskId) return;
    const diffY = clientY - pointerStartY;
    setDragCurrentOffset(diffY);

    const newTop = Math.max(0, dragStartTop + diffY);
    const minutes = newTop / (64 / 60);
    const snappedMinutes = Math.round(minutes / 15) * 15;
    const clampedMins = Math.max(0, Math.min(1425, snappedMinutes)); // clamp to 23:45
    const h = Math.floor(clampedMins / 60);
    const m = clampedMins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setTempTimeStr(timeStr);
  };

  const handleTaskDragEnd = () => {
    if (!draggedTaskId) return;
    if (tempTimeStr) {
      updateTask(draggedTaskId, { time: tempTimeStr });
    }
    setDraggedTaskId(null);
    setDragCurrentOffset(0);
    setTempTimeStr(null);
  };

  // Filter tasks by category and search query
  const filteredTasks = tasks.filter((task) => {
    const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
    const matchesQuery = searchQuery.trim() === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.subtasks.some((sub) => sub.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const openPopover = (date: Date, hour: number) => {
    setPopoverDate(date);
    setPopoverHour(hour);
    setIsPopoverOpen(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handlePopoverSave = (title: string, category: CategoryType) => {
    const formattedHour = popoverHour.toString().padStart(2, '0') + ':00';
    const formattedDateStr = format(popoverDate, 'yyyy-MM-dd');
    addTask({
      title,
      category,
      date: formattedDateStr,
      time: formattedHour,
      completed: false,
      subtasks: [],
    });
    setIsPopoverOpen(false);
  };

  const handlePopoverMoreOptions = (title: string, category: CategoryType) => {
    const formattedHour = popoverHour.toString().padStart(2, '0') + ':00';
    
    // Set prefilled values in the form
    setCurrentDate(popoverDate);
    setPrefilledTime(formattedHour);
    
    useTaskStore.getState().setEditingTask(null);

    setFABOpen(true);
    setIsPopoverOpen(false);
  };

  // Render the appropriate view
  const renderView = () => {
    switch (selectedView) {
      case 'month':
        return <MonthView activeDate={activeDate} tasks={filteredTasks} setSelectedTaskForDetails={setSelectedTaskForDetails} setFABOpen={setFABOpen} setCurrentDate={setCurrentDate} openPopover={openPopover} />;
      case 'week':
        return (
          <WeekView 
            activeDate={activeDate} 
            tasks={filteredTasks} 
            setSelectedTaskForDetails={setSelectedTaskForDetails} 
            setFABOpen={setFABOpen} 
            openPopover={openPopover} 
            collapsedTasks={collapsedTasks} 
            toggleTaskCollapse={toggleTaskCollapse}
            draggedTaskId={draggedTaskId}
            dragStartTop={dragStartTop}
            pointerStartY={pointerStartY}
            dragCurrentOffset={dragCurrentOffset}
            tempTimeStr={tempTimeStr}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragMove={handleTaskDragMove}
            onTaskDragEnd={handleTaskDragEnd}
            expandedTaskId={expandedTaskId}
            setExpandedTaskId={setExpandedTaskId}
          />
        );
      case 'day':
        return (
          <DayView 
            activeDate={activeDate} 
            tasks={filteredTasks} 
            setSelectedTaskForDetails={setSelectedTaskForDetails} 
            setFABOpen={setFABOpen} 
            openPopover={openPopover} 
            collapsedTasks={collapsedTasks} 
            toggleTaskCollapse={toggleTaskCollapse}
            draggedTaskId={draggedTaskId}
            dragStartTop={dragStartTop}
            pointerStartY={pointerStartY}
            dragCurrentOffset={dragCurrentOffset}
            tempTimeStr={tempTimeStr}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragMove={handleTaskDragMove}
            onTaskDragEnd={handleTaskDragEnd}
            expandedTaskId={expandedTaskId}
            setExpandedTaskId={setExpandedTaskId}
          />
        );
      case 'schedule':
        return <ScheduleView activeDate={activeDate} tasks={filteredTasks} setSelectedTaskForDetails={setSelectedTaskForDetails} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {renderView()}

      <QuickCreatePopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        selectedDate={popoverDate}
        selectedHour={popoverHour}
        onSave={handlePopoverSave}
        onMoreOptions={handlePopoverMoreOptions}
      />
    </div>
  );
};

/* ============================================================================
   1. MONTH VIEW COMPONENT
   ============================================================================ */
interface ViewProps {
  activeDate: Date;
  tasks: Task[];
  setSelectedTaskForDetails: (task: Task | null) => void;
  setFABOpen: (open: boolean) => void;
  setCurrentDate: (date: Date) => void;
  openPopover: (date: Date, hour: number) => void;
}

const MonthView: React.FC<ViewProps> = ({
  activeDate,
  tasks,
  setSelectedTaskForDetails,
  setFABOpen,
  setCurrentDate,
  openPopover,
}) => {
  const setHeaderCollapsed = useTaskStore((state) => state.setHeaderCollapsed);

  useEffect(() => {
    setHeaderCollapsed(false);
  }, []);

  const monthStart = startOfMonth(activeDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const handleCellClick = (day: Date) => {
    setCurrentDate(day);
    openPopover(day, 9);
  };

  const selectedDayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.date + 'T00:00:00');
    return isSameDay(taskDate, activeDate);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
      {/* Month Grid Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 text-center text-[10px] font-bold text-gray-400 py-1 flex-shrink-0 bg-gray-50/20">
          {weekDays.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y divide-gray-100 border-b border-gray-100 min-h-0">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, activeDate);
            const isTodayDay = isToday(day);
            const isSelectedDay = isSameDay(day, activeDate);
            
            // Filter tasks belonging to this day
            const dayTasks = tasks.filter((task) => {
              const taskDate = new Date(task.date + 'T00:00:00');
              return isSameDay(taskDate, day);
            });

            // Sort tasks by time first, then alphabetically
            const sortedDayTasks = [...dayTasks].sort((a, b) => {
              if (a.time && b.time) return a.time.localeCompare(b.time);
              if (a.time) return -1;
              if (b.time) return 1;
              return a.title.localeCompare(b.title);
            });

            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

            return (
              <div
                key={day.toString()}
                onClick={() => handleCellClick(day)}
                className={`flex flex-col min-h-0 min-w-0 p-1 group hover:bg-blue-50/10 transition-colors duration-150 cursor-pointer relative
                  ${!isCurrentMonth ? 'bg-gray-50/40' : ''}
                  ${isSelectedDay ? 'bg-blue-50/30 ring-2 ring-blue-500/20' : ''}
                `}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all
                      ${isTodayDay 
                        ? 'bg-blue-600 text-white font-bold shadow-xs' 
                        : isSelectedDay
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : isCurrentMonth 
                            ? 'text-gray-700 group-hover:bg-gray-100' 
                            : 'text-gray-300'
                      }
                    `}
                  >
                    {format(day, 'd') === '1' ? format(day, 'MMM d') : format(day, 'd')}
                  </span>

                  {/* Subtask count overview */}
                  {sortedDayTasks.length > 0 && !isMobile && (
                    <span className="text-[9px] text-gray-400 font-bold pr-1">
                      {sortedDayTasks.length} {sortedDayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>

                {/* Tasks List / Dots on Mobile */}
                {isMobile ? (
                  <div className="flex flex-wrap gap-1 justify-center mt-auto mb-1 max-w-full">
                    {sortedDayTasks.slice(0, 3).map((task) => {
                      const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
                      return (
                        <span 
                          key={task.id}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? 'bg-gray-300 line-through' : ''}`}
                          style={!task.completed ? { backgroundColor: cat.color.solid } : undefined}
                        />
                      );
                    })}
                    {sortedDayTasks.length > 3 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-none">
                    {sortedDayTasks.slice(0, 4).map((task) => {
                      const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskForDetails(task);
                          }}
                          className={`text-[11px] px-1.5 py-0.5 rounded-md border flex items-center justify-between truncate select-none shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-material
                            ${task.completed 
                              ? 'bg-gray-50 text-gray-400 border-gray-100 line-through' 
                              : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                            }
                          `}
                          title={task.title}
                        >
                          <div className="flex items-center min-w-0 flex-1 space-x-1">
                            <span 
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.completed ? 'bg-gray-300' : ''}`}
                              style={!task.completed ? { backgroundColor: cat.color.solid } : undefined}
                            />
                            <span className="truncate font-medium">{task.title}</span>
                          </div>
                          
                          {task.time && (
                            <span className="text-[9px] opacity-75 font-semibold font-mono pl-1">{task.time}</span>
                          )}
                        </div>
                      );
                    })}
                    {sortedDayTasks.length > 4 && (
                      <div className="text-[9px] text-blue-600 font-bold pl-1.5">
                        + {sortedDayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Agenda List below Grid */}
      <div className="md:hidden border-t border-gray-200 bg-gray-50/50 p-4 flex-shrink-0 overflow-y-auto max-h-[35vh] min-h-[140px] shadow-inner">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {format(activeDate, 'EEEE, d MMMM')}
          </h4>
          <button 
            onClick={() => setFABOpen(true)}
            className="px-3 py-2 -my-1 border border-blue-200/50 bg-blue-50/50 hover:bg-blue-100/60 font-bold rounded-lg text-xs text-blue-600 cursor-pointer min-h-[38px] flex items-center justify-center transition-colors"
          >
            + Create Task
          </button>
        </div>
        
        {selectedDayTasks.length > 0 ? (
          <div className="space-y-2">
            {selectedDayTasks.map((task) => {
              const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskForDetails(task)}
                  className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }} 
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </p>
                      {task.time && (
                        <p className="text-[10px] text-gray-400 font-medium font-mono">
                          {task.time}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`}>
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400 italic">No tasks for this day</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   2. WEEK VIEW COMPONENT
   ============================================================================ */
interface WeekViewProps {
  activeDate: Date;
  tasks: Task[];
  setSelectedTaskForDetails: (task: Task | null) => void;
  setFABOpen: (open: boolean) => void;
  openPopover: (date: Date, hour: number) => void;
  collapsedTasks: Record<string, boolean>;
  toggleTaskCollapse: (taskId: string) => void;

  draggedTaskId: string | null;
  dragStartTop: number;
  pointerStartY: number;
  dragCurrentOffset: number;
  tempTimeStr: string | null;
  onTaskDragStart: (taskId: string, initialTop: number, clientY: number) => void;
  onTaskDragMove: (clientY: number) => void;
  onTaskDragEnd: () => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  activeDate,
  tasks,
  setSelectedTaskForDetails,
  setFABOpen,
  openPopover,
  collapsedTasks,
  toggleTaskCollapse,
  draggedTaskId,
  dragStartTop,
  pointerStartY,
  dragCurrentOffset,
  tempTimeStr,
  onTaskDragStart,
  onTaskDragMove,
  onTaskDragEnd,
  expandedTaskId,
  setExpandedTaskId,
}) => {
  const days = [addDays(activeDate, -1), activeDate, addDays(activeDate, 1)];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const reorderSubtasks = useTaskStore((state) => state.reorderSubtasks);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);
  const [draggedSubTaskId, setDraggedSubTaskId] = useState<string | null>(null);
  const [subPointerStartY, setSubPointerStartY] = useState<number>(0);
  const [subDraggedOffset, setSubDraggedOffset] = useState<number>(0);
  const [subPointerStartX, setSubPointerStartX] = useState<number>(0);
  const [subDraggedOffsetX, setSubDraggedOffsetX] = useState<number>(0);
  const [subDraggedCol, setSubDraggedCol] = useState<number | null>(null);
  const [subDraggedHour, setSubDraggedHour] = useState<number | null>(null);

  const handleSubPointerDown = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggedSubTaskId(taskId);
    setDraggedSubIndex(index);
    setSubPointerStartY(e.clientY);
    setSubPointerStartX(e.clientX);
    setSubDraggedOffset(0);
    setSubDraggedOffsetX(0);
    setSubDraggedCol(null);
    setSubDraggedHour(null);
  };

  const handleSubPointerMove = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId !== taskId || draggedSubIndex !== index) return;
    const currentY = e.clientY;
    const currentX = e.clientX;
    const diffY = currentY - subPointerStartY;
    const diffX = currentX - subPointerStartX;
    setSubDraggedOffset(diffY);
    setSubDraggedOffsetX(diffX);

    const isTimelineDrag = Math.abs(diffX) > 30 || Math.abs(diffY) > 60;

    if (isTimelineDrag) {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const relativeX = currentX - rect.left - 64; // Hours column is 64px
        const relativeY = currentY - rect.top + scrollContainerRef.current.scrollTop;

        const colWidth = (rect.width - 64) / 3;
        const colIndex = Math.floor(relativeX / colWidth);
        const clampedCol = Math.max(0, Math.min(2, colIndex));

        const hour = Math.floor(relativeY / 64);
        const clampedHour = Math.max(0, Math.min(23, hour));

        setSubDraggedCol(clampedCol);
        setSubDraggedHour(clampedHour);
      }
    } else {
      setSubDraggedCol(null);
      setSubDraggedHour(null);

      const rowHeight = 22; // smaller row height for timeline view
      const swapThreshold = rowHeight * 0.5;

      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const subtasks = [...task.subtasks];

      if (diffY > swapThreshold && index < subtasks.length - 1) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index + 1];
        subtasks[index + 1] = temp;

        setSubPointerStartY((prev) => prev + rowHeight);
        setDraggedSubIndex(index + 1);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY - rowHeight);
      } else if (diffY < -swapThreshold && index > 0) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index - 1];
        subtasks[index - 1] = temp;

        setSubPointerStartY((prev) => prev - rowHeight);
        setDraggedSubIndex(index - 1);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY + rowHeight);
      }
    }
  };

  const handleSubPointerUp = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId === taskId && draggedSubIndex === index) {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);

      if (subDraggedHour !== null && subDraggedCol !== null) {
        const parentTask = tasks.find(t => t.id === taskId);
        if (parentTask) {
          const subtask = parentTask.subtasks[index];
          if (subtask) {
            const targetDay = days[subDraggedCol];
            const dateStr = format(targetDay, 'yyyy-MM-dd');
            const timeStr = `${String(subDraggedHour).padStart(2, '0')}:00`;
            const addTask = useTaskStore.getState().addTask;
            const deleteSubtask = useTaskStore.getState().deleteSubtask;

            addTask({
              title: subtask.title,
              category: parentTask.category,
              date: dateStr,
              time: timeStr,
              completed: subtask.completed,
              subtasks: [],
            });

            deleteSubtask(taskId, subtask.id);
          }
        }
      }
    }
    setDraggedSubTaskId(null);
    setDraggedSubIndex(null);
    setSubDraggedOffset(0);
    setSubDraggedOffsetX(0);
    setSubDraggedCol(null);
    setSubDraggedHour(null);
  };

  // Tracks current time today for vertical marker
  const [currentHourMinute, setCurrentHourMinute] = useState({ hour: 0, minute: 0 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentHourMinute({ hour: now.getHours(), minute: now.getMinutes() });
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Track swipe touch events to move dates
  const touchStartX = useRef(0);
  const swipeThreshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > swipeThreshold) {
      const direction = diffX > 0 ? -1 : 1;
      const nextDate = addDays(activeDate, direction * 3); // Swipe 3 days
      useTaskStore.getState().setCurrentDate(nextDate);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  // Scroll collapsing top app bar
  const lastScrollTop = useRef(0);
  const setHeaderCollapsed = useTaskStore((state) => state.setHeaderCollapsed);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTop.current && scrollTop > 50) {
      setHeaderCollapsed(true);
    } else if (scrollTop < lastScrollTop.current) {
      setHeaderCollapsed(false);
    }
    lastScrollTop.current = scrollTop;
  };

  // Auto scroll to current hour on load
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      scrollContainerRef.current.scrollTop = Math.max(0, currentHour * 64 - 120);
    }
  }, []);

  // Long-press detection to trigger popover
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (day: Date, hour: number) => {
    longPressTimer.current = setTimeout(() => {
      openPopover(day, hour);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleHourCellClick = (day: Date, hour: number) => {
    openPopover(day, hour);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none"
    >
      {/* Week Headers Row */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {/* Empty left corner for time vertical scale */}
        <div className="w-16 border-r border-gray-200 flex-shrink-0 bg-gray-50/50" />
        
        {/* Days grid row */}
        <div className="flex-1 grid divide-x divide-gray-100 grid-cols-3">
          {days.map((day) => {
            const isTodayDay = isToday(day);
            return (
              <div 
                key={day.toString()} 
                className={`py-2 text-center flex flex-col items-center justify-center space-y-0.5
                  ${isTodayDay ? 'bg-blue-50/20' : ''}
                `}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {format(day, 'EEE')}
                </span>
                <span className={`text-base font-semibold w-7 h-7 flex items-center justify-center rounded-full
                  ${isTodayDay ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Timeline Grid Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex relative text-gray-800"
      >
        
        {/* Left Column: Hours indicator */}
        <div className="w-16 border-r border-gray-200 flex-shrink-0 bg-gray-50/10 text-right pr-2 text-[10px] font-medium text-gray-400 select-none">
          {hours.map((hour) => (
            <div key={hour} className="h-16 pt-1">
              {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {/* Right Columns: Hourly blocks */}
        <div className="flex-1 grid divide-x divide-gray-100 relative min-h-[1536px] grid-cols-3">
          
          {/* Day blocks */}
          {days.map((day, colIdx) => {
            const isTodayDay = isToday(day);
            
            // Filter tasks for this specific day
            const dayTasks = tasks.filter((task) => {
              const taskDate = new Date(task.date + 'T00:00:00');
              return isSameDay(taskDate, day);
            });

            return (
              <div key={day.toString()} className="relative h-full flex flex-col">
                
                {/* 24 vertical slot grids */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => handleHourCellClick(day, hour)}
                    onTouchStart={() => handleLongPressStart(day, hour)}
                    onTouchEnd={handleLongPressEnd}
                    className="h-16 border-b border-gray-100 hover:bg-gray-50/40 cursor-pointer transition-colors"
                  />
                ))}

                {/* Today's Red line time indicator */}
                {isTodayDay && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-rose-500 z-10 flex items-center"
                    style={{ 
                      top: `${((currentHourMinute.hour * 60) + currentHourMinute.minute) * (1536 / 1440)}px` 
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[5px]" />
                  </div>
                )}

                {/* Snap guide line while dragging a task in this day block */}
                {draggedTaskId && tempTimeStr && dayTasks.some(t => t.id === draggedTaskId) && (() => {
                  const [h, m] = tempTimeStr.split(':').map(Number);
                  const offset = ((h * 60) + m) * (1536 / 1440);
                  return (
                    <div 
                      className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-40 pointer-events-none flex items-center"
                      style={{ top: `${offset}px` }}
                    >
                      <div className="bg-blue-600 text-white font-mono text-[8px] font-extrabold px-1 py-0.5 rounded shadow-md ml-1 flex items-center space-x-0.5 border border-blue-400">
                        <Clock size={7} />
                        <span>{tempTimeStr}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Subtask Drag Hover Preview on Timeline */}
                {subDraggedCol === colIdx && subDraggedHour !== null && draggedSubTaskId && (
                  <div 
                    className="absolute left-1 right-1 p-2 bg-blue-50/90 border border-dashed border-blue-400 rounded-lg flex flex-col justify-center text-[10px] font-semibold text-blue-700 pointer-events-none animate-pulse z-50 shadow-sm"
                    style={{
                      top: `${subDraggedHour * 64}px`,
                      height: '60px'
                    }}
                  >
                    <span className="truncate">Move subtask here</span>
                    <span className="font-mono text-[8px] bg-blue-100 px-1 py-0.2 rounded text-blue-600 mt-1 self-start">
                      {String(subDraggedHour).padStart(2, '0')}:00
                    </span>
                  </div>
                )}

                {/* Render hourly timed tasks floating absolute on top of grid */}
                {dayTasks.map((task) => {
                  if (!task.time && draggedTaskId !== task.id) return null;

                  const [taskHour, taskMin] = (task.time || "00:00").split(':').map(Number);
                  const startOffsetMins = (taskHour * 60) + (taskMin || 0);
                  const topPos = startOffsetMins * (1536 / 1440);

                  const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
                  
                  const isCollapsed = collapsedTasks[task.id] ?? true; 
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                  const isExpanded = !isCollapsed;

                  const isDraggingThis = draggedTaskId === task.id;
                  const currentTop = isDraggingThis ? Math.max(0, dragStartTop + dragCurrentOffset) : topPos;
                  const displayTime = isDraggingThis && tempTimeStr ? tempTimeStr : (task.time || "All-Day");

                  const deleteTask = useTaskStore.getState().deleteTask;
                  const setEditingTask = useTaskStore.getState().setEditingTask;

                  return (
                    <div
                      key={task.id}
                      className="absolute left-1 right-1 overflow-hidden rounded-xl"
                      style={{ 
                        top: `${currentTop}px`,
                        height: isExpanded ? 'auto' : '52px',
                        minHeight: '52px',
                        zIndex: isDraggingThis ? 100 : isExpanded ? 40 : 5,
                      }}
                    >
                      {/* Swipe Background (Delete Trash indicators) */}
                      <div className="absolute inset-0 bg-rose-600 rounded-xl flex items-center justify-between px-4 text-white z-0 pointer-events-none">
                        <Trash2 size={16} className="animate-pulse" />
                        <Trash2 size={16} className="animate-pulse" />
                      </div>

                      {/* Draggable Task Card */}
                      <motion.div
                        drag="x"
                        dragDirectionLock
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.95, right: 0.95 }}
                        onDragEnd={(event, info) => {
                          const threshold = 100;
                          if (Math.abs(info.offset.x) > threshold) {
                            deleteTask(task.id);
                          }
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          if (e.button !== 0) return;
                          const target = e.currentTarget as HTMLElement;
                          target.setPointerCapture(e.pointerId);
                          onTaskDragStart(task.id, topPos, e.clientY);
                        }}
                        onPointerMove={(e) => {
                          e.stopPropagation();
                          if (draggedTaskId === task.id) {
                            onTaskDragMove(e.clientY);
                          }
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          if (draggedTaskId === task.id) {
                            const target = e.currentTarget as HTMLElement;
                            target.releasePointerCapture(e.pointerId);
                            onTaskDragEnd();
                            const diffY = Math.abs(e.clientY - pointerStartY);
                            if (diffY < 5) {
                              toggleTaskCollapse(task.id);
                            }
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-xs shadow-xs transition-all duration-150 flex flex-col select-none pl-3.5 z-10 relative
                          ${isDraggingThis 
                            ? 'scale-[1.02] shadow-sm opacity-95 border-blue-500 ring-2 ring-blue-500/30 cursor-grabbing' 
                            : isExpanded 
                              ? 'ring-1.5 ring-blue-400/50 border-blue-400 shadow-xs scale-[1.005]' 
                              : 'hover:scale-[1.005] hover:shadow-xs cursor-grab'
                          }
                          ${task.completed
                            ? 'bg-gray-50 text-gray-400 border-gray-200'
                            : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                          }
                        `}
                        style={{ 
                          overflow: 'visible',
                          touchAction: 'none'
                        }}
                      >
                        {/* Ripple Effect */}
                        <Ripple color={task.completed ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.07)'} />

                        {/* Left accent stripe */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-colors" 
                          style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }}
                        />

                        {/* Header row with custom checkbox */}
                        <div className="flex items-start justify-between min-w-0 relative z-10">
                          <div className="flex items-center min-w-0 flex-1">
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTask(task.id, { completed: !task.completed });
                              }}
                              className="p-0.5 rounded-full text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 mr-1.5 cursor-pointer"
                            >
                              <span 
                                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all
                                  ${task.completed 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-transparent border-gray-400 hover:border-gray-600'
                                  }
                                `}
                                style={task.completed ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid } : { borderColor: cat.color.solid }}
                              >
                                {task.completed && <Check size={8} className="stroke-[3px] text-white" />}
                              </span>
                            </button>
                            
                            <div className={`font-semibold truncate leading-tight flex-1 ${task.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                              {task.title}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 pl-1 flex-shrink-0">
                            {hasSubtasks && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCollapse(task.id);
                                }}
                                className="p-0.5 hover:bg-black/5 rounded transition-transform duration-150 cursor-pointer"
                                style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                              >
                                <ChevronRight size={11} />
                              </button>
                            )}
                            <span className="text-[9px] opacity-75 font-bold flex items-center space-x-0.5 whitespace-nowrap">
                              <Clock size={9} />
                              <span>{displayTime}</span>
                            </span>
                          </div>
                        </div>

                        {/* Sub-header details */}
                        <div className="text-[9px] opacity-80 mt-0.5 flex items-center justify-between relative z-10">
                          <div className="flex items-center min-w-0">
                            <span 
                              className="w-1 h-1 rounded-full mr-1 flex-shrink-0"
                              style={!task.completed ? { backgroundColor: cat.color.solid } : undefined}
                            />
                            <span className="font-semibold truncate">{cat.name}</span>
                          </div>

                          {/* Subtasks Progress Status Dots when Collapsed */}
                          {hasSubtasks && isCollapsed && (
                            <div className="flex items-center space-x-0.5 bg-black/5 px-1.5 py-0.2 rounded-full scale-90 border border-black/5 flex-shrink-0">
                              <span className="text-[8px] font-bold font-mono mr-0.5">
                                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                              </span>
                              <div className="flex items-center space-x-0.5">
                                {task.subtasks.slice(0, 4).map((s) => (
                                  <span 
                                    key={s.id} 
                                    className={`w-1 h-1 rounded-full border
                                      ${s.completed 
                                        ? 'bg-blue-600 border-blue-600' 
                                        : 'bg-transparent border-gray-400'
                                      }
                                    `} 
                                  />
                                ))}
                                {task.subtasks.length > 4 && <span className="text-[6px] font-bold">+</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inline expanded details */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-black/5 flex flex-col space-y-1.5 animate-fadeIn relative z-10">
                            <div className="flex items-center space-x-1 text-[9px] text-gray-500 font-medium">
                              <CalendarDays size={10} />
                              <span>{task.date} {task.time ? `at ${task.time}` : '(All Day)'}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 pt-0.5">
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setFABOpen(true);
                                }}
                                className="flex items-center space-x-0.5 px-2 py-0.5 rounded bg-black/5 hover:bg-black/10 text-gray-700 font-semibold text-[9px] select-none cursor-pointer transition-colors"
                                title="Edit task"
                              >
                                <Edit3 size={10} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="flex items-center space-x-0.5 px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[9px] select-none cursor-pointer transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={10} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Display subtasks below parent block if expanded */}
                        {!isCollapsed && hasSubtasks && (
                          <div className="mt-1.5 space-y-0.5 border-t border-black/5 pt-1.5 flex-1 overflow-visible relative z-10">
                            {task.subtasks.map((sub, sIdx) => {
                              const isDraggingSub = draggedSubTaskId === task.id && draggedSubIndex === sIdx;
                              const subTopOffset = isDraggingSub ? subDraggedOffset : 0;

                              return (
                                <div 
                                  key={sub.id} 
                                  className={`group flex items-center space-x-1 py-0.5 px-1 rounded hover:bg-black/5 relative select-none transition-all duration-150
                                    ${isDraggingSub ? 'bg-black/10 shadow-sm z-50 scale-[1.02] ring-1 ring-blue-500/20' : ''}
                                    ${sub.completed ? 'opacity-60' : 'hover:translate-x-0.5'}
                                  `}
                                  style={{
                                    transform: isDraggingSub ? `translate(${subDraggedOffsetX}px, ${subTopOffset}px)` : 'none',
                                    touchAction: 'none'
                                  }}
                                >
                                  {/* Small drag handle (≡) */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => handleSubPointerDown(task.id, sIdx, e)}
                                    onPointerMove={(e) => handleSubPointerMove(task.id, sIdx, e)}
                                    onPointerUp={(e) => handleSubPointerUp(task.id, sIdx, e)}
                                    className="p-0.5 text-gray-400 hover:text-gray-700 rounded cursor-grab active:cursor-grabbing flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity"
                                    title="Drag subtask to prioritize"
                                  >
                                    <GripVertical size={10} />
                                  </button>

                                  {/* Completion dot/checkbox */}
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubtask(task.id, sub.id);
                                    }}
                                    className="p-0.5 text-gray-500 hover:text-gray-800 rounded flex-shrink-0 cursor-pointer relative overflow-hidden"
                                    title={sub.completed ? "Mark incomplete" : "Mark complete"}
                                  >
                                    <span 
                                      className={`w-2 h-2 rounded-full flex items-center justify-center border border-current flex-shrink-0 transition-all
                                        ${sub.completed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-400'}
                                      `}
                                      style={!sub.completed ? { color: cat.color.solid, borderColor: cat.color.solid } : undefined}
                                    >
                                      {sub.completed && <Check size={5} className="stroke-[3.5px] text-white" />}
                                    </span>
                                  </button>

                                  {/* Title */}
                                  <span className={`truncate text-[9px] flex-1 ${sub.completed ? 'line-through opacity-50 text-gray-400 font-normal' : 'font-medium text-gray-700 group-hover:text-gray-900'}`}>
                                    {sub.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
                {/* Non-timed tasks section at the very top */}
                <div className="absolute top-1 left-1 right-1 flex flex-col space-y-1">
                  {dayTasks.filter(t => !t.time).map((task) => {
                    const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
                    const isExpanded = expandedTaskId === task.id;
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                    
                    const deleteTask = useTaskStore.getState().deleteTask;
                    const setEditingTask = useTaskStore.getState().setEditingTask;

                    return (
                      <div
                        key={task.id}
                        className="relative overflow-hidden rounded-md"
                        style={{ minHeight: '28px' }}
                      >
                        {/* Swipe background */}
                        <div className="absolute inset-0 bg-rose-600 rounded-md flex items-center justify-between px-3 text-white z-0 pointer-events-none">
                          <Trash2 size={12} className="animate-pulse" />
                          <Trash2 size={12} className="animate-pulse" />
                        </div>

                        {/* Draggable container */}
                        <motion.div
                          drag="x"
                          dragDirectionLock
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={{ left: 0.95, right: 0.95 }}
                          onDragEnd={(event, info) => {
                            const threshold = 100;
                            if (Math.abs(info.offset.x) > threshold) {
                              deleteTask(task.id);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isExpanded) {
                              setExpandedTaskId(null);
                            } else {
                              setExpandedTaskId(task.id);
                            }
                          }}
                          className={`p-1.5 rounded-md border text-[10px] cursor-pointer shadow-2xs transition-all duration-200 flex flex-col pl-3 relative z-10
                            ${isExpanded ? 'ring-1 ring-blue-400 border-blue-400' : 'hover:scale-101'}
                            ${task.completed
                              ? 'bg-gray-50 text-gray-400 border-gray-100'
                              : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                            }
                          `}
                          style={{ touchAction: 'pan-y' }}
                        >
                          {/* Ripple Effect */}
                          <Ripple color="rgba(0, 0, 0, 0.05)" />

                          {/* Accent left stripe */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md" 
                            style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }}
                          />

                          {/* Title and Checkbox row */}
                          <div className="flex items-center justify-between min-w-0 relative z-10">
                            <div className="flex items-center min-w-0 flex-1">
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTask(task.id, { completed: !task.completed });
                                }}
                                className="p-0.5 rounded-full text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 mr-1.5 cursor-pointer"
                              >
                                <span 
                                  className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all
                                    ${task.completed 
                                      ? 'bg-blue-600 border-blue-600 text-white' 
                                      : 'bg-transparent border-gray-400 hover:border-gray-600'
                                    }
                                  `}
                                  style={task.completed ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid } : { borderColor: cat.color.solid }}
                                >
                                  {task.completed && <Check size={6} className="stroke-[3.5px] text-white" />}
                                </span>
                              </button>
                              <span className={`font-semibold truncate flex-1 ${task.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                                All-Day: {task.title}
                              </span>
                            </div>
                          </div>

                          {/* Expanded state details */}
                          {isExpanded && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/5 flex flex-col space-y-1.5 text-[9px] relative z-10">
                              <div className="flex items-center space-x-1 text-gray-500 font-medium">
                                <CalendarDays size={8} />
                                <span>{task.date} (All Day)</span>
                              </div>

                              <div className="flex items-center space-x-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                    setFABOpen(true);
                                  }}
                                  className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-black/5 hover:bg-black/10 text-gray-700 font-semibold select-none cursor-pointer transition-colors"
                                >
                                  <Edit3 size={8} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold select-none cursor-pointer transition-colors"
                                >
                                  <Trash2 size={8} />
                                  <span>Delete</span>
                                </button>
                              </div>

                              {/* Subtasks inside expanded all-day task */}
                              {hasSubtasks && (
                                <div className="mt-1 space-y-0.5 pt-1 border-t border-black/5">
                                  {task.subtasks.map((sub) => (
                                    <div key={sub.id} className="flex items-center space-x-1 py-0.5">
                                      <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubtask(task.id, sub.id);
                                        }}
                                        className="p-0.5 text-gray-500 hover:text-gray-800 rounded flex-shrink-0 cursor-pointer"
                                      >
                                        <span 
                                          className={`w-1.5 h-1.5 rounded-full flex items-center justify-center border border-current flex-shrink-0 transition-all
                                            ${sub.completed ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-gray-400'}
                                          `}
                                          style={!sub.completed ? { color: cat.color.solid, borderColor: cat.color.solid } : undefined}
                                        />
                                      </button>
                                      <span className={`truncate text-[8px] flex-1 ${sub.completed ? 'line-through opacity-50' : 'font-medium text-gray-700'}`}>
                                        {sub.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   3. DAY VIEW COMPONENT
   ============================================================================ */
interface DayViewProps {
  activeDate: Date;
  tasks: Task[];
  setSelectedTaskForDetails: (task: Task | null) => void;
  setFABOpen: (open: boolean) => void;
  openPopover: (date: Date, hour: number) => void;
  collapsedTasks: Record<string, boolean>;
  toggleTaskCollapse: (taskId: string) => void;

  draggedTaskId: string | null;
  dragStartTop: number;
  pointerStartY: number;
  dragCurrentOffset: number;
  tempTimeStr: string | null;
  onTaskDragStart: (taskId: string, initialTop: number, clientY: number) => void;
  onTaskDragMove: (clientY: number) => void;
  onTaskDragEnd: () => void;
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
}

const DayView: React.FC<DayViewProps> = ({
  activeDate,
  tasks,
  setSelectedTaskForDetails,
  setFABOpen,
  openPopover,
  collapsedTasks,
  toggleTaskCollapse,
  draggedTaskId,
  dragStartTop,
  pointerStartY,
  dragCurrentOffset,
  tempTimeStr,
  onTaskDragStart,
  onTaskDragMove,
  onTaskDragEnd,
  expandedTaskId,
  setExpandedTaskId,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isTodayDay = isToday(activeDate);
  const setTasksOverlayOpen = useTaskStore((state) => state.setTasksOverlayOpen);

  const reorderSubtasks = useTaskStore((state) => state.reorderSubtasks);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);
  const [draggedSubTaskId, setDraggedSubTaskId] = useState<string | null>(null);
  const [subPointerStartY, setSubPointerStartY] = useState<number>(0);
  const [subDraggedOffset, setSubDraggedOffset] = useState<number>(0);
  const [subPointerStartX, setSubPointerStartX] = useState<number>(0);
  const [subDraggedOffsetX, setSubDraggedOffsetX] = useState<number>(0);
  const [subDraggedHour, setSubDraggedHour] = useState<number | null>(null);

  const handleSubPointerDown = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggedSubTaskId(taskId);
    setDraggedSubIndex(index);
    setSubPointerStartY(e.clientY);
    setSubPointerStartX(e.clientX);
    setSubDraggedOffset(0);
    setSubDraggedOffsetX(0);
    setSubDraggedHour(null);
  };

  const handleSubPointerMove = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId !== taskId || draggedSubIndex !== index) return;
    const currentY = e.clientY;
    const currentX = e.clientX;
    const diffY = currentY - subPointerStartY;
    const diffX = currentX - subPointerStartX;
    setSubDraggedOffset(diffY);
    setSubDraggedOffsetX(diffX);

    const isTimelineDrag = Math.abs(diffX) > 40 || Math.abs(diffY) > 80;

    if (isTimelineDrag) {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const relativeY = currentY - rect.top + scrollContainerRef.current.scrollTop;
        const hour = Math.floor(relativeY / 64);
        const clampedHour = Math.max(0, Math.min(23, hour));
        setSubDraggedHour(clampedHour);
      }
    } else {
      setSubDraggedHour(null);

      const rowHeight = 26; // row height for DayView subtasks
      const swapThreshold = rowHeight * 0.5;

      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const subtasks = [...task.subtasks];

      if (diffY > swapThreshold && index < subtasks.length - 1) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index + 1];
        subtasks[index + 1] = temp;

        setSubPointerStartY((prev) => prev + rowHeight);
        setDraggedSubIndex(index + 1);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY - rowHeight);
      } else if (diffY < -swapThreshold && index > 0) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index - 1];
        subtasks[index - 1] = temp;

        setSubPointerStartY((prev) => prev - rowHeight);
        setDraggedSubIndex(index - 1);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY + rowHeight);
      }
    }
  };

  const handleSubPointerUp = (taskId: string, index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId === taskId && draggedSubIndex === index) {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);

      if (subDraggedHour !== null) {
        const parentTask = tasks.find(t => t.id === taskId);
        if (parentTask) {
          const subtask = parentTask.subtasks[index];
          if (subtask) {
            const timeStr = `${String(subDraggedHour).padStart(2, '0')}:00`;
            const addTask = useTaskStore.getState().addTask;
            const deleteSubtask = useTaskStore.getState().deleteSubtask;

            addTask({
              title: subtask.title,
              category: parentTask.category,
              date: parentTask.date,
              time: timeStr,
              completed: subtask.completed,
              subtasks: [],
            });

            deleteSubtask(taskId, subtask.id);
          }
        }
      }
    }
    setDraggedSubTaskId(null);
    setDraggedSubIndex(null);
    setSubDraggedOffset(0);
    setSubDraggedOffsetX(0);
    setSubDraggedHour(null);
  };

  const [currentHourMinute, setCurrentHourMinute] = useState({ hour: 0, minute: 0 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentHourMinute({ hour: now.getHours(), minute: now.getMinutes() });
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Swipe gesture handling
  const touchStartX = useRef(0);
  const swipeThreshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > swipeThreshold) {
      const direction = diffX > 0 ? -1 : 1;
      const nextDate = addDays(activeDate, direction);
      useTaskStore.getState().setCurrentDate(nextDate);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  // Scroll collapsing top app bar
  const lastScrollTop = useRef(0);
  const setHeaderCollapsed = useTaskStore((state) => state.setHeaderCollapsed);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTop.current && scrollTop > 50) {
      setHeaderCollapsed(true);
    } else if (scrollTop < lastScrollTop.current) {
      setHeaderCollapsed(false);
    }
    lastScrollTop.current = scrollTop;
  };

  // Auto scroll on load to center current hour
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      scrollContainerRef.current.scrollTop = Math.max(0, currentHour * 64 - 120);
    }
  }, []);

  // Long-press detection to trigger popover
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (hour: number) => {
    longPressTimer.current = setTimeout(() => {
      openPopover(activeDate, hour);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const dayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.date + 'T00:00:00');
    return isSameDay(taskDate, activeDate);
  });

  const handleHourCellClick = (hour: number) => {
    openPopover(activeDate, hour);
  };  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none"
    >
      {/* Pending Task Viewer (GCAL Style) */}
      {(() => {
        const allPendingTasks = tasks.filter((task) => !task.completed);
        return (
          <div className="bg-white border-b border-gray-150 flex flex-col flex-shrink-0 select-none">
            <div 
              onClick={() => setTasksOverlayOpen(true)}
              className="flex items-center h-10 px-3 justify-between cursor-pointer hover:bg-gray-50/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Pending Tasks
                </span>
                {allPendingTasks.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono text-[9px] font-extrabold">
                    {allPendingTasks.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-xs text-blue-600 font-bold">
                <span>Open Tasks List</span>
                <ChevronRight size={13} className="stroke-[2.5px]" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hourly timeline scale */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex relative text-gray-800"
      >
        <div className="w-16 border-r border-gray-200 flex-shrink-0 bg-gray-50/10 text-right pr-3 text-[10px] font-semibold text-gray-400">
          {hours.map((hour) => (
            <div key={hour} className="h-16 pt-1">
              {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
          ))}
        </div>

        {/* 24 hour content canvas */}
        <div className="flex-1 relative min-h-[1536px]">
          {hours.map((hour) => (
            <div
              key={hour}
              onClick={() => handleHourCellClick(hour)}
              onTouchStart={() => handleLongPressStart(hour)}
              onTouchEnd={handleLongPressEnd}
              className="h-16 border-b border-gray-100 hover:bg-gray-50/40 cursor-pointer transition-colors"
            />
          ))}

          {/* Red line time indicator */}
          {isTodayDay && (
            <div 
              className="absolute left-0 right-0 border-t-2 border-rose-500 z-10 flex items-center"
              style={{ 
                top: `${((currentHourMinute.hour * 60) + currentHourMinute.minute) * (1536 / 1440)}px` 
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[5px]" />
            </div>
          )}

          {/* Snap guide line while dragging a task */}
          {draggedTaskId && tempTimeStr && (() => {
            const [h, m] = tempTimeStr.split(':').map(Number);
            const offset = ((h * 60) + m) * (1536 / 1440);
            return (
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-40 pointer-events-none flex items-center"
                style={{ top: `${offset}px` }}
              >
                <div className="bg-blue-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md ml-1 flex items-center space-x-1 border border-blue-400">
                  <Clock size={8} />
                  <span>{tempTimeStr}</span>
                </div>
              </div>
            );
          })()}

          {/* Subtask Drag Hover Preview on Timeline */}
          {subDraggedHour !== null && draggedSubTaskId && (
            <div 
              className="absolute left-4 right-4 p-3 bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-700 pointer-events-none animate-pulse z-50 shadow-sm"
              style={{
                top: `${subDraggedHour * 64}px`,
                height: '60px'
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Move subtask here</span>
              </div>
              <span className="font-mono text-[9px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-600">
                {String(subDraggedHour).padStart(2, '0')}:00
              </span>
            </div>
          )}

          {/* Timed Tasks placement */}
          {dayTasks.map((task) => {
            if (!task.time && draggedTaskId !== task.id) return null;

            const [taskHour, taskMin] = (task.time || "00:00").split(':').map(Number);
            const startOffsetMins = (taskHour * 60) + (taskMin || 0);
            const topPos = startOffsetMins * (1536 / 1440);

            const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];

            const isCollapsed = collapsedTasks[task.id] ?? true; 
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const isExpanded = !isCollapsed;

            const isDraggingThis = draggedTaskId === task.id;
            const currentTop = isDraggingThis ? Math.max(0, dragStartTop + dragCurrentOffset) : topPos;
            const displayTime = isDraggingThis && tempTimeStr ? tempTimeStr : (task.time || "All-Day");

            const deleteTask = useTaskStore.getState().deleteTask;
            const setEditingTask = useTaskStore.getState().setEditingTask;

            return (
              <div
                key={task.id}
                className="absolute left-4 right-4 overflow-hidden rounded-2xl"
                style={{ 
                  top: `${currentTop}px`,
                  height: isExpanded ? 'auto' : '64px',
                  minHeight: '64px',
                  zIndex: isDraggingThis ? 100 : isExpanded ? 40 : 5,
                }}
              >
                {/* Swipe background */}
                <div className="absolute inset-0 bg-rose-600 rounded-2xl flex items-center justify-between px-4 text-white z-0 pointer-events-none">
                  <Trash2 size={18} className="animate-pulse" />
                  <Trash2 size={18} className="animate-pulse" />
                </div>

                {/* Draggable Task Card */}
                <motion.div
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.95, right: 0.95 }}
                  onDragEnd={(event, info) => {
                    const threshold = 100;
                    if (Math.abs(info.offset.x) > threshold) {
                      deleteTask(task.id);
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.button !== 0) return;
                    const target = e.currentTarget as HTMLElement;
                    target.setPointerCapture(e.pointerId);
                    onTaskDragStart(task.id, topPos, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (draggedTaskId === task.id) {
                      onTaskDragMove(e.clientY);
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (draggedTaskId === task.id) {
                      const target = e.currentTarget as HTMLElement;
                      target.releasePointerCapture(e.pointerId);
                      onTaskDragEnd();
                      const diffY = Math.abs(e.clientY - pointerStartY);
                      if (diffY < 5) {
                        toggleTaskCollapse(task.id);
                      }
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-sm shadow-xs transition-all duration-150 flex flex-col select-none pl-5 z-10 relative
                    ${isDraggingThis 
                      ? 'scale-[1.02] shadow-sm opacity-95 border-blue-500 ring-2 ring-blue-500/30 cursor-grabbing' 
                      : isExpanded 
                        ? 'ring-1.5 ring-blue-400/50 border-blue-400 shadow-sm scale-[1.005]'
                        : 'hover:scale-[1.005] hover:shadow-xs cursor-grab'
                    }
                    ${task.completed
                      ? 'bg-gray-50 text-gray-400 border-gray-200 shadow-xs'
                      : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                    }
                  `}
                  style={{ 
                    overflow: 'visible',
                    touchAction: 'none'
                  }}
                >
                  {/* Ripple effect */}
                  <Ripple color={task.completed ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.07)'} />

                  {/* Left accent stripe */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-colors" 
                    style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }}
                  />

                  {/* Header row with custom checkbox */}
                  <div className="flex items-start justify-between min-w-0 relative z-10">
                    <div className="flex items-center min-w-0 flex-1">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask(task.id, { completed: !task.completed });
                        }}
                        className="p-0.5 rounded-full text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 mr-2 cursor-pointer"
                      >
                        <span 
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                            ${task.completed 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-transparent border-gray-400 hover:border-gray-600'
                            }
                          `}
                          style={task.completed ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid } : { borderColor: cat.color.solid }}
                        >
                          {task.completed && <Check size={10} className="stroke-[3px] text-white" />}
                        </span>
                      </button>

                      <div className={`font-bold truncate leading-tight flex-1 ${task.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                        {task.title}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 pl-2 flex-shrink-0">
                      {hasSubtasks && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCollapse(task.id);
                          }}
                          className="p-1 hover:bg-black/5 rounded transition-transform duration-150 cursor-pointer"
                          style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                      <span className="text-xs opacity-75 font-bold flex items-center space-x-1 whitespace-nowrap">
                        <Clock size={12} />
                        <span>{displayTime}</span>
                      </span>
                    </div>
                  </div>

                   {/* Sub-header details */}
                  <div className="text-xs opacity-80 mt-1 flex items-center justify-between relative z-10">
                    <div className="flex items-center min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={!task.completed ? { backgroundColor: cat.color.solid } : undefined}
                      />
                      <span className="font-semibold truncate">{cat.name}</span>
                    </div>

                    {/* Subtasks Progress Status Dots when Collapsed */}
                    {hasSubtasks && isCollapsed && (
                      <div className="flex items-center space-x-1 bg-black/5 px-2 py-0.5 rounded-full scale-95 border border-black/5 flex-shrink-0">
                        <span className="text-[10px] font-bold font-mono mr-1">
                          {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                        </span>
                        <div className="flex items-center space-x-0.5">
                          {task.subtasks.slice(0, 5).map((s) => (
                            <span 
                              key={s.id} 
                              className={`w-1.5 h-1.5 rounded-full border
                                ${s.completed 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'bg-transparent border-gray-400'
                                }
                              `} 
                            />
                          ))}
                          {task.subtasks.length > 5 && <span className="text-[8px] font-bold">+</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inline expanded details */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-black/5 flex flex-col space-y-2 animate-fadeIn relative z-10">
                      <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-medium">
                        <CalendarDays size={13} />
                        <span>{task.date} {task.time ? `at ${task.time}` : '(All Day)'}</span>
                      </div>

                      <div className="flex items-center space-x-2 pt-0.5">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setFABOpen(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 rounded bg-black/5 hover:bg-black/10 text-gray-700 font-semibold text-xs select-none cursor-pointer transition-colors"
                          title="Edit task"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs select-none cursor-pointer transition-colors"
                          title="Delete task"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display subtasks below parent block if expanded */}
                  {!isCollapsed && hasSubtasks && (
                    <div className="mt-2 space-y-1 border-t border-black/5 pt-2 flex-1 overflow-visible relative z-10">
                      {task.subtasks.map((sub, sIdx) => {
                        const isDraggingSub = draggedSubTaskId === task.id && draggedSubIndex === sIdx;
                        const subTopOffset = isDraggingSub ? subDraggedOffset : 0;

                        return (
                          <div 
                            key={sub.id} 
                            className={`group flex items-center space-x-2 py-0.5 px-1.5 rounded hover:bg-black/5 relative select-none transition-all duration-150
                              ${isDraggingSub ? 'bg-black/10 shadow-sm z-50 scale-[1.01] ring-1 ring-blue-500/20' : ''}
                              ${sub.completed ? 'opacity-60' : 'hover:translate-x-0.5'}
                            `}
                            style={{
                              transform: isDraggingSub ? `translate(${subDraggedOffsetX}px, ${subTopOffset}px)` : 'none',
                              touchAction: 'none'
                            }}
                          >
                            {/* Drag handle (≡) */}
                            <button
                              type="button"
                              onPointerDown={(e) => handleSubPointerDown(task.id, sIdx, e)}
                              onPointerMove={(e) => handleSubPointerMove(task.id, sIdx, e)}
                              onPointerUp={(e) => handleSubPointerUp(task.id, sIdx, e)}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-grab active:cursor-grabbing flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity"
                              title="Drag subtask to prioritize"
                            >
                              <GripVertical size={13} />
                            </button>

                            {/* Completion checkbox/dot */}
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubtask(task.id, sub.id);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-800 rounded flex-shrink-0 cursor-pointer relative overflow-hidden"
                              title={sub.completed ? "Mark incomplete" : "Mark complete"}
                            >
                              <span 
                                className={`w-2.5 h-2.5 rounded-full flex items-center justify-center border border-current flex-shrink-0 transition-all
                                  ${sub.completed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-400'}
                                `}
                                style={!sub.completed ? { color: cat.color.solid, borderColor: cat.color.solid } : undefined}
                              >
                                {sub.completed && <Check size={6} className="stroke-[3.5px] text-white" />}
                              </span>
                            </button>

                            {/* Title */}
                            <span className={`truncate text-xs flex-1 ${sub.completed ? 'line-through opacity-50 text-gray-400 font-normal' : 'font-medium text-gray-700 group-hover:text-gray-900'}`}>
                              {sub.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}

          {/* Non-timed tasks list */}
          <div className="absolute top-2 left-4 right-4 flex flex-col space-y-1.5">
            {dayTasks.filter(t => !t.time).map((task) => {
              const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
              const isExpanded = expandedTaskId === task.id;
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;

              const deleteTask = useTaskStore.getState().deleteTask;
              const setEditingTask = useTaskStore.getState().setEditingTask;

              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden rounded-xl"
                  style={{ minHeight: '44px' }}
                >
                  {/* Swipe background */}
                  <div className="absolute inset-0 bg-rose-600 rounded-xl flex items-center justify-between px-4 text-white z-0 pointer-events-none">
                    <Trash2 size={16} className="animate-pulse" />
                    <Trash2 size={16} className="animate-pulse" />
                  </div>

                  {/* Draggable container */}
                  <motion.div
                    drag="x"
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.95, right: 0.95 }}
                    onDragEnd={(event, info) => {
                      const threshold = 100;
                      if (Math.abs(info.offset.x) > threshold) {
                        deleteTask(task.id);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isExpanded) {
                        setExpandedTaskId(null);
                      } else {
                        setExpandedTaskId(task.id);
                      }
                    }}
                    className={`p-3 rounded-xl border text-sm cursor-pointer shadow-xs transition-all duration-200 flex flex-col pl-5 relative z-10
                      ${isExpanded ? 'z-50 ring-1 ring-blue-400 border-blue-400 shadow-sm' : 'hover:scale-[1.01] hover:shadow-xs'}
                      ${task.completed
                        ? 'bg-gray-50 text-gray-400 border-gray-200'
                        : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                      }
                    `}
                    style={{ touchAction: 'pan-y' }}
                  >
                    {/* Ripple effect */}
                    <Ripple color="rgba(0, 0, 0, 0.05)" />

                    {/* Accent left stripe */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors" 
                      style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }}
                    />

                    {/* Title and Checkbox row */}
                    <div className="flex items-center justify-between min-w-0 relative z-10">
                      <div className="flex items-center min-w-0 flex-1">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTask(task.id, { completed: !task.completed });
                          }}
                          className="p-0.5 rounded-full text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 mr-2 cursor-pointer"
                        >
                          <span 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                              ${task.completed 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'bg-transparent border-gray-400 hover:border-gray-600'
                              }
                            `}
                            style={task.completed ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid } : { borderColor: cat.color.solid }}
                          >
                            {task.completed && <Check size={10} className="stroke-[3px] text-white" />}
                          </span>
                        </button>
                        <span className={`font-bold truncate flex-1 ${task.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                          All-Day Task: {task.title}
                        </span>
                      </div>
                    </div>

                    {/* Expanded state details */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-black/5 flex flex-col space-y-2 text-xs relative z-10">
                        <div className="flex items-center space-x-1.5 text-gray-500 font-medium">
                          <CalendarDays size={13} />
                          <span>{task.date} (All Day)</span>
                        </div>

                        <div className="flex items-center space-x-2 pt-0.5">
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setFABOpen(true);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 rounded bg-black/5 hover:bg-black/10 text-gray-700 font-semibold select-none cursor-pointer transition-colors"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold select-none cursor-pointer transition-colors"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>

                        {/* Subtasks inside expanded all-day task */}
                        {hasSubtasks && (
                          <div className="mt-2 space-y-1 pt-2 border-t border-black/5">
                            {task.subtasks.map((sub) => (
                              <div key={sub.id} className="flex items-center space-x-2 py-0.5">
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubtask(task.id, sub.id);
                                  }}
                                  className="p-0.5 text-gray-500 hover:text-gray-800 rounded flex-shrink-0 cursor-pointer"
                                >
                                  <span 
                                    className={`w-2 h-2 rounded-full flex items-center justify-center border border-current flex-shrink-0 transition-all
                                      ${sub.completed ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-gray-400'}
                                    `}
                                    style={!sub.completed ? { color: cat.color.solid, borderColor: cat.color.solid } : undefined}
                                  />
                                </button>
                                <span className={`truncate text-xs flex-1 ${sub.completed ? 'line-through opacity-50' : 'font-medium text-gray-700'}`}>
                                  {sub.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. SCHEDULE VIEW COMPONENT
   ============================================================================ */
interface ScheduleViewProps {
  activeDate: Date;
  tasks: Task[];
  setSelectedTaskForDetails: (task: Task | null) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  activeDate,
  tasks,
  setSelectedTaskForDetails,
}) => {
  const lastScrollTop = useRef(0);
  const setHeaderCollapsed = useTaskStore((state) => state.setHeaderCollapsed);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTop.current && scrollTop > 50) {
      setHeaderCollapsed(true);
    } else if (scrollTop < lastScrollTop.current) {
      setHeaderCollapsed(false);
    }
    lastScrollTop.current = scrollTop;
  };

  // Group upcoming tasks from the start of current month onwards
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00');
    const dateB = new Date(b.date + 'T00:00:00');
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.title.localeCompare(b.title);
  });

  // Group tasks by their date string
  const groupedTasks: { [dateStr: string]: Task[] } = {};
  sortedTasks.forEach((task) => {
    if (!groupedTasks[task.date]) {
      groupedTasks[task.date] = [];
    }
    groupedTasks[task.date].push(task);
  });

  const dateKeys = Object.keys(groupedTasks).sort();

  return (
    <div 
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-gray-50 select-none p-4 md:p-6 space-y-6"
    >
      {dateKeys.length > 0 ? (
        dateKeys.map((dateStr) => {
          const dateObj = new Date(dateStr + 'T00:00:00');
          const dayTasks = groupedTasks[dateStr];
          const isTodayDay = isToday(dateObj);

          return (
            <div key={dateStr} className="max-w-2xl mx-auto space-y-2.5">
              {/* Date Header Indicator */}
              <div className="flex items-center space-x-2 px-1">
                <span className={`text-sm font-bold uppercase tracking-wider
                  ${isTodayDay ? 'text-blue-600' : 'text-gray-400'}
                `}>
                  {format(dateObj, 'EEEE, d MMMM')}
                </span>
                {isTodayDay && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Today
                  </span>
                )}
              </div>

              {/* Day tasks card list */}
              <div className="space-y-2">
                {dayTasks.map((task) => (
                  <ScheduleTaskCard 
                    key={task.id} 
                    task={task} 
                    onViewDetails={() => setSelectedTaskForDetails(task)} 
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600 shadow-xs">
            <CalendarDays size={28} />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-sm font-semibold text-gray-800">No scheduled tasks</h3>
            <p className="text-xs text-gray-400">
              There are no tasks matching your query or category in this period. Create one using the floating button!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   SCHEDULE TASK CARD COMPONENT (Nested Expandable Subtasks list)
   ============================================================================ */
interface ScheduleTaskCardProps {
  task: Task;
  onViewDetails: () => void;
}

const ScheduleTaskCard: React.FC<ScheduleTaskCardProps> = ({ task, onViewDetails }) => {
  const updateTask = useTaskStore((state) => state.updateTask);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);

  const [isExpanded, setIsExpanded] = useState(false);

  const categoryInfo = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const handleToggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { completed: !task.completed });
  };

  const handleToggleSubtaskWrapper = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSubtask(task.id, subId);
  };

  return (
    <div
      onClick={onViewDetails}
      className={`bg-white border border-gray-150/60 rounded-xl shadow-2xs hover:shadow-xs hover:bg-gray-50/10 transition-material duration-200 p-4 cursor-pointer relative group flex flex-col space-y-3
        ${task.completed ? 'opacity-80' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        
        {/* Checkbox + Details info */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <button
            onClick={handleToggleCompleted}
            className="text-blue-600 focus:outline-none transition-material hover:scale-105 p-2 -m-2 flex items-center justify-center min-w-[44px] min-h-[44px]"
            title="Toggle completed"
          >
            {task.completed ? (
              <CheckSquare size={20} className="fill-blue-50" />
            ) : (
              <Square size={20} />
            )}
          </button>
          
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className={`text-sm font-semibold text-gray-800 leading-tight truncate
              ${task.completed ? 'line-through text-gray-400' : ''}
            `}>
              {task.title}
            </h4>

            {/* Badges metadata row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {/* Category Badge */}
              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                ${categoryInfo.color.bgLight} ${categoryInfo.color.light} ${categoryInfo.color.borderLight}
              `}>
                <span 
                  className="w-1 h-1 rounded-full" 
                  style={{ backgroundColor: categoryInfo.color.solid }} 
                />
                <span>{categoryInfo.name}</span>
              </span>

              {/* Time Indicator */}
              {task.time && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-200/50">
                  <Clock size={10} />
                  <span>{task.time}</span>
                </span>
              )}

              {/* Subtask count banner */}
              {totalSubtasks > 0 && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-blue-600 bg-blue-50/50 border border-blue-100/50">
                  <span>Subtasks {completedSubtasks}/{totalSubtasks}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand subtasks chevron */}
        {totalSubtasks > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-3 md:p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Subtasks inline nested list with height slide */}
      {isExpanded && totalSubtasks > 0 && (
        <div
          className="overflow-hidden border-t border-gray-100 pt-2.5 space-y-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {task.subtasks.map((sub) => (
            <div
              key={sub.id}
              onClick={(e) => handleToggleSubtaskWrapper(sub.id, e)}
              className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={(e) => handleToggleSubtaskWrapper(sub.id, e)}
                className="text-blue-600 hover:scale-105 transition-transform p-2.5 -m-2.5 flex items-center justify-center min-w-[40px] min-h-[40px]"
              >
                {sub.completed ? (
                  <CheckSquare size={16} className="fill-blue-50" />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <span className={`text-xs text-gray-600
                ${sub.completed ? 'line-through text-gray-400' : ''}
              `}>
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
