import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Square, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  ListTodo
} from 'lucide-react';
import { useTaskStore } from '../store';
import { CATEGORIES } from '../types';

export const TaskDetailsModal: React.FC = () => {
  const selectedTask = useTaskStore((state) => state.selectedTaskForDetails);
  const setSelectedTaskForDetails = useTaskStore((state) => state.setSelectedTaskForDetails);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const setEditingTask = useTaskStore((state) => state.setEditingTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);

  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(true);

  if (!selectedTask) return null;

  const categoryInfo = CATEGORIES.find((cat) => cat.id === selectedTask.category) || CATEGORIES[0];

  const handleToggleTaskCompleted = () => {
    updateTask(selectedTask.id, { completed: !selectedTask.completed });
  };

  const handleDelete = () => {
    deleteTask(selectedTask.id);
    setSelectedTaskForDetails(null);
  };

  const handleEdit = () => {
    setEditingTask(selectedTask);
    setSelectedTaskForDetails(null); // Close details and open sheet
  };

  // Date formatting for human-friendly reading
  const dateObj = new Date(selectedTask.date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AnimatePresence>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-3xs z-40 flex items-end justify-center p-0">
        {/* Backdrop Tap to Close */}
        <div 
          className="absolute inset-0 cursor-default" 
          onClick={() => setSelectedTaskForDetails(null)} 
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-10"
        >
          {/* Action Header */}
          <div className="flex items-center justify-end px-4 py-2 bg-gray-50 border-b border-gray-100 space-x-1">
            <button
              onClick={handleEdit}
              className="p-2 hover:bg-gray-200/60 rounded-full text-gray-600 transition-colors cursor-pointer"
              title="Edit task"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-rose-100 rounded-full text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete task"
            >
              <Trash2 size={18} />
            </button>
            <div className="h-6 w-[1px] bg-gray-200 mx-1" />
            <button
              onClick={() => setSelectedTaskForDetails(null)}
              className="p-2 hover:bg-gray-200/60 rounded-full text-gray-600 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Core Info Body */}
          <div className="p-6 space-y-5">
            {/* Title & Status */}
            <div className="flex items-start space-x-3">
              <button
                onClick={handleToggleTaskCompleted}
                className="mt-1 text-blue-600 transition-material hover:scale-105"
              >
                {selectedTask.completed ? (
                  <CheckSquare size={22} className="fill-blue-50" />
                ) : (
                  <Square size={22} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg font-semibold text-gray-900 leading-tight break-words
                  ${selectedTask.completed ? 'line-through text-gray-400' : ''}
                `}>
                  {selectedTask.title}
                </h2>
                
                {/* Category Badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                    ${categoryInfo.color.bgLight} ${categoryInfo.color.light} ${categoryInfo.color.borderLight}
                  `}>
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: categoryInfo.color.solid }} 
                    />
                    <span>{categoryInfo.name}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Event Time details */}
            <div className="space-y-3 pt-3 border-t border-gray-50">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Calendar size={18} className="text-gray-400" />
                <span className="font-medium">{formattedDate}</span>
              </div>
              
              {selectedTask.time && (
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Clock size={18} className="text-gray-400" />
                  <span className="font-medium">{selectedTask.time}</span>
                </div>
              )}
            </div>

            {/* Subtasks checklist (Collapsible) */}
            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
              <div className="pt-3 border-t border-gray-50 space-y-2">
                <button
                  onClick={() => setIsSubtasksExpanded(!isSubtasksExpanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <ListTodo size={14} />
                    <span>Subtasks ({selectedTask.subtasks.filter(s => s.completed).length}/{selectedTask.subtasks.length})</span>
                  </span>
                  {isSubtasksExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Subtask list slider */}
                <AnimatePresence initial={false}>
                  {isSubtasksExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-1.5 pl-1"
                    >
                      {selectedTask.subtasks.map((sub) => (
                        <div 
                          key={sub.id} 
                          className="flex items-center space-x-2.5 p-1.5 rounded hover:bg-gray-50 transition-colors"
                        >
                          <button
                            onClick={() => toggleSubtask(selectedTask.id, sub.id)}
                            className="text-blue-600 hover:scale-105 transition-transform"
                          >
                            {sub.completed ? (
                              <CheckSquare size={16} className="fill-blue-50" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <span className={`text-sm text-gray-700 break-words
                            ${sub.completed ? 'line-through text-gray-400' : ''}
                          `}>
                            {sub.title}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
