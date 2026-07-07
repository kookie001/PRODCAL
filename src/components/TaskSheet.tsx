import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Check, 
  Calendar, 
  Clock, 
  Bookmark, 
  GripVertical,
  ChevronDown
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore } from '../store';
import { Task, CategoryType, CATEGORIES, Subtask } from '../types';

interface SortableSubtaskProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  onEnterPressed: () => void;
}

const SortableSubtask = React.memo<SortableSubtaskProps>(({ id, value, onChange, onRemove, onEnterPressed }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        zIndex: isDragging ? 50 : 'auto',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        minHeight: '32px',
        marginBottom: '4px',
      }}
      className="flex items-center gap-1.5 bg-white rounded-md px-2 cursor-grab active:cursor-grabbing"
    >
      <span className="text-[#BDC1C6] text-base select-none">≡</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnterPressed();
          }
        }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onFocus={(e) => {
          setTimeout(() => {
            e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }, 300); // wait for keyboard to open
        }}
        placeholder="Subtask"
        style={{
          paddingTop: '4px',
          paddingBottom: '4px',
        }}
        className="subtask-input flex-1 text-sm text-[#202124] placeholder-[#BDC1C6] border-0 border-b border-[#F1F3F4] focus:outline-none focus:border-[#1A73E8] bg-transparent cursor-text"
      />
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        onPointerDown={e => e.stopPropagation()}
        className="text-[#BDC1C6] text-lg leading-none p-0.5"
      >
        ×
      </button>
    </div>
  );
});

SortableSubtask.displayName = 'SortableSubtask';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const parse24h = (timeStr: string) => {
  if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
  const [h24, m] = timeStr.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return {
    hour: String(h12).padStart(2, '0'),
    minute: String(m || 0).padStart(2, '0'),
    period
  };
};

const to24h = (hour12: string, minute: string, period: string) => {
  let h = Number(hour12);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
};

const snapTo15 = (d: Date) => {
  const m = Math.round(d.getMinutes() / 15) * 15;
  const snapped = new Date(d);
  snapped.setMinutes(m === 60 ? 0 : m);
  if (m === 60) snapped.setHours(snapped.getHours() + 1);
  return snapped;
};

const formatDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (d: Date): string => {
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
};

