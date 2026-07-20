'use client';

import { useEffect, useRef, useState } from 'react';

interface QuizTimerProps {
  /** Total exam duration in minutes (from config.examDetails.duration). */
  durationMinutes: number;
  /** Called exactly once when the countdown reaches zero. */
  onExpire: () => void;
}

/** Format a non-negative number of seconds as mm:ss. */
function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Threshold (seconds) below which the timer switches to a low-time style. */
const LOW_TIME_SECONDS = 60;

export default function QuizTimer({ durationMinutes, onExpire }: QuizTimerProps) {
  const totalSeconds = Math.max(0, Math.round(durationMinutes * 60));
  // Anchor to a fixed end timestamp so re-renders don't drift the countdown.
  // Initialized inside the effect (Date.now() is impure — never call in render).
  const endTimeRef = useRef<number | null>(null);
  const expiredRef = useRef<boolean>(false);
  const [remaining, setRemaining] = useState<number>(totalSeconds);

  useEffect(() => {
    endTimeRef.current = Date.now() + totalSeconds * 1000;

    const tick = () => {
      const end = endTimeRef.current ?? Date.now();
      const secondsLeft = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(secondsLeft);

      if (secondsLeft <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onExpire, totalSeconds]);

  const isLowTime = remaining <= LOW_TIME_SECONDS;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Time Remaining
        </span>
        <span
          className={`text-2xl font-bold tabular-nums ${
            isLowTime
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
          role="timer"
          aria-live="polite"
        >
          {formatTime(remaining)}
        </span>
      </div>
    </div>
  );
}

// Made with Bob
