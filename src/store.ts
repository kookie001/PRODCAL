import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, CategoryType, ViewType, Subtask, CategoryConfig, CATEGORIES } from './types';

const GOOGLE_COLORS = [
  { light: 'text-purple-700', bgLight: 'bg-purple-50', borderLight: 'border-purple-200', solid: '#8E24AA' },
  { light: 'text-rose-700', bgLight: 'bg-rose-50', borderLight: 'border-rose-200', solid: '#E67C73' },
  { light: 'text-teal-700', bgLight: 'bg-teal-50', borderLight: 'border-teal-200', solid: '#33B679' },
  { light: 'text-sky-700', bgLight: 'bg-sky-50', borderLight: 'border-sky-200', solid: '#039BE5' },
  { light: 'text-indigo-700', bgLight: 'bg-indigo-50', borderLight: 'border-indigo-200', solid: '#3F51B5' },
  { light: 'text-violet-700', bgLight: 'bg-violet-50', borderLight: 'border-violet-200', solid: '#7986CB' },
];

interface TaskState {
  // Persisted state
  tasks: Task[];
  theme: 'light' | 'dark';
  selectedView: ViewType;
  categories: CategoryConfig[];
  
  // Non-persisted transient state
  currentDate: string; // ISO String of the current active date for calendar view
  direction: 'next' | 'prev'; // For slide transitions
  selectedCategory: CategoryType | 'All';
  isFABOpen: boolean;
  editingTask: Task | null; // For editing existing tasks in the task sheet
  selectedTaskForDetails: Task | null; // For showing task detail modal
  prefilledTime: string; // Pre-filled HH:MM for new tasks
  prefilledTitle: string; // Pre-filled title for new tasks
  isHeaderCollapsed: boolean; // For Material 3 scroll-to-collapse header
  lastDeletedTask: Task | null; // For Undo snackbar
  isTasksOverlayOpen: boolean; // Global state for full-screen GCAL Tasks view
  isBottomBarVisible: boolean; // For scroll hiding bottom bar
  isTaskSheetOpen: boolean; // True when the task create/edit sheet is open
}

interface TaskActions {
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updatedFields: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addCategory: (name: string) => void;
  
