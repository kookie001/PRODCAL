import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trash2, RotateCcw, Trash } from 'lucide-react';
import { useTaskStore } from '../store';

export const BinOverlay: React.FC = () => {
  const isBinOpen = useTaskStore((state) => state.isBinOpen);
  const setBinOpen = useTaskStore((state) => state.setBinOpen);
  const deletedTasks = useTaskStore((state) => state.deletedTasks);
  const restoreTask = useTaskStore((state) => state.restoreTask);
  const deleteTaskForever = useTaskStore((state) => state.deleteTaskForever);

  if (!isBinOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 240 }}
      className="absolute inset-0 bg-white z-[950] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-150 bg-white flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setBinOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-gray-800 text-base">Bin</span>
        </div>
        <div className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-1 rounded-full">
          {deletedTasks.length} {deletedTasks.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Info Warning Banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-[11px] text-amber-800 flex items-start space-x-2 flex-shrink-0">
        <span className="font-bold">Note:</span>
        <span>Items in the Bin are kept for 30 days before being automatically permanently removed.</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {deletedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Trash size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Your Bin is empty</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
              When you delete a task, it will appear here for 30 days before being deleted forever.
            </p>
          </div>
        ) : (
          deletedTasks.map((task) => {
            // Calculate days remaining
            const deletedTime = new Date(task.deletedAt).getTime();
            const daysPassed = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, 30 - daysPassed);

            return (
              <div
                key={task.id}
                className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start justify-between space-x-3 shadow-xs hover:border-gray-200 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {task.category}
                  </span>
                  <h4 className="text-xs font-bold text-gray-800 truncate mt-0.5">
                    {task.title}
                  </h4>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                      {task.subtasks.length} subtasks
                    </p>
                  )}
                  <p className="text-[10px] font-semibold text-amber-600 mt-1.5 flex items-center bg-amber-50 w-max px-1.5 py-0.5 rounded">
                    Auto-deletes in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                  </p>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => restoreTask(task.id)}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-all cursor-pointer flex items-center justify-center"
                    title="Restore"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Permanently delete this task forever? This cannot be undone.')) {
                        deleteTaskForever(task.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 transition-all cursor-pointer flex items-center justify-center"
                    title="Delete forever"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
