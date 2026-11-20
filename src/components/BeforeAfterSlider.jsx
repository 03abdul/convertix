import { useCallback, useRef, useState } from 'react';
import { ChevronsLeftRight, ImageOff } from 'lucide-react';

/**
 * Draggable before/after image comparison.
 * Pointer: drag anywhere. Keyboard: Left/Right arrows (Shift = bigger steps), Home/End.
 */
export default function BeforeAfterSlider({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = '',
}) {
  const [position, setPosition] = useState(50);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointerDown = (event) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveTo(event.clientX);
  };
  const onPointerMove = (event) => {
    if (dragging.current) moveTo(event.clientX);
  };
  const endDrag = (event) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === 'ArrowLeft') setPosition((value) => Math.max(0, value - step));
    else if (event.key === 'ArrowRight') setPosition((value) => Math.min(100, value + step));
    else if (event.key === 'Home') setPosition(0);
    else if (event.key === 'End') setPosition(100);
    else return;
    event.preventDefault();
  };

  if (failed) {
    return (
      <div className={`flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-dark-900/60 text-center ${className}`}>
        <ImageOff className="h-6 w-6 text-dark-500" />
        <p className="text-sm text-dark-300">This format can&apos;t be previewed in the browser.</p>
        <p className="text-xs text-dark-500">The converted file is still ready to download.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label={`Comparison slider: ${beforeLabel} on the left, ${afterLabel} on the right`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% ${beforeLabel}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative h-[min(60vh,420px)] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-xl bg-dark-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-400"
      >
        <img
          src={after}
          alt={afterLabel}
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          src={before}
          alt={beforeLabel}
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.6)]" style={{ left: `${position}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-dark-900/90 shadow-lg">
            <ChevronsLeftRight className="h-4 w-4 text-white" />
          </div>
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-dark-950/75 px-2 py-1 text-xs font-medium text-dark-100">{beforeLabel}</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-dark-950/75 px-2 py-1 text-xs font-medium text-secondary-300">{afterLabel}</span>
      </div>
    </div>
  );
}
