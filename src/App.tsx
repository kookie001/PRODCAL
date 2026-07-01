import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ListTodo, Clock, CalendarDays, Grid, Search, ArrowLeft, X } from 'lucide-react';

import { useTaskStore } from './store';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CategoryTabBar } from './components/CategoryTabBar';
import { CalendarViews } from './components/CalendarViews';
import { TaskSheet } from './components/TaskSheet';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { Ripple } from './components/Ripple';
import { TasksOverlay } from './components/TasksOverlay';

export default function App() {
  const theme = useTaskStore((state) => state.theme);
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const selectedView = useTaskStore((state) => state.selectedView);
  const setSelectedView = useTaskStore((state) => state.setSelectedView);
  
  const lastDeletedTask = useTaskStore((state) => state.lastDeletedTask);
  const setLastDeletedTask = useTaskStore((state) => state.setLastDeletedTask);
  const undoDeleteTask = useTaskStore((state) => state.undoDeleteTask);
  
  // Local states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [previousView, setPreviousView] = useState(selectedView);

  // Auto-dismiss the last deleted task notification after 5 seconds
  useEffect(() => {
    if (lastDeletedTask) {
      const timer = setTimeout(() => {
        setLastDeletedTask(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedTask, setLastDeletedTask]);

  // Force light mode on mount and prevent any dark mode classing
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSearchTabClick = () => {
    if (!isSearchActive) {
      setPreviousView(selectedView);
      setSelectedView('schedule'); // Schedule view is best for showing query results
      setIsSearchActive(true);
    } else {
      handleCloseSearch();
    }
  };

  const handleCloseSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    setSelectedView(previousView);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 w-full overflow-hidden select-none">
      
      {/* Outer mock viewport bounds (strictly optimized for 360px - 430px) */}
      <div className="w-full max-w-[430px] h-screen bg-white flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-200/50 text-gray-800 font-sans transition-colors duration-200">
        
        {/* Header Bar or Search Overlay */}
        <AnimatePresence mode="wait">
          {isSearchActive ? (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="flex items-center px-3 h-14 bg-white border-b border-gray-100 flex-shrink-0 space-x-2 z-30"
            >
              <button
                onClick={handleCloseSearch}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 relative flex items-center bg-gray-100 rounded-full h-9 px-4">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks or subtasks..."
                  className="w-full bg-transparent border-none outline-none text-xs text-gray-800 placeholder-gray-400 py-1"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-200 rounded-full text-gray-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <Header 
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={handleToggleSidebar}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearchClick={() => setIsSearchActive(true)}
            />
          )}
        </AnimatePresence>

        {/* Main Body Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Mobile Sidebar backdrop */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-black z-40"
              />
            )}
          </AnimatePresence>

          {/* Collapsible Left Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          {/* Dynamic Calendar Views container */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
            <CategoryTabBar />
            <CalendarViews searchQuery={searchQuery} />
          </main>

          {/* Floating "+" FAB (positioned beautifully at bottom-right corner) */}
          <div className="absolute bottom-6 right-6 z-30">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setFABOpen(true)}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl flex items-center justify-center transition-material cursor-pointer group relative overflow-hidden"
              title="Create Task"
            >
              <Ripple color="rgba(255, 255, 255, 0.2)" />
              <Plus size={26} className="group-hover:rotate-90 transition-transform duration-300 relative z-10" />
            </motion.button>
          </div>
        </div>

        {/* Material 3 Undo Snackbar */}
        <AnimatePresence>
          {lastDeletedTask && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute bottom-20 left-4 right-4 bg-neutral-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center justify-between z-50 border border-neutral-800"
            >
              <div className="flex flex-col text-left min-w-0 flex-1 mr-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Task Deleted
                </span>
                <span className="text-xs font-semibold text-neutral-100 truncate">
                  {lastDeletedTask.title}
                </span>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  onClick={() => undoDeleteTask()}
                  className="text-xs font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300 active:scale-95 transition-all cursor-pointer bg-transparent border-none outline-none px-1 py-0.5"
                >
                  Undo
                </button>
                <button
                  onClick={() => setLastDeletedTask(null)}
                  className="text-neutral-400 hover:text-neutral-200 p-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Sheet Creator & Editor */}
        <TaskSheet />

        {/* Task detail card modal picker */}
        <TaskDetailsModal />

        {/* Global Google Calendar style Tasks list overlay */}
        <TasksOverlay />
      </div>
    </div>
  );
}
