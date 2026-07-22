import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Check, X, GripVertical } from 'lucide-react';
import { useTaskStore } from '../store';
import { CategoryConfig } from '../types';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const restrictToHorizontalViewport = ({ transform, draggingNodeRect }: any) => {
  if (!draggingNodeRect) {
    return { ...transform, y: 0 };
  }

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  if (!windowWidth) {
    return { ...transform, y: 0 };
  }

  const minX = -draggingNodeRect.left + 4;
  const maxX = windowWidth - draggingNodeRect.left - draggingNodeRect.width - 4;

  return {
    x: Math.min(Math.max(transform.x, minX), maxX),
    y: 0,
  };
};

interface SortableCategoryTabProps {
  id: string;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: CategoryConfig[];
}

const SortableCategoryTab: React.FC<SortableCategoryTabProps> = ({
  id,
  selectedCategory,
  setSelectedCategory,
  categories,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: transition ? transition.replace(/transform\s+[^\s,]+/g, 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)') : undefined,
    opacity: isDragging ? 0.35 : 1,
    height: '32px',
    borderRadius: '20px',
    paddingLeft: '8px',
    paddingRight: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    width: 'fit-content',
    whiteSpace: 'nowrap',
    touchAction: 'pan-x',
  };

  if (id === 'All') {
    const isActive = selectedCategory === 'All';
    return (
      <button
        ref={setNodeRef}
        style={style}
        onClick={() => setSelectedCategory('All')}
        data-category-tab="All"
        className={`shrink-0 border transition-colors duration-200 select-none flex items-center space-x-1.5
          ${isActive
            ? 'active-tab bg-[#1A73E8] border-[#1A73E8] text-white'
            : 'bg-blue-50/50 border-blue-100 text-gray-700 hover:bg-blue-100/50 hover:text-gray-900'
          }
        `}
      >
        <span
          {...attributes}
          {...listeners}
          className="p-0.5 -ml-1 rounded hover:bg-black/5 active:bg-black/10 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
        </span>
        <span>All</span>
      </button>
    );
  }

  if (id === 'Pending') {
    const isActive = selectedCategory === 'Pending';
    return (
      <button
        ref={setNodeRef}
        style={style}
        onClick={() => setSelectedCategory('Pending')}
        data-category-tab="Pending"
        className={`shrink-0 border transition-colors duration-200 select-none flex items-center space-x-1.5
          ${isActive
            ? 'active-tab bg-[#F29900] border-[#F29900] text-white'
            : 'bg-amber-50/50 border-amber-100 text-gray-700 hover:bg-amber-100/50 hover:text-gray-900'
          }
        `}
      >
        <span
          {...attributes}
          {...listeners}
          className="p-0.5 -ml-1 rounded hover:bg-black/5 active:bg-black/10 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
        </span>
        <span>Pending</span>
      </button>
    );
  }

  const cat = categories.find((c) => c.id === id);
  if (!cat) return null;

  const isActive = selectedCategory === cat.id;
  const customStyle: React.CSSProperties = {
    ...style,
    backgroundColor: isActive ? cat.color.solid : undefined,
    borderColor: isActive ? cat.color.solid : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={customStyle}
      onClick={() => setSelectedCategory(cat.id)}
      data-category-tab={cat.id}
      className={`shrink-0 flex items-center space-x-1.5 border transition-colors duration-200 select-none
        ${isActive
          ? 'active-tab text-white'
          : `${cat.color.bgLight} ${cat.color.borderLight} text-gray-700 hover:bg-opacity-80`
        }
      `}
    >
      <span
        {...attributes}
        {...listeners}
        className="p-0.5 -ml-1 rounded hover:bg-black/5 active:bg-black/10 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
      </span>
      <span 
        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200" 
        style={{ backgroundColor: isActive ? '#ffffff' : cat.color.solid }} 
      />
      <span>{cat.name}</span>
    </button>
  );
};

interface StaticCategoryTabProps {
  id: string;
  selectedCategory: string;
  categories: CategoryConfig[];
  isOverlay?: boolean;
}

