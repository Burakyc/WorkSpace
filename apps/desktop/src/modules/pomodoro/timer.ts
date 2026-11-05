/** Focus length until phase 2.3 makes it a setting. */
export const FOCUS_MINUTES = 25;

interface SessionInfo {
  goalId: string;
  /** Kept with the session so it can be shown even if the goal is archived meanwhile. */
  goalTitle: string;
  projectId: string | null;
  startedAt: number;
  durationMs: number;
}

/** The active focus timer. All times are epoch milliseconds; the remaining time is always derived from them. */
export type TimerState =
  | { status: 'idle' }
  | (SessionInfo & { status: 'running'; endsAt: number })
  | (SessionInfo & { status: 'paused'; remainingMs: number })
  | (SessionInfo & { status: 'finished'; endedAt: number });

export type RunningTimer = Extract<TimerState, { status: 'running' }>;
export type PausedTimer = Extract<TimerState, { status: 'paused' }>;

export const IDLE: TimerState = { status: 'idle' };

export function startTimer(
  goal: { id: string; title: string },
  projectId: string | null,
  durationMs: number,
  now: number,
): RunningTimer {
  return {
    status: 'running',
    goalId: goal.id,
    goalTitle: goal.title,
    projectId,
    startedAt: now,
    durationMs,
    endsAt: now + durationMs,
  };
}

export function remainingMs(state: TimerState, now: number): number {
  switch (state.status) {
    case 'running':
      return Math.max(0, state.endsAt - now);
    case 'paused':
      return state.remainingMs;
    default:
      return 0;
  }
}

export function pauseTimer(state: RunningTimer, now: number): PausedTimer {
  const { endsAt, ...info } = state;
  return { ...info, status: 'paused', remainingMs: Math.max(0, endsAt - now) };
}

export function resumeTimer(state: PausedTimer, now: number): RunningTimer {
  const { remainingMs: remaining, ...info } = state;
  return { ...info, status: 'running', endsAt: now + remaining };
}

/** A running timer whose end has passed becomes finished (at its end time); anything else is unchanged. */
export function advance(state: TimerState, now: number): TimerState {
  if (state.status !== 'running' || state.endsAt > now) {
    return state;
  }
  const { endsAt, ...info } = state;
  return { ...info, status: 'finished', endedAt: endsAt };
}

/** Time actually focused so far; pauses do not count. */
export function focusedMs(state: TimerState, now: number): number {
  if (state.status === 'idle') return 0;
  if (state.status === 'finished') return state.durationMs;
  return state.durationMs - remainingMs(state, now);
}

/** `MM:SS`, seconds rounded up: 25:00 at the start, 00:01 in the last second. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Stored data (localStorage) is untrusted: anything that is not a complete, valid timer is idle. */
export function parseStoredTimer(value: unknown): TimerState {
  if (typeof value !== 'object' || value === null) return IDLE;
  const v = value as Record<string, unknown>;
  const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

  if (
    typeof v['goalId'] !== 'string' ||
    typeof v['goalTitle'] !== 'string' ||
    !(v['projectId'] === null || typeof v['projectId'] === 'string') ||
    !isNumber(v['startedAt']) ||
    !isNumber(v['durationMs']) ||
    v['durationMs'] <= 0
  ) {
    return IDLE;
  }
  const info: SessionInfo = {
    goalId: v['goalId'],
    goalTitle: v['goalTitle'],
    projectId: v['projectId'],
    startedAt: v['startedAt'],
    durationMs: v['durationMs'],
  };

  switch (v['status']) {
    case 'running':
      return isNumber(v['endsAt']) ? { ...info, status: 'running', endsAt: v['endsAt'] } : IDLE;
    case 'paused':
      return isNumber(v['remainingMs']) && v['remainingMs'] >= 0
        ? { ...info, status: 'paused', remainingMs: v['remainingMs'] }
        : IDLE;
    case 'finished':
      return isNumber(v['endedAt']) ? { ...info, status: 'finished', endedAt: v['endedAt'] } : IDLE;
    default:
      return IDLE;
  }
}
