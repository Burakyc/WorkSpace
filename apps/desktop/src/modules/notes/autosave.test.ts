import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosave, type SaveStatus } from './autosave';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(save = vi.fn<(value: string) => Promise<void>>(() => Promise.resolve())) {
  const statuses: SaveStatus[] = [];
  const autosave = createAutosave(save, (s) => statuses.push(s));
  return { save, statuses, autosave };
}

describe('createAutosave', () => {
  it('saves only the last value one second after the last change', async () => {
    const { save, statuses, autosave } = setup();

    autosave.schedule('a');
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule('ab');
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule('abc');
    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    expect(autosave.pending()).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls).toEqual([['abc']]);
    expect(statuses).toEqual(['saving', 'saved']);
    expect(autosave.pending()).toBe(false);
  });

  it('flushes a pending value at once and does nothing without one', async () => {
    const { save, autosave } = setup();

    await autosave.flush();
    expect(save).not.toHaveBeenCalled();

    autosave.schedule('x');
    await autosave.flush();
    expect(save.mock.calls).toEqual([['x']]);

    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('never runs two saves at once', async () => {
    let finish = () => {};
    const save = vi.fn<(value: string) => Promise<void>>(
      (value) =>
        new Promise((resolve) => {
          finish = resolve;
          void value;
        }),
    );
    const { autosave } = setup(save);

    autosave.schedule('first');
    await vi.advanceTimersByTimeAsync(1000);
    autosave.schedule('second');
    await vi.advanceTimersByTimeAsync(1000);
    expect(save.mock.calls).toEqual([['first']]);

    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(save.mock.calls).toEqual([['first'], ['second']]);
    finish();
    await autosave.flush();
    expect(autosave.pending()).toBe(false);
  });

  it('keeps a failed value pending and saves it on the next flush', async () => {
    const save = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const { statuses, autosave } = setup(save);

    autosave.schedule('text');
    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses).toEqual(['saving', 'failed']);
    expect(autosave.pending()).toBe(true);

    await autosave.flush();
    expect(save.mock.calls).toEqual([['text'], ['text']]);
    expect(statuses.at(-1)).toBe('saved');
    expect(autosave.pending()).toBe(false);
  });
});
