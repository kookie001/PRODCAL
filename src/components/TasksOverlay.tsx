import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, isToday, parseISO } from 'date-fns';
import { 
  ArrowLeft, 
  Search, 
  X, 
  CheckSquare, 
  Trash2, 
  ChevronDown, 
  Plus, 
  Edit3, 
  Check, 
  Maximize2, 
  Minimize2
} from 'lucide-react';
import { useTaskStore } from '../store';
import { CATEGORIES, Task } from '../types';

// Helper component for each Individual Task Item to encapsulate swipe-to-action & long-press states
interface TaskItemRowProps {
  task: Task;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onStartMultiSelect: (id: string) => void;
  getTaskDateLabel: (dateStr: string) => string;
  getLeftDateData: (dateStr: string) => any;
  updateTask: (id: string, fields: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  setEditingTask: (task: Task | null) => void;
  catColor: { light: string; bgLight: string; borderLight: string; solid: string };
  isSubExpanded: boolean;
  onToggleSubExpanded: () => void;
}

const TaskItemRow: React.FC<TaskItemRowProps> = ({
  task,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  onStartMultiSelect,
  getTaskDateLabel,
  getLeftDateData,
  updateTask,
  deleteTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  setEditingTask,
  catColor,
  isSubExpanded,
  onToggleSubExpanded
}) => {
  const [dragX, setDragX] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const startPressTimer = () => {
    isLongPressActive.current = false;
    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setIsPressing(false);
      onStartMultiSelect(task.id);
    }, 600); // 600ms long press duration
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // If long press was triggered, do not trigger standard click
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    if (isMultiSelectMode) {
      onToggleSelect(task.id);
    } else {
      setEditingTask(task);
    }
  };

  // Safe gesture handlers for both touch & mouse
  const handleTouchStart = () => {
    if (isMultiSelectMode) return;
    startPressTimer();
  };

  const handleTouchEnd = () => {
    clearPressTimer();
  };

  const handleMouseDown = () => {
    if (isMultiSelectMode) return;
    startPressTimer();
  };

  const handleMouseUp = () => {
    clearPressTimer();
  };

  const handleMouseLeave = () => {
    clearPressTimer();
  };

  const hasSub = task.subtasks && task.subtasks.length > 0;
  const leftDate = getLeftDateData(task.date);
  
  // Decide what background to show underneath during drag
  const isSwipingRight = dragX > 15;
  const isSwipingLeft = dragX < -15;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="relative overflow-hidden rounded-2xl border border-gray-150/70 bg-white shadow-3xs select-none"
    >
      {/* Swipe action background indicators */}
      <div 
        className={`absolute inset-0 flex items-center justify-between px-5 text-white z-0 transition-all duration-150
          ${isSwipingRight ? 'bg-emerald-600' : isSwipingLeft ? 'bg-rose-600' : 'bg-gray-50'}
        `}
      >
        {/* Swipe Right to Complete (Shown on the left side) */}
        <div className={`flex items-center space-x-2 transition-all duration-150 ${isSwipingRight ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-95'}`}>
          <Check size={18} className="stroke-[3px]" />
          <span className="font-extrabold text-xs tracking-wider">COMPLETE</span>
        </div>

        {/* Swipe Left to Delete (Shown on the right side) */}
        <div className={`flex items-center space-x-2 transition-all duration-150 ${isSwipingLeft ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-4 scale-95'}`}>
          <span className="font-extrabold text-xs tracking-wider">DELETE</span>
          <Trash2 size={16} />
        </div>
      </div>

      {/* Main Draggable Task Item Container */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0.6 }}
        onDrag={(event, info) => setDragX(info.offset.x)}
        onDragEnd={(event, info) => {
          const threshold = 100;
          if (info.offset.x > threshold) {
            // Swipe right triggers complete
            updateTask(task.id, { completed: true });
          } else if (info.offset.x < -threshold) {
            // Swipe left triggers delete
            deleteTask(task.id);
          }
          setDragX(0);
        }}
        animate={{ x: 0 }}
        onClick={handleRowClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative z-10 p-3.5 flex items-start select-none transition-all duration-200 active:bg-gray-50/70 touch-manipulation
          ${isPressing ? 'scale-[0.98] bg-gray-50' : 'scale-100'}
          ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70 border-l-4 border-blue-500' : 'bg-white'}
          ${isMultiSelectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        `}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Multi-Selection Checkbox (Only visible in Multi-Select Mode) */}
        {isMultiSelectMode && (
          <div className="flex-shrink-0 mr-3.5 flex items-center justify-center min-h-[44px]">
            <div 
              className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all duration-150
                ${isSelected 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
            >
              {isSelected && <Check size={12} className="stroke-[3.5px]" />}
            </div>
          </div>
        )}

        {/* Left Date Column: Google Calendar style */}
        <div className="flex-shrink-0 w-12 mr-3.5 flex flex-col items-center justify-center select-none border-r border-gray-100 pr-3.5 text-center min-h-[44px]">
          <span className={`text-[9px] font-black tracking-wider leading-none mb-1
            ${leftDate.isOverdue ? 'text-rose-600' : leftDate.isToday ? 'text-blue-600' : 'text-gray-400'}
          `}>
            {leftDate.topText}
          </span>
          <span className={`text-sm font-black leading-none my-0.5 rounded-full w-6.5 h-6.5 flex items-center justify-center
            ${leftDate.isToday 
              ? 'bg-blue-600 text-white font-black shadow-xs' 
              : leftDate.isOverdue 
                ? 'bg-rose-50 text-rose-700 font-extrabold border border-rose-100' 
                : 'text-gray-700'
            }
          `}>
            {leftDate.midText}
          </span>
          <span className={`text-[8px] font-bold tracking-tight leading-none mt-1
            ${leftDate.isOverdue ? 'text-rose-500' : leftDate.isToday ? 'text-blue-500' : 'text-gray-400'}
          `}>
            {leftDate.botText}
          </span>
        </div>

        {/* Right Task Body Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center min-w-0 flex-1">
              {/* Circular Complete Checkbox (Hidden in Multi-Select to avoid layout noise) */}
              {!isMultiSelectMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent opening details
                    updateTask(task.id, { completed: true });
                  }}
                  className="w-5.5 h-5.5 rounded-full border-2 border-[#c4c6cf] flex items-center justify-center flex-shrink-0 transition-all hover:bg-blue-50 hover:border-gray-600 cursor-pointer mr-3 active:scale-90 touch-manipulation relative overflow-hidden"
                >
                  <motion.span
                    initial={false}
                    animate={{ scale: task.completed ? 1 : 0 }}
                    whileTap={{ scale: 1 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute inset-0 bg-[#0b57d0] rounded-full flex items-center justify-center"
                  >
                    <Check size={11} className="stroke-[3.5px] text-white" />
                  </motion.span>
                </button>
              )}

              {/* Title and details */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {task.title}
                </p>
                <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-gray-400 font-medium">
                  <span>{getTaskDateLabel(task.date)}</span>
                  {task.time && <span>at {task.time}</span>}
                </div>
              </div>
            </div>

            {/* Right Controls Block */}
            {!isMultiSelectMode && (
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                {/* Toggle subtasks expansion */}
                {hasSub && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubExpanded();
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-transform duration-150 cursor-pointer flex items-center justify-center active:scale-90"
                    style={{ transform: isSubExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    title="Toggle Subtasks"
                  >
                    <ChevronDown size={14} className="stroke-[2.5px]" />
                  </button>
                )}

                {/* Add subtask helper icon if empty */}
                {!hasSub && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubExpanded();
                      addSubtask(task.id, 'New subtask');
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center justify-center active:scale-90"
                    title="Add Subtask"
                  >
                    <Plus size={14} className="stroke-[2.5px]" />
                  </button>
                )}

                {/* Quick Edit */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer flex items-center justify-center active:scale-90"
                  title="Edit Task"
                >
                  <Edit3 size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Expanded Nestable Subtask List */}
          {isSubExpanded && !isMultiSelectMode && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
              {task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between pl-4 py-1">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSubtask(task.id, sub.id)}
                      className="p-0.5 rounded text-gray-500 hover:text-gray-800 cursor-pointer flex items-center justify-center active:scale-90"
                    >
                      <span 
                        className={`w-4 h-4 rounded flex items-center justify-center border-2 relative overflow-hidden transition-colors duration-150
                          ${sub.completed ? 'border-[#0b57d0]' : 'border-[#c4c6cf] hover:border-gray-600'}
                        `}
                      >
                        <motion.span
                          initial={false}
                          animate={{ scale: sub.completed ? 1 : 0 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute inset-0 bg-[#0b57d0] flex items-center justify-center"
                        >
                          <Check size={11} className="stroke-[3px] text-white" />
                        </motion.span>
                      </span>
                    </button>
                    <span className={`text-xs font-semibold truncate flex-1 relative inline-block ${sub.completed ? 'text-gray-400' : 'text-gray-700'}`}>
                      <span>{sub.title}</span>
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: sub.completed ? '100%' : 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                        style={{ transform: 'translateY(-50%)' }}
                      />
                    </span>
                  </div>

                  <button
                    type="button;}"
                    onClick={() => deleteSubtask(task.id, sub.id)}
                    className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded transition-colors flex items-center justify-center active:scale-90"
                  >
                    <X size={12} className="stroke-[2.5px]" />
                  </button>
                </div>
              ))}

              {/* Inline Subtask Entry Box */}
              <div className="pl-4 pt-1">
                <input
                  type="text"
                  placeholder="+ Add subtask & press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        addSubtask(task.id, val);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="w-full text-xs font-bold py-1.5 focus:outline-none bg-transparent placeholder-gray-400 text-gray-700 border-b border-dashed border-gray-200 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const TasksOverlay: React.FC = () => {
  const isTasksOverlayOpen = useTaskStore((state) => state.isTasksOverlayOpen);
  const setTasksOverlayOpen = useTaskStore((state) => state.setTasksOverlayOpen);
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const addSubtask = useTaskStore((state) => state.addSubtask);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const deleteSubtask = useTaskStore((state) => state.deleteSubtask);
  const setEditingTask = useTaskStore((state) => state.setEditingTask);
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const setPrefilledTitle = useTaskStore((state) => state.setPrefilledTitle);

  const [gcalTaskQuery, setGcalTaskQuery] = useState('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [gcalExpandedTaskIds, setGcalExpandedTaskIds] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Multi-Selection States
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const allPendingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const sortedPending = [...allPendingTasks].sort((a, b) => a.date.localeCompare(b.date));

  const getTaskDateLabel = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    try {
      const parsed = parseISO(dateStr);
      if (isToday(parsed)) return 'Today';
      const tomorrow = addDays(new Date(), 1);
      if (format(tomorrow, 'yyyy-MM-dd') === dateStr) return 'Tomorrow';
      return format(parsed, 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getLeftDateData = (dateStr: string) => {
    if (!dateStr) {
      return {
        topText: 'ANY',
        midText: '—',
        botText: 'TIME',
        isOverdue: false,
        isToday: false,
        isTomorrow: false,
        isNoDate: true
      };
    }
    try {
      const parsed = parseISO(dateStr);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      const isTodayDate = dateStr === todayStr;
      const isTomorrowDate = dateStr === tomorrowStr;
      const isOverdue = dateStr < todayStr;

      const dayOfWeek = format(parsed, 'EEE'); // e.g. "Mon"
      const dayNum = format(parsed, 'd'); // e.g. "30"
      const monthName = format(parsed, 'MMM'); // e.g. "Jun"

      return {
        // ALWAYS use the uppercase day of the week above the date, as requested!
        topText: dayOfWeek.toUpperCase(), 
        midText: dayNum,
        botText: monthName.toUpperCase(),
        isOverdue,
        isToday: isTodayDate,
        isTomorrow: isTomorrowDate,
        isNoDate: false
      };
    } catch {
      return {
        topText: 'DUE',
        midText: '?',
        botText: 'DATE',
        isOverdue: false,
        isToday: false,
        isTomorrow: false,
        isNoDate: false
      };
    }
  };

  // Search filter
  const searchFiltered = sortedPending.filter((task) => {
    if (!gcalTaskQuery) return true;
    const q = gcalTaskQuery.toLowerCase();
    const matchTitle = task.title.toLowerCase().includes(q);
    const matchSubtasks = task.subtasks && task.subtasks.some(s => s.title.toLowerCase().includes(q));
    return matchTitle || matchSubtasks;
  });

  const hasAnyPending = searchFiltered.length > 0;

  // Multi-select helpers
  const handleStartMultiSelect = (id: string) => {
    setIsMultiSelectMode(true);
    setSelectedTaskIds([id]);
  };

  const handleToggleSelect = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      const next = selectedTaskIds.filter(x => x !== id);
      setSelectedTaskIds(next);
      if (next.length === 0) {
        setIsMultiSelectMode(false);
      }
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleCompleteSelected = () => {
    selectedTaskIds.forEach((id) => {
      updateTask(id, { completed: true });
    });
    setSelectedTaskIds([]);
    setIsMultiSelectMode(false);
  };

  const handleDeleteSelected = () => {
    selectedTaskIds.forEach((id) => {
      deleteTask(id);
    });
    setSelectedTaskIds([]);
    setIsMultiSelectMode(false);
  };

  const handleCancelSelection = () => {
    setSelectedTaskIds([]);
    setIsMultiSelectMode(false);
  };

  // Open the main full-screen task creation sheet with prefilled text
  const handleOpenCreator = () => {
    setEditingTask(null);
    setFABOpen(true);
    setTasksOverlayOpen(false);
  };

  const handleQuickAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setPrefilledTitle(val);
      setFABOpen(true);
      e.target.value = ''; // Reset input so it is empty next time
    }
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0.95 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className={`fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden text-gray-800 transition-all duration-300
        ${isFullScreen 
          ? 'w-full h-full max-w-none rounded-none inset-0' 
          : 'md:max-w-[430px] md:mx-auto md:shadow-2xl md:border-x md:border-gray-200/50 md:rounded-t-3xl md:inset-y-4 md:h-[calc(100vh-32px)]'
        }
      `}
    >
          {/* Header Area (Swaps with multi-selection actions when active) */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 flex-shrink-0 bg-white select-none">
            {isMultiSelectMode ? (
              <div className="flex items-center justify-between w-full animate-fadeIn">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className="p-2 hover:bg-gray-100 active:bg-gray-200/70 rounded-full text-gray-600 cursor-pointer flex items-center justify-center active:scale-95 transition-all"
                  >
                    <X size={18} className="stroke-[2.5px]" />
                  </button>
                  <span className="text-sm font-black text-gray-900">
                    {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Complete Action Button */}
                  <button
                    type="button"
                    onClick={handleCompleteSelected}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/70 text-emerald-700 font-extrabold text-[11px] tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckSquare size={14} className="stroke-[2.5px]" />
                    <span>COMPLETE</span>
                  </button>

                  {/* Delete Action Button */}
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200/70 text-rose-700 font-extrabold text-[11px] tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    <Trash2 size={13} className="stroke-[2.5px]" />
                    <span>DELETE</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setTasksOverlayOpen(false)}
                    className="p-2.5 hover:bg-gray-100 active:bg-gray-200/70 rounded-full text-gray-600 transition-all cursor-pointer flex items-center justify-center active:scale-95 touch-manipulation"
                    title="Close Tasks"
                  >
                    <ArrowLeft size={20} className="stroke-[2.5px]" />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 tracking-tight leading-tight">My Tasks</span>
                    <span className="text-[10px] font-bold text-gray-400">Google Calendar Sync</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="hidden md:flex p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer items-center justify-center"
                    title={isFullScreen ? "Collapse View" : "Expand to Fullscreen"}
                  >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* M3 Style Search Input */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/40">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-gray-400 stroke-[2.5px]" />
              <input
                type="text"
                placeholder="Search tasks or subtasks..."
                value={gcalTaskQuery}
                onChange={(e) => setGcalTaskQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium placeholder-gray-400 transition-all focus:shadow-xs"
              />
              {gcalTaskQuery && (
                <button
                  type="button"
                  onClick={() => setGcalTaskQuery('')}
                  className="absolute right-3 top-2.5 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
                >
                  <X size={12} className="stroke-[2.5px]" />
                </button>
              )}
            </div>
          </div>

          {/* Scroll Area of Task Lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none pb-36 bg-white">
            {!hasAnyPending ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-2xs">
                  <CheckSquare size={32} className="stroke-[1.5px]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">All tasks completed!</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Enjoy your day or create a new task using the quick add bar below.
                </p>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <motion.div layout className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {searchFiltered.map((task) => {
                      const catColor = CATEGORIES.find((c) => c.id === task.category)?.color || CATEGORIES[0].color;
                      const isSubExpanded = gcalExpandedTaskIds.includes(task.id);
                      const isSelected = selectedTaskIds.includes(task.id);

                      return (
                        <TaskItemRow
                          key={task.id}
                          task={task}
                          isMultiSelectMode={isMultiSelectMode}
                          isSelected={isSelected}
                          onToggleSelect={handleToggleSelect}
                          onStartMultiSelect={handleStartMultiSelect}
                          getTaskDateLabel={getTaskDateLabel}
                          getLeftDateData={getLeftDateData}
                          updateTask={updateTask}
                          deleteTask={deleteTask}
                          addSubtask={addSubtask}
                          toggleSubtask={toggleSubtask}
                          deleteSubtask={deleteSubtask}
                          setEditingTask={setEditingTask}
                          catColor={catColor}
                          isSubExpanded={isSubExpanded}
                          onToggleSubExpanded={() => {
                            if (isSubExpanded) {
                              setGcalExpandedTaskIds(gcalExpandedTaskIds.filter(id => id !== task.id));
                            } else {
                              setGcalExpandedTaskIds([...gcalExpandedTaskIds, task.id]);
                            }
                          }}
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            {/* Collapsible Completed Section */}
            {completedTasks.length > 0 && !isMultiSelectMode && (
              <div className="pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  className="flex items-center space-x-2 w-full text-left text-xs font-extrabold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer select-none px-1 py-1"
                >
                  <span>Completed Tasks ({completedTasks.length})</span>
                  <ChevronDown 
                    size={14} 
                    className="stroke-[3px] transition-transform duration-150"
                    style={{ transform: isCompletedExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {isCompletedExpanded && (
                  <div className="mt-3 divide-y divide-gray-100 bg-gray-50/50 rounded-2xl p-2.5 border border-gray-100">
                    {completedTasks.map((task) => {
                      const cat = CATEGORIES.find((c) => c.id === task.category) || CATEGORIES[0];
                      return (
                        <div key={task.id} className="flex items-center justify-between py-2.5 px-2">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => updateTask(task.id, { completed: false })}
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer text-white active:scale-90"
                              style={{ backgroundColor: cat.color.solid }}
                            >
                              <Check size={11} className="stroke-[3.5px]" />
                            </button>
                            <span className="text-xs text-gray-400 font-bold truncate flex-1 relative inline-block">
                              <span>{task.title}</span>
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="absolute left-0 top-1/2 h-[1.5px] bg-gray-400"
                                style={{ transform: 'translateY(-50%)' }}
                              />
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer ml-2 flex items-center justify-center"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Persistent 'Quick Add' style block: Clicking anywhere triggers the full TaskSheet, exactly like the + button */}
          <div 
            onClick={handleOpenCreator}
            className="absolute bottom-0 left-0 right-0 border-t border-gray-150 bg-white p-3.5 z-50 shadow-lg cursor-pointer active:scale-[0.99] transition-all"
            style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 16px))' }}
          >
            <div className="relative flex items-center w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 select-none touch-manipulation">
              <Plus size={18} className="absolute left-3.5 text-blue-600 stroke-[2.5px]" />
              <span className="text-xs font-bold text-gray-400">
                Add a task to list...
              </span>
            </div>
          </div>
        </motion.div>
  );
};
