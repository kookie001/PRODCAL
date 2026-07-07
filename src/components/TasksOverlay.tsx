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

const TaskItemRow = React.memo(({
  task,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  updateTask,
  setEditingTask
}: TaskItemRowProps) => {
  const dateObj = task.date ? new Date(task.date + 'T00:00:00') : new Date();

  const handleRowClick = () => {
    if (isMultiSelectMode) {
      onToggleSelect(task.id);
    } else {
      setEditingTask(task);
    }
  };

  return (
    <div 
      onClick={handleRowClick}
      className="flex items-center bg-white mx-3 my-1 px-4 py-3 rounded-xl border border-[#F1F3F4] min-h-[60px] cursor-pointer"
    >
      {isMultiSelectMode && (
        <div className="flex-shrink-0 mr-3 flex items-center justify-center">
          <div 
            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-150
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

      {/* Left: date — compact */}
      <div className="flex flex-col items-center w-10 mr-3 shrink-0 select-none">
        <span className="text-[10px] text-[#5F6368] uppercase">{format(dateObj, 'EEE')}</span>
        <span className="text-lg font-medium text-[#202124] leading-none">{format(dateObj, 'd')}</span>
        <span className="text-[10px] text-[#5F6368]">{format(dateObj, 'MMM')}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-[#E0E0E0] mr-3 shrink-0" />

      {/* Title — large and readable */}
      <p className={`flex-1 text-[17px] font-medium truncate min-w-0 ${task.completed ? 'line-through text-[#BDC1C6]' : 'text-[#202124]'}`}>
        {task.title}
      </p>

      {/* Checkbox only — nothing else on right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateTask(task.id, { completed: !task.completed });
        }}
        className={`ml-3 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-100 cursor-pointer ${
          task.completed ? 'bg-[#1A73E8] border-[#1A73E8]' : 'border-[#DADCE0] bg-white'
        }`}
      >
        {task.completed && <Check size={12} className="text-white" />}
      </button>
    </div>
  );
});

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

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setTasksOverlayOpen(false);
    }, 280);
  };

  const [gcalTaskQuery, setGcalTaskQuery] = useState('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
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

  // Completed search filter
  const completedFiltered = completedTasks.filter((task) => {
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
    <div
      className={`fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden text-gray-800 tasks-overlay ${
        isOpen ? 'open' : ''
      } ${
        isFullScreen 
          ? 'w-full h-full max-w-none rounded-none inset-0' 
          : 'md:max-w-[430px] md:mx-auto md:shadow-2xl md:border-x md:border-gray-200/50 md:rounded-t-3xl md:inset-y-4 md:h-[calc(100vh-32px)]'
      }`}
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
                    onClick={handleClose}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none pb-12 bg-white scroll-container">
            {!hasAnyPending ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-2xs">
                  <CheckSquare size={32} className="stroke-[1.5px]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">All tasks completed!</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Enjoy your day!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2.5">
                  {searchFiltered.map((task) => {
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
                        catColor={CATEGORIES[0].color}
                        isSubExpanded={false}
                        onToggleSubExpanded={() => {}}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collapsible Completed Section */}
            {completedFiltered.length > 0 && !isMultiSelectMode && (
              <div className="pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  className="flex items-center space-x-2 w-full text-left text-xs font-extrabold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer select-none px-1 py-1"
                >
                  <span>Completed Tasks ({completedFiltered.length})</span>
                  <ChevronDown 
                    size={14} 
                    className="stroke-[3px] transition-transform duration-150"
                    style={{ transform: isCompletedExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {isCompletedExpanded && (
                  <div className="mt-3 divide-y divide-gray-100 bg-gray-50/50 rounded-2xl p-2.5 border border-gray-100">
                    {completedFiltered.map((task) => {
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
                              <span className="line-through text-gray-400">{task.title}</span>
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
    </div>
  );
};
