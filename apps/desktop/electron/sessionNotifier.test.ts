import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionNotifier, isValidSchedule } from './sessionNotifier';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const notify = vi.fn<(body: string) => void>();
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

    notifier.schedule(Date.now() + 60_000, 'Learn ASP.NET Core');
    vi.advanceTimersByTime(59_999);
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(notify).toHaveBeenCalledExactlyOnceWith('Learn ASP.NET Core');
  });

  it('replaces an earlier schedule and can be cancelled', () => {
    const { notifier, notify } = setup();

    notifier.schedule(Date.now() + 1_000, 'first');
    notifier.schedule(Date.now() + 2_000, 'second');
    vi.advanceTimersByTime(5_000);
    expect(notify).toHaveBeenCalledExactlyOnceWith('second');

    notifier.schedule(Date.now() + 1_000, 'third');
    notifier.cancel();
    vi.advanceTimersByTime(5_000);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('notifies at once for an end time in the past', () => {
    const { notifier, notify } = setup();

    notifier.schedule(Date.now() - 10_000, 'late');
    vi.advanceTimersByTime(0);

    expect(notify).toHaveBeenCalledExactlyOnceWith('late');
  });
});

describe('isValidSchedule', () => {
  const now = 1_800_000_000_000;

  it('accepts a near end time and a short text', () => {
    expect(isValidSchedule(now + 25 * 60_000, 'Learn', now)).toBe(true);
  });

  it.each<[string, unknown, unknown]>([
    ['a string time', '1800', 'x'],
    ['infinity', Infinity, 'x'],
    ['more than a day ahead', now + 25 * 60 * 60_000, 'x'],
    ['a missing body', now, undefined],
    ['a long body', now, 'x'.repeat(201)],
  ])('refuses %s', (_name, endsAt, body) => {
    expect(isValidSchedule(endsAt, body, now)).toBe(false);
  });
});