const StaticCategoryTab: React.FC<StaticCategoryTabProps> = ({
  id,
  selectedCategory,
  categories,
  isOverlay = false,
}) => {
  const style: React.CSSProperties = {
    height: '32px',
    borderRadius: '20px',
    paddingLeft: '8px',
    paddingRight: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isOverlay ? 'grabbing' : 'grab',
    userSelect: 'none',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    width: 'fit-content',
    whiteSpace: 'nowrap',
    ...(isOverlay ? {
      transform: 'scale(1.05)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.04)',
      zIndex: 100,
    } : {}),
  };

  if (id === 'All') {
    const isActive = selectedCategory === 'All';
    return (
      <div
        style={style}
        className={`shrink-0 border select-none touch-none flex items-center space-x-1.5
          ${isActive
            ? 'bg-[#1A73E8] border-[#1A73E8] text-white font-semibold'
            : 'bg-blue-50/50 border-blue-100 text-gray-700'
          }
        `}
      >
        <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
        <span>All</span>
      </div>
    );
  }

  if (id === 'Pending') {
    const isActive = selectedCategory === 'Pending';
    return (
      <div
        style={style}
        className={`shrink-0 border select-none touch-none flex items-center space-x-1.5
          ${isActive
            ? 'bg-[#F29900] border-[#F29900] text-white font-semibold'
            : 'bg-amber-50/50 border-amber-100 text-gray-700'
          }
        `}
      >
        <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
        <span>Pending</span>
      </div>
    );
  }

  const cat = categories.find((c) => c.id === id);
  if (!cat) return null;

  const isActive = selectedCategory === cat.id;
  const customStyle: React.CSSProperties = {
    ...style,
    backgroundColor: isActive ? cat.color.solid : undefined,
    borderColor: isActive ? cat.color.solid : undefined,
  };

  return (
    <div
      style={customStyle}
      className={`shrink-0 flex items-center space-x-1.5 border select-none touch-none
        ${isActive
          ? 'text-white font-semibold'
          : `${cat.color.bgLight} ${cat.color.borderLight} text-gray-700`
        }
      `}
    >
      <GripVertical size={11} className={isActive ? 'text-white/70' : 'text-gray-400'} />
      <span 
        className="w-2 h-2 rounded-full flex-shrink-0" 
        style={{ backgroundColor: isActive ? '#ffffff' : cat.color.solid }} 
      />
      <span>{cat.name}</span>
    </div>
  );
};

export const CategoryTabBar: React.FC = () => {
  const selectedCategory = useTaskStore((state) => state.selectedCategory);
  const setSelectedCategory = useTaskStore((state) => state.setSelectedCategory);
  const categories = useTaskStore((state) => state.categories);
  const addCategory = useTaskStore((state) => state.addCategory);
  const categoryOrder = useTaskStore((state) => state.categoryOrder);
  const setCategoryOrder = useTaskStore((state) => state.setCategoryOrder);

  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const displayOrder = useMemo(() => {
    const allIds = ['All', 'Pending', ...categories.map((c) => c.id)];
    return [...allIds].sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      const posA = indexA === -1 ? 9999 : indexA;
      const posB = indexB === -1 ? 9999 : indexB;
      return posA - posB;
    });
  }, [categories, categoryOrder]);

  const pointerSensor = useSensor(PointerSensor);
  const touchSensor = useSensor(TouchSensor);
  const sensors = useSensors(pointerSensor, touchSensor);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Ignore vibration errors
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    triggerHaptic();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayOrder.indexOf(active.id as string);
    const newIndex = displayOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(displayOrder, oldIndex, newIndex) as string[];
      setCategoryOrder(newOrder);
      triggerHaptic();
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  useEffect(() => {
    if (containerRef.current) {
      const updateIndicator = () => {
        const activeElement = containerRef.current?.querySelector('.active-tab') as HTMLElement;
        if (activeElement) {
          setIndicatorStyle({
            left: activeElement.offsetLeft,
            width: activeElement.clientWidth,
          });
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      };
      
      updateIndicator();
      const timer = setTimeout(updateIndicator, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedCategory, categories, isAdding]);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (trimmed) {
      addCategory(trimmed);
      setSelectedCategory(trimmed);
      setNewCategoryName('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewCategoryName('');
    setIsAdding(false);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full bg-white border-b border-gray-150 px-4 flex items-center overflow-x-auto scrollbar-none flex-shrink-0 h-12"
      style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
    >
      <div className="flex items-center space-x-2 whitespace-nowrap pr-8 relative h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          modifiers={[restrictToHorizontalViewport]}
        >
          <SortableContext
            items={displayOrder}
            strategy={horizontalListSortingStrategy}
          >
            {displayOrder.map((id) => (
              <SortableCategoryTab
                key={id}
                id={id}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
              />
            ))}
          </SortableContext>

          <DragOverlay modifiers={[restrictToHorizontalViewport]}>
            {activeId ? (
              <StaticCategoryTab
                id={activeId}
                selectedCategory={selectedCategory}
                categories={categories}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Dynamic Inline "Add Category" Form or Button */}
        {isAdding ? (
          <form onSubmit={handleAddSubmit} className="flex items-center space-x-2 bg-white rounded-full border border-[#1A73E8] h-8 pl-3 pr-1 py-0.5 shadow-inner transition-all duration-150">
            <input
              ref={inputRef}
              type="text"
              maxLength={20}
              placeholder="New..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="bg-transparent text-xs text-gray-800 font-medium focus:outline-none w-20 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="p-1 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-30 cursor-pointer transition-colors"
              title="Confirm"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:bg-gray-50 rounded-full cursor-pointer transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 h-8 px-3 rounded-full text-xs font-semibold text-[#1A73E8] border border-dashed border-[#1A73E8]/30 bg-blue-50/25 hover:bg-blue-50/55 transition-all duration-150 cursor-pointer select-none"
            title="Create new category"
          >
            <Plus size={14} />
            <span>Category</span>
          </button>
        )}
      </div>
    </div>
  );
};
