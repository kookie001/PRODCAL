import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onTouchStart?: (e: React.TouchEvent) => void;
  isDraggingThis?: boolean;
}

const format12hTime = (timeStr?: string): string => {
  if (!timeStr || !timeStr.includes(':')) return timeStr || '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h24) || isNaN(m)) return timeStr;
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const minsStr = String(m).padStart(2, '0');
  return `${h12}:${minsStr} ${period}`;
};

interface SortableSubtaskItemProps {
  id: string;
  sub: any;
  taskId: string;
  isCompleted: boolean;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  fgSub: string;
}

const SortableSubtaskItem = React.memo<SortableSubtaskItemProps>(({
  id,
  sub,
  taskId,
  isCompleted,
  toggleSubtask,
  fgSub,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '2px 4px',
        background: isDragging ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        borderRadius: '6px',
        cursor: 'grab',
      }}
      className="active:cursor-grabbing"
    >
      {/* ≡ Drag handle/indicator on the left */}
      <div style={{ width: '12px', display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: '12px', lineHeight: '1', color: `${fgSub}99`, fontWeight: 'bold' }}>≡</span>
      </div>

      {/* Subtask text */}
      <span
        style={{
          flex: 1,
          fontSize: '11px',
          lineHeight: '1.2',
          color: sub.completed ? `${fgSub}66` : fgSub,
          textDecoration: sub.completed ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub.title || sub.text || ''}
      </span>

      {/* Completion circle */}
      <button
        onTouchStart={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (sub.id) {
            toggleSubtask(taskId, sub.id);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (sub.id) {
            toggleSubtask(taskId, sub.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '18px',
          minWidth: 'auto',
          minHeight: 'auto',
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          border: `1.2px solid ${fgSub}`,
          background: sub.completed ? fgSub : 'transparent',
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
  );
});

SortableSubtaskItem.displayName = 'SortableSubtaskItem';

const TaskItemRow = React.memo(({
  task,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  updateTask,
  setEditingTask,
  onTouchStart,
  isDraggingThis,
  isSubExpanded,
  onToggleSubExpanded,
  toggleSubtask,
}: TaskItemRowProps) => {
  const dateObj = useMemo(() => task.date ? new Date(task.date + 'T00:00:00') : new Date(), [task.date]);

  const incompleteSubtasks = useMemo(() => {
    return (task.subtasks || []).filter((sub: any) => !sub.completed);
  }, [task.subtasks]);

  const incompleteSubtaskIds = useMemo(() => {
    return incompleteSubtasks.map((s: any) => s.id);
  }, [incompleteSubtasks]);

  const handleRowClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode) {
      onToggleSelect(task.id);
      return;
    }

    const hasIncompleteSubtasks = incompleteSubtasks.length > 0;
    if (hasIncompleteSubtasks) {
      onToggleSubExpanded();
    } else {
      setEditingTask(task);
    }
  };

  const isCompleted = task.completed;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      }
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const originalSubtasks = task.subtasks || [];
      const incompleteSubtasks = originalSubtasks.filter(s => !s.completed);
      
      const oldIndex = incompleteSubtasks.findIndex(s => s.id === active.id);
      const newIndex = incompleteSubtasks.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedIncomplete = arrayMove(incompleteSubtasks, oldIndex, newIndex);
        
        let reorderedIndex = 0;
        const newSubtasks = originalSubtasks.map(sub => {
          if (sub.completed) {
            return sub;
          } else {
            return reorderedIncomplete[reorderedIndex++];
          }
        });
        
        updateTask(task.id, { subtasks: newSubtasks });
      }
    }
  };

  return (
    <div 
      className={`mx-3 my-1 rounded-[12px] cursor-pointer select-none transition-all duration-150 ${
        isDraggingThis ? 'opacity-35 border-dashed border-gray-400 bg-gray-100 scale-95' : ''
      }`}
      style={{
        backgroundColor: isCompleted ? '#F3F4F6' : '#EBF5FF',
        border: isCompleted ? '1px solid #E5E7EB' : '1px solid #BFDBFE',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={handleRowClick}
        onTouchStart={onTouchStart}
        className="flex items-center px-2.5"
        style={{
          minHeight: '44px',
          width: '100%',
          boxSizing: 'border-box',
        }}
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

        {/* WRAPPER FOR TIME/DATE + SEPARATOR */}
        <div className="shrink-0 flex items-center" style={{ flexShrink: 0 }}>
          {/* Left: date — compact */}
          <div className="shrink-0 select-none flex flex-col justify-center items-start" style={{ marginRight: '8px', flexShrink: 0 }}>
            <span className="text-xs font-bold whitespace-nowrap" style={{ color: isCompleted ? '#9CA3AF' : '#1E40AF' }}>
              {format(dateObj, 'd MMMM')}
            </span>
            {task.time && (
              <span className="text-[10px] font-medium whitespace-nowrap mt-0.5" style={{ color: isCompleted ? '#9CA3AF' : '#5F6368' }}>
                {format12hTime(task.time)}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 shrink-0" style={{ backgroundColor: isCompleted ? '#E5E7EB' : '#BFDBFE', marginRight: '8px' }} />
        </div>

        {/* Fixed-width chevron slot — same width on every card */}
        <div style={{ width: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px' }}>
          {incompleteSubtasks.length > 0 && (
            <span 
              style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: isCompleted ? '#9CA3AF' : '#1E40AF',
                display: 'inline-block',
                transition: 'transform 150ms ease',
                transform: isSubExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              ›
            </span>
          )}
        </div>

        {/* Title — compact & matching timeline task font size/weight */}
        <p className="flex-1 text-sm font-semibold truncate min-w-0" style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#9CA3AF' : '#1E40AF' }}>
          {task.title}
        </p>

        {/* Checkbox only — nothing else on right */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            updateTask(task.id, { completed: !task.completed });
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-100 cursor-pointer"
          style={{ marginLeft: '8px' }}
        >
          <span style={{
            width: '18px',
            height: '18px',
            minWidth: '18px',
            borderRadius: '50%',
            border: isCompleted ? '2px solid #9CA3AF' : '2px solid #1E40AF',
            background: isCompleted ? '#9CA3AF' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 100ms ease',
          }}>
            {isCompleted && (
              <Check size={10} className="text-white" style={{ strokeWidth: 3 }} />
            )}
          </span>
        </button>
      </div>

      {/* Subtasks block expanded below */}
      {isSubExpanded && (
        <div
          data-subtask-panel="true"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            backgroundColor: isCompleted ? '#F3F4F6' : '#EBF5FF',
            borderRadius: '0 0 12px 12px',
            padding: '4px 10px 8px 10px',
            borderTop: isCompleted ? '1px solid #E5E7EB' : '1px solid #BFDBFE',
            overflow: 'hidden',
          }}
        >
          {incompleteSubtasks.length === 0 ? (
            <span style={{ fontSize: '10px', color: isCompleted ? '#9CA3AF' : '#1E40AF' }}>No subtasks</span>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={incompleteSubtaskIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {incompleteSubtasks.map((sub: any, index: number) => {
                    const fgSub = isCompleted ? '#9CA3AF' : '#2563EB';
                    return (
                      <SortableSubtaskItem
                        key={sub.id || `subtask-${index}`}
                        id={sub.id}
                        sub={sub}
                        taskId={task.id}
                        isCompleted={isCompleted}
                        toggleSubtask={toggleSubtask}
                        fgSub={fgSub}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
});

TaskItemRow.displayName = 'TaskItemRow';

interface TasksOverlayProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export const TasksOverlay: React.FC<TasksOverlayProps> = ({ searchQuery, setSearchQuery }) => {
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

  // Drag and Drop States for Pending Tasks
  const [localGcalTaskQuery, setLocalGcalTaskQuery] = useState('');
  const gcalTaskQuery = searchQuery !== undefined ? searchQuery : localGcalTaskQuery;
  const setGcalTaskQuery = setSearchQuery !== undefined ? setSearchQuery : setLocalGcalTaskQuery;

  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [gcalExpandedTaskIds, setGcalExpandedTaskIds] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [todayStr, setTodayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const updateToday = () => {
      setTodayStr(format(new Date(), 'yyyy-MM-dd'));
    };

    updateToday(); // Recompute on mount

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        updateToday();
      }
    };
    
    // Also a periodic check every 30 seconds
    const interval = setInterval(updateToday, 30000);

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  // Multi-Selection States
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isDraggingFromList = useRef(false);
  const preventClickRef = useRef(false);
  const draggedTaskRef = useRef<Task | null>(null);

  const setDraggedTaskWithRef = (task: Task | null) => {
    setDraggedTask(task);
    draggedTaskRef.current = task;
  };

  const handleListItemTouchStart = (task: Task, e: React.TouchEvent) => {
    if (isMultiSelectMode || task.completed) return;

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    preventClickRef.current = false;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      isDraggingFromList.current = true;
      setDraggedTaskWithRef(task);
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    }, 500);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingFromList.current) {
        if (longPressTimer.current) {
          const touch = e.touches[0];
          const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
          const diffY = Math.abs(touch.clientY - touchStartPos.current.y);
          if (diffX > 20 || diffY > 20) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = undefined;
          }
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      setDragPosition({ x: touch.clientX, y: touch.clientY });
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;

      if (!isDraggingFromList.current || !draggedTaskRef.current) {
        isDraggingFromList.current = false;
        return;
      }

      // Suppress normal click/edit modal trigger since we just finished a drag gesture
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 100);

      const timelineEl = document.getElementById('day-timeline-container');
      const rect = timelineEl?.getBoundingClientRect();

      const touch = e.changedTouches[0];
      const dropX = touch.clientX;
      const dropY = touch.clientY;

      if (
        rect &&
        dropX >= rect.left &&
        dropX <= rect.right &&
        dropY >= rect.top &&
        dropY <= rect.bottom
      ) {
        const relativeY = dropY - rect.top + timelineEl.scrollTop;
        const pixelsPerMinute = 1536 / 1440;
        const minutes = Math.round((relativeY / pixelsPerMinute) / 15) * 15;
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');

        const activeDateObj = new Date(useTaskStore.getState().currentDate);
        const year = activeDateObj.getFullYear();
        const month = String(activeDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(activeDateObj.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        updateTask(draggedTaskRef.current.id, {
          date: formattedDate,
          time: `${h}:${m}`
        });

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }

        handleClose();
      }

      setDraggedTaskWithRef(null);
      isDraggingFromList.current = false;
    };

    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isOpen, isMultiSelectMode]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setTasksOverlayOpen(false);
    }, 280);
  }, [setIsOpen, setTasksOverlayOpen]);

  const allPendingTasks = useMemo(() => {
    return tasks.filter((task) => !task.completed && task.date && (task.date < todayStr || task.isPending === true));
  }, [tasks, todayStr]);

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.completed);
  }, [tasks]);

  const sortedPending = useMemo(() => {
    return [...allPendingTasks].sort((a, b) => {
      // today's manually-pending tasks first
      const aToday = a.isPending && a.date === todayStr;
      const bToday = b.isPending && b.date === todayStr;
      if (aToday && !bToday) return -1;
      if (bToday && !aToday) return 1;
      // otherwise, most recent date first (descending)
      return b.date.localeCompare(a.date);
    });
  }, [allPendingTasks, todayStr]);

  const getTaskDateLabel = useCallback((dateStr: string) => {
    if (!dateStr) return 'No Date';
    try {
      if (dateStr === todayStr) return 'Today';
      const parsed = parseISO(dateStr);
      const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      if (tomorrowStr === dateStr) return 'Tomorrow';
      return format(parsed, 'MMM d');
    } catch {
      return dateStr;
    }
  }, [todayStr]);

  const getLeftDateData = useCallback((dateStr: string) => {
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
  }, [todayStr]);

  // Search filter
  const searchFiltered = useMemo(() => {
    return sortedPending.filter((task) => {
      if (!gcalTaskQuery) return true;
      const q = gcalTaskQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchSubtasks = task.subtasks && task.subtasks.some(s => s.title.toLowerCase().includes(q));
      return matchTitle || matchSubtasks;
    });
  }, [sortedPending, gcalTaskQuery]);

  // Completed search filter
  const completedFiltered = useMemo(() => {
    return completedTasks.filter((task) => {
      if (!gcalTaskQuery) return true;
      const q = gcalTaskQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchSubtasks = task.subtasks && task.subtasks.some(s => s.title.toLowerCase().includes(q));
      return matchTitle || matchSubtasks;
    });
  }, [completedTasks, gcalTaskQuery]);

  // Completed subtasks search filter
  const completedSubtasksFiltered = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .flatMap((task) => 
        (task.subtasks || [])
          .filter((sub) => sub.completed)
          .map((sub) => ({ sub, parent: task }))
      )
      .filter(({ sub, parent }) => {
        if (!gcalTaskQuery) return true;
        const q = gcalTaskQuery.toLowerCase();
        const matchSubtaskTitle = sub.title.toLowerCase().includes(q);
        const matchParentTitle = parent.title.toLowerCase().includes(q);
        return matchSubtaskTitle || matchParentTitle;
      });
  }, [tasks, gcalTaskQuery]);

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
      className={`fixed inset-0 bg-transparent z-[100] flex flex-col overflow-hidden text-gray-800 tasks-overlay ${
        isOpen ? 'open' : ''
      } ${
        isFullScreen 
          ? 'w-full h-full max-w-none rounded-none inset-0' 
          : 'md:max-w-[430px] md:mx-auto md:shadow-2xl md:border-x md:border-gray-200/50 md:rounded-t-3xl md:inset-y-4 md:h-[calc(100vh-32px)]'
      }`}
    >
      <div className={`flex-1 flex flex-col h-full bg-white transition-opacity duration-200 ${draggedTask ? 'opacity-15 pointer-events-none' : ''}`}>
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
                    id="tasks-overlay-close-btn"
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
                        setEditingTask={(t) => {
                          if (preventClickRef.current) return;
                          setEditingTask(t);
                        }}
                        catColor={CATEGORIES[0].color}
                        isSubExpanded={gcalExpandedTaskIds.includes(task.id)}
                        onToggleSubExpanded={() => {
                          setGcalExpandedTaskIds((prev) =>
                            prev.includes(task.id)
                              ? prev.filter((id) => id !== task.id)
                              : [...prev, task.id]
                          );
                        }}
                        onTouchStart={(e) => handleListItemTouchStart(task, e)}
                        isDraggingThis={draggedTask?.id === task.id}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collapsible Completed Section */}
            {(completedFiltered.length > 0 || completedSubtasksFiltered.length > 0) && !isMultiSelectMode && (
              <div className="pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  className="flex items-center space-x-2 w-full text-left text-xs font-extrabold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer select-none px-1 py-1"
                >
                  <span>Completed Tasks & Subtasks ({completedFiltered.length + completedSubtasksFiltered.length})</span>
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

                    {completedSubtasksFiltered.map(({ sub, parent }) => {
                      const cat = CATEGORIES.find((c) => c.id === parent.category) || CATEGORIES[0];
                      return (
                        <div key={`subtask-comp-${parent.id}-${sub.id}`} className="flex items-center justify-between py-2.5 px-2 border-t border-gray-100/50">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(parent.id, sub.id)}
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer text-white active:scale-90"
                              style={{ backgroundColor: cat.color.solid }}
                            >
                              <Check size={11} className="stroke-[3.5px]" />
                            </button>
                            <span className="text-xs text-gray-400 font-bold truncate flex-1 relative inline-block">
                              <span className="line-through text-gray-400">{sub.title}</span>
                              <span className="text-[10px] text-gray-400 font-normal ml-1.5 opacity-75">({parent.title})</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteSubtask(parent.id, sub.id)}
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

      {/* Floating Drag Preview */}
      {draggedTask && (
        <div 
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate(${dragPosition.x - 100}px, ${dragPosition.y - 25}px) scale(1.05)`,
            width: '200px',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="bg-[#1A73E8] text-white p-3 rounded-xl shadow-2xl border border-blue-500 font-medium text-sm flex items-center justify-between"
        >
          <span className="truncate flex-1">{draggedTask.title}</span>
          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full ml-2 select-none">Drag</span>
        </div>
      )}
    </div>
  );
};
