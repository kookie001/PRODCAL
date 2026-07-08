import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date();
};

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange }) => {
  const dateObj = value ? parseLocalDate(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(dateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(dateObj.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleDateClick = (day: number) => {
    // Ensure we handle the date as local to avoid timezone shifts
    const newDate = new Date(currentYear, currentMonth, day);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-[28px] p-6 w-full max-w-sm mx-auto shadow-xl border border-[#E8EAED]"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#1F1F1F]">
          {months[currentMonth]} {currentYear}
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => {
            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
            else { setCurrentMonth(currentMonth - 1); }
          }} className="p-2 rounded-full hover:bg-[#F2F2F2]"><ChevronLeft size={20} className="text-[#444746]" /></button>
          <button type="button" onClick={() => {
            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
            else { setCurrentMonth(currentMonth + 1); }
          }} className="p-2 rounded-full hover:bg-[#F2F2F2]"><ChevronRight size={20} className="text-[#444746]" /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-[#747775] mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(b => <div key={`blank-${b}`} />)}
        {days.map(day => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = value === dateStr;
          const isToday = todayStr === dateStr;
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-sm transition-all
                ${isSelected ? 'bg-[#1A73E8] text-white font-semibold' : isToday ? 'bg-[#D3E3FD] text-[#1A73E8] font-semibold' : 'text-[#1F1F1F] hover:bg-[#F2F2F2]'}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
