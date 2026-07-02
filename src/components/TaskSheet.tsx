import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Check, 
  Calendar, 
  Clock, 
  Bookmark, 
  GripVertical
} from 'lucide-react';
import { useTaskStore } from '../store';
import { Task, CategoryType, CATEGORIES, Subtask } from '../types';

export const TaskSheet: React.FC = () => {
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

  // Form Fields State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('Work');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Subtasks list local editing state
  const [subtasks, setSubtasks] = useState<Omit<Subtask, 'completed'>[]>([]);

  // Drag and drop state for subtasks
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pointerStartY, setPointerStartY] = useState<number>(0);
  const [draggedOffset, setDraggedOffset] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync edit mode / prefilled defaults
  useEffect(() => {
    if (isFABOpen) {
      if (editingTask) {
        setTitle(editingTask.title);
        setCategory(editingTask.category);
        setDate(editingTask.date);
        setTime(editingTask.time || '');
        setSubtasks(editingTask.subtasks.map(({ id, title }) => ({ id, title })));
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
  }, [isFABOpen, editingTask, currentDateStr, prefilledTime, prefilledTitle]);

  const handleClose = () => {
    setFABOpen(false);
    setEditingTask(null);
    setPrefilledTime('');
    setPrefilledTitle('');
  };

  const handleAddSubtask = () => {
    if (subtasks.length >= 5) return;

    const newSub = {
      id: `sub-temp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: '',
    };

    setSubtasks([...subtasks, newSub]);
  };

  const handleDeleteSubtask = (subId: string) => {
    setSubtasks(subtasks.filter((sub) => sub.id !== subId));
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalSubtasks: Subtask[] = subtasks.map((sub) => {
      // Retain existing completion status if editing, else default to false
      const existing = editingTask?.subtasks.find((s) => s.id === sub.id);
      return {
        id: sub.id,
        title: sub.title.trim() || 'Untitled Subtask',
        completed: existing ? existing.completed : false,
      };
    });

    const taskPayload = {
      title: title.trim(),
      category,
      date,
      time: time || undefined,
      completed: editingTask ? editingTask.completed : false,
      subtasks: finalSubtasks,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskPayload);
    } else {
      addTask(taskPayload);
    }

    handleClose();
  };

  // Drag handles
  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDraggedIndex(index);
    setPointerStartY(e.clientY);
    setDraggedOffset(0);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handlePointerMove = (index: number, e: React.PointerEvent) => {
    if (draggedIndex !== index) return;
    const currentY = e.clientY;
    const diffY = currentY - pointerStartY;
    setDraggedOffset(diffY);

    const rowHeight = 44; // subtask row estimated height
    const swapThreshold = rowHeight * 0.5;

    if (diffY > swapThreshold && index < subtasks.length - 1) {
      const updated = [...subtasks];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;

      setPointerStartY((prev) => prev + rowHeight);
      setDraggedIndex(index + 1);
      setSubtasks(updated);
      setDraggedOffset(diffY - rowHeight);
    } else if (diffY < -swapThreshold && index > 0) {
      const updated = [...subtasks];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;

      setPointerStartY((prev) => prev - rowHeight);
      setDraggedIndex(index - 1);
      setSubtasks(updated);
      setDraggedOffset(diffY + rowHeight);
    }
  };

  const handlePointerUp = (index: number, e: React.PointerEvent) => {
    if (draggedIndex === index) {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);
      setDraggedIndex(null);
      setDraggedOffset(0);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center select-none">
      {/* Premium Glass-blur Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="absolute inset-0 bg-black/40 cursor-default"
        onClick={handleClose}
      />

      {/* Modal Core Sheet */}
      <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 300, mass: 0.8 }}
          className="relative bg-white w-full rounded-t-2xl shadow-2xl flex flex-col max-h-[90%] overflow-hidden border border-gray-100 z-10"
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">
              {editingTask ? 'Edit Task' : 'Create Task'}
            </h3>
            <button 
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <form onSubmit={handleSaveSubmit} className="space-y-6">
              
              {/* 1. Task Title Input */}
              <div className="space-y-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  required
                  placeholder="Task Title (e.g. Weekly Sync)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                      dateInput?.focus();
                    }
                  }}
                  className="w-full bg-transparent text-xl font-medium text-gray-900 border-b border-gray-200 focus:border-blue-600 focus:outline-none py-1 transition-all placeholder-gray-400"
                />
              </div>

              {/* 2. Category Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                  <Bookmark size={13} className="text-blue-500" />
                  <span>Category</span>
                </label>
                <div className="w-full overflow-x-auto scrollbar-none py-1">
                  <div className="flex items-center space-x-2 whitespace-nowrap">
                    {categories.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className="flex items-center px-4 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105 cursor-pointer"
                          style={
                            isSelected 
                              ? { backgroundColor: cat.color.solid, borderColor: cat.color.solid, color: '#ffffff' }
                              : { backgroundColor: 'transparent', borderColor: cat.color.solid, color: cat.color.solid }
                          }
                        >
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Date & Time Picker */}
              <div className="grid grid-cols-2 gap-4">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
                        timeInput?.focus();
                      }
                    }}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                    <Clock size={13} className="text-blue-500" />
                    <span>Time (Optional)</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const subInput = document.querySelector('input[placeholder="Subtask description..."]') as HTMLInputElement;
                        if (subInput) {
                          subInput.focus();
                        } else {
                          e.currentTarget.blur();
                        }
                      }
                    }}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* 4. "+ Add Subtask" Button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={subtasks.length >= 5}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Subtask</span>
                </button>

                {/* Subtasks Indented checklist */}
                {subtasks.length > 0 && (
                  <div className="pl-4 border-l-2 border-blue-100 space-y-2">
                    {subtasks.map((sub, index) => {
                      const isDragging = draggedIndex === index;
                      return (
                        <div
                          key={sub.id}
                          className={`flex items-center space-x-2 py-1.5 px-2 rounded bg-white relative transition-all duration-150
                            ${isDragging ? 'shadow-lg scale-[1.02] bg-blue-50/50 z-50 border border-blue-200' : 'border border-transparent'}
                          `}
                          style={isDragging ? { transform: `translateY(${draggedOffset}px)`, touchAction: 'none' } : { touchAction: 'none' }}
                        >
                          {/* Drag Handle (≡) */}
                          <button
                            type="button"
                            onPointerDown={(e) => handlePointerDown(index, e)}
                            onPointerMove={(e) => handlePointerMove(index, e)}
                            onPointerUp={(e) => handlePointerUp(index, e)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                            title="Drag to reorder"
                          >
                            <GripVertical size={16} />
                          </button>

                          {/* Text Input */}
                          <input
                            type="text"
                            value={sub.title}
                            onChange={(e) => {
                              const updated = [...subtasks];
                              updated[index].title = e.target.value;
                              setSubtasks(updated);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const allSubInputs = Array.from(document.querySelectorAll('input[placeholder="Subtask description..."]')) as HTMLInputElement[];
                                const currIndex = allSubInputs.indexOf(e.currentTarget);
                                if (currIndex < allSubInputs.length - 1) {
                                  allSubInputs[currIndex + 1].focus();
                                } else {
                                  if (sub.title.trim() && subtasks.length < 5) {
                                    handleAddSubtask();
                                    setTimeout(() => {
                                      const updatedSubInputs = Array.from(document.querySelectorAll('input[placeholder="Subtask description..."]')) as HTMLInputElement[];
                                      updatedSubInputs[updatedSubInputs.length - 1]?.focus();
                                    }, 50);
                                  } else {
                                    e.currentTarget.blur();
                                  }
                                }
                              }
                            }}
                            placeholder="Subtask description..."
                            className="flex-1 bg-transparent border-b border-gray-100 focus:border-blue-600 focus:outline-none text-sm text-gray-800 py-1"
                          />

                          {/* Remove button (×) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded flex-shrink-0"
                            title="Remove subtask"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </form>
          </div>

          {/* Footer Save actions */}
          <div 
            className="flex items-center justify-end space-x-2 p-6 border-t border-gray-100 flex-shrink-0"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 16px))' }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubmit}
              disabled={!title.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>{editingTask ? 'Apply Changes' : 'Save Task'}</span>
            </button>
          </div>
        </motion.div>
    </div>
  );
};