  setCurrentDate: (date: Date) => void;
  setDirection: (direction: 'next' | 'prev') => void;
  setSelectedCategory: (category: CategoryType | 'All') => void;
  setSelectedView: (view: ViewType) => void;
  toggleTheme: () => void;
  setFABOpen: (isOpen: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setSelectedTaskForDetails: (task: Task | null) => void;
  setPrefilledTime: (time: string) => void;
  setPrefilledTitle: (title: string) => void;
  setHeaderCollapsed: (collapsed: boolean) => void;
  setLastDeletedTask: (task: Task | null) => void;
  undoDeleteTask: () => void;
  setTasksOverlayOpen: (open: boolean) => void;
  setBottomBarVisible: (visible: boolean) => void;
  setTaskSheetOpen: (open: boolean) => void;
  
  // Subtask helpers
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtaskComplete: (taskId: string, subtaskIndex: number) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  reorderSubtasks: (taskId: string, subtasks: Subtask[]) => void;
}

export const useTaskStore = create<TaskState & TaskActions>()(
  persist(
    (set, get) => ({
      // Default state
      tasks: [
        {
          id: 'sample-gcal-1',
          title: 'Birthday of Rabindranath',
          category: 'Holidays',
          date: '2026-05-09',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-1-curr',
          title: 'Birthday of Rabindranath',
          category: 'Holidays',
          date: '2026-07-09',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-2',
          title: 'VENTURE DAY DELHI',
          category: 'Work',
          date: '2026-05-16',
          time: '15:00',
          completed: false,
          subtasks: [
            { id: 'sub-v-1', title: 'Keynote Speech', completed: false },
            { id: 'sub-v-2', title: 'Investor Pitch Session', completed: false },
            { id: 'sub-v-3', title: 'Networking & Co-working drinks', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-2-curr',
          title: 'VENTURE DAY DELHI',
          category: 'Work',
          date: '2026-07-16',
          time: '15:00',
          completed: false,
          subtasks: [
            { id: 'sub-v-1-c', title: 'Keynote Speech', completed: false },
            { id: 'sub-v-2-c', title: 'Investor Pitch Session', completed: false },
            { id: 'sub-v-3-c', title: 'Networking & Co-working drinks', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-3',
          title: 'Happy birthday!',
          category: 'Personal',
          date: '2026-05-17',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-3-curr',
          title: 'Happy birthday!',
          category: 'Personal',
          date: '2026-07-17',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-4',
          title: '30 min with Edvin (Lucky singh)',
          category: 'Work',
          date: '2026-05-22',
          time: '13:00',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-4-curr',
          title: '30 min with Edvin (Lucky singh)',
          category: 'Work',
          date: '2026-07-22',
          time: '13:00',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-5',
          title: 'Bakrid',
          category: 'Holidays',
          date: '2026-05-28',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-5-curr',
          title: 'Bakrid',
          category: 'Holidays',
          date: '2026-07-28',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-6',
          title: 'Bakrid/Eid ul-Adha (tentative)',
          category: 'Holidays',
          date: '2026-05-28',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-6-curr',
          title: 'Bakrid/Eid ul-Adha (tentative)',
          category: 'Holidays',
          date: '2026-07-28',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-7-curr',
          title: 'Diwali Festival of Lights 🪔',
          category: 'Holidays',
          date: '2026-07-12',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-8-curr',
          title: 'Independence Day Holiday 🇺🇸',
          category: 'Holidays',
          date: '2026-07-04',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-9-curr',
          title: 'Netflix Movie Night 🍿',
          category: 'Other',
          date: '2026-07-10',
          time: '20:00',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-10-curr',
          title: 'Morning Yoga & Fitness Run 🏃‍♂️',
          category: 'Health',
          date: '2026-07-02',
          time: '07:30',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-gcal-11-curr',
          title: 'Dentist Checkup Appointment 🦷',
          category: 'Health',
          date: '2026-07-06',
          time: '11:00',
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString()
        }
      ],
      theme: 'light',
      selectedView: 'month',
      categories: CATEGORIES,
      
      currentDate: new Date().toISOString(),
      direction: 'next',
      selectedCategory: 'All',
      isFABOpen: false,
      editingTask: null,
      selectedTaskForDetails: null,
      prefilledTime: '',
      prefilledTitle: '',
      isHeaderCollapsed: false,
      lastDeletedTask: null,
      isTasksOverlayOpen: false,
      isBottomBarVisible: true,
      isTaskSheetOpen: false,

      // Actions
      addTask: (taskData) => set((state) => {
        const newTask: Task = {
          ...taskData,
          id: `task-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        return {
          tasks: [newTask, ...state.tasks],
          isFABOpen: false,
          editingTask: null
        };
      }),

      updateTask: (id, updatedFields) => set((state) => {
        const updatedTasks = state.tasks.map((task) =>
          task.id === id ? { ...task, ...updatedFields } : task
        );
        
        // Keep selectedTaskForDetails in sync if it is the one being updated
        const updatedDetails = state.selectedTaskForDetails?.id === id 
          ? { ...state.selectedTaskForDetails, ...updatedFields }
          : state.selectedTaskForDetails;

        return {
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails,
          editingTask: null,
          isFABOpen: false
        };
      }),

      deleteTask: (id) => set((state) => {
        const taskToDelete = state.tasks.find((task) => task.id === id);
        return {
          tasks: state.tasks.filter((task) => task.id !== id),
          lastDeletedTask: taskToDelete || null,
          selectedTaskForDetails: state.selectedTaskForDetails?.id === id ? null : state.selectedTaskForDetails,
          editingTask: state.editingTask?.id === id ? null : state.editingTask
        };
      }),

      setCurrentDate: (date) => set((state) => {
        const year = date.getFullYear();
        if (year < 2024 || year > 2027) return {};
        const current = new Date(state.currentDate);
        const direction = date.getTime() >= current.getTime() ? 'next' : 'prev';
        return { currentDate: date.toISOString(), direction };
      }),
      setDirection: (direction) => set({ direction }),
      
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      
      setSelectedView: (view) => set({ selectedView: view }),
      
      toggleTheme: () => set((state) => {
        const nextTheme = state.theme === 'light' ? 'dark' : 'light';
        // Toggle the 'dark' class on <html> document element for Tailwind dark styling
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: nextTheme };
      }),

      setFABOpen: (isOpen) => set((state) => ({
        isFABOpen: isOpen,
        editingTask: isOpen ? state.editingTask : null // Reset edit mode if closing
      })),

      setEditingTask: (task) => set({
        editingTask: task,
        isFABOpen: task !== null
      }),

      setSelectedTaskForDetails: (task) => set({ selectedTaskForDetails: task }),

      setPrefilledTime: (time) => set({ prefilledTime: time }),

      setPrefilledTitle: (title) => set({ prefilledTitle: title }),

      setHeaderCollapsed: (collapsed) => set({ isHeaderCollapsed: collapsed }),

      setLastDeletedTask: (task) => set({ lastDeletedTask: task }),

      undoDeleteTask: () => set((state) => {
        if (!state.lastDeletedTask) return {};
        const alreadyExists = state.tasks.some((t) => t.id === state.lastDeletedTask?.id);
        const updatedTasks = alreadyExists ? state.tasks : [...state.tasks, state.lastDeletedTask];
        return {
          tasks: updatedTasks,
          lastDeletedTask: null
        };
      }),

      setTasksOverlayOpen: (open) => set({ isTasksOverlayOpen: open }),
      
      setBottomBarVisible: (visible) => set({ isBottomBarVisible: visible }),

      setTaskSheetOpen: (open) => set({ isTaskSheetOpen: open }),

      // Subtask specific methods
      toggleSubtask: (taskId, subtaskId) => set((state) => {
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          
          const updatedSubtasks = task.subtasks.map((sub) =>
            sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
          );
          
          return { ...task, subtasks: updatedSubtasks };
        });

        const updatedDetails = state.selectedTaskForDetails?.id === taskId
          ? updatedTasks.find(t => t.id === taskId) || null
          : state.selectedTaskForDetails;

        return { 
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails
        };
      }),

      toggleSubtaskComplete: (taskId, subtaskIndex) => set((state) => {
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const updatedSubtasks = task.subtasks.map((sub, i) =>
            i === subtaskIndex ? { ...sub, completed: !sub.completed } : sub
          );
          return { ...task, subtasks: updatedSubtasks };
        });

        const updatedDetails = state.selectedTaskForDetails?.id === taskId
          ? updatedTasks.find(t => t.id === taskId) || null
          : state.selectedTaskForDetails;

        return { 
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails
        };
      }),

      addSubtask: (taskId, title) => set((state) => {
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          
          const newSubtask: Subtask = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title,
            completed: false
          };
          
          return {
            ...task,
            subtasks: [...task.subtasks, newSubtask]
          };
        });

        const updatedDetails = state.selectedTaskForDetails?.id === taskId
          ? updatedTasks.find(t => t.id === taskId) || null
          : state.selectedTaskForDetails;

        return { 
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails
        };
      }),

      deleteSubtask: (taskId, subtaskId) => set((state) => {
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            subtasks: task.subtasks.filter((sub) => sub.id !== subtaskId)
          };
        });

        const updatedDetails = state.selectedTaskForDetails?.id === taskId
          ? updatedTasks.find(t => t.id === taskId) || null
          : state.selectedTaskForDetails;

        return { 
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails
        };
      }),

      reorderSubtasks: (taskId, subtasks) => set((state) => {
        const updatedTasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, subtasks };
        });

        const updatedDetails = state.selectedTaskForDetails?.id === taskId
          ? updatedTasks.find(t => t.id === taskId) || null
          : state.selectedTaskForDetails;

        return { 
          tasks: updatedTasks,
          selectedTaskForDetails: updatedDetails
        };
      }),

      addCategory: (name) => set((state) => {
        const trimmedName = name.trim();
        if (!trimmedName) return {};
        const exists = state.categories.some(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (exists) return {};

        const colorIndex = state.categories.length % GOOGLE_COLORS.length;
        const color = GOOGLE_COLORS[colorIndex];

        const newCategory: CategoryConfig = {
          id: trimmedName,
          name: trimmedName,
          color,
        };

        return {
          categories: [...state.categories, newCategory],
        };
      })
    }),
    {
      name: 'google-calendar-tasks-store',
      // Only persist tasks, theme, view, and categories
      partialize: (state) => ({
        tasks: state.tasks,
        theme: state.theme,
        selectedView: state.selectedView,
        categories: state.categories,
      }),
    }
  )
);
