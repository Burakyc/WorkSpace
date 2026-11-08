export type TimerKind = 'focus' | 'shortBreak' | 'longBreak';

/** The lesson part a focus session studies. */
export interface LessonPartRef {
  slug: string;
  partId: string;
  /** Kept for the note, so saving does not depend on the lesson still being readable. */
  topic: string;
  title: string;
}

interface SessionInfo {
  /** Breaks keep the last focus session's goal for display; they are never saved. */
  kind: TimerKind;
  goalId: string;
  /** Kept with the session so it can be shown even if the goal is archived meanwhile. */
  goalTitle: string;
  projectId: string | null;
  /** Normalized tags chosen at start. */
  tags: string[];
  lessonPart: LessonPartRef | null;
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
  tags: string[] = [],
  lessonPart: LessonPartRef | null = null,
): RunningTimer {
  return {
    status: 'running',
    kind: 'focus',
    goalId: goal.id,
    goalTitle: goal.title,
    projectId,
    tags,
    lessonPart,
    startedAt: now,
    durationMs,
    endsAt: now + durationMs,
  };
}

export function startBreak(
  kind: 'shortBreak' | 'longBreak',
  goal: { id: string; title: string },
  projectId: string | null,
  durationMs: number,
  now: number,
): RunningTimer {
  return { ...startTimer(goal, projectId, durationMs, now), kind };
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

function parseLessonPart(value: unknown): LessonPartRef | null {
  if (typeof value !== 'object' || value === null) return null;
  const { slug, partId, topic, title } = value as Record<string, unknown>;
  return typeof slug === 'string' &&
    typeof partId === 'string' &&
    typeof topic === 'string' &&
    typeof title === 'string'
    ? { slug, partId, topic, title }
    : null;
}

/** Stored data (localStorage) is untrusted: anything that is not a complete, valid timer is idle. */
export function parseStoredTimer(value: unknown): TimerState {
  if (typeof value !== 'object' || value === null) return IDLE;
  const v = value as Record<string, unknown>;
  const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

  const kind = v['kind'] ?? 'focus';
  if (
    (kind !== 'focus' && kind !== 'shortBreak' && kind !== 'longBreak') ||
    typeof v['goalId'] !== 'string' ||
    typeof v['goalTitle'] !== 'string' ||
    !(v['projectId'] === null || typeof v['projectId'] === 'string') ||
    !(
      v['tags'] === undefined ||
      (Array.isArray(v['tags']) && v['tags'].every((t) => typeof t === 'string'))
    ) ||
    !isNumber(v['startedAt']) ||
    !isNumber(v['durationMs']) ||
    v['durationMs'] <= 0
  ) {
    return IDLE;
  }
  const info: SessionInfo = {
    // Timers stored before breaks existed are focus timers.
    kind,
    goalId: v['goalId'],
    goalTitle: v['goalTitle'],
    projectId: v['projectId'],
    // Timers stored before tags existed have none.
    tags: (v['tags'] as string[] | undefined) ?? [],
    // A session is worth more than its link: a broken part only loses the part.
    lessonPart: parseLessonPart(v['lessonPart']),
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
