import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCloseGuard } from './closeGuard';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const requestFlush = vi.fn();
  const close = vi.fn();
  const guard = createCloseGuard({ requestFlush, close });
  const event = () => ({ preventDefault: vi.fn() });
  return { requestFlush, close, guard, event };
}

describe('createCloseGuard', () => {
  it('holds the first close, asks the page and closes when it answers', () => {
    const { requestFlush, close, guard, event } = setup();
    const first = event();

    guard.onClose(first);
    expect(first.preventDefault).toHaveBeenCalled();
    expect(requestFlush).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();

    guard.onClose(event());
    expect(requestFlush).toHaveBeenCalledTimes(1);

    guard.ready();
    expect(close).toHaveBeenCalledTimes(1);

    const second = event();
    guard.onClose(second);
    expect(second.preventDefault).not.toHaveBeenCalled();
  });

  it('closes after 3 seconds when the page does not answer', () => {
    const { close, guard, event } = setup();

    guard.onClose(event());
    vi.advanceTimersByTime(2999);
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(close).toHaveBeenCalledTimes(1);

    guard.ready();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores an answer before any close', () => {
    const { close, guard } = setup();
    guard.ready();
    expect(close).not.toHaveBeenCalled();
  });
});
