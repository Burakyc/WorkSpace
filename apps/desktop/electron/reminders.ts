/** A daily reminder as main schedules it: the module it opens, its local time (HH:MM) and whether it notifies. */
export interface DailyReminder {
  id: 'english' | 'tech';
  time: string;
  enabled: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** A timer this late means the PC slept through the time: no catch-up. */
export const MAX_LATE_MS = 5 * 60 * 1000;

/** The next local date-time at `time` strictly after `now`: today if still ahead, otherwise tomorrow. */
export function nextTrigger(time: string, now: Date): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

/** The `reminders` of a `GET /api/settings` answer, or null when it is not the expected shape. */
export function parseReminders(settings: unknown): DailyReminder[] | null {
  const section = (settings as { reminders?: unknown } | null)?.reminders;
  if (typeof section !== 'object' || section === null) return null;
  const result: DailyReminder[] = [];
  for (const id of ['english', 'tech'] as const) {
    const value = (section as Record<string, unknown>)[id] as
      { time?: unknown; enabled?: unknown } | undefined;
    if (typeof value?.time !== 'string' || !TIME.test(value.time)) return null;
    if (typeof value.enabled !== 'boolean') return null;
    result.push({ id, time: value.time, enabled: value.enabled });
  }
  return result;
}

export interface ReminderSchedulerDeps {
  now(): Date;
  setTimer(callback: () => void, delayMs: number): unknown;
  clearTimer(handle: unknown): void;
  notify(reminder: DailyReminder): void;
}

/** One timer per enabled reminder; each fires once a day while the app runs. */
export function createReminderScheduler(deps: ReminderSchedulerDeps) {
  let timers: unknown[] = [];

  function schedule(reminder: DailyReminder, after = deps.now()) {
    const at = nextTrigger(reminder.time, after).getTime();
    const handle = deps.setTimer(() => {
      timers = timers.filter((t) => t !== handle);
      const now = deps.now().getTime();
      if (now - at <= MAX_LATE_MS) deps.notify(reminder);
      // From `at` at the earliest: a timer that fires a little early must not land on the same time again.
      schedule(reminder, new Date(Math.max(now, at)));
    }, at - deps.now().getTime());
    timers.push(handle);
  }

  return {
    /** Replaces every scheduled reminder. */
    update(reminders: readonly DailyReminder[]) {
      for (const handle of timers) deps.clearTimer(handle);
      timers = [];
      for (const reminder of reminders) if (reminder.enabled) schedule(reminder);
    },
  };
}
