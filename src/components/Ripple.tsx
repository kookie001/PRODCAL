import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RippleType {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function Ripple({ color = 'rgba(0, 0, 0, 0.08)' }: { color?: string }) {
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    // Ensure parent is styled with relative and overflow-hidden
    parent.classList.add('relative');
    parent.classList.add('overflow-hidden');

    const handlePointerDown = (e: PointerEvent) => {
      // Don't ripple on right click
      if (e.button === 2) return;

      const rect = parent.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple: RippleType = {
        id: Math.random(),
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, newRipple]);
    };

    parent.addEventListener('pointerdown', handlePointerDown);
    return () => {
      parent.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-[inherit]"
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.1, 0.8, 0.3, 1] }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              borderRadius: '50%',
              backgroundColor: color,
              pointerEvents: 'none',
            }}
            onAnimationComplete={() => {
              setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
