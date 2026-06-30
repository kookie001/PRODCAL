import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../store';

export const MiniCalendar: React.FC = () => {
  const currentDateStr = useTaskStore((state) => state.currentDate);
  const setCurrentDate = useTaskStore((state) => state.setCurrentDate);
  
  const activeDate = new Date(currentDateStr);
  const [viewDate, setViewDate] = React.useState<Date>(activeDate);

  // Sync viewDate with activeDate if external activeDate shifts months
  React.useEffect(() => {
    setViewDate(activeDate);
  }, [currentDateStr]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="p-2 select-none text-xs bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <div className="flex items-center space-x-0.5">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      {/* Grid of days */}
      <div className="grid grid-cols-7 gap-y-1 text-center font-medium text-gray-500">
        {weekDays.map((day, i) => (
          <div key={i} className="h-6 flex items-center justify-center font-semibold text-[10px] text-gray-400">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isSelected = isSameDay(day, activeDate);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => setCurrentDate(day)}
              className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center text-[11px] transition-colors relative cursor-pointer
                ${!isCurrentMonth ? 'text-gray-350' : 'text-gray-700'}
                ${isSelected && !isDayToday ? 'bg-blue-100 text-blue-700 font-bold' : ''}
                ${isDayToday ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
