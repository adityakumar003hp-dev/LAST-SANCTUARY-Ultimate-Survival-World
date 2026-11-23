import React, { useEffect, useRef, useState } from 'react';
import { Anchor, X } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface FishingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasLuckyPerk?: boolean;
  onCatchFish: (count: number) => void;
}

export const FishingModal: React.FC<FishingModalProps> = ({
  isOpen,
  onClose,
  hasLuckyPerk = false,
  onCatchFish,
}) => {
  const [cursorPos, setCursorPos] = useState(50);
  const [zoneStart, setZoneStart] = useState(38);
  const [zoneWidth, setZoneWidth] = useState(24);
  const [statusMessage, setStatusMessage] = useState<string>('Press Reel In when the marker crosses the green window.');
  const [streak, setStreak] = useState(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const speed = 95 + Math.min(60, streak * 12);

      setCursorPos((prev) => {
        let next = prev + dirRef.current * speed * dt;
        if (next >= 98) {
          next = 98;
          dirRef.current = -1;
        } else if (next <= 2) {
          next = 2;
          dirRef.current = 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, streak]);

  if (!isOpen) return null;

  const handleReel = () => {
    const inZone = cursorPos >= zoneStart && cursorPos <= zoneStart + zoneWidth;
    if (inZone) {
      const caught = hasLuckyPerk ? 2 : 1;
      soundEngine.playFishingSplash();
      onCatchFish(caught);
      setStreak((s) => s + 1);
      setStatusMessage(`Caught ${caught} Fresh River Trout! Cast ready for another bite.`);
      const nextWidth = Math.max(14, 26 - streak * 2);
      setZoneWidth(nextWidth);
      setZoneStart(12 + Math.floor(Math.random() * (76 - nextWidth)));
    } else {
      soundEngine.playUIClick();
      setStreak(0);
      setStatusMessage('The line snapped free — time the green strike window.');
      setZoneWidth(24);
      setZoneStart(20 + Math.floor(Math.random() * 50));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950/95 p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold tracking-wide">Shoreline Angling</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 font-mono tabular-nums">
          <span>Catch Streak: {streak}</span>
          <span>{hasLuckyPerk ? 'Pathfinder Bonus: 2x Yield' : 'Standard Rod: 1x Yield'}</span>
        </div>

        {/* Timing Meter */}
        <div className="relative mt-4 h-10 w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900">
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/35 border-x border-emerald-400"
            style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }}
          />
          <div
            className="absolute top-1 bottom-1 w-1.5 -translate-x-1/2 rounded-full bg-amber-400 shadow-md"
            style={{ left: `${cursorPos}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-neutral-300 leading-relaxed min-h-[2.25rem]">
          {statusMessage}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReel}
            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-neutral-950 cursor-pointer whitespace-nowrap"
          >
            Reel In
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 py-2.5 px-4 text-xs font-semibold text-neutral-300 cursor-pointer whitespace-nowrap"
          >
            Pack Rod
          </button>
        </div>
      </div>
    </div>
  );
};
