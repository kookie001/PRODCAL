import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ListTodo, Clock, CalendarDays, Grid, Search, ArrowLeft, X, Menu, Calendar, Settings } from 'lucide-react';

import { useTaskStore } from './store';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CategoryTabBar } from './components/CategoryTabBar';
import { CalendarViews } from './components/CalendarViews';
import { TaskSheet } from './components/TaskSheet';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { Ripple } from './components/Ripple';
import { TasksOverlay } from './components/TasksOverlay';
import { BinOverlay } from './components/BinOverlay';

export default function App() {
  const theme = useTaskStore((state) => state.theme);
  const isFABOpen = useTaskStore((state) => state.isFABOpen);
  const setFABOpen = useTaskStore((state) => state.setFABOpen);
  const selectedView = useTaskStore((state) => state.selectedView);
  const setSelectedView = useTaskStore((state) => state.setSelectedView);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  const selectedTaskForDetails = useTaskStore((state) => state.selectedTaskForDetails);
  const isTasksOverlayOpen = useTaskStore((state) => state.isTasksOverlayOpen);
  const isBottomBarVisible = useTaskStore((state) => state.isBottomBarVisible);
  const isBinOpen = useTaskStore((state) => state.isBinOpen);
  
  const lastDeletedTask = useTaskStore((state) => state.lastDeletedTask);
  const setLastDeletedTask = useTaskStore((state) => state.setLastDeletedTask);
  const undoDeleteTask = useTaskStore((state) => state.undoDeleteTask);
  
  // Local states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [previousView, setPreviousView] = useState(selectedView);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  // Refs to avoid stale closures in event listeners
  const isSidebarOpenRef = useRef(isSidebarOpen);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Intercept back button to prevent accidental exits (Android back button pattern)
  useEffect(() => {
    let lastBackPress = 0;

    const handleBackButton = (e: PopStateEvent) => {
      // 1. Check if task sheet (FAB) is open — highest priority
      const isFABOpen = useTaskStore.getState().isFABOpen;
      const isTaskSheetOpen = useTaskStore.getState().isTaskSheetOpen;
      if (isFABOpen || isTaskSheetOpen) {
        // Check if calendar picker is open inside the TaskSheet
        const calendarPickerOverlay = document.getElementById('calendar-picker-overlay');
        if (calendarPickerOverlay) {
          calendarPickerOverlay.click();
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // Check if clock picker is open inside the TaskSheet
        const clockPickerOverlay = document.getElementById('clock-picker-overlay');
        if (clockPickerOverlay) {
          clockPickerOverlay.click();
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
          return;
        }

        // Otherwise directly close the task sheet using real state functions
        useTaskStore.getState().setFABOpen(false);
        useTaskStore.getState().setTaskSheetOpen(false);
        useTaskStore.getState().setEditingTask(null);
        useTaskStore.getState().setPrefilledTime('');
        useTaskStore.getState().setPrefilledTitle('');
        
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 2. Check if drawer/sidebar is open
      if (isSidebarOpenRef.current) {
        setIsSidebarOpen(false);
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 3. Check if Pending/My Tasks list overlay is open
      if (useTaskStore.getState().isTasksOverlayOpen) {
        useTaskStore.getState().setTasksOverlayOpen(false);
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 3.5 Check if Bin overlay is open
      if (useTaskStore.getState().isBinOpen) {
        useTaskStore.getState().setBinOpen(false);
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 4. Check if search is active/query not empty
      if (searchQueryRef.current.trim() !== '') {
        setSearchQuery('');
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // 5. On main timeline with nothing open -> allow app exit (press back again to exit)
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        // Second press within 2 seconds — allow exit
        return;
      }
      // First press — prevent exit, show toast, record time
      e.preventDefault();
      lastBackPress = now;
      showToast('Press back again to exit');
      // Push state back so app doesn't close
      window.history.pushState(null, '', window.location.href);
    };

    // Push initial state to intercept back
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);

    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);

  // Auto-dismiss the last deleted task notification after 5 seconds
  useEffect(() => {
    if (lastDeletedTask) {
      const timer = setTimeout(() => {
        setLastDeletedTask(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedTask, setLastDeletedTask]);

  // Force light mode on mount, prevent any dark mode classing, and purge old deleted tasks
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    useTaskStore.getState().purgeOldDeletedTasks();
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
          {/* HIDDEN 2026-07-07 — removed from header per request, keep for future re-enable */}
          {false ? (
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
          
          {/* Collapsible Left Sidebar */}
          <AnimatePresence>
            {isSidebarOpen && (
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            )}
          </AnimatePresence>

          {/* Dynamic Calendar Views container */}
          <motion.main
            animate={{
              scale: isSidebarOpen ? 0.97 : 1,
              x: isSidebarOpen ? 16 : 0,
              opacity: isSidebarOpen ? 0.7 : 1,
            }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white origin-left"
          >
            <CategoryTabBar />
            <CalendarViews searchQuery={searchQuery} />
          </motion.main>
        </div>

        {/* Floating "+" FAB (always on top of timeline/cards with zIndex: 900) */}
        {!isTasksOverlayOpen && !isSidebarOpen && (selectedView === 'schedule' || selectedView === 'day' || selectedView === 'week' || selectedView === 'month' || selectedView === '3day') ? (
          <div 
            className="absolute bottom-20 right-4"
            style={{ zIndex: 900 }}
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setFABOpen(true)}
              className="w-14 h-14 bg-[#E8F0FE] hover:opacity-90 rounded-[16px] shadow-lg hover:shadow-xl flex items-center justify-center transition-all cursor-pointer group relative overflow-hidden"
              title="Create Task"
            >
              <Ripple color="rgba(0, 0, 0, 0.08)" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 scale-125 transition-transform duration-300 group-hover:rotate-90">
                <path d="M5 12h14" stroke="#1A73E8" strokeWidth="4" strokeLinecap="round" />
                <path d="M12 5v14" stroke="#1A73E8" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </motion.button>
          </div>
        ) : null}

         {/* Material 3 Undo Snackbar */}
        <AnimatePresence>
          {lastDeletedTask && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, bottom: 16 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed bottom-20 left-4 right-4 bg-neutral-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center justify-between z-[950] border border-neutral-800"
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
        <AnimatePresence>
          {isFABOpen && <TaskSheet />}
        </AnimatePresence>

        {/* Task detail card modal picker */}
        <AnimatePresence>
          {selectedTaskForDetails && <TaskDetailsModal />}
        </AnimatePresence>

        {/* Global Google Calendar style Tasks list overlay */}
        <AnimatePresence>
          {isTasksOverlayOpen && (
            <TasksOverlay 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
        </AnimatePresence>

        {/* Trash/Bin overlay */}
        <AnimatePresence>
          {isBinOpen && <BinOverlay />}
        </AnimatePresence>

        {/* Toast Notification */}
        {toastMsg && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#323232',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 9999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
