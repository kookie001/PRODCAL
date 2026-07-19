import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { timeToMinutes, minutesToTime, layoutTasks } from '../utils/timelineHelpers';
import { useLongPress } from '../hooks/useLongPress';
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
  Pencil,
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
import { TaskSheet } from './TaskSheet';
import { DndContext, closestCenter, TouchSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';





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

  const activeDate = useMemo(() => new Date(currentDateStr), [currentDateStr]);

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

  const toggleTaskCollapse = useCallback((taskId: string) => {
    setCollapsedTasks((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      localStorage.setItem('gcal-timeline-collapsed-tasks', JSON.stringify(next));
      return next;
    });
  }, []);

  // Drag states for timeline task pointer dragging
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragStartTop, setDragStartTop] = useState<number>(0);
  const [pointerStartY, setPointerStartY] = useState<number>(0);
  const [dragCurrentOffset, setDragCurrentOffset] = useState<number>(0);
  const [tempTimeStr, setTempTimeStr] = useState<string | null>(null);

  const updateTask = useTaskStore((state) => state.updateTask);

  const handleTaskDragStart = useCallback((taskId: string, initialTop: number, clientY: number) => {
    setDraggedTaskId(taskId);
    setDragStartTop(initialTop);
    setPointerStartY(clientY);
    setDragCurrentOffset(0);

    const task = tasks.find(t => t.id === taskId);
    if (task && task.time) {
      setTempTimeStr(task.time);
    }
  }, [tasks]);

  const handleTaskDragMove = useCallback((clientY: number) => {
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
  }, [draggedTaskId, pointerStartY, dragStartTop]);

  const handleTaskDragEnd = useCallback(() => {
    if (!draggedTaskId) return;
    if (tempTimeStr) {
      updateTask(draggedTaskId, { time: tempTimeStr });
    }
    setDraggedTaskId(null);
    setDragCurrentOffset(0);
    setTempTimeStr(null);
  }, [draggedTaskId, tempTimeStr, updateTask]);

  // Filter tasks by category and exclude completed tasks from timeline (do NOT filter by search query anymore!)
  const filteredTasks = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return tasks.filter((task) => {
      if (task.completed) return false;
      if (selectedCategory === 'Pending') {
        return task.date < todayStr || task.isPending === true;
      }
      const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
      return matchesCategory;
    });
  }, [tasks, selectedCategory]);

  const openPopover = useCallback((date: Date, hour: number) => {
    setPopoverDate(date);
    setPopoverHour(hour);
    setIsPopoverOpen(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handlePopoverSave = useCallback((title: string, category: CategoryType) => {
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
  }, [popoverHour, popoverDate, addTask]);

  const handlePopoverMoreOptions = useCallback((title: string, category: CategoryType) => {
    const formattedHour = popoverHour.toString().padStart(2, '0') + ':00';
    
    // Set prefilled values in the form
    setCurrentDate(popoverDate);
    setPrefilledTime(formattedHour);
    
    useTaskStore.getState().setEditingTask(null);

    setFABOpen(true);
    setIsPopoverOpen(false);
  }, [popoverHour, popoverDate, setCurrentDate, setPrefilledTime, setFABOpen]);

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

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const NON_TIMED_TASK_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  left: 'auto',
  top: 'auto',
};

const MonthView = React.memo<ViewProps>(({
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

  const days = useMemo(() => {
    const monthStart = startOfMonth(activeDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [activeDate]);

  const handleCellClick = useCallback((day: Date) => {
    setCurrentDate(day);
    openPopover(day, 9);
  }, [setCurrentDate, openPopover]);

  const selectedDayTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.date + 'T00:00:00');
      return isSameDay(taskDate, activeDate);
    });
  }, [tasks, activeDate]);

  // Pre-sort and group tasks by formatted date string to avoid doing it inside the loops
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const dateStr = task.date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(task);
    });

    for (const [_, dayTasks] of map.entries()) {
      dayTasks.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.title.localeCompare(b.title);
      });
    }

    return map;
  }, [tasks]);

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none">
            {/* Month Grid Panel */}
            <div className="flex-1 flex flex-col min-h-0">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 text-center text-[10px] font-bold text-gray-400 py-1 flex-shrink-0 bg-gray-50/20">
          {WEEKDAYS.map((day) => (
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
            
            const dateStr = format(day, 'yyyy-MM-dd');
            const sortedDayTasks = tasksByDate.get(dateStr) || [];

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
  </div>
  );
});

MonthView.displayName = "MonthView";

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

