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
  selectedCategory: CategoryType | 'All';
  isFABOpen: boolean;
  editingTask: Task | null; // For editing existing tasks in the task sheet
  selectedTaskForDetails: Task | null; // For showing task detail modal
  prefilledTime: string; // Pre-filled HH:MM for new tasks
  isHeaderCollapsed: boolean; // For Material 3 scroll-to-collapse header
}

interface TaskActions {
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updatedFields: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addCategory: (name: string) => void;
  
  setCurrentDate: (date: Date) => void;
  setSelectedCategory: (category: CategoryType | 'All') => void;
  setSelectedView: (view: ViewType) => void;
  toggleTheme: () => void;
  setFABOpen: (isOpen: boolean) => void;
  setEditingTask: (task: Task | null) => void;
  setSelectedTaskForDetails: (task: Task | null) => void;
  setPrefilledTime: (time: string) => void;
  setHeaderCollapsed: (collapsed: boolean) => void;
  
  // Subtask helpers
  toggleSubtask: (taskId: string, subtaskId: string) => void;
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
          id: 'sample-1',
          title: 'Design Google Tasks UI System',
          category: 'Work',
          date: new Date().toISOString().split('T')[0], // Today
          time: '10:00',
          completed: false,
          subtasks: [
            { id: 'sub-1-1', title: 'Replicate Material 3 guidelines', completed: true },
            { id: 'sub-1-2', title: 'Build month, week, day, and schedule views', completed: false },
            { id: 'sub-1-3', title: 'Integrate fluid spring motion with dnd-kit', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-2',
          title: 'Morning Yoga and Cardiovascular Run',
          category: 'Health',
          date: new Date().toISOString().split('T')[0], // Today
          time: '07:30',
          completed: true,
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-3',
          title: 'Review System Design Principles',
          category: 'Other',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          time: '15:00',
          completed: false,
          subtasks: [
            { id: 'sub-3-1', title: 'Read DynamoDB paper', completed: false },
            { id: 'sub-3-2', title: 'Draft sequence diagrams', completed: false }
          ],
          createdAt: new Date().toISOString()
        }
      ],
      theme: 'light',
      selectedView: 'month',
      categories: CATEGORIES,
      
      currentDate: new Date().toISOString(),
      selectedCategory: 'All',
      isFABOpen: false,
      editingTask: null,
      selectedTaskForDetails: null,
      prefilledTime: '',
      isHeaderCollapsed: false,

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

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        selectedTaskForDetails: state.selectedTaskForDetails?.id === id ? null : state.selectedTaskForDetails,
        editingTask: state.editingTask?.id === id ? null : state.editingTask
      })),

      setCurrentDate: (date) => set({ currentDate: date.toISOString() }),
      
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

      setHeaderCollapsed: (collapsed) => set({ isHeaderCollapsed: collapsed }),

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
