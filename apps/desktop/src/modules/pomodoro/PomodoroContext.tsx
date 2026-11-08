import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DevPathBridge } from '../../shared/api/types';
import {
  advance,
  IDLE,
  parseStoredTimer,
  pauseTimer,
  resumeTimer,
  startBreak,
  startTimer,
  type LessonPartRef,
  type TimerState,
} from './timer';

export const STORAGE_KEY = 'devpath.pomodoro';
/** Completed focus sessions in the current cycle (for the long break). */
export const CYCLE_KEY = 'devpath.pomodoro.cycle';
const TICK_MS = 250;

export interface Pomodoro {
  state: TimerState;
  /** The clock used for the remaining time; updated every tick while running. */
  now: number;
  start(
    goal: { id: string; title: string },
    projectId: string | null,
    tags: string[],
    durationMs: number,
    lessonPart?: LessonPartRef | null,
  ): void;
  startBreak(
    kind: 'shortBreak' | 'longBreak',
    goal: { id: string; title: string },
    projectId: string | null,
    durationMs: number,
  ): void;
  pause(): void;
  resume(): void;
  stop(): void;
  /** Back to idle after a finished session. */
  reset(): void;
  /** Completed focus sessions since the last long break. */
  cycle: number;
  recordCompletedFocus(): void;
  resetCycle(): void;
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

function loadCycle(): number {
  try {
    const value = Number(localStorage.getItem(CYCLE_KEY));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the timer still works for this page load.
  }
}

// The timer never depends on main: a missing bridge or a failed call is ignored.
const bridge = () => (window.devpath as DevPathBridge | undefined)?.pomodoro;

function scheduleEnd(state: TimerState) {
  if (state.status === 'running') {
    void bridge()
      ?.scheduleEnd(
        state.endsAt,
        state.kind === 'focus' ? 'Odak süresi bitti' : 'Mola bitti',
        state.kind === 'focus' ? state.goalTitle : 'Yeni odak oturumuna hazırsın.',
      )
      .catch(() => undefined);
  }
}

function cancelEnd() {
  void bridge()
    ?.cancelEnd()
    .catch(() => undefined);
}

/** Owns the active timer (focus or break) for the whole app: ticks it, stores it and schedules the end notification. */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadStored);
  const [state, setState] = useState<TimerState>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [cycle, setCycle] = useState(loadCycle);

  // A timer restored as running gets its notification scheduled again (main may have restarted).
  useEffect(() => {
    scheduleEnd(initial);
  }, [initial]);

  useEffect(() => {
    save(STORAGE_KEY, state);
  }, [state]);

  useEffect(() => {
    save(CYCLE_KEY, cycle);
  }, [cycle]);

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
      start(goal, projectId, tags, durationMs, lessonPart = null) {
        const t = Date.now();
        const next = startTimer(goal, projectId, durationMs, t, tags, lessonPart);
        setNow(t);
        setState(next);
        scheduleEnd(next);
      },
      startBreak(kind, goal, projectId, durationMs) {
        const t = Date.now();
        const next = startBreak(kind, goal, projectId, durationMs, t);
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
      cycle,
      recordCompletedFocus() {
        setCycle((c) => c + 1);
      },
      resetCycle() {
        setCycle(0);
      },
    }),
    [state, now, cycle],
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
