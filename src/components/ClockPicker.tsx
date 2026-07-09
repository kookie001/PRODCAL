import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Keyboard, Clock } from 'lucide-react';

interface ClockPickerProps {
  value: string; // "HH:MM" in 24-hour format
  onChange: (time: string) => void;
  onClose?: () => void;
}

const parseTimeStr = (timeStr: string) => {
  if (!timeStr) {
    return { hour12: 12, minute: 0, period: 'PM' as 'AM' | 'PM' };
  }
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const h24 = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    let p: 'AM' | 'PM' = 'AM';
    if (h24 >= 12) {
      p = 'PM';
    }
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { hour12: h12, minute: m, period: p };
  }
  return { hour12: 12, minute: 0, period: 'PM' as 'AM' | 'PM' };
};

export const ClockPicker: React.FC<ClockPickerProps> = ({ value, onChange, onClose }) => {
  const initialTime = parseTimeStr(value);

  const [tempHour, setTempHour] = useState(initialTime.hour12);
  const [tempMinute, setTempMinute] = useState(initialTime.minute);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>(initialTime.period);

  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [isManualMode, setIsManualMode] = useState(false);

  // Manual inputs
  const [manualHour, setManualHour] = useState(String(initialTime.hour12).padStart(2, '0'));
  const [manualMinute, setManualMinute] = useState(String(initialTime.minute).padStart(2, '0'));
  const [isValidManual, setIsValidManual] = useState(true);

  const dialRef = useRef<HTMLDivElement>(null);

  // Synchronize manual text input state when changing manually
  const validateAndSyncManual = (hStr: string, mStr: string) => {
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const hValid = !isNaN(h) && h >= 1 && h <= 12;
    const mValid = !isNaN(m) && m >= 0 && m <= 59;
    
    if (hValid && mValid) {
      setTempHour(h);
      setTempMinute(m);
      setIsValidManual(true);
    } else {
      setIsValidManual(false);
    }
  };

  const handleManualHourChange = (val: string) => {
    // limit to 2 chars max
    const sanitized = val.replace(/\D/g, '').slice(0, 2);
    setManualHour(sanitized);
    validateAndSyncManual(sanitized, manualMinute);
  };

  const handleManualMinuteChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '').slice(0, 2);
    setManualMinute(sanitized);
    validateAndSyncManual(manualHour, sanitized);
  };

  // Convert angular position relative to dial center into hour or minute
  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let adjustedAngle = angle + 90; // offset so 12 o'clock is 0 deg
    if (adjustedAngle < 0) adjustedAngle += 360;
    adjustedAngle = adjustedAngle % 360;

    if (mode === 'hour') {
      let h = Math.round(adjustedAngle / 30);
      if (h === 0) h = 12;
      setTempHour(h);
      setManualHour(String(h).padStart(2, '0'));
    } else {
      let m = Math.round(adjustedAngle / 6) % 60;
      setTempMinute(m);
      setManualMinute(String(m).padStart(2, '0'));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerMove(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handlePointerMove(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      // Auto transition to minute mode
      if (mode === 'hour') {
        setTimeout(() => setMode('minute'), 250);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      handlePointerMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      // Auto transition to minute mode
      if (mode === 'hour') {
        setTimeout(() => setMode('minute'), 250);
      }
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleOK = () => {
    if (isManualMode && !isValidManual) return;
    let finalHour = tempHour;
    if (tempPeriod === 'PM' && tempHour !== 12) finalHour += 12;
    if (tempPeriod === 'AM' && tempHour === 12) finalHour = 0;

    onChange(`${String(finalHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`);
    if (onClose) {
      onClose();
    }
  };

  // Calculations for current pendulum position
  const currentAngle = mode === 'hour' ? (tempHour % 12) * 30 : tempMinute * 6;
  const currentAngleRad = (currentAngle - 90) * (Math.PI / 180);
  const pendulumRadius = 92;
  const lineX = 128 + pendulumRadius * Math.cos(currentAngleRad);
  const lineY = 128 + pendulumRadius * Math.sin(currentAngleRad);

  const isMinuteMultiOf5 = tempMinute % 5 === 0;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#EDF2FA] rounded-[28px] p-6 w-full max-w-[328px] mx-auto shadow-2xl border border-[#D3E3FD]/30"
    >
      {/* Header */}
      <div className="flex flex-col mb-4">
        <span className="text-xs font-semibold text-[#444746] uppercase tracking-wider mb-2">Select time</span>
        
        {/* Large time readout cards + AM/PM block */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Hours Display Card */}
            <button
              type="button"
              onClick={() => {
                setIsManualMode(false);
                setMode('hour');
              }}
              className={`w-[84px] h-[72px] flex items-center justify-center rounded-2xl text-5xl font-medium transition-all ${
                !isManualMode && mode === 'hour'
                  ? 'bg-[#D3E3FD] text-[#0B57D0] font-semibold'
                  : 'bg-[#E1E2E5] text-[#1F1F1F]'
              }`}
            >
              {String(tempHour).padStart(2, '0')}
            </button>

            {/* Separator */}
            <span className="text-4xl text-[#1F1F1F] font-bold px-1">:</span>

            {/* Minutes Display Card */}
            <button
              type="button"
              onClick={() => {
                setIsManualMode(false);
                setMode('minute');
              }}
              className={`w-[84px] h-[72px] flex items-center justify-center rounded-2xl text-5xl font-medium transition-all ${
                !isManualMode && mode === 'minute'
                  ? 'bg-[#D3E3FD] text-[#0B57D0] font-semibold'
                  : 'bg-[#E1E2E5] text-[#1F1F1F]'
              }`}
            >
              {String(tempMinute).padStart(2, '0')}
            </button>
          </div>

          {/* AM / PM Pill Stack */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTempPeriod('AM')}
              className={`w-[52px] h-[36px] flex items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                tempPeriod === 'AM'
                  ? 'bg-[#E6F4EA] text-[#137333] border-transparent font-bold'
                  : 'bg-white text-[#5F6368] border-[#747775] hover:bg-black/5'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setTempPeriod('PM')}
              className={`w-[52px] h-[36px] flex items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                tempPeriod === 'PM'
                  ? 'bg-[#E6F4EA] text-[#137333] border-transparent font-bold'
                  : 'bg-white text-[#5F6368] border-[#747775] hover:bg-black/5'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Main interactive area (Dial or Manual keyboard inputs) */}
      <div className="min-h-[268px] bg-white rounded-2xl p-4 shadow-inner border border-gray-100 flex items-center justify-center relative">
        {!isManualMode ? (
          <div 
            ref={dialRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className="relative w-[256px] h-[256px] rounded-full bg-[#F1F3F4] cursor-pointer select-none overflow-hidden touch-none"
          >
            {/* The blue pointer/pendulum SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <line 
                x1={128} 
                y1={128} 
                x2={lineX} 
                y2={lineY} 
                stroke="#1A73E8" 
                strokeWidth={2} 
              />
              <circle 
                cx={128} 
                cy={128} 
                r={4} 
                fill="#1A73E8" 
              />
              {/* If minutes mode is active and value is NOT a multiple of 5, show small circle with inner dot */}
              {mode === 'minute' && !isMinuteMultiOf5 ? (
                <>
                  <circle cx={lineX} cy={lineY} r={10} fill="#1A73E8" />
                  <circle cx={lineX} cy={lineY} r={2} fill="white" />
                </>
              ) : (
                <circle cx={lineX} cy={lineY} r={18} fill="#1A73E8" />
              )}
            </svg>

            {/* Dial Labels */}
            {mode === 'hour' ? (
              // HOUR DIAL
              Array.from({ length: 12 }, (_, i) => {
                const h = i === 0 ? 12 : i;
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = 128 + pendulumRadius * Math.cos(angleRad);
                const y = 128 + pendulumRadius * Math.sin(angleRad);
                const isSelected = tempHour === h;
                return (
                  <div
                    key={h}
                    className={`absolute text-sm font-semibold transition-all select-none duration-100 pointer-events-none
                      ${isSelected ? 'text-white z-20 font-bold' : 'text-[#1F1F1F]'}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {h}
                  </div>
                );
              })
            ) : (
              // MINUTE DIAL
              Array.from({ length: 12 }, (_, i) => {
                const m = i * 5;
                const angleRad = (i * 30 - 90) * (Math.PI / 180);
                const x = 128 + pendulumRadius * Math.cos(angleRad);
                const y = 128 + pendulumRadius * Math.sin(angleRad);
                const isSelected = tempMinute === m;
                return (
                  <div
                    key={m}
                    className={`absolute text-sm font-semibold transition-all select-none duration-100 pointer-events-none
                      ${isSelected ? 'text-white z-20 font-bold' : 'text-[#1F1F1F]'}`}
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {String(m).padStart(2, '0')}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // MANUAL MODE INPUTS
          <div className="flex flex-col items-center justify-center w-full py-4 px-2">
            <div className="flex items-center gap-3 justify-center">
              {/* Hour Input Block */}
              <div className="relative">
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={manualHour}
                  onChange={(e) => handleManualHourChange(e.target.value)}
                  className={`w-20 px-3 py-4 rounded-xl border-2 text-center text-3xl font-medium focus:outline-none transition-all ${
                    isValidManual ? 'border-[#1A73E8] focus:border-blue-600' : 'border-red-500 focus:border-red-500'
                  }`}
                  placeholder="12"
                />
                <span className={`absolute -top-2.5 left-3 bg-white px-1.5 text-[10px] font-bold transition-all ${
                  isValidManual ? 'text-[#1A73E8]' : 'text-red-500'
                }`}>
                  Hour
                </span>
              </div>

              <span className="text-3xl font-bold text-gray-400">:</span>

              {/* Minute Input Block */}
              <div className="relative">
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={manualMinute}
                  onChange={(e) => handleManualMinuteChange(e.target.value)}
                  className={`w-20 px-3 py-4 rounded-xl border-2 text-center text-3xl font-medium focus:outline-none transition-all ${
                    isValidManual ? 'border-[#1A73E8] focus:border-blue-600' : 'border-red-500 focus:border-red-500'
                  }`}
                  placeholder="00"
                />
                <span className={`absolute -top-2.5 left-3 bg-white px-1.5 text-[10px] font-bold transition-all ${
                  isValidManual ? 'text-[#1A73E8]' : 'text-red-500'
                }`}>
                  Minute
                </span>
              </div>
            </div>

            {!isValidManual && (
              <span className="text-xs text-red-500 mt-4 text-center">
                Please enter a valid hour (1-12) and minute (00-59)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer controls: Keyboard toggle (left), Cancel & OK (right) */}
      <div className="flex justify-between items-center mt-4">
        <button
          type="button"
          onClick={() => {
            if (isManualMode) {
              setManualHour(String(tempHour).padStart(2, '0'));
              setManualMinute(String(tempMinute).padStart(2, '0'));
              setIsValidManual(true);
            }
            setIsManualMode(!isManualMode);
          }}
          className="p-2 rounded-full hover:bg-[#D3E3FD]/30 text-[#444746] transition-all"
          aria-label={isManualMode ? "Switch to dial entry" : "Switch to manual text entry"}
        >
          {isManualMode ? <Clock size={22} className="text-[#1A73E8]" /> : <Keyboard size={22} />}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#1A73E8] hover:bg-[#D3E3FD]/30 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOK}
            disabled={isManualMode && !isValidManual}
            className="px-4 py-2 text-sm font-semibold text-[#1A73E8] hover:bg-[#D3E3FD]/30 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            OK
          </button>
        </div>
      </div>
    </motion.div>
  );
};
