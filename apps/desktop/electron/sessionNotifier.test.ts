import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionNotifier, isValidSchedule } from './sessionNotifier';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const notify = vi.fn<(title: string, body: string) => void>();
  const notifier = createSessionNotifier({
    now: () => Date.now(),
    setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    notify,
  });
  return { notifier, notify };
}

describe('createSessionNotifier', () => {
  it('notifies once at the end time', () => {
    const { notifier, notify } = setup();

    notifier.schedule(Date.now() + 60_000, 'Odak süresi bitti', 'Learn ASP.NET Core');
    vi.advanceTimersByTime(59_999);
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(notify).toHaveBeenCalledExactlyOnceWith('Odak süresi bitti', 'Learn ASP.NET Core');
  });

  it('replaces an earlier schedule and can be cancelled', () => {
    const { notifier, notify } = setup();

    notifier.schedule(Date.now() + 1_000, 'T', 'first');
    notifier.schedule(Date.now() + 2_000, 'T', 'second');
    vi.advanceTimersByTime(5_000);
    expect(notify).toHaveBeenCalledExactlyOnceWith('T', 'second');

    notifier.schedule(Date.now() + 1_000, 'T', 'third');
    notifier.cancel();
    vi.advanceTimersByTime(5_000);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('notifies at once for an end time in the past', () => {
    const { notifier, notify } = setup();

    notifier.schedule(Date.now() - 10_000, 'Mola bitti', 'late');
    vi.advanceTimersByTime(0);

    expect(notify).toHaveBeenCalledExactlyOnceWith('Mola bitti', 'late');
  });
});

describe('isValidSchedule', () => {
  const now = 1_800_000_000_000;

  it('accepts a near end time and a short text', () => {
    expect(isValidSchedule(now + 25 * 60_000, 'Odak süresi bitti', 'Learn', now)).toBe(true);
  });

  it.each<[string, unknown, unknown, unknown]>([
    ['a string time', '1800', 'T', 'x'],
    ['infinity', Infinity, 'T', 'x'],
    ['more than a day ahead', now + 25 * 60 * 60_000, 'T', 'x'],
    ['a missing title', now, undefined, 'x'],
    ['a long title', now, 'x'.repeat(101), 'x'],
    ['a missing body', now, 'T', undefined],
    ['a long body', now, 'T', 'x'.repeat(201)],
  ])('refuses %s', (_name, endsAt, title, body) => {
    expect(isValidSchedule(endsAt, title, body, now)).toBe(false);
  });
});
