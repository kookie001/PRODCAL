import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Bookmark, Calendar, Clock, Sparkles } from 'lucide-react';
import { CategoryType, CATEGORIES } from '../types';
import { format } from 'date-fns';

interface QuickCreatePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedHour: number;
  onSave: (title: string, category: CategoryType) => void;
  onMoreOptions: (title: string, category: CategoryType) => void;
}

export const QuickCreatePopover: React.FC<QuickCreatePopoverProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedHour,
  onSave,
  onMoreOptions,
}) => {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Work');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSelectedCategory('Work');
      // Autofocus the title input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format time display
  const ampm = selectedHour >= 12 ? 'PM' : 'AM';
  const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
  const timeString = `${displayHour}:00 ${ampm}`;
  const dateString = format(selectedDate, 'EEE, MMMM d');

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), selectedCategory);
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 bg-black/45 z-40 flex items-end justify-center select-none">
        {/* Scrim tap to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Popover sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white w-full rounded-t-3xl border border-gray-100 shadow-2xl overflow-hidden z-10 p-5 pb-6 space-y-4 max-w-md mx-auto"
        >
          {/* Top handle pill for swipe close hint */}
          <div className="flex justify-center -mt-2 mb-2">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center space-x-1">
              <Sparkles size={12} />
              <span>Quick Create</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveSubmit} className="space-y-4">
            {/* Title field */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Date & Time indicators */}
            <div className="flex items-center space-x-4 text-xs font-semibold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100/50">
              <div className="flex items-center space-x-1.5">
                <Calendar size={13} className="text-blue-500" />
                <span>{dateString}</span>
              </div>
              <div className="flex items-center space-x-1.5 border-l border-gray-200 pl-4">
                <Clock size={13} className="text-blue-500" />
                <span>{timeString}</span>
              </div>
            </div>

            {/* Category pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1 select-none">
                <Bookmark size={10} />
                <span>Category</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-material hover:scale-105
                        ${isSelected 
                          ? `${cat.color.bgLight} ${cat.color.light} ${cat.color.borderLight} ring-1 ring-blue-500/10` 
                          : 'bg-gray-50 text-gray-600 border-gray-150 hover:border-gray-200'
                        }
                      `}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: cat.color.solid }} 
                      />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onMoreOptions(title, selectedCategory)}
                className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3.5 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                More options
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
