/** At most one pending "focus session ended" notification. Timers and the OS call are injected for tests. */
export interface SessionNotifierDeps {
  now(): number;
  setTimer(callback: () => void, delayMs: number): unknown;
  clearTimer(handle: unknown): void;
  notify(title: string, body: string): void;
}

export interface SessionNotifier {
  /** Replaces any earlier schedule; an end time in the past notifies at once. */
  schedule(endsAt: number, title: string, body: string): void;
  cancel(): void;
}

export const MAX_SCHEDULE_AHEAD_MS = 24 * 60 * 60 * 1000;
export const MAX_TITLE_LENGTH = 100;
export const MAX_BODY_LENGTH = 200;

/** IPC arguments come from the renderer: a finite end time at most 24 h ahead and short texts. */
export function isValidSchedule(
  endsAt: unknown,
  title: unknown,
  body: unknown,
  now: number,
): boolean {
  return (
    typeof endsAt === 'number' &&
    Number.isFinite(endsAt) &&
    endsAt <= now + MAX_SCHEDULE_AHEAD_MS &&
    typeof title === 'string' &&
    title.length <= MAX_TITLE_LENGTH &&
    typeof body === 'string' &&
    body.length <= MAX_BODY_LENGTH
  );
}

export function createSessionNotifier(deps: SessionNotifierDeps): SessionNotifier {
  let handle: unknown;

  const cancel = () => {
    if (handle !== undefined) {
      deps.clearTimer(handle);
      handle = undefined;
    }
  };

  return {
    schedule(endsAt, title, body) {
      cancel();
      handle = deps.setTimer(
        () => {
          handle = undefined;
          deps.notify(title, body);
        },
        Math.max(0, endsAt - deps.now()),
      );
    },
    cancel,
  };
}
