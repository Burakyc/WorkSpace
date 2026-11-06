import { describe, expect, it } from 'vitest';
import {
  createReminderScheduler,
  nextTrigger,
  parseReminders,
  type DailyReminder,
} from './reminders';

const at = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(y, m - 1, d, h, min);

describe('nextTrigger', () => {
  it('is today while the time is ahead', () => {
    expect(nextTrigger('09:00', at(2026, 11, 6, 8, 0))).toEqual(at(2026, 11, 6, 9, 0));
  });

  it('is tomorrow once the time has passed today, or is now', () => {
    expect(nextTrigger('09:00', at(2026, 11, 6, 10, 0))).toEqual(at(2026, 11, 7, 9, 0));
    expect(nextTrigger('09:00', at(2026, 11, 6, 9, 0))).toEqual(at(2026, 11, 7, 9, 0));
  });

  it('rolls over the month and year', () => {
    expect(nextTrigger('00:15', at(2026, 12, 31, 23, 30))).toEqual(at(2027, 1, 1, 0, 15));
  });
});

describe('parseReminders', () => {
  const answer = {
    pomodoro: {},
    reminders: {
      english: { time: '09:00', enabled: true },
      tech: { time: '20:00', enabled: false },
    },
  };

  it('reads both reminders', () => {
    expect(parseReminders(answer)).toEqual([
      { id: 'english', time: '09:00', enabled: true },
      { id: 'tech', time: '20:00', enabled: false },
    ]);
  });

  it.each([
    null,
    {},
    {
      reminders: {
        english: { time: '9:00', enabled: true },
        tech: { time: '20:00', enabled: true },
      },
    },
    { reminders: { english: { time: '09:00', enabled: true } } },
    {
      reminders: {
        english: { time: '09:00', enabled: 'yes' },
        tech: { time: '20:00', enabled: true },
      },
    },
  ])('rejects %j', (value) => {
    expect(parseReminders(value)).toBeNull();
  });
});

describe('createReminderScheduler', () => {
  function setup(start: Date) {
    let clock = start.getTime();
    const timers = new Map<number, { callback: () => void; due: number }>();
    let nextId = 0;
    const notified: string[] = [];
    const scheduler = createReminderScheduler({
      now: () => new Date(clock),
      setTimer: (callback, delayMs) => {
        timers.set(++nextId, { callback, due: clock + delayMs });
        return nextId;
      },
      clearTimer: (handle) => timers.delete(handle as number),
      notify: (r) => notified.push(r.id),
    });
    /** Moves the clock to `to` and fires the timers due by then (each at its due time, or at `to` when `late`). */
    const advance = (to: Date, late = false) => {
      for (;;) {
        const due = [...timers]
          .filter(([, t]) => t.due <= to.getTime())
          .sort((a, b) => a[1].due - b[1].due)[0];
        if (!due) break;
        timers.delete(due[0]);
        clock = late ? to.getTime() : due[1].due;
        due[1].callback();
      }
      clock = to.getTime();
    };
    return { scheduler, timers, notified, advance };
  }

  const reminders: DailyReminder[] = [
    { id: 'english', time: '09:00', enabled: true },
    { id: 'tech', time: '20:00', enabled: false },
  ];

  it('schedules only enabled reminders, notifies and schedules the next day', () => {
    const { scheduler, timers, notified, advance } = setup(at(2026, 11, 6, 8, 0));

    scheduler.update(reminders);
    expect([...timers.values()].map((t) => new Date(t.due))).toEqual([at(2026, 11, 6, 9, 0)]);

    advance(at(2026, 11, 7, 9, 30));
    expect(notified).toEqual(['english', 'english']);
    expect([...timers.values()].map((t) => new Date(t.due))).toEqual([at(2026, 11, 8, 9, 0)]);
  });

  it('replaces the old timers on update', () => {
    const { scheduler, timers } = setup(at(2026, 11, 6, 8, 0));
    scheduler.update(reminders);

    scheduler.update([{ id: 'tech', time: '20:00', enabled: true }]);

    expect([...timers.values()].map((t) => new Date(t.due))).toEqual([at(2026, 11, 6, 20, 0)]);
  });

  it('does not notify a time the PC slept through, but schedules the next day', () => {
    const { scheduler, timers, notified, advance } = setup(at(2026, 11, 6, 8, 0));
    scheduler.update(reminders);

    advance(at(2026, 11, 6, 9, 10), true);

    expect(notified).toEqual([]);
    expect([...timers.values()].map((t) => new Date(t.due))).toEqual([at(2026, 11, 7, 9, 0)]);
  });

  it('schedules the next day when a timer fires a little early', () => {
    const { scheduler, timers, notified, advance } = setup(at(2026, 11, 6, 8, 0));
    scheduler.update(reminders);
    const [id, timer] = [...timers][0]!;
    timers.delete(id);

    advance(new Date(at(2026, 11, 6, 9, 0).getTime() - 2));
    timer.callback();

    expect(notified).toEqual(['english']);
    expect([...timers.values()].map((t) => new Date(t.due))).toEqual([at(2026, 11, 7, 9, 0)]);
  });
});
