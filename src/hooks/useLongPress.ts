import React, { useRef } from 'react';

export const useLongPress = (callback: (time: string) => void, delay = 600) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const movedRef = useRef(false);

  const start = (time: string) => (e: React.TouchEvent) => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        callback(time);
      }
    }, delay);
  };

  const cancel = () => {
    clearTimeout(timerRef.current);
  };

  const move = () => {
    movedRef.current = true;
    clearTimeout(timerRef.current);
  };

  return { start, cancel, move };
};
