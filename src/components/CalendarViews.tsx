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
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
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
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
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

  // Continuous swipe / drag state tracking
  const dragX = useMotionValue(0);
  const x = useTransform(dragX, (val) => val);

  // Reset offset when active date or view changes to avoid stale/stuck states
  useEffect(() => {
    dragX.set(0);
  }, [selectedView, currentDateStr, dragX]);

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

  const handleDragEnd = (event: any, info: any) => {
    if (selectedView === 'schedule') return;

    const dragDistance = info.offset.x;
    const threshold = 40;

    if (dragDistance < -threshold) {
      // Swipe left = Next period
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
      
      let nextDate = activeDate;
      if (selectedView === 'day') {
        nextDate = addDays(activeDate, 1);
      } else if (selectedView === 'week') {
        nextDate = addWeeks(activeDate, 1);
      } else if (selectedView === '3day') {
        nextDate = addDays(activeDate, 3);
      } else if (selectedView === 'month') {
        nextDate = addMonths(activeDate, 1);
      }

      const nextYear = nextDate.getFullYear();
      if (nextYear >= 2024 && nextYear <= 2027) {
        animate(dragX, -300, {
          type: 'spring',
          damping: 28,
          stiffness: 220,
          mass: 0.8
        }).then(() => {
          setCurrentDate(nextDate);
          dragX.set(300);
          animate(dragX, 0, {
            type: 'spring',
            damping: 28,
            stiffness: 220,
            mass: 0.8
          });
        });
      } else {
        animate(dragX, 0, {
          type: 'spring',
          damping: 28,
          stiffness: 220,
          mass: 0.8
        });
      }
    } else if (dragDistance > threshold) {
      // Swipe right = Previous period
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }

      let prevDate = activeDate;
      if (selectedView === 'day') {
        prevDate = subDays(activeDate, 1);
      } else if (selectedView === 'week') {
        prevDate = subWeeks(activeDate, 1);
      } else if (selectedView === '3day') {
        prevDate = subDays(activeDate, 3);
      } else if (selectedView === 'month') {
        prevDate = subMonths(activeDate, 1);
      }

      const prevYear = prevDate.getFullYear();
      if (prevYear >= 2024 && prevYear <= 2027) {
        animate(dragX, 300, {
          type: 'spring',
          damping: 28,
          stiffness: 220,
          mass: 0.8
        }).then(() => {
          setCurrentDate(prevDate);
          dragX.set(-300);
          animate(dragX, 0, {
            type: 'spring',
            damping: 28,
            stiffness: 220,
            mass: 0.8
          });
        });
      } else {
        animate(dragX, 0, {
          type: 'spring',
          damping: 28,
          stiffness: 220,
          mass: 0.8
        });
      }
    } else {
      animate(dragX, 0, {
        type: 'spring',
        damping: 28,
        stiffness: 220,
        mass: 0.8
      });
    }
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
            isThreeDay={false}
          />
        );
      case '3day':
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
            isThreeDay={true}
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
  const direction = useTaskStore((state) => state.direction);

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

  const setDirection = useTaskStore((state) => state.setDirection);
  const x = useMotionValue(0);
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    x.set(delta);
  };

  const handleTouchEnd = () => {
    const delta = x.get();
    if (Math.abs(delta) > 40) {
      const dir = delta < 0 ? 'next' : 'prev';
      animate(x, delta < 0 ? -window.innerWidth : window.innerWidth, {
        type: 'spring', damping: 28, stiffness: 220, mass: 0.6,
        onComplete: () => {
          setDirection(dir);
          const nextDate = dir === 'next' ? addMonths(activeDate, 1) : subMonths(activeDate, 1);
          setCurrentDate(nextDate);
          x.set(dir === 'next' ? window.innerWidth : -window.innerWidth);
          animate(x, 0, { type: 'spring', damping: 28, stiffness: 220, mass: 0.6 });
        }
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } else {
      animate(x, 0, { type: 'spring', damping: 32, stiffness: 300 });
    }
  };

  return (
    <motion.div 
      style={{ x, touchAction: 'pan-y', willChange: 'transform', transform: 'translateZ(0)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full overflow-hidden bg-white"
    >
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
                className={`flex flex-col min-h-0 min-w-0 p-0.5 md:p-1 group hover:bg-blue-50/10 transition-colors duration-150 cursor-pointer relative
                  ${!isCurrentMonth ? 'bg-gray-50/40' : ''}
                  ${isSelectedDay ? 'bg-blue-50/30 ring-2 ring-blue-500/20' : ''}
                `}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all
                      ${isTodayDay 
                        ? 'bg-[#1A73E8] text-white font-bold shadow-xs' 
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
                          className={`text-[10px] h-[16px] max-h-[16px] px-1.5 py-0 rounded-md border flex items-center justify-between truncate select-none shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-material
                            ${task.completed 
                              ? 'bg-gray-50 text-gray-400 border-gray-100 line-through' 
                              : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                            }
                          `}
                          title={task.title}
                        >
                          <div className="flex items-center min-w-0 flex-1 space-x-1">
                            <span 
                              className={`w-1 h-1 rounded-full flex-shrink-0 ${task.completed ? 'bg-gray-300' : ''}`}
                              style={!task.completed ? { backgroundColor: cat.color.solid } : undefined}
                            />
                            <span className="truncate font-semibold">{task.title}</span>
                          </div>
                          
                          {task.time && (
                            <span className="text-[8px] opacity-75 font-semibold font-mono pl-1">{task.time}</span>
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
  </motion.div>
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
  isThreeDay?: boolean;
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
  isThreeDay = false,
}) => {
  const days = isThreeDay
    ? [activeDate, addDays(activeDate, 1), addDays(activeDate, 2)]
    : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(activeDate), i));
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
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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

        const colCount = isThreeDay ? 3 : 7;
        const colWidth = (rect.width - 64) / colCount;
        const colIndex = Math.floor(relativeX / colWidth);
        const clampedCol = Math.max(0, Math.min(colCount - 1, colIndex));

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

  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const direction = useTaskStore((state) => state.direction);

  const setDirection = useTaskStore((state) => state.setDirection);
  const x = useMotionValue(0);
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    x.set(delta);
  };

  const handleTouchEnd = () => {
    const delta = x.get();
    if (Math.abs(delta) > 40) {
      const dir = delta < 0 ? 'next' : 'prev';
      animate(x, delta < 0 ? -window.innerWidth : window.innerWidth, {
        type: 'spring', damping: 28, stiffness: 220, mass: 0.6,
        onComplete: () => {
          setDirection(dir);
          const nextDate = dir === 'next' 
            ? (isThreeDay ? addDays(activeDate, 3) : addWeeks(activeDate, 1)) 
            : (isThreeDay ? subDays(activeDate, 3) : subWeeks(activeDate, 1));
          setCurrentDate(nextDate);
          x.set(dir === 'next' ? window.innerWidth : -window.innerWidth);
          animate(x, 0, { type: 'spring', damping: 28, stiffness: 220, mass: 0.6 });
        }
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } else {
      animate(x, 0, { type: 'spring', damping: 32, stiffness: 300 });
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
    <motion.div 
      style={{ x, touchAction: 'pan-y', willChange: 'transform', transform: 'translateZ(0)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full overflow-hidden bg-white"
    >
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
      {/* Week Headers Row */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {/* Empty left corner for time vertical scale */}
        <div className="w-16 border-r border-gray-200 flex-shrink-0 bg-gray-50/50" />
        
        {/* Days grid row */}
        <div className={`flex-1 grid divide-x divide-gray-100 ${isThreeDay ? 'grid-cols-3' : 'grid-cols-7'}`}>
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
                  ${isTodayDay ? 'bg-[#1A73E8] text-white font-bold' : 'text-gray-700'}
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
        <div className={`flex-1 grid divide-x divide-gray-100 relative min-h-[1536px] ${isThreeDay ? 'grid-cols-3' : 'grid-cols-7'}`}>
          
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
                    className="absolute left-0 right-0 border-t-2 border-[#EA4335] z-10 flex items-center"
                    style={{ 
                      top: `${((currentHourMinute.hour * 60) + currentHourMinute.minute) * (1536 / 1440)}px` 
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] -ml-[5px]" />
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
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCollapse(task.id);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-xs shadow-xs transition-all duration-150 flex flex-col select-none pl-6.5 z-10 relative group
                          ${isDraggingThis 
                            ? 'scale-[1.02] shadow-sm opacity-95 border-blue-500 ring-2 ring-blue-500/30' 
                            : isExpanded 
                              ? 'ring-1.5 ring-blue-400/50 border-blue-400 shadow-xs scale-[1.005]' 
                              : 'hover:scale-[1.005] hover:shadow-xs'
                          }
                          ${task.completed
                            ? 'bg-gray-50 text-gray-400 border-gray-200'
                            : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                          }
                        `}
                        style={{ 
                          overflow: 'visible',
                          touchAction: 'pan-y'
                        }}
                      >
                        {/* Ripple Effect */}
                        <Ripple color={task.completed ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.07)'} />

                        {/* Left accent stripe */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-colors" 
                          style={{ backgroundColor: task.completed ? '#cbd5e1' : cat.color.solid }}
                        />

                        {/* Dedicated vertical drag handle */}
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            if (e.pointerType === 'mouse' && e.button !== 0) return;
                            const target = e.currentTarget as HTMLElement;
                            const pointerId = e.pointerId;
                            const startY = e.clientY;
                            const startX = e.clientX;
                            
                            if ((window as any)._dragTimer) clearTimeout((window as any)._dragTimer);
                            
                            (window as any)._dragTimer = setTimeout(() => {
                              try {
                                target.setPointerCapture(pointerId);
                                onTaskDragStart(task.id, topPos, startY);
                              } catch (err) {}
                            }, 150);

                            target.setAttribute('data-start-y', startY.toString());
                            target.setAttribute('data-start-x', startX.toString());
                          }}
                          onPointerMove={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget as HTMLElement;
                            if (draggedTaskId === task.id) {
                              onTaskDragMove(e.clientY);
                            } else {
                              const startY = parseFloat(target.getAttribute('data-start-y') || '');
                              const startX = parseFloat(target.getAttribute('data-start-x') || '');
                              if (!isNaN(startY) && !isNaN(startX)) {
                                const diffY = Math.abs(e.clientY - startY);
                                const diffX = Math.abs(e.clientX - startX);
                                if ((diffY > 6 || diffX > 6) && (window as any)._dragTimer) {
                                  clearTimeout((window as any)._dragTimer);
                                  (window as any)._dragTimer = null;
                                }
                              }
                            }
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            if ((window as any)._dragTimer) {
                              clearTimeout((window as any)._dragTimer);
                              (window as any)._dragTimer = null;
                            }
                            if (draggedTaskId === task.id) {
                              const target = e.currentTarget as HTMLElement;
                              try {
                                target.releasePointerCapture(e.pointerId);
                              } catch (err) {}
                              onTaskDragEnd();
                            }
                          }}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing rounded hover:bg-black/5 active:bg-black/10 transition-colors z-20"
                          style={{ touchAction: 'none' }}
                          title="Drag vertically to change time"
                        >
                          <GripVertical size={11} className="opacity-60" />
                        </button>

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
                            
                            <div className={`font-semibold truncate leading-tight flex-1 relative inline-block ${task.completed ? 'text-gray-400 font-normal' : ''}`}>
                              <span>{task.title}</span>
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: task.completed ? '100%' : 0 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                                style={{ transform: 'translateY(-50%)' }}
                              />
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
                              <span className={`font-semibold truncate flex-1 relative inline-block ${task.completed ? 'text-gray-400 font-normal' : ''}`}>
                                <span>All-Day: {task.title}</span>
                                <motion.span
                                  initial={{ width: 0 }}
                                  animate={{ width: task.completed ? '100%' : 0 }}
                                  transition={{ duration: 0.25, ease: 'easeOut' }}
                                  className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                                  style={{ transform: 'translateY(-50%)' }}
                                />
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
  </motion.div>
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
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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

  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const direction = useTaskStore((state) => state.direction);

  const setDirection = useTaskStore((state) => state.setDirection);
  const x = useMotionValue(0);
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    x.set(delta);
  };

  const handleTouchEnd = () => {
    const delta = x.get();
    if (Math.abs(delta) > 40) {
      const dir = delta < 0 ? 'next' : 'prev';
      animate(x, delta < 0 ? -window.innerWidth : window.innerWidth, {
        type: 'spring', damping: 28, stiffness: 220, mass: 0.6,
        onComplete: () => {
          setDirection(dir);
          const nextDate = dir === 'next' ? addDays(activeDate, 1) : subDays(activeDate, 1);
          setCurrentDate(nextDate);
          x.set(dir === 'next' ? window.innerWidth : -window.innerWidth);
          animate(x, 0, { type: 'spring', damping: 28, stiffness: 220, mass: 0.6 });
        }
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } else {
      animate(x, 0, { type: 'spring', damping: 32, stiffness: 300 });
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
  };

  return (
    <motion.div 
      style={{ x, touchAction: 'pan-y', willChange: 'transform', transform: 'translateZ(0)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full overflow-hidden bg-white"
    >
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
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
              className="absolute left-0 right-0 border-t-2 border-[#EA4335] z-10 flex items-center"
              style={{ 
                top: `${((currentHourMinute.hour * 60) + currentHourMinute.minute) * (1536 / 1440)}px` 
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] -ml-[5px]" />
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
                   onClick={(e) => {
                     e.stopPropagation();
                     toggleTaskCollapse(task.id);
                   }}
                   className={`w-full p-3.5 rounded-2xl border text-sm shadow-xs transition-all duration-150 flex flex-col select-none pl-8 z-10 relative group
                     ${isDraggingThis 
                       ? 'scale-[1.02] shadow-sm opacity-95 border-blue-500 ring-2 ring-blue-500/30' 
                       : isExpanded 
                         ? 'ring-1.5 ring-blue-400/50 border-blue-400 shadow-sm scale-[1.005]'
                         : 'hover:scale-[1.005] hover:shadow-xs'
                     }
                     ${task.completed
                       ? 'bg-gray-50 text-gray-400 border-gray-200 shadow-xs'
                       : `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight}`
                     }
                   `}
                   style={{ 
                     overflow: 'visible',
                     touchAction: 'pan-y'
                   }}
                 >
                   {/* Ripple effect */}
                   <Ripple color={task.completed ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.07)'} />

                   {/* Dedicated vertical drag handle */}
                   <button
                     type="button"
                     onPointerDown={(e) => {
                       e.stopPropagation();
                       if (e.pointerType === 'mouse' && e.button !== 0) return;
                       const target = e.currentTarget as HTMLElement;
                       const pointerId = e.pointerId;
                       const startY = e.clientY;
                       const startX = e.clientX;
                       
                       if ((window as any)._dragTimer) clearTimeout((window as any)._dragTimer);
                       
                       (window as any)._dragTimer = setTimeout(() => {
                         try {
                           target.setPointerCapture(pointerId);
                           onTaskDragStart(task.id, topPos, startY);
                         } catch (err) {}
                       }, 150);

                       target.setAttribute('data-start-y', startY.toString());
                       target.setAttribute('data-start-x', startX.toString());
                     }}
                     onPointerMove={(e) => {
                       e.stopPropagation();
                       const target = e.currentTarget as HTMLElement;
                       if (draggedTaskId === task.id) {
                         onTaskDragMove(e.clientY);
                       } else {
                         const startY = parseFloat(target.getAttribute('data-start-y') || '');
                         const startX = parseFloat(target.getAttribute('data-start-x') || '');
                         if (!isNaN(startY) && !isNaN(startX)) {
                           const diffY = Math.abs(e.clientY - startY);
                           const diffX = Math.abs(e.clientX - startX);
                           if ((diffY > 6 || diffX > 6) && (window as any)._dragTimer) {
                             clearTimeout((window as any)._dragTimer);
                             (window as any)._dragTimer = null;
                           }
                         }
                       }
                     }}
                     onPointerUp={(e) => {
                       e.stopPropagation();
                       if ((window as any)._dragTimer) {
                         clearTimeout((window as any)._dragTimer);
                         (window as any)._dragTimer = null;
                       }
                       if (draggedTaskId === task.id) {
                         const target = e.currentTarget as HTMLElement;
                         try {
                           target.releasePointerCapture(e.pointerId);
                         } catch (err) {}
                         onTaskDragEnd();
                       }
                     }}
                     className="absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing rounded hover:bg-black/5 active:bg-black/10 transition-colors z-20"
                     style={{ touchAction: 'none' }}
                     title="Drag vertically to change time"
                   >
                     <GripVertical size={13} className="opacity-60" />
                   </button>

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

                      <div className={`font-bold truncate leading-tight flex-1 relative inline-block ${task.completed ? 'text-gray-400 font-normal' : ''}`}>
                        <span>{task.title}</span>
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: task.completed ? '100%' : 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                          style={{ transform: 'translateY(-50%)' }}
                        />
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
                        <span className={`font-bold truncate flex-1 relative inline-block ${task.completed ? 'text-gray-400 font-normal' : ''}`}>
                          <span>All-Day Task: {task.title}</span>
                          <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: task.completed ? '100%' : 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                            style={{ transform: 'translateY(-50%)' }}
                          />
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
  </motion.div>
  );
};

/* ============================================================================
   4. SCHEDULE VIEW COMPONENT
   ============================================================================ */
const getWeekRangeString = (date: Date) => {
  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = format(start, 'LLL');
  const endMonth = format(end, 'LLL');
  
  if (startMonth === endMonth) {
    return `${startMonth} ${format(start, 'd')} – ${format(end, 'd')}`;
  } else {
    return `${startMonth} ${format(start, 'd')} – ${endMonth} ${format(end, 'd')}`;
  }
};

const getIndianHoliday = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const monthDay = parts[1] + '-' + parts[2]; // "MM-DD"
  const year = parts[0];

  // Annual national/public holidays
  switch (monthDay) {
    case '01-26':
      return 'Republic Day 🇮🇳';
    case '04-14':
      return 'Ambedkar Jayanti 🇮🇳';
    case '05-01':
      return 'Labour Day 🇮🇳';
    case '08-15':
      return 'Independence Day 🇮🇳';
    case '10-02':
      return 'Gandhi Jayanti 🇮🇳';
    case '12-25':
      return 'Christmas 🌲';
  }

  // Year specific holidays (Holi, Good Friday, Diwali, Diwali Holiday)
  if (year === '2025') {
    if (monthDay === '03-14') return 'Holi 🎨';
    if (monthDay === '04-18') return 'Good Friday ⛪';
    if (monthDay === '10-20') return 'Diwali 🪔';
    if (monthDay === '11-04') return 'Diwali holiday 🪔';
  } else if (year === '2026') {
    if (monthDay === '03-17') return 'Holi 🎨';
    if (monthDay === '04-03') return 'Good Friday ⛪';
    if (monthDay === '10-20') return 'Diwali 🪔';
    if (monthDay === '11-04') return 'Diwali holiday 🪔';
  } else if (year === '2027') {
    if (monthDay === '03-22') return 'Holi 🎨';
    if (monthDay === '03-26') return 'Good Friday ⛪';
    if (monthDay === '11-04') return 'Diwali 🪔';
    if (monthDay === '11-08') return 'Diwali holiday 🪔';
  }

  return null;
};

const MonthHeaderRow: React.FC<{ date: Date }> = ({ date }) => {
  const monthName = format(date, 'MMMM yyyy');
  return (
    <div className="text-2xl font-medium text-[#202124] font-sans py-4 px-4 bg-white border-b border-gray-100 mt-4 select-none">
      {monthName}
    </div>
  );
};

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
  const setDirection = useTaskStore((state) => state.setDirection);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const x = useMotionValue(0);
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    x.set(delta);
  };

  const handleTouchEnd = () => {
    const delta = x.get();
    if (Math.abs(delta) > 40) {
      const dir = delta < 0 ? 'next' : 'prev';
      animate(x, delta < 0 ? -window.innerWidth : window.innerWidth, {
        type: 'spring', damping: 28, stiffness: 220, mass: 0.6,
        onComplete: () => {
          setDirection(dir);
          const nextDate = dir === 'next' ? addMonths(activeDate, 1) : subMonths(activeDate, 1);
          setCurrentDate(nextDate);
          x.set(dir === 'next' ? window.innerWidth : -window.innerWidth);
          animate(x, 0, { type: 'spring', damping: 28, stiffness: 220, mass: 0.6 });
        }
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } else {
      animate(x, 0, { type: 'spring', damping: 32, stiffness: 300 });
    }
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Auto-scroll to today
  useEffect(() => {
    const timer = setTimeout(() => {
      const todayElement = document.getElementById('schedule-today');
      if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  // Reset bottom bar visibility when unmounting
  useEffect(() => {
    return () => {
      useTaskStore.getState().setBottomBarVisible(true);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const setBottomBarVisible = useTaskStore.getState().setBottomBarVisible;
    if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

    if (currentScrollY > lastScrollY.current && currentScrollY > 15) {
      setBottomBarVisible(false);
    } else {
      setBottomBarVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Build full list of days from Jan 1st 2025 to Dec 31st 2027
  const scheduleItems = React.useMemo(() => {
    const items: any[] = [];
    const curr = new Date(2025, 0, 1);
    const end = new Date(2027, 11, 31);

    let lastMonthKey = '';
    let lastWeekKey = '';

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    while (curr <= end) {
      const dateStr = format(curr, 'yyyy-MM-dd');
      const dayTasks = tasks.filter((t) => t.date === dateStr);
      const holiday = getIndianHoliday(dateStr);
      const isTodayDay = dateStr === todayStr;

      // 1. Month header separator
      const monthKey = format(curr, 'yyyy-MM');
      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        items.push({
          type: 'month-banner',
          key: `month-${monthKey}`,
          date: new Date(curr),
        });
        lastWeekKey = ''; // reset week separator on month boundaries
      }

      // 2. Week separator
      const weekKey = getWeekRangeString(curr);
      if (weekKey !== lastWeekKey) {
        lastWeekKey = weekKey;
        items.push({
          type: 'week-separator',
          key: `week-${weekKey}-${dateStr}`,
          label: weekKey,
        });
      }

      // 3. Day Row item
      items.push({
        type: 'day-row',
        key: `day-${dateStr}`,
        dateStr,
        dateObj: new Date(curr),
        isToday: isTodayDay,
        holiday,
        tasks: dayTasks,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return items;
  }, [tasks]);

  return (
    <motion.div
      style={{ x, touchAction: 'pan-y', willChange: 'transform', transform: 'translateZ(0)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full overflow-hidden bg-white"
    >
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-y-auto bg-white select-none"
      >
        <div className="max-w-md mx-auto pb-24">
        {scheduleItems.map((item) => {
          if (item.type === 'month-banner') {
            return <MonthHeaderRow key={item.key} date={item.date} />;
          }

          if (item.type === 'week-separator') {
            return (
              <div 
                key={item.key} 
                className="bg-[#F1F3F4] text-[#5F6368] text-xs h-7 flex items-center px-4 my-1 select-none font-normal border-y border-gray-200/40"
              >
                {item.label}
              </div>
            );
          }

          // Day row
          const day = item;
          return (
            <div 
              key={day.key} 
              id={day.isToday ? 'schedule-today' : undefined} 
              className="flex items-start px-4 py-3 border-b border-gray-100 bg-white"
            >
              {/* Left column */}
              <div className="w-12 flex-shrink-0 flex flex-col items-center select-none pt-0.5">
                <span className={`text-xs font-sans font-medium uppercase tracking-wider ${day.isToday ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`}>
                  {format(day.dateObj, 'EEE')}
                </span>
                {day.isToday ? (
                  <span className="w-8 h-8 rounded-full bg-[#1A73E8] text-white flex items-center justify-center text-sm font-semibold mt-1">
                    {format(day.dateObj, 'd')}
                  </span>
                ) : (
                  <span className="text-lg font-medium text-[#202124] mt-1">
                    {format(day.dateObj, 'd')}
                  </span>
                )}
              </div>

              {/* Right column */}
              <div className="flex-1 min-w-0 ml-4 space-y-2">
                {/* Render Holiday block if any */}
                {day.holiday && (
                  <div className="relative w-full rounded-[6px] bg-[#0F9D58] text-white px-3 py-2 select-none flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Holiday</span>
                      <span className="text-sm font-medium">{day.holiday}</span>
                    </div>
                  </div>
                )}

                {/* Render Tasks */}
                {day.tasks.map((task: Task) => {
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskForDetails(task)}
                      className={`relative w-full rounded-[8px] cursor-pointer px-3 py-2.5 select-none transition-all duration-150 flex items-center justify-between
                        ${task.completed 
                          ? 'bg-[#E8EAFD] text-[#5F6368]' 
                          : 'bg-[#1A73E8] text-white'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium truncate ${task.completed ? 'text-[#5F6368] line-through' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.time && (
                          <div className={`text-xs flex items-center space-x-1 mt-0.5 ${task.completed ? 'text-[#5F6368]/80' : 'text-white/85'}`}>
                            <Clock size={11} className="mr-0.5 opacity-80" />
                            <span>{task.time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* If empty (no tasks, no holidays) show transparent placeholder */}
                {day.tasks.length === 0 && !day.holiday && (
                  <div className="text-sm text-gray-400 py-2 select-none font-normal">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </motion.div>
  );
};

/* ============================================================================
   GOOGLE CALENDAR MOBILE STYLE KEYWORD ILLUSTRATIONS
   ============================================================================ */
export const getGcalIllustration = (title: string) => {
  const lower = title.toLowerCase();
  
  // 1. Food / Dining / Cafe
  if (/\b(food|eat|lunch|dinner|restaurant|meal|pizza|burger|sushi|cook|cooking|baking|breakfast|brunch|cafe|coffee|tea|starbucks|donut|pastry|bakery|drink)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#0F9D58]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#0F9D58" />
          <circle cx="120" cy="40" r="22" fill="#34A853" opacity="0.3" />
          <circle cx="120" cy="40" r="16" fill="#ffffff" opacity="0.15" />
          <path d="M115 30v20M112 30h6M112 34h6" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M125 30v20M125 30c1 1 2 4 2 6" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
          {/* Steaming Coffee Cup */}
          <g transform="translate(25, 25)" opacity="0.3">
            <path d="M5 10h18v14c0 4-3 7-7 7H12c-4 0-7-3-7-7V10z" fill="#ffffff" />
            <path d="M23 14h3c1.5 0 2.5 1 2.5 2.5s-1 2.5-3 2.5h-3" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M9 4c0.5-1.5-.5-2.5 0-3.5M14 4c0.5-1.5-.5-2.5 0-3.5M19 4c0.5-1.5-.5-2.5 0-3.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
          <circle cx="75" cy="20" r="2" fill="#ffffff" opacity="0.2" />
        </svg>
      )
    };
  }

  // 2. Fitness / Health / Sports
  if (/\b(run|running|jog|jogging|gym|workout|fitness|exercise|sport|yoga|cardio|training|marathon|swimming|cycle|cycling|bike|tennis|soccer|football|basketball|squat|pushup|pullup)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#1A73E8]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#1A73E8" />
          {/* Running track curve */}
          <path d="M-10 60c30-15 80-15 180 5" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.2" />
          <path d="M-10 68c30-15 80-15 180 5" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.15" />
          {/* Sneaker Shoe */}
          <g transform="translate(15, 20) scale(0.65)" opacity="0.25">
            <path d="M6 22h30l6-8h8v8l10 5h4v5H4v-10z" fill="#ffffff" />
            <path d="M18 22l-4-8M26 22l-4-8" stroke="#1A73E8" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          {/* Dumbbell */}
          <g transform="translate(110, 25) scale(0.7)" opacity="0.3">
            <rect x="8" y="12" width="22" height="4" rx="1" fill="#ffffff" />
            <rect x="4" y="6" width="4" height="16" rx="1.5" fill="#ffffff" />
            <rect x="30" y="6" width="4" height="16" rx="1.5" fill="#ffffff" />
          </g>
        </svg>
      )
    };
  }

  // 3. Travel / Flight / Trip / Hotel
  if (/\b(flight|plane|travel|airport|trip|vacation|holiday|hotel|airplane|fly|flying|passport|tourist|tour|luggage|suitcase)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#0097A7]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#0097A7" />
          <circle cx="130" cy="40" r="30" fill="#00ACC1" opacity="0.4" />
          {/* Clouds */}
          <path d="M10 55a8 8 0 0115-3 6 6 0 0111 2 8 8 0 01-26 1z" fill="#ffffff" opacity="0.3" />
          <path d="M100 25a6 6 0 0111-2 5 5 0 019 1 6 6 0 01-20 1z" fill="#ffffff" opacity="0.2" />
          {/* Airplane */}
          <g transform="translate(45, 18) rotate(-4) scale(0.9)" opacity="0.4">
            <path d="M12 22c8-2 38-10 46-10 4 0 7 2 4 5L46 26h18l4-4h4v7h-4l-4-4H34L16 35l-1-1 4-11H12v-4z" fill="#ffffff" />
            <path d="M40 16l-10-12h-6l12 12H40z" fill="#ffffff" opacity="0.7" />
          </g>
        </svg>
      )
    };
  }

  // 4. Birthday / Party / Celebration
  if (/\b(birthday|party|celebrate|celebration|anniversary|cake|balloons|wedding|bday|balloon|gift|present)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#E67C73]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#E67C73" />
          {/* Balloons */}
          <circle cx="30" cy="25" r="11" fill="#FBBC05" opacity="0.4" />
          <path d="M30 36c0 4-1 8-2 11" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.4" />
          <circle cx="45" cy="20" r="13" fill="#9C27B0" opacity="0.3" />
          <path d="M45 33c0 4 1 8 1 11" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.4" />
          <circle cx="20" cy="30" r="9" fill="#1A73E8" opacity="0.3" />
          <path d="M20 39c0 4-1 6-2 9" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.3" />
          {/* Birthday Cake */}
          <g transform="translate(105, 20)" opacity="0.35">
            <rect x="8" y="24" width="36" height="18" rx="1.5" fill="#ffffff" />
            <rect x="12" y="16" width="28" height="8" rx="1" fill="#FBBC05" />
            {/* Candles */}
            <rect x="20" y="8" width="2" height="8" fill="#ffffff" />
            <path d="M21 4c.4-1.2-.4-2.5 0-3.3" stroke="#EA4335" strokeWidth="1.5" fill="none" />
            <rect x="30" y="8" width="2" height="8" fill="#ffffff" />
            <path d="M31 4c.4-1.2-.4-2.5 0-3.3" stroke="#EA4335" strokeWidth="1.5" fill="none" />
          </g>
          {/* Confetti */}
          <circle cx="70" cy="15" r="1.5" fill="#ffffff" opacity="0.5" />
          <circle cx="150" cy="35" r="1" fill="#ffffff" opacity="0.5" />
          <polygon points="80,40 82,45 87,45 83,48 85,53 80,50 75,53 77,48 73,45 78,45" fill="#FBBC05" opacity="0.4" />
        </svg>
      )
    };
  }

  // 5. Work / Tech / Code / Venture / Business
  if (/\b(code|coding|programming|software|develop|developer|computer|website|github|interview|meeting|work|office|standup|project|presentation|slide|sheets|doc|laptop|terminal|programmer|venture|venture day|business)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#78909C]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#78909C" />
          {/* Soft technical grids */}
          <line x1="0" y1="20" x2="160" y2="20" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
          <line x1="0" y1="40" x2="160" y2="40" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
          <line x1="0" y1="60" x2="160" y2="60" stroke="#ffffff" strokeWidth="0.5" opacity="0.1" />
          {/* Subway / Train tracks */}
          <path d="M-10 65h180" stroke="#CFD8DC" strokeWidth="4" opacity="0.4" />
          <path d="M-10 69h180" stroke="#37474F" strokeWidth="2" opacity="0.3" />
          {/* Tech building silhouettes (Delhi Venture theme!) */}
          <rect x="110" y="20" width="18" height="45" fill="#B0BEC5" opacity="0.3" />
          <rect x="132" y="10" width="22" height="55" fill="#90A4AE" opacity="0.4" />
          <rect x="95" y="35" width="12" height="30" fill="#CFD8DC" opacity="0.2" />
          {/* Modern high-speed train */}
          <path d="M10 45h60c5 0 8 3 8 8v10H10V45z" fill="#ffffff" opacity="0.3" />
          {/* Train windows */}
          <rect x="16" y="49" width="8" height="6" rx="1" fill="#78909C" opacity="0.5" />
          <rect x="28" y="49" width="8" height="6" rx="1" fill="#78909C" opacity="0.5" />
          <rect x="40" y="49" width="8" height="6" rx="1" fill="#78909C" opacity="0.5" />
          <path d="M52 49h10c3 0 5 2 5 5v1H52v-6z" fill="#78909C" opacity="0.5" />
          {/* Office/briefcase element */}
          <g transform="translate(85, 45) scale(0.6)" opacity="0.3">
            <rect x="0" y="10" width="16" height="12" rx="1" fill="#ffffff" />
            <path d="M4 10V6c0-1 1-2 2-2h4c1 0 2 1 2 2v4" stroke="#ffffff" strokeWidth="1.5" fill="none" />
          </g>
        </svg>
      )
    };
  }

  // 6. Music / Concert
  if (/\b(music|concert|song|guitar|piano|sing|singing|band|audio|podcast|sound|headphones|show|classical|instrument)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#6A1B9A]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#6A1B9A" />
          <circle cx="35" cy="40" r="26" fill="#9C27B0" opacity="0.3" />
          {/* Headphones */}
          <g transform="translate(15, 25) scale(0.7)" opacity="0.3">
            <path d="M6 22a12 12 0 0124 0v3H6v-3z" stroke="#ffffff" strokeWidth="3" fill="none" />
            <rect x="2" y="19" width="6" height="10" rx="2" fill="#ffffff" />
            <rect x="28" y="19" width="6" height="10" rx="2" fill="#ffffff" />
          </g>
          {/* Music Notes */}
          <g transform="translate(100, 20) scale(0.8)" opacity="0.35">
            <circle cx="12" cy="26" r="4" fill="#ffffff" />
            <circle cx="28" cy="22" r="4" fill="#ffffff" />
            <path d="M16 26V8l16-4v20" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 13l16-4" stroke="#ffffff" strokeWidth="2" />
          </g>
        </svg>
      )
    };
  }

  // 7. Study / Learning / Books
  if (/\b(study|exam|book|school|class|read|reading|test|homework|learn|learning|course|lecture|college|university|library|history|math|science|physics)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#B06000]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#B06000" />
          <circle cx="130" cy="40" r="28" fill="#F0B429" opacity="0.3" />
          {/* Open Book */}
          <g transform="translate(15, 25) scale(0.85)" opacity="0.35">
            <path d="M4 8c8-3 16-3 22 1V32C20 28 12 28 4 30V8z" fill="#ffffff" />
            <path d="M48 8c-8-3-16-3-22 1V32C32 28 40 28 48 30V8z" fill="#ffffff" />
            <path d="M26 9v23" stroke="#B06000" strokeWidth="2" />
          </g>
        </svg>
      )
    };
  }

  // 8. Movies / Cinema
  if (/\b(movie|cinema|theater|film|show|netflix|disney|popcorn|hulu|tv|series|episode|drama)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#283593]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#283593" />
          <circle cx="40" cy="40" r="26" fill="#3F51B5" opacity="0.3" />
          {/* Film Strip */}
          <g transform="translate(90, 24) scale(0.9)" opacity="0.3">
            <rect x="0" y="0" width="40" height="25" rx="2" fill="#ffffff" />
            <rect x="3" y="2" width="5" height="4" fill="#283593" />
            <rect x="12" y="2" width="5" height="4" fill="#283593" />
            <rect x="21" y="2" width="5" height="4" fill="#283593" />
            <rect x="30" y="2" width="5" height="4" fill="#283593" />
            <rect x="3" y="19" width="5" height="4" fill="#283593" />
            <rect x="12" y="19" width="5" height="4" fill="#283593" />
            <rect x="21" y="19" width="5" height="4" fill="#283593" />
            <rect x="30" y="19" width="5" height="4" fill="#283593" />
          </g>
        </svg>
      )
    };
  }

  // 9. Health / Medical / Dentist
  if (/\b(dentist|dental|teeth|tooth|doctor|hospital|clinic|medical|health|checkup|surgeon|physio|appointment|vaccine|shot|medicine)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#006064]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#006064" />
          <circle cx="120" cy="40" r="28" fill="#0097A7" opacity="0.3" />
          <circle cx="40" cy="45" r="24" fill="#00838F" opacity="0.2" />
          {/* Pulse Circle */}
          <g transform="translate(20, 22)" opacity="0.35">
            <circle cx="14" cy="14" r="13" fill="#ffffff" />
            <path d="M14 7v14M7 14h14" stroke="#006064" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      )
    };
  }

  // 10. Festival / Holiday / Eid / Bakrid / Diwali
  if (/\b(eid|bakrid|diwali|festival|holiday|holidays|festival of lights|republic|independence)\b/.test(lower)) {
    return {
      bgColor: 'bg-[#00897B]',
      svg: (
        <svg viewBox="0 0 160 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="80" fill="#00897B" />
          {/* Moon & Stars */}
          <path d="M130 18a14 14 0 00-11 11 12 12 0 1111-11z" fill="#FFE082" opacity="0.4" />
          <circle cx="100" cy="15" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="85" cy="30" r="1.5" fill="#ffffff" opacity="0.5" />
          {/* Hanging traditional lanterns */}
          <line x1="30" y1="0" x2="30" y2="30" stroke="#FFE082" strokeWidth="1" opacity="0.4" />
          <line x1="55" y1="0" x2="55" y2="42" stroke="#FFE082" strokeWidth="1" opacity="0.4" />
          <g transform="translate(24, 30)" opacity="0.5">
            <path d="M6 0 L10 5 L10 12 L6 17 L2 12 L2 5 Z" fill="#FFE082" />
            <circle cx="6" cy="21" r="1.5" fill="#FFE082" />
          </g>
          <g transform="translate(49, 42)" opacity="0.5">
            <path d="M6 0 L10 5 L10 12 L6 17 L2 12 L2 5 Z" fill="#FFE082" />
            <circle cx="6" cy="21" r="1.5" fill="#FFE082" />
          </g>
          {/* Soft lantern glow */}
          <circle cx="30" cy="38" r="8" fill="#FFE082" opacity="0.1" />
          <circle cx="55" cy="50" r="8" fill="#FFE082" opacity="0.1" />
        </svg>
      )
    };
  }

  return null;
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

  const illustration = getGcalIllustration(task.title);

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
      className={`relative w-full rounded-2xl cursor-pointer p-4 select-none shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden flex flex-col justify-between group
        ${task.completed 
          ? 'bg-gray-200 border border-gray-300 text-gray-500 line-through' 
          : illustration 
            ? 'h-28 text-white' 
            : 'text-white'
        }
      `}
      style={!task.completed && !illustration ? { backgroundColor: categoryInfo.color.solid } : undefined}
    >
      {/* Background illustration for illustrated cards */}
      {illustration && !task.completed && (
        <>
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            {illustration.svg}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent z-1 pointer-events-none" />
        </>
      )}

      {/* Card Content Row */}
      <div className="relative z-10 flex items-start justify-between h-full w-full">
        {/* Left Side: Title, Time, Subtasks, Location */}
        <div className="flex-1 min-w-0 flex flex-col justify-end h-full">
          {/* If illustrated card, push content to the bottom to match GCAL exactly! */}
          {illustration && !task.completed && <div className="flex-grow" />}
          
          <h4 className={`text-sm md:text-base font-semibold leading-snug truncate
            ${task.completed ? 'text-gray-400 line-through' : 'text-white'}
          `}>
            {task.title}
          </h4>

          {/* Time & Metadata */}
          {task.time && (
            <div className={`text-xs mt-0.5 font-medium flex items-center space-x-1
              ${task.completed ? 'text-gray-400' : 'text-white/85'}
            `}>
              <Clock size={11} className="mr-0.5 opacity-80" />
              <span>{task.time}</span>
              {/* If it's Venture Day Delhi, add location subtext like the screenshot! */}
              {task.title.toLowerCase().includes('venture') && (
                <span className="opacity-80 truncate hidden sm:inline">
                  • Third Place | Business & Co-Working Space
                </span>
              )}
            </div>
          )}

          {/* Subtasks Count if any */}
          {totalSubtasks > 0 && (
            <div className={`text-[10px] mt-1 font-bold inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md w-fit
              ${task.completed 
                ? 'bg-gray-300 text-gray-600' 
                : 'bg-white/20 text-white border border-white/10'
              }
            `}>
              <span>Subtasks: {completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}
        </div>

        {/* Right Side: Checkbox to Toggle Completion */}
        <button
          onClick={handleToggleCompleted}
          className="p-1 -mr-1 -mt-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 z-20"
          title="Toggle completion"
        >
          {task.completed ? (
            <CheckSquare size={20} className="text-gray-400 fill-gray-300" />
          ) : (
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${illustration 
                ? 'border-white/60 hover:border-white text-white' 
                : 'border-white/80 hover:border-white text-white'
              }
            `}>
              {/* Simple aesthetic indicator */}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