const WeekView = React.memo<WeekViewProps>(({
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
  const days = useMemo(() => {
    return isThreeDay
      ? [activeDate, addDays(activeDate, 1), addDays(activeDate, 2)]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(activeDate), i));
  }, [activeDate, isThreeDay]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const dateStr = task.date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(task);
    });
    return map;
  }, [tasks]);

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

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScrollToTask = (e: any) => {
      const timeStr = e.detail?.time;
      if (timeStr && scrollContainerRef.current) {
        const [h, m] = timeStr.split(':').map(Number);
        const hourDecimal = h + (m || 0) / 60;
        scrollContainerRef.current.scrollTop = Math.max(0, hourDecimal * 64 - 120);
      }
    };
    window.addEventListener('scroll-to-task', handleScrollToTask);
    return () => window.removeEventListener('scroll-to-task', handleScrollToTask);
  }, []);

  useEffect(() => {
    if (!draggedTaskId) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      onTaskDragMove(touch.clientY);
    };

    const handleTouchEnd = () => {
      onTaskDragEnd();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedTaskId, onTaskDragMove, onTaskDragEnd]);

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

  const longPress = useLongPress((timeStr) => {
    const [dateStr, hourStr] = timeStr.split('|');
    const d = new Date(dateStr + 'T00:00:00');
    const h = parseInt(hourStr, 10);
    openPopover(d, h);
  });

  return (
    <div className="h-full w-full overflow-hidden bg-white">
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
            
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(dateStr) || [];
            const nonTimedDayTasks = dayTasks.filter(t => !t.time);

            return (
              <div key={day.toString()} className="relative h-full flex flex-col">
                
                {/* 24 vertical slot grids */}
                {hours.map((hour) => {
                  const slotTime = `${format(day, 'yyyy-MM-dd')}|${hour}`;
                  return (
                    <div
                      key={hour}
                      onTouchStart={longPress.start(slotTime)}
                      onTouchEnd={longPress.cancel}
                      onTouchMove={longPress.move}
                      className="h-16 border-b border-gray-100 hover:bg-gray-50/40 cursor-pointer transition-colors"
                    />
                  );
                })}

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
                  
                  const isExpanded = !!expandedTasks[task.id];
                  const isCollapsed = !isExpanded;
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

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
                        height: isExpanded ? 'auto' : '48px',
                        minHeight: '48px',
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
                          setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                        }}
                        className={`w-full p-2 rounded-xl border text-xs shadow-xs transition-colors duration-150 flex flex-col select-none pl-6.5 z-10 relative group
                          ${isDraggingThis 
                            ? 'scale-[1.02] shadow-sm opacity-95 border-blue-500 ring-2 ring-blue-500/30' 
                            : isExpanded 
                              ? 'ring-1.5 ring-blue-400/50 border-blue-400 shadow-xs' 
                              : 'hover:scale-[1.002]'
                          }
                          ${task.completed
                            ? 'bg-[#E8EAFD] text-[#5F6368] border-[#DADCE0]'
                            : 'bg-[#1A73E8] text-white border-[#1A73E8]'
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

                        {/* Header row containing checkbox, title, and chevron */}
                        <div className="flex items-center justify-between min-w-0 relative z-10 w-full h-8">
                          <div className="flex items-center min-w-0 flex-1">
                            {/* Custom checkbox */}
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTask(task.id, { completed: !task.completed });
                              }}
                              className="p-0.5 rounded-full text-current hover:opacity-80 transition-opacity flex-shrink-0 mr-1.5 cursor-pointer"
                            >
                              <span 
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                  ${task.completed 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-transparent border-current'
                                  }
                                `}
                              >
                                {task.completed && <Check size={10} className="stroke-[3px] text-white" />}
                              </span>
                            </button>
                            
                            <div className={`font-semibold truncate leading-tight flex-1 relative ${task.completed ? 'opacity-60 line-through' : ''}`}>
                              <span>{task.title}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 pl-1 flex-shrink-0">
                            <span className="text-[10px] opacity-75 font-medium whitespace-nowrap">
                              {displayTime}
                            </span>
                            <ChevronRight 
                              size={14} 
                              className={`transition-transform duration-200 transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`} 
                            />
                          </div>
                        </div>

                        {/* Expanded details container */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex flex-col space-y-2 relative z-10 w-full">
                            {/* Category Pill */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/15 text-current border border-white/10">
                                {cat.name}
                              </span>
                              {/* Date & Time info */}
                              <div className="flex items-center space-x-1 text-[10px] opacity-80">
                                <CalendarDays size={11} />
                                <span>{task.date}</span>
                              </div>
                            </div>

                            {/* Subtasks inside expanded task as a bulleted list */}
                            {hasSubtasks && (
                              <div className="space-y-1.5 border-t border-white/5 pt-2">
                                {task.subtasks.map((sub, idx) => {
                                  const isDragging = draggedSubTaskId === task.id && draggedSubIndex === idx;
                                  return (
                                    <div 
                                      key={sub.id} 
                                      className={`flex items-center space-x-2 py-0.5 transition-shadow select-none relative
                                        ${isDragging ? 'z-50 opacity-70 scale-[1.02]' : ''}
                                      `}
                                      style={isDragging ? { transform: `translateY(${subDraggedOffset}px)`, position: 'relative' } : undefined}
                                    >
                                      {/* Grab Handle */}
                                      <span
                                        onPointerDown={(e) => handleSubPointerDown(task.id, idx, e)}
                                        onPointerMove={(e) => handleSubPointerMove(task.id, idx, e)}
                                        onPointerUp={(e) => handleSubPointerUp(task.id, idx, e)}
                                        className="text-current/60 hover:text-current cursor-grab active:cursor-grabbing px-1 touch-none select-none flex items-center justify-center w-5 h-5 hover:bg-white/10 rounded font-bold"
                                      >
                                        ≡
                                      </span>

                                      <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubtask(task.id, sub.id);
                                        }}
                                        className="p-0.5 text-current hover:opacity-80 rounded flex-shrink-0 cursor-pointer"
                                      >
                                        <span 
                                          className={`w-3 h-3 rounded-full flex items-center justify-center border border-current flex-shrink-0 transition-all
                                            ${sub.completed ? 'bg-white border-white' : 'bg-transparent'}
                                          `}
                                        >
                                          {sub.completed && <Check size={7} className="stroke-[3px] text-blue-600" />}
                                        </span>
                                      </button>
                                      <span className={`text-[11px] flex-1 truncate ${sub.completed ? 'line-through opacity-50' : 'font-medium'}`}>
                                        {sub.title}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Actions: Edit & Delete */}
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                  setFABOpen(true);
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-current font-semibold text-[10px] select-none cursor-pointer transition-colors"
                              >
                                <Edit3 size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/80 hover:bg-rose-600 text-white font-semibold text-[10px] select-none cursor-pointer transition-colors"
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
                {/* Non-timed tasks section at the very top */}
                <div className="absolute top-1 left-1 right-1 flex flex-col space-y-1">
                  {nonTimedDayTasks.map((task) => {
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
                                  {task.subtasks.map((sub, idx) => {
                                    const isDragging = draggedSubTaskId === task.id && draggedSubIndex === idx;
                                    return (
                                      <div 
                                        key={sub.id} 
                                        className={`flex items-center space-x-1 py-0.5 transition-shadow select-none relative
                                          ${isDragging ? 'z-50 opacity-70 scale-[1.02]' : ''}
                                        `}
                                        style={isDragging ? { transform: `translateY(${subDraggedOffset}px)`, position: 'relative' } : undefined}
                                      >
                                        {/* Grab Handle */}
                                        <span
                                          onPointerDown={(e) => handleSubPointerDown(task.id, idx, e)}
                                          onPointerMove={(e) => handleSubPointerMove(task.id, idx, e)}
                                          onPointerUp={(e) => handleSubPointerUp(task.id, idx, e)}
                                          className="text-gray-400 hover:text-gray-800 cursor-grab active:cursor-grabbing px-0.5 touch-none select-none flex items-center justify-center w-3 h-3 hover:bg-gray-100 rounded text-[9px] font-bold"
                                        >
                                          ≡
                                        </span>

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
                                    );
                                  })}
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
  </div>
  );
});

WeekView.displayName = "WeekView";


const SortableSubtaskRow = React.memo(({
  sub, index, taskId, fgSub, onToggle
}: {
  sub: any, index: number, taskId: string, fgSub: string, onToggle: (i: number) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging
  } = useSortable({ id: sub.id || `subtask-${index}` })

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '5px',
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease',
        opacity: isSortDragging ? 0.4 : 1,
        background: isSortDragging ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderRadius: '4px',
      }}
    >

      {/* LEFT: drag handle — only this triggers drag */}
      <div
        {...attributes}
        {...listeners}
        data-subtask-drag-handle="true"
        onPointerDown={(e) => {
          e.stopPropagation();
          listeners?.onPointerDown?.(e);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          listeners?.onMouseDown?.(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          listeners?.onTouchStart?.(e);
        }}
        style={{
          width: '24px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          touchAction: 'none',
          flexShrink: 0,
        }}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
          <circle cx="3" cy="3" r="1.2" fill={fgSub}/>
          <circle cx="7" cy="3" r="1.2" fill={fgSub}/>
          <circle cx="3" cy="7" r="1.2" fill={fgSub}/>
          <circle cx="7" cy="7" r="1.2" fill={fgSub}/>
          <circle cx="3" cy="11" r="1.2" fill={fgSub}/>
          <circle cx="7" cy="11" r="1.2" fill={fgSub}/>
        </svg>
      </div>

      {/* MIDDLE: subtask text — takes all remaining space */}
      <span
        style={{
          flex: 1,
          fontSize: '11px',
          color: sub.completed ? `${fgSub}66` : fgSub,
          textDecoration: sub.completed ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub.title || sub.text || ''}
      </span>

      {/* RIGHT: completion circle */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggle(index);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(index);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          minWidth: '40px',
          padding: 0,
          margin: '-14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          alignSelf: 'center',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: '1.2px solid #2563eb',
          background: sub.completed ? '#2563eb' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}>
          {sub.completed && (
            <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      </button>

    </div>
  )
})

SortableSubtaskRow.displayName = "SortableSubtaskRow";

const format12hTime = (timeStr?: string): string => {
  if (!timeStr) return 'All-Day';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return timeStr;
  const hour = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const min = m !== undefined ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour}${min} ${ampm}`;
};

interface DraggableTaskBlockProps {
  task: Task;
  pixelsPerMinute?: number;
  onReschedule?: (taskId: string, newTime: string) => void;
  style?: React.CSSProperties;
  onEditOpen: (task: Task) => void;
}

const DraggableTaskBlock = React.memo<DraggableTaskBlockProps>(({ task, style, onReschedule, onEditOpen }) => {
  const addDebug = (msg: string) => {};
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [isDraggingSubtask, setIsDraggingSubtask] = useState(false)
  const [isActivelyDragging, setIsActivelyDragging] = useState(false)
  const lastTap = useRef<number>(0)
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout>>()

  const blockRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  const moved = useRef(false)
  const dragging = useRef(false)
  const dragStartY = useRef(0)
  const currentTop = useRef(0)
  const lastTouchTime = useRef(0)

  const isCurrentlyDragging = isActivelyDragging && dragging.current

  useEffect(() => {
    setEditTitle(task.title)
  }, [task.title])



  useEffect(() => {
    return () => {
      if (tapTimeout.current) clearTimeout(tapTimeout.current)
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [])

  const updateTask = useTaskStore((state) => state.updateTask)
  const setTaskPending = useTaskStore((state) => state.setTaskPending)
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const toggleSubtaskComplete = useTaskStore((state) => state.toggleSubtaskComplete)
  const toggleTaskComplete = (id: string) => {
    updateTask(id, { completed: !task.completed })
  }

  const handleUnifiedTap = (isTitle: boolean) => {
    if (moved.current) return;
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    addDebug(`tap=${tapCount.current} title=${isTitle}`);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      addDebug(`DELETE ${task.title}`);
      if (navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
      deleteTask(task.id);
      return;
    }
    tapTimer.current = setTimeout(() => {
      if (tapCount.current === 1 && isTitle) {
        addDebug(`EDIT ${task.title}`);
        onEditOpen(task);
      }
      tapCount.current = 0;
    }, 350);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 4 }
    })
  )

  const handleSubtaskReorder = useCallback(({ active, over }: any) => {
    if (!over || active.id === over.id) return
    const subtasks = task.subtasks || []
    const oldIndex = subtasks.findIndex((s) => (s.id || `subtask-${subtasks.indexOf(s)}`) === active.id)
    const newIndex = subtasks.findIndex((s) => (s.id || `subtask-${subtasks.indexOf(s)}`) === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(subtasks, oldIndex, newIndex) as Subtask[]
      updateTask(task.id, { subtasks: reordered })
    }
  }, [task.subtasks, task.id, updateTask])

  const completed = task.completed
  const bg = completed ? '#F3F4F6' : '#EBF5FF'
  const fg = completed ? '#9CA3AF' : '#1E40AF'
  const fgSub = completed ? '#9CA3AF' : '#2563EB'
  const borderStyle = completed ? '1px solid #E5E7EB' : '1px solid #BFDBFE'

  const lastPointerPos = useRef({ x: 0, y: 0 })

  const getTabAtCoords = useCallback((x: number, y: number) => {
    const tabs = document.querySelectorAll('[data-category-tab]');
    for (const tab of Array.from(tabs)) {
      const rect = tab.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return tab.getAttribute('data-category-tab');
      }
    }
    return null;
  }, []);

  const updateTabHighlights = useCallback((activeTabId: string | null) => {
    const tabs = document.querySelectorAll('[data-category-tab]');
    const storeCategories = useTaskStore.getState().categories;
    tabs.forEach(tab => {
      const tabId = tab.getAttribute('data-category-tab');
      const isOver = tabId === activeTabId;
      if (isOver && activeTabId !== 'All') {
        let colorHex = '#1A73E8'; // Default Fallback Color
        if (tabId === 'Pending') {
          colorHex = '#F29900';
        } else {
          const cat = storeCategories.find(c => c.id === tabId);
          if (cat && cat.color && cat.color.solid) {
            colorHex = cat.color.solid;
          }
        }
        (tab as HTMLElement).style.boxShadow = `0 0 0 3px ${colorHex}44, 0 4px 10px rgba(0,0,0,0.1)`;
        (tab as HTMLElement).style.borderColor = colorHex;
        (tab as HTMLElement).style.backgroundColor = `${colorHex}1a`; // 10% opacity tint
        (tab as HTMLElement).style.transform = 'scale(1.05)';
        (tab as HTMLElement).style.transition = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';
      } else {
        (tab as HTMLElement).style.boxShadow = '';
        (tab as HTMLElement).style.borderColor = '';
        (tab as HTMLElement).style.backgroundColor = '';
        (tab as HTMLElement).style.transform = '';
      }
    });
  }, []);

  const clearTabHighlights = useCallback(() => {
    const tabs = document.querySelectorAll('[data-category-tab]');
    tabs.forEach(tab => {
      (tab as HTMLElement).style.boxShadow = '';
      (tab as HTMLElement).style.borderColor = '';
      (tab as HTMLElement).style.backgroundColor = '';
      (tab as HTMLElement).style.transform = '';
    });
  }, []);

  const resetDragState = useCallback(() => {
    dragging.current = false
    moved.current = false
    setIsActivelyDragging(false)
    setIsDraggingSubtask(false)
    clearTabHighlights()
    if (blockRef.current) {
      blockRef.current.style.transform = ''
    }
  }, [clearTabHighlights])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDraggingSubtask) {
      resetDragState()
      return
    }
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-subtask-drag-handle]') || target.closest('[data-subtask-panel]')) {
      resetDragState()
      return
    }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    moved.current = false
    dragging.current = true
    dragStartY.current = e.touches[0].clientY

    const onTouchEndNative = () => {
      lastTouchTime.current = Date.now()
      if (dragging.current && moved.current && blockRef.current) {
        const droppedCat = getTabAtCoords(lastPointerPos.current.x, lastPointerPos.current.y)
        if (droppedCat && droppedCat !== 'All') {
          if (droppedCat === 'Pending') {
            setTaskPending(task.id)
          } else {
            updateTask(task.id, { category: droppedCat as CategoryType })
          }
          if (navigator.vibrate) {
            navigator.vibrate(10)
          }
        }
      }
      clearTabHighlights()
      resetDragState()
      window.removeEventListener('touchend', onTouchEndNative)
      window.removeEventListener('touchcancel', onTouchCancelNative)
    }

    const onTouchCancelNative = () => {
      resetDragState()
      window.removeEventListener('touchend', onTouchEndNative)
      window.removeEventListener('touchcancel', onTouchCancelNative)
    }

    window.addEventListener('touchend', onTouchEndNative)
    window.addEventListener('touchcancel', onTouchCancelNative)
  }

  const handleTouchEnd = () => {
    if (dragging.current && moved.current && blockRef.current) {
      const droppedCat = getTabAtCoords(lastPointerPos.current.x, lastPointerPos.current.y)
      if (droppedCat && droppedCat !== 'All') {
        if (droppedCat === 'Pending') {
          setTaskPending(task.id)
        } else {
          updateTask(task.id, { category: droppedCat as CategoryType })
        }
        if (navigator.vibrate) {
          navigator.vibrate(10)
        }
      }
    }
    clearTabHighlights()
    resetDragState()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingSubtask) {
      resetDragState()
      return
    }
    if (e.button !== 0) {
      resetDragState()
      return
    }
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-subtask-drag-handle]') || target.closest('[data-subtask-panel]')) {
      resetDragState()
      return
    }
    touchStart.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    moved.current = false
    dragging.current = true
    dragStartY.current = e.clientY

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingSubtask) return
      if (!dragging.current) return
      const dy = moveEvent.clientY - touchStart.current.y
      const dx = moveEvent.clientX - touchStart.current.x
      if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
        if (!moved.current) {
          moved.current = true
          setIsActivelyDragging(true)
        }
      }
      if (moved.current) {
        if (blockRef.current) {
          blockRef.current.style.transform = `translate(${dx}px, ${dy}px)`
        }
        const clientX = moveEvent.clientX
        const clientY = moveEvent.clientY
        lastPointerPos.current = { x: clientX, y: clientY }
        const activeTabId = getTabAtCoords(clientX, clientY)
        updateTabHighlights(activeTabId)
      }
    };

    const onMouseUp = () => {
      if (dragging.current && moved.current && blockRef.current) {
        const droppedCat = getTabAtCoords(lastPointerPos.current.x, lastPointerPos.current.y)
        if (droppedCat && droppedCat !== 'All') {
          if (droppedCat === 'Pending') {
            setTaskPending(task.id)
          } else {
            updateTask(task.id, { category: droppedCat as CategoryType })
          }
          if (navigator.vibrate) {
            navigator.vibrate(10)
          }
        }
      }
      clearTabHighlights()
      resetDragState()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    const el = blockRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (isDraggingSubtask) return
      if (!dragging.current) return
      const dy = e.touches[0].clientY - touchStart.current.y
      const dx = e.touches[0].clientX - touchStart.current.x
      if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
        if (!moved.current) {
          moved.current = true
          setIsActivelyDragging(true)
        }
        e.preventDefault()
      }
      if (moved.current) {
        if (blockRef.current) {
          blockRef.current.style.transform = `translate(${dx}px, ${dy}px)`
        }
        const clientX = e.touches[0].clientX
        const clientY = e.touches[0].clientY
        lastPointerPos.current = { x: clientX, y: clientY }
        const activeTabId = getTabAtCoords(clientX, clientY)
        updateTabHighlights(activeTabId)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [isDraggingSubtask, getTabAtCoords, updateTabHighlights])

  return (
    <motion.div
      ref={blockRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={(e) => {
        lastTouchTime.current = Date.now()
        if (e.target === e.currentTarget) {
          handleUnifiedTap(false)
        }
        handleTouchEnd()
      }}
      onTouchCancel={resetDragState}
      onPointerCancel={resetDragState}
      onMouseUp={(e) => {
        if (Date.now() - lastTouchTime.current < 500) return
        if (e.target === e.currentTarget) {
          handleUnifiedTap(false)
        }
        resetDragState()
      }}
      onMouseDown={handleMouseDown}
      whileHover={{
        y: -1,
      }}
      transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: bg,
        borderRadius: '12px',
        border: borderStyle,
        minHeight: '48px',
        overflow: (expanded && !isCurrentlyDragging) ? 'visible' : 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        boxSizing: 'border-box',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        zIndex: (expanded && !isCurrentlyDragging) ? 200 : (dragging.current ? 250 : 1),
      }}
    >
      {/* MAIN ROW — always visible */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        height: '48px',
        width: '100%',
        boxSizing: 'border-box',
      }}>

        {/* WRAPPER FOR TIME/DATE + SEPARATOR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* TIME BLOCK */}
          <div style={{
            paddingLeft: '4px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            marginRight: '8px',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: completed ? '#9CA3AF' : '#1E40AF',
              whiteSpace: 'nowrap',
            }}>
              {format12hTime(task.time)}
            </span>
          </div>

          {/* THIN SEPARATOR */}
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: completed ? '#E5E7EB' : '#BFDBFE',
            marginRight: '8px',
            flexShrink: 0,
          }} />
        </div>

        {/* LEFT: expand toggle (chevron) — only if incomplete subtasks exist */}
        <div style={{
          width: '24px',
          marginRight: '6px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {task.subtasks && task.subtasks.filter(s => !s.completed).length > 0 && (
            <button
              className="chevron-button"
              onTouchStart={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setExpanded(prev => !prev)
              }}
              onMouseUp={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setExpanded(prev => !prev)
              }}
              style={{
                width: '24px',
                height: '24px',
                background: 'transparent',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg 
                width="10" 
                height="10" 
                viewBox="0 0 8 8" 
                fill="none"
                style={{
                  transition: 'transform 150ms ease',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                <path d="M2 1.5L5.5 4L2 6.5" stroke={fg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* CENTER: task title — takes all remaining space, priority */}
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              setIsEditing(false)
              if (editTitle.trim() && editTitle.trim() !== task.title) {
                updateTask(task.id, { title: editTitle.trim() })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur()
              } else if (e.key === 'Escape') {
                setEditTitle(task.title)
                setIsEditing(false)
              }
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              fontSize: '14px',
              fontWeight: 600,
              color: fg,
              background: 'rgba(255, 255, 255, 0.7)',
              border: `1px solid ${completed ? '#D1D5DB' : '#BFDBFE'}`,
              borderRadius: '6px',
              outline: 'none',
              padding: '2px 6px',
              margin: 0,
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <p
            onTouchEnd={(e) => {
              lastTouchTime.current = Date.now()
              e.stopPropagation()
              e.preventDefault()  // CRITICAL — prevents the synthetic onClick from also firing
              handleUnifiedTap(true)
            }}
            onMouseUp={(e) => {
              if (Date.now() - lastTouchTime.current < 500) return
              e.stopPropagation()
              handleUnifiedTap(true)
            }}
            style={{
              flex: 1,
              fontSize: '14px',
              fontWeight: 600,
              color: fg,
              textDecoration: completed ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
              padding: 0,
              cursor: 'pointer',
              lineHeight: '1.2',
            }}
          >
            {task.title}
          </p>
        )}

        {/* SMALL PENCIL (EDIT) ICON BUTTON */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          onTouchEnd={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const oldTitle = task.title
            const newSubId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
            const newSub: Subtask = {
              id: newSubId,
              title: oldTitle,
              completed: false,
            }
            const updatedSubtasks = [newSub, ...(task.subtasks || [])]
            const updatedTask: Task = {
              ...task,
              title: '',
              subtasks: updatedSubtasks,
            }
            onEditOpen(updatedTask)
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            e.preventDefault()
            const oldTitle = task.title
            const newSubId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
            const newSub: Subtask = {
              id: newSubId,
              title: oldTitle,
              completed: false,
            }
            const updatedSubtasks = [newSub, ...(task.subtasks || [])]
            const updatedTask: Task = {
              ...task,
              title: '',
              subtasks: updatedSubtasks,
            }
            onEditOpen(updatedTask)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            minWidth: '28px',
            padding: 0,
            margin: 0,
            marginLeft: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            opacity: 0.6,
          }}
          className="hover:opacity-100 transition-opacity"
        >
          <Pencil size={14} style={{ color: fg }} />
        </button>

        {/* RIGHT: task completion circle — small, right aligned */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          onTouchEnd={(e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleTaskComplete(task.id)
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleTaskComplete(task.id)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            minWidth: '28px',
            padding: 0,
            margin: 0,
            marginLeft: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{
            width: '18px',
            height: '18px',
            minWidth: '18px',
            borderRadius: '50%',
            border: `2px solid ${fg}`,
            background: completed ? fg : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 100ms ease',
          }}>
            {completed && (
              <Check size={10} className="text-white" style={{ strokeWidth: 3 }} />
            )}
          </span>
        </button>

      </div>

      {/* SUBTASKS — expand below */}
      {(expanded && !isCurrentlyDragging) && (
        <div 
          data-subtask-panel="true"
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 200,
            backgroundColor: completed ? '#F3F4F6' : '#EBF5FF',
            borderRadius: '0 0 12px 12px',
            padding: '4px 8px 8px 8px',
            borderTop: borderStyle,
            overflow: 'hidden',  // CRITICAL — clips subtask to stay inside card
          }}
        >
          {((task.subtasks || []).filter((sub: any) => !sub.completed)).length === 0 && (
            <span style={{ fontSize: '10px', color: fgSub }}>No subtasks</span>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsDraggingSubtask(true)}
            onDragEnd={(event) => {
              setIsDraggingSubtask(false)
              handleSubtaskReorder(event)
            }}
            onDragCancel={() => setIsDraggingSubtask(false)}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={(task.subtasks || [])
                .map((sub: any, i: number) => ({ id: sub.id || `subtask-${i}`, completed: sub.completed }))
                .filter(item => !item.completed)
                .map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {(task.subtasks || [])
                .map((sub: any, originalIndex: number) => ({ sub, originalIndex }))
                .filter(({ sub }) => !sub.completed)
                .map(({ sub, originalIndex }) => (
                  <SortableSubtaskRow
                    key={sub.id || `subtask-${originalIndex}`}
                    sub={sub}
                    index={originalIndex}
                    taskId={task.id}
                    fgSub={fgSub}
                    onToggle={(idx) => toggleSubtaskComplete(task.id, idx)}
                  />
                ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

    </motion.div>
  )
}, (prev, next) => {
  return (
    prev.task === next.task &&
    prev.pixelsPerMinute === next.pixelsPerMinute &&
    prev.onReschedule === next.onReschedule &&
    prev.onEditOpen === next.onEditOpen &&
    prev.style?.top === next.style?.top &&
    prev.style?.left === next.style?.left &&
    prev.style?.width === next.style?.width &&
    prev.style?.height === next.style?.height &&
    prev.style?.marginTop === next.style?.marginTop &&
    prev.style?.position === next.style?.position
  );
})

DraggableTaskBlock.displayName = "DraggableTaskBlock";

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


const DayView = React.memo<DayViewProps>(({
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


  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const isTodayDay = isToday(activeDate);
  const setTasksOverlayOpen = useTaskStore((state) => state.setTasksOverlayOpen);
  const isTasksOverlayOpen = useTaskStore((state) => state.isTasksOverlayOpen);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const pendingCount = useTaskStore(
    useCallback((state) => state.tasks.filter((task) => !task.completed && task.date && (task.date < todayStr || task.isPending === true)).length, [todayStr])
  );

  const reorderSubtasks = useTaskStore((state) => state.reorderSubtasks);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const handleReschedule = useCallback((taskId: string, newTime: string) => {
    updateTask(taskId, { time: newTime });
  }, [updateTask]);

  const deleteTask = useTaskStore((state) => state.deleteTask);
  const setEditingTask = useTaskStore((state) => state.setEditingTask);

  const [editingTaskState, setEditingTaskState] = useState<Task | null>(null);

  const openEditSheet = useCallback((task: Task) => {
    setEditingTaskState(task);
  }, []);

  const closeEditSheet = useCallback(() => {
    setEditingTaskState(null);
  }, []);

  const draggedSubIndex: number | null = null;
  const [draggedSubId, setDraggedSubId] = useState<string | null>(null);
  const [draggedSubTaskId, setDraggedSubTaskId] = useState<string | null>(null);
  const [subPointerStartY, setSubPointerStartY] = useState<number>(0);
  const [subDraggedOffset, setSubDraggedOffset] = useState<number>(0);
  const [subPointerStartX, setSubPointerStartX] = useState<number>(0);
  const [subDraggedOffsetX, setSubDraggedOffsetX] = useState<number>(0);
  const [subDraggedHour, setSubDraggedHour] = useState<number | null>(null);

  const handleSubPointerDown = (taskId: string, subtaskId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggedSubTaskId(taskId);
    setDraggedSubId(subtaskId);
    setSubPointerStartY(e.clientY);
    setSubPointerStartX(e.clientX);
    setSubDraggedOffset(0);
    setSubDraggedOffsetX(0);
    setSubDraggedHour(null);
  };

  const handleSubPointerMove = (taskId: string, subtaskId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId !== taskId || draggedSubId !== subtaskId) return;
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
      const index = subtasks.findIndex(s => s.id === subtaskId);
      if (index === -1) return;

      if (diffY > swapThreshold && index < subtasks.length - 1) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index + 1];
        subtasks[index + 1] = temp;

        setSubPointerStartY((prev) => prev + rowHeight);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY - rowHeight);
      } else if (diffY < -swapThreshold && index > 0) {
        const temp = subtasks[index];
        subtasks[index] = subtasks[index - 1];
        subtasks[index - 1] = temp;

        setSubPointerStartY((prev) => prev - rowHeight);
        reorderSubtasks(taskId, subtasks);
        setSubDraggedOffset(diffY + rowHeight);
      }
    }
  };

  const handleSubPointerUp = (taskId: string, subtaskId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (draggedSubTaskId === taskId && draggedSubId === subtaskId) {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);

      if (subDraggedHour !== null) {
        const parentTask = tasks.find(t => t.id === taskId);
        if (parentTask) {
          const index = parentTask.subtasks.findIndex(s => s.id === subtaskId);
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
    setDraggedSubId(null);
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

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScrollToTask = (e: any) => {
      const timeStr = e.detail?.time;
      if (timeStr && scrollContainerRef.current) {
        const [h, m] = timeStr.split(':').map(Number);
        const hourDecimal = h + (m || 0) / 60;
        scrollContainerRef.current.scrollTop = Math.max(0, hourDecimal * 64 - 120);
      }
    };
    window.addEventListener('scroll-to-task', handleScrollToTask);
    return () => window.removeEventListener('scroll-to-task', handleScrollToTask);
  }, []);

  useEffect(() => {
    if (!draggedTaskId) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      onTaskDragMove(touch.clientY);
    };

    const handleTouchEnd = () => {
      onTaskDragEnd();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggedTaskId, onTaskDragMove, onTaskDragEnd]);

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

  const slideContainerRef = useRef<HTMLDivElement>(null);
  const activeDateRef = useRef(activeDate);
  useEffect(() => {
    activeDateRef.current = activeDate;
  }, [activeDate]);

  useEffect(() => {
    const el = slideContainerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let isSwipeActive = false;
    let hasDeterminedDirection = false;
    let isIgnored = false;

    const isTaskElement = (element: HTMLElement | null): boolean => {
      let curr = element;
      while (curr && curr !== el && curr !== document.body) {
        if (
          curr.style.minHeight === '44px' || 
          curr.style.minHeight === '48px' || 
          curr.tagName === 'BUTTON' || 
          curr.getAttribute('data-subtask-panel') === 'true' ||
          curr.getAttribute('data-subtask-drag-handle') === 'true' ||
          curr.classList.contains('chevron-button')
        ) {
          return true;
        }
        curr = curr.parentElement;
      }
      return false;
    };

    const handleTouchStartNative = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isTaskElement(target)) {
        isIgnored = true;
        isSwipeActive = false;
        hasDeterminedDirection = true;
        return;
      }

      isIgnored = false;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isSwipeActive = false;
      hasDeterminedDirection = false;
      
      el.style.transition = 'none';
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (isIgnored) return;

      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      if (!hasDeterminedDirection) {
        if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
          if (Math.abs(diffX) > Math.abs(diffY)) {
            isSwipeActive = true;
          } else {
            isSwipeActive = false;
          }
          hasDeterminedDirection = true;
        }
      }

      if (isSwipeActive) {
        e.preventDefault();
        el.style.transform = `translateX(${diffX}px)`;
        el.style.opacity = `${Math.max(0.4, 1 - Math.abs(diffX) / (window.innerWidth * 1.2))}`;
      }
    };

    const handleTouchEndNative = (e: TouchEvent) => {
      if (isIgnored || !isSwipeActive) {
        isIgnored = false;
        isSwipeActive = false;
        hasDeterminedDirection = false;
        return;
      }

      const touch = e.changedTouches[0];
      const diffX = touch.clientX - startX;
      const threshold = 80;

      if (Math.abs(diffX) > threshold) {
        const direction = diffX < 0 ? 1 : -1;
        
        el.style.transition = 'transform 250ms cubic-bezier(0.1, 0.8, 0.2, 1), opacity 250ms ease';
        el.style.transform = `translateX(${-direction * window.innerWidth}px)`;
        el.style.opacity = '0';

        setTimeout(() => {
          const nextDate = direction === 1 ? addDays(activeDateRef.current, 1) : subDays(activeDateRef.current, 1);
          setCurrentDate(nextDate);

          el.style.transition = 'none';
          el.style.transform = `translateX(${direction * window.innerWidth}px)`;
          el.style.opacity = '0';

          el.getBoundingClientRect();

          el.style.transition = 'transform 250ms cubic-bezier(0.1, 0.8, 0.2, 1), opacity 250ms ease';
          el.style.transform = 'translateX(0px)';
          el.style.opacity = '1';
        }, 250);
      } else {
        el.style.transition = 'transform 200ms ease, opacity 200ms ease';
        el.style.transform = 'translateX(0px)';
        el.style.opacity = '1';
      }

      isSwipeActive = false;
      hasDeterminedDirection = false;
      isIgnored = false;
    };

    el.addEventListener('touchstart', handleTouchStartNative, { passive: false });
    el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    el.addEventListener('touchend', handleTouchEndNative);
    el.addEventListener('touchcancel', handleTouchEndNative);

    return () => {
      el.removeEventListener('touchstart', handleTouchStartNative);
      el.removeEventListener('touchmove', handleTouchMoveNative);
      el.removeEventListener('touchend', handleTouchEndNative);
      el.removeEventListener('touchcancel', handleTouchEndNative);
    };
  }, [setCurrentDate]);

  const longPress = useLongPress((timeStr) => {
    const [dateStr, hourStr] = timeStr.split('|');
    const d = new Date(dateStr + 'T00:00:00');
    const h = parseInt(hourStr, 10);
    openPopover(d, h);
  });

  const dayTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.isPending) return false;
      const taskDate = new Date(task.date + 'T00:00:00');
      return isSameDay(taskDate, activeDate);
    });
  }, [tasks, activeDate]);

  const sortedDayTasks = useMemo(() => {
    return [...dayTasks].sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return -1; // All-Day at the top
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });
  }, [dayTasks]);

  return (
    <div className="h-full w-full overflow-hidden bg-white">


      <div 
        ref={slideContainerRef}
        className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none"
      >
      {/* Pending Task Viewer (GCAL Style) */}
      {(() => {
        return (
          <div className="bg-white border-b border-gray-150 flex flex-col flex-shrink-0 select-none">
            <div 
              onClick={() => setTasksOverlayOpen(true)}
              className="flex items-center h-10 px-3 cursor-pointer hover:bg-gray-50/70 transition-colors"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', color: '#202124' }}>
                  PENDING TASKS
                </span>
                <span style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1A73E8',
                  backgroundColor: '#E8F0FE',
                  borderRadius: '12px',
                  padding: '2px 10px',
                  minWidth: '28px',
                  textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hourly timeline scale */}
      <div 
        id="day-timeline-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto text-gray-800"
      >
        <div className="flex flex-col space-y-2.5 py-4 px-3 select-none">
          {sortedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-2xs">
                <CheckSquare size={32} className="stroke-[1.5px]" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No tasks for today</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                Enjoy your day!
              </p>
            </div>
          ) : (
            sortedDayTasks.map((task) => (
              <DraggableTaskBlock
                key={task.id}
                task={task}
                onEditOpen={openEditSheet}
              />
            ))
          )}
        </div>
      </div>
    </div>
    {editingTaskState && (
        <TaskSheet
          isOpen={true}
          onClose={closeEditSheet}
          editTask={editingTaskState}
          mode="edit"
        />
      )}
    </div>
  );
});

DayView.displayName = "DayView";

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

const ScheduleView = React.memo<ScheduleViewProps>(({
  activeDate,
  tasks,
  setSelectedTaskForDetails,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const updateTask = useTaskStore((state) => state.updateTask);

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
    const tasksByDateMap = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const dStr = t.date;
      if (!tasksByDateMap.has(dStr)) {
        tasksByDateMap.set(dStr, []);
      }
      tasksByDateMap.get(dStr)!.push(t);
    });

    const items: any[] = [];
    const curr = new Date(2025, 0, 1);
    const end = new Date(2027, 11, 31);

    let lastMonthKey = '';
    let lastWeekKey = '';

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    while (curr <= end) {
      const dateStr = format(curr, 'yyyy-MM-dd');
      const dayTasks = tasksByDateMap.get(dateStr) || [];
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
    <div className="h-full w-full overflow-hidden bg-white">
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
                      className="flex items-center bg-white rounded-xl border border-[#F1F3F4] px-4 py-3 min-h-[64px] select-none transition-all duration-150 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    >
                      {/* Right: task content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-medium truncate ${task.completed ? 'line-through text-[#BDC1C6]' : 'text-[#202124]'}`}>
                          {task.title}
                        </p>
                        {task.time && (
                          <p className="text-xs text-[#5F6368] mt-0.5">{task.time}</p>
                        )}
                        {task.category && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] bg-[#E8F0FE] text-[#1A73E8]">
                            {task.category}
                          </span>
                        )}
                      </div>

                      {/* Right: checkbox only */}
                      <div className="ml-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => updateTask(task.id, { completed: !task.completed })}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer select-none
                            ${task.completed ? 'bg-[#1A73E8] border-[#1A73E8] text-white' : 'border-[#DADCE0] bg-white'}
                          `}
                        >
                          {task.completed && <Check size={14} className="text-white" />}
                        </button>
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
  </div>
  );
});

ScheduleView.displayName = "ScheduleView";

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

const ScheduleTaskCard = React.memo<ScheduleTaskCardProps>(({ task, onViewDetails }) => {
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
});

ScheduleTaskCard.displayName = 'ScheduleTaskCard';
