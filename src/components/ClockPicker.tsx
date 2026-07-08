import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ClockPickerProps {
  value: string;
  onChange: (time: string) => void;
}

export const ClockPicker: React.FC<ClockPickerProps> = ({ value, onChange }) => {
  const [hour, setHour] = useState(value ? parseInt(value.split(':')[0]) : 12);
  const [minute, setMinute] = useState(value ? parseInt(value.split(':')[1]) : 0);
  const [period, setPeriod] = useState(hour >= 12 ? 'PM' : 'AM');

  const handleTimeChange = (h: number, m: number, p: string) => {
    let finalHour = h;
    if (p === 'PM' && h !== 12) finalHour += 12;
    if (p === 'AM' && h === 12) finalHour = 0;
    
    onChange(`${String(finalHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-[28px] p-6 w-full max-w-sm mx-auto shadow-xl border border-[#E8EAED]"
    >
      <div className="flex justify-center items-center gap-2 mb-8">
        <div className="bg-[#D3E3FD] text-[#041E49] text-5xl font-medium px-4 py-3 rounded-2xl">
          {String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, '0')}
        </div>
        <span className="text-4xl text-[#1F1F1F] font-bold">:</span>
        <div className="bg-[#E0E2E6] text-[#1F1F1F] text-5xl font-medium px-4 py-3 rounded-2xl">
          {String(minute).padStart(2, '0')}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { setPeriod('AM'); handleTimeChange(hour, minute, 'AM'); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period === 'AM' ? 'bg-[#D3E3FD] text-[#041E49]' : 'bg-[#E0E2E6]'}`}>AM</button>
          <button type="button" onClick={() => { setPeriod('PM'); handleTimeChange(hour, minute, 'PM'); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period === 'PM' ? 'bg-[#D3E3FD] text-[#041E49]' : 'bg-[#E0E2E6]'}`}>PM</button>
        </div>
      </div>
      
      <div className="relative w-64 h-64 mx-auto rounded-full bg-[#E0E2E6] flex items-center justify-center">
        {Array.from({ length: 12 }, (_, i) => {
          const h = i === 0 ? 12 : i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => { setHour(h); handleTimeChange(h, minute, period); }}
              className={`absolute w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                ${(hour % 12 === 0 ? 12 : hour % 12) === h ? 'bg-[#1A73E8] text-white' : 'text-[#444746]'}`}
              style={{
                transform: `rotate(${i * 30}deg) translate(0, -96px) rotate(-${i * 30}deg)`
              }}
            >
              {h}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
