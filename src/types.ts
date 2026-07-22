export type CategoryType = string;

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: CategoryType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (24h format or 12h format display)
  completed: boolean;
  subtasks: Subtask[];
  createdAt: string;
  isPending?: boolean;
  manualOrder?: number;
}

export interface DeletedTask extends Task {
  deletedAt: string;
}

export type ViewType = 'month' | 'week' | 'day' | 'schedule' | '3day';

export interface CategoryConfig {
  id: CategoryType;
  name: string;
  color: {
    light: string;       // Text color
    bgLight: string;     // Background color
    borderLight: string; // Border color
    solid: string;       // Hex code for custom use (e.g. badge dot)
  };
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'Work',
    name: 'Work',
    color: {
      light: 'text-blue-700',
      bgLight: 'bg-blue-50',
      borderLight: 'border-blue-200',
      solid: '#1a73e8',
    },
  },
  {
    id: 'Personal',
    name: 'Personal',
    color: {
      light: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      solid: '#0f9d58',
    },
  },
  {
    id: 'Health',
    name: 'Health',
    color: {
      light: 'text-rose-700',
      bgLight: 'bg-rose-50',
      borderLight: 'border-rose-200',
      solid: '#e53935',
    },
  },
  {
    id: 'Holidays',
    name: 'Holidays',
    color: {
      light: 'text-teal-700',
      bgLight: 'bg-teal-50',
      borderLight: 'border-teal-200',
      solid: '#00897B',
    },
  },
  {
    id: 'Other',
    name: 'Other',
    color: {
      light: 'text-amber-700',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      solid: '#f0b429',
    },
  },
];