const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getDefaultTime = (existingTasks: Task[], date: string): string => {
  // Get all tasks on the same date
  const sameDayTasks = existingTasks.filter(t => t.date === date);

  if (sameDayTasks.length === 0) {
    // No tasks today — use current time snapped to 15min
    return formatTime(snapTo15(new Date()));
  }

  // Find the latest task time on that day
  const latestTime = sameDayTasks.reduce((latest, task) => {
    const taskMins = timeToMinutes(task.time || '00:00');
    return taskMins > latest ? taskMins : latest;
  }, 0);

  // Place new task 30 minutes after the latest one
  const newTimeMins = Math.min(latestTime + 30, 23 * 60 + 30);
  const hours = Math.floor(newTimeMins / 60).toString().padStart(2, '0');
  const mins = (newTimeMins % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

interface WheelColumnProps {
  items: string[];
  selectedItem: string;
  onSelect: (item: string) => void;
  loop?: boolean;
}

const ITEM_HEIGHT = 40;

const WheelColumn: React.FC<WheelColumnProps> = ({ items, selectedItem, onSelect, loop = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const displayItems = loop ? [...items, ...items, ...items] : items;
  const cycleLength = items.length;

  const getSelectedIndex = () => {
    const baseIdx = items.indexOf(selectedItem);
    if (baseIdx === -1) return 0;
    return loop ? baseIdx + cycleLength : baseIdx;
  };

  const selectedIdx = getSelectedIndex();

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      containerRef.current.scrollTop = selectedIdx * ITEM_HEIGHT;
    }
  }, [selectedItem, selectedIdx]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const activeIndex = Math.round(scrollTop / ITEM_HEIGHT);

    if (loop) {
      if (activeIndex < cycleLength) {
        isScrollingRef.current = true;
        container.scrollTop = (activeIndex + cycleLength) * ITEM_HEIGHT;
        setTimeout(() => { isScrollingRef.current = false; }, 50);
        const itemVal = items[activeIndex % cycleLength];
        if (itemVal !== selectedItem) {
          onSelect(itemVal);
          if (navigator.vibrate) navigator.vibrate(5);
        }
        return;
      } else if (activeIndex >= cycleLength * 2) {
        isScrollingRef.current = true;
        container.scrollTop = (activeIndex - cycleLength) * ITEM_HEIGHT;
        setTimeout(() => { isScrollingRef.current = false; }, 50);
        const itemVal = items[activeIndex % cycleLength];
        if (itemVal !== selectedItem) {
          onSelect(itemVal);
          if (navigator.vibrate) navigator.vibrate(5);
        }
        return;
      }
    }

    const itemVal = items[activeIndex % cycleLength];
    if (itemVal && itemVal !== selectedItem) {
      onSelect(itemVal);
      if (navigator.vibrate) navigator.vibrate(5);
    }
  };

  return (
    <div className="relative flex-1 h-[120px]">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none py-[40px] relative scroll-smooth"
        style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
        }}
      >
        {displayItems.map((item, idx) => {
          const offset = Math.abs(idx - selectedIdx);
          const scale = Math.max(0.7, 1 - offset * 0.12);
          const opacity = Math.max(0.3, 1 - offset * 0.35);
          return (
            <div
              key={idx}
              className="h-[40px] flex items-center justify-center snap-center font-semibold text-sm select-none cursor-pointer transition-all duration-100"
              style={{
                transform: `scale(${scale})`,
                opacity,
              }}
              onClick={() => {
                onSelect(items[idx % cycleLength]);
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimeWheelPicker: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const { hour, minute, period } = parse24h(value);

  const handleHourSelect = (newHour: string) => {
    onChange(to24h(newHour, minute, period));
  };

  const handleMinuteSelect = (newMinute: string) => {
    onChange(to24h(hour, newMinute, period));
  };

  const handlePeriodSelect = (newPeriod: string) => {
    onChange(to24h(hour, minute, newPeriod));
  };

  return (
    <div className="relative w-full max-w-[280px] bg-gray-50/80 rounded-2xl p-3 border border-gray-100 flex items-center justify-center overflow-hidden">
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[40px] border-y border-blue-500/15 bg-blue-50/20 pointer-events-none rounded-md" />
      <div className="flex items-center w-full relative z-10">
        <WheelColumn items={HOURS} selectedItem={hour} onSelect={handleHourSelect} loop />
        <span className="font-bold text-gray-400 px-1 select-none">:</span>
        <WheelColumn items={MINUTES} selectedItem={minute} onSelect={handleMinuteSelect} loop />
        <span className="w-2" />
        <WheelColumn items={PERIODS} selectedItem={period} onSelect={handlePeriodSelect} />
      </div>
    </div>
  );
};

interface TaskSheetProps {
  isOpen?: boolean;
  onClose?: () => void;
  editTask?: Task;
  mode?: 'create' | 'edit';
}

export const TaskSheet: React.FC<TaskSheetProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  editTask: propEditTask,
  mode: propMode = 'create'
}) => {
  const isFABOpen = useTaskStore((state) => state.isFABOpen);
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const editingTask = useTaskStore((state) => state.editingTask);
  const setEditingTask = useTaskStore((state) => state.setEditingTask);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const prefilledTime = useTaskStore((state) => state.prefilledTime);
  const setPrefilledTime = useTaskStore((state) => state.setPrefilledTime);
  const prefilledTitle = useTaskStore((state) => state.prefilledTitle);
  const setPrefilledTitle = useTaskStore((state) => state.setPrefilledTitle);
  const currentDateStr = useTaskStore((state) => state.currentDate);
  const categories = useTaskStore((state) => state.categories);
  const setTaskSheetOpen = useTaskStore((state) => state.setTaskSheetOpen);

  const activeIsOpen = propIsOpen !== undefined ? propIsOpen : isFABOpen;
  const activeMode = propEditTask ? 'edit' : (propMode || (editingTask ? 'edit' : 'create'));
  const activeEditTask = propEditTask || editingTask;

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('Work');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Animation & UI states
  const [isOpen, setIsOpen] = useState(false);
  const [isDateTimeExpanded, setIsDateTimeExpanded] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Subtasks list local editing state
  const [subtasks, setSubtasks] = useState<Omit<Subtask, 'completed'>[]>([]);

  // dnd-kit sensors setup for drag-reordering
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

  const inputRef = useRef<HTMLInputElement>(null);
  const subtaskScrollRef = useRef<HTMLDivElement>(null);

  const handleFocus = () => {
    setKeyboardOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
        setKeyboardOpen(false);
      }
    }, 50);
  };

  const handleSheetBack = () => {
    const active = document.activeElement as HTMLElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.blur(); // keyboard open → just close keyboard
      return;
    }
    handleClose(); // keyboard already closed → close the sheet (no save)
  };

  // Sync sheet open status to the store for global back gesture bypass
  useEffect(() => {
    setTaskSheetOpen(isOpen);
    return () => {
      setTaskSheetOpen(false);
    };
  }, [isOpen, setTaskSheetOpen]);

  // Animate sheet sliding in on mount
  useEffect(() => {
    if (activeIsOpen) {
      const timer = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setIsOpen(false);
    }
  }, [activeIsOpen]);

  // Sync edit mode / prefilled defaults
  useEffect(() => {
    if (activeIsOpen) {
      if (activeMode === 'edit' && activeEditTask) {
        setTitle(activeEditTask.title || '');
        setCategory(activeEditTask.category || 'Work');
        setDate(activeEditTask.date || '');
        setTime(activeEditTask.time || '');
        setSubtasks((activeEditTask.subtasks || []).map(({ id, title }) => ({ id, title })));
      } else {
        // Create mode
        setTitle(prefilledTitle || '');
        setCategory('Work');
        
        // Match currently selected date from store
        const selectedDateObj = new Date(currentDateStr);
        const yyyy = selectedDateObj.getFullYear();
        const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDateObj.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);

        setTime(prefilledTime || '');
        setSubtasks([]);
      }

      // Auto-focus input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Put cursor at the end of pre-populated text if present
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 150);
    }
  }, [activeIsOpen, activeMode, activeEditTask, currentDateStr, prefilledTime, prefilledTitle]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      if (propOnClose) {
        propOnClose();
      } else {
        setFABOpen(false);
        setEditingTask(null);
        setPrefilledTime('');
        setPrefilledTitle('');
      }
    }, 280);
  };

  const handleAddEmptySubtask = () => {
    if (subtasks.length >= 50) return;

    // If the last subtask is already empty, just focus it instead of adding another empty one
    const lastSub = subtasks[subtasks.length - 1];
    if (lastSub && lastSub.title.trim() === '') {
      setTimeout(() => {
        const inputs = document.querySelectorAll('.subtask-input');
        const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
        if (lastInput) {
          lastInput.focus();
        }
      }, 50);
      return;
    }

    const newId = `sub-temp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newSub = {
      id: newId,
      title: '',
    };
    setSubtasks([...subtasks, newSub]);

    // Focus the newly added subtask input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.subtask-input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
      subtaskScrollRef.current?.scrollTo({
        top: subtaskScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 50);
  };

  const handleDeleteSubtask = (subId: string) => {
    setSubtasks(subtasks.filter((sub) => sub.id !== subId));
  };

  const getDefaultTime = (): string => {
    const allTasks = useTaskStore.getState().tasks;
    const targetDate = date || formatDate(new Date());
    const sameDayTasks = allTasks.filter((t) => t.date === targetDate);

    if (sameDayTasks.length === 0) {
      // First task of the day — use current time snapped to 15 min
      const now = new Date();
      const m = Math.round(now.getMinutes() / 15) * 15;
      const d = new Date(now);
      if (m >= 60) {
        d.setHours(d.getHours() + 1);
        d.setMinutes(0);
      } else {
        d.setMinutes(m);
      }
      return formatTime(d);
    }

    // Find the latest task time on this day, place new one 60 min below
    const latestMins = sameDayTasks.reduce((max, t) => {
      const [h, mm] = (t.time || '00:00').split(':').map(Number);
      return Math.max(max, h * 60 + mm);
    }, 0);
    const newMins = Math.min(latestMins + 60, 23 * 60 + 30);
    const h = Math.floor(newMins / 60).toString().padStart(2, '0');
    const m2 = (newMins % 60).toString().padStart(2, '0');
    return `${h}:${m2}`;
  };

  const handleSaveSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const finalSubtasks: Subtask[] = subtasks
      .filter((sub) => sub.title.trim() !== '')
      .map((sub) => {
        // Retain existing completion status if editing, else default to false
        const existing = activeEditTask?.subtasks.find((s) => s.id === sub.id);
        return {
          id: sub.id,
          title: sub.title.trim(),
          completed: existing ? existing.completed : false,
        };
      });

    let finalTime: string;
    if (activeMode === 'edit' && activeEditTask) {
      // EDIT MODE: keep the existing time unless user changed it (keep original, never getDefaultTime)
      finalTime = time.trim() || activeEditTask.time || '';
    } else {
      // CREATE MODE: use selected time, or default to creation time
      finalTime = time.trim() || getDefaultTime();
    }

    const taskPayload = {
      title: title.trim(),
      category,
      date,
      time: finalTime,
      completed: activeEditTask ? activeEditTask.completed : false,
      subtasks: finalSubtasks,
    };

    if (activeEditTask) {
      updateTask(activeEditTask.id, taskPayload);
    } else {
      addTask(taskPayload);
    }

    // Trigger auto-scroll to the newly created task
    setTimeout(() => {
      const event = new CustomEvent('scroll-to-task', { detail: { time: finalTime } });
      window.dispatchEvent(event);
    }, 100);

    handleClose();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSubtasks((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over?.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  return (
    <div style={{ zIndex: 2000 }} className="fixed inset-0 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div
        style={{ zIndex: 1999 }}
        className={`absolute inset-0 bg-black/40 cursor-default transition-opacity duration-280 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleSheetBack}
      />

      {/* Modal Core Sheet — full height, flex column */}
      <form
        onSubmit={handleSaveSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`relative bg-white w-full rounded-t-[24px] shadow-2xl flex flex-col z-10 task-sheet ${
          isOpen ? 'open' : ''
        }`}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          top: '15%', // sheet starts 15% from top, fixed to bottom
          maxHeight: 'none',
          height: 'auto', // let top/bottom define height, not vh
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          zIndex: 2000,
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('input, button, select, textarea');
          if (!isInteractive && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
      >
        {/* FIXED TOP: handle bar + Save button — never moves */}
        <div 
          style={{ flexShrink: 0, cursor: 'pointer' }} 
          className="pt-4 pb-2 px-6 select-none"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('button, input, select, textarea')) {
              e.stopPropagation();
              handleSheetBack();
            }
          }}
        >
          <div className="w-8 h-1 bg-[#DADCE0] rounded-full mx-auto mb-3" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0 mr-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSheetBack();
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                className="hover:bg-gray-100 rounded-full transition-colors"
              >
                {/* down-chevron icon */}
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M6 9L11 14L16 9" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                required
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (title.trim()) {
                      handleSaveSubmit(); // Enter on title saves the whole task
                    }
                  }
                }}
                className="flex-1 bg-transparent text-[#202124] placeholder-gray-400 focus:outline-none py-1 truncate"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 cursor-pointer flex-shrink-0 ${
                title.trim()
                  ? 'bg-[#1A73E8] text-white active:bg-[#0B57D0]'
                  : 'bg-[#F1F3F4] text-[#BDC1C6] cursor-not-allowed'
              }`}
            >
              Save
            </button>
          </div>
        </div>

        {/* SCROLLABLE: Subtasks area — this is the ONLY part that scrolls */}
        <div 
          ref={subtaskScrollRef}
          style={{
            flex: 1,
            minHeight: 0, // CRITICAL for Android flex scrolling
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '8px 16px 24px 16px',
          }}
          className="scroll-container border-t border-gray-100"
        >
          {/* Subtask list — dnd-kit sortable */}
          {subtasks.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 pl-1">
                  {subtasks.map((sub, index) => (
                    <SortableSubtask
                      key={sub.id}
                      id={sub.id}
                      value={sub.title}
                      onChange={(val) => {
                        const updated = [...subtasks];
                        updated[index] = { ...updated[index], title: val };
                        setSubtasks(updated);
                      }}
                      onRemove={() => handleDeleteSubtask(sub.id)}
                      onEnterPressed={handleAddEmptySubtask}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add subtask button */}
          {subtasks.length < 50 && (
            <button
              type="button"
              onClick={handleAddEmptySubtask}
              className="flex items-center space-x-2 py-1.5 pl-1 mt-2 text-sm text-gray-400 hover:text-gray-600 w-full text-left focus:outline-none"
            >
              <Plus size={14} className="text-gray-400 flex-shrink-0" />
              <span>Add subtask...</span>
            </button>
          )}
        </div>

        {!keyboardOpen && (
          <>
            {/* FIXED: Category selector — never moves */}
            <div style={{ flexShrink: 0 }} className="px-6 py-2 space-y-1.5 border-t border-gray-100">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                <Bookmark size={13} className="text-blue-500" />
                <span>Category</span>
              </label>
              <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center px-3.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95
                        ${isSelected ? 'text-white' : ''}
                      `}
                      style={
                        isSelected 
                          ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid }
                          : { backgroundColor: 'transparent', borderColor: cat.color.solid + '50', color: cat.color.solid }
                      }
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FIXED: Date/time row — never moves */}
            <div style={{ flexShrink: 0 }} className="px-6 py-2">
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/30">
                <button
                  type="button"
                  onClick={() => setIsDateTimeExpanded(!isDateTimeExpanded)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span>Date & Time</span>
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      ({date || 'Today'}{time ? `, ${time}` : ', All-day'})
                    </span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 transition-transform duration-200 ${
                      isDateTimeExpanded ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isDateTimeExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-150/50 bg-white grid grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                        <Calendar size={13} className="text-blue-500" />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                        <Clock size={13} className="text-blue-500" />
                        <span>Time</span>
                      </label>
                      
                      <div className="flex items-center space-x-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setTime('')}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none
                            ${!time 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
                            }
                          `}
                        >
                          All-Day
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!time) {
                              const now = new Date();
                              const hrs = String(now.getHours()).padStart(2, '0');
                              const mins = String(Math.round(now.getMinutes() / 15) * 15 % 60).padStart(2, '0');
                              setTime(`${hrs}:${mins}`);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none
                            ${time 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50'
                            }
                          `}
                        >
                          Set Time
                        </button>
                      </div>

                      {time ? (
                        <div className="flex justify-center pt-1">
                          <TimeWheelPicker value={time} onChange={setTime} />
                        </div>
                      ) : (
                        <div className="h-[120px] flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                          <span className="text-[11px] text-gray-400 italic font-medium">All day</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Bottom spacer for safe area */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', flexShrink: 0 }} />
      </form>
    </div>
  );
};
