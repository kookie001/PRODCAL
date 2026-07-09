import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pencil, Calendar, ChevronDown } from 'lucide-react';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose?: () => void;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return new Date();
};

const toManualFormat = (dateStr: string): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
  }
  return '';
};

const fromManualFormat = (manualStr: string): string | null => {
  if (!manualStr || typeof manualStr !== 'string') return null;
  const trimmed = manualStr.trim();
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0');
    const d = parts[1].padStart(2, '0');
    const y = parts[2];
    if (y.length === 4 && !isNaN(parseInt(y)) && !isNaN(parseInt(m)) && !isNaN(parseInt(d))) {
      return `${y}-${m}-${d}`;
    }
  }
  return null;
};

const formatHeaderDate = (dateStr: string): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  }
  return '';
};

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange, onClose }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [tempDate, setTempDate] = useState(value || todayStr);
  const [isManualMode, setIsManualMode] = useState(false);
  const [inputText, setInputText] = useState(toManualFormat(value || todayStr));
  const [isValidInput, setIsValidInput] = useState(true);
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);

  const dateObj = parseLocalDate(tempDate);
  const [currentMonth, setCurrentMonth] = useState(dateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(dateObj.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    setTempDate(formatted);
    setInputText(toManualFormat(formatted));
    setIsValidInput(true);
  };

  const handleInputChange = (val: string) => {
    setInputText(val);
    const parsed = fromManualFormat(val);
    if (parsed) {
      const date = parseLocalDate(parsed);
      const parts = parsed.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      // Simple validity range checks
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 && !isNaN(date.getTime())) {
        setTempDate(parsed);
        setCurrentMonth(date.getMonth());
        setCurrentYear(date.getFullYear());
        setIsValidInput(true);
        return;
      }
    }
    setIsValidInput(false);
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOK = () => {
    if (isManualMode && !isValidInput) return;
    onChange(tempDate);
    if (onClose) {
      onClose();
    }
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#EDF2FA] rounded-[28px] p-6 w-full max-w-[328px] mx-auto shadow-2xl border border-[#D3E3FD]/30"
    >
      {/* HEADER SECTION (Select Date & Display with Pencil Icon) */}
      <div className="flex flex-col mb-4">
        <span className="text-xs font-semibold text-[#444746] uppercase tracking-wider mb-2">Select Date</span>
        <div className="flex justify-between items-center">
          <span className="text-3xl font-medium text-[#1F1F1F]">
            {formatHeaderDate(tempDate)}
          </span>
          <button 
            type="button" 
            onClick={() => {
              setIsManualMode(!isManualMode);
              setShowMonthYearSelector(false);
            }} 
            className="p-2 rounded-full hover:bg-black/5 text-[#444746] transition-colors"
          >
            {isManualMode ? <Calendar size={22} /> : <Pencil size={22} />}
          </button>
        </div>
      </div>

      {/* BODY CONTENT (Calendar Grid or Manual Input Field or Month Selector) */}
      <div className="min-h-[260px] bg-white rounded-2xl p-4 shadow-inner border border-gray-100 flex flex-col justify-between">
        {!isManualMode ? (
          showMonthYearSelector ? (
            <div className="flex flex-col h-full justify-between flex-1">
              {/* Year Selector */}
              <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setCurrentYear(currentYear - 1)} 
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={18} className="text-[#444746]" />
                </button>
                <span className="text-base font-semibold text-[#1F1F1F]">{currentYear}</span>
                <button 
                  type="button" 
                  onClick={() => setCurrentYear(currentYear + 1)} 
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={18} className="text-[#444746]" />
                </button>
              </div>
              
              {/* Months Grid */}
              <div className="grid grid-cols-3 gap-2 flex-1 items-center py-2">
                {months.map((m, idx) => {
                  const isCurrent = idx === currentMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(idx);
                        setShowMonthYearSelector(false);
                      }}
                      className={`py-2 text-sm font-semibold rounded-full transition-all text-center
                        ${isCurrent ? 'bg-[#1A73E8] text-white' : 'text-[#444746] hover:bg-[#F2F2F2]'}`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Month dropdown/navigation */}
              <div className="flex justify-between items-center mb-4">
                <button 
                  type="button" 
                  onClick={() => setShowMonthYearSelector(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#444746] hover:bg-black/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <span>{months[currentMonth]} {currentYear}</span>
                  <ChevronDown size={16} className="text-[#444746]" />
                </button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => {
                    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                    else { setCurrentMonth(currentMonth - 1); }
                  }} className="p-1.5 rounded-full hover:bg-[#F2F2F2] transition-colors"><ChevronLeft size={18} className="text-[#444746]" /></button>
                  <button type="button" onClick={() => {
                    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                    else { setCurrentMonth(currentMonth + 1); }
                  }} className="p-1.5 rounded-full hover:bg-[#F2F2F2] transition-colors"><ChevronRight size={18} className="text-[#444746]" /></button>
                </div>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#747775] mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => <div key={idx}>{d}</div>)}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-2 gap-x-1 flex-1">
                {blanks.map(b => <div key={`blank-${b}`} />)}
                {days.map(day => {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = tempDate === dateStr;
                  const isToday = todayStr === dateStr;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs transition-all mx-auto
                        ${isSelected ? 'bg-[#1A73E8] text-white font-semibold shadow-sm' : isToday ? 'bg-[#D3E3FD] text-[#1A73E8] font-semibold' : 'text-[#1F1F1F] hover:bg-[#F2F2F2]'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col justify-center flex-1 py-4">
            <div className="relative my-4">
              <input
                type="text"
                placeholder="MM/DD/YYYY"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`w-full px-4 py-4 rounded-lg border-2 bg-transparent text-[#1F1F1F] text-base focus:outline-none placeholder-gray-400 font-normal transition-all
                  ${isValidInput ? 'border-[#1A73E8]' : 'border-red-500 focus:border-red-500'}`}
                autoFocus
              />
              <span className={`absolute -top-2.5 left-3 bg-white px-1.5 text-xs font-semibold transition-all
                ${isValidInput ? 'text-[#1A73E8]' : 'text-red-500'}`}
              >
                Date
              </span>
            </div>
            {!isValidInput && (
              <span className="text-xs text-red-500 mt-1 pl-1">Please enter a valid date (MM/DD/YYYY)</span>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS (Cancel & OK) */}
      <div className="flex justify-end gap-4 mt-4">
        <button 
          type="button" 
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-semibold text-[#1A73E8] hover:bg-[#D3E3FD]/20 rounded-full transition-colors"
        >
          Cancel
        </button>
        <button 
          type="button" 
          onClick={handleOK}
          disabled={isManualMode && !isValidInput}
          className="px-4 py-2 text-sm font-semibold text-[#1A73E8] hover:bg-[#D3E3FD]/20 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          OK
        </button>
      </div>
    </motion.div>
  );
};
