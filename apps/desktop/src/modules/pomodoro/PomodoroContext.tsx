import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DevPathBridge } from '../../shared/api/types';
import {
  advance,
  FOCUS_MINUTES,
  IDLE,
  parseStoredTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  type TimerState,
} from './timer';

export const STORAGE_KEY = 'devpath.pomodoro';
const TICK_MS = 250;

export interface Pomodoro {
  state: TimerState;
  /** The clock used for the remaining time; updated every tick while running. */
  now: number;
  start(goal: { id: string; title: string }, projectId: string | null): void;
  pause(): void;
  resume(): void;
  stop(): void;
  /** Back to idle after a finished session. */
  reset(): void;
}

const PomodoroContext = createContext<Pomodoro | null>(null);

function loadStored(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? advance(parseStoredTimer(JSON.parse(raw)), Date.now()) : IDLE;
  } catch {
    return IDLE;
  }
}

function save(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the timer still works for this page load.
  }
}

// The timer never depends on main: a missing bridge or a failed call is ignored.
const bridge = () => (window.devpath as DevPathBridge | undefined)?.pomodoro;

function scheduleEnd(state: TimerState) {
  if (state.status === 'running') {
    void bridge()
      ?.scheduleEnd(state.endsAt, state.goalTitle)
      .catch(() => undefined);
  }
}

function cancelEnd() {
  void bridge()
    ?.cancelEnd()
    .catch(() => undefined);
}

/** Owns the active focus timer for the whole app: ticks it, stores it and schedules the end notification. */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadStored);
  const [state, setState] = useState<TimerState>(initial);
  const [now, setNow] = useState(() => Date.now());

  // A timer restored as running gets its notification scheduled again (main may have restarted).
  useEffect(() => {
    scheduleEnd(initial);
  }, [initial]);

  useEffect(() => {
    save(state);
  }, [state]);

  const running = state.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((current) => advance(current, t));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  const value = useMemo<Pomodoro>(
    () => ({
      state,
      now,
      start(goal, projectId) {
        const t = Date.now();
        const next = startTimer(goal, projectId, FOCUS_MINUTES * 60_000, t);
        setNow(t);
        setState(next);
        scheduleEnd(next);
      },
      pause() {
        if (state.status !== 'running') return;
        const t = Date.now();
        setNow(t);
        setState(pauseTimer(state, t));
        cancelEnd();
      },
      resume() {
        if (state.status !== 'paused') return;
        const t = Date.now();
        const next = resumeTimer(state, t);
        setNow(t);
        setState(next);
        scheduleEnd(next);
      },
      stop() {
        setState(IDLE);
        cancelEnd();
      },
      reset() {
        setState(IDLE);
        cancelEnd();
      },
    }),
    [state, now],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): Pomodoro {
  const pomodoro = useContext(PomodoroContext);
  if (!pomodoro) {
    throw new Error('usePomodoro must be used inside PomodoroProvider.');
  }
  return pomodoro;
}
