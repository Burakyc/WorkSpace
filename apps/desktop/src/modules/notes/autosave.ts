export type SaveStatus = 'saving' | 'saved' | 'failed';

export interface Autosave<T> {
  /** Remembers the latest value and saves it `delayMs` after the last call. */
  schedule(value: T): void;
  /** Saves a pending value now; resolves when no save is running. A failed value stays pending. */
  flush(): Promise<void>;
  /** Whether a value is waiting to be saved. */
  pending(): boolean;
}

/**
 * Debounced background saving: one save at a time, always of the latest value.
 * A failed save keeps its value pending until the next `schedule` or `flush`.
 */
export function createAutosave<T>(
  save: (value: T) => Promise<unknown>,
  onStatus: (status: SaveStatus) => void = () => {},
  delayMs = 1000,
): Autosave<T> {
  let next: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;

  async function run(): Promise<void> {
    clearTimeout(timer);
    timer = undefined;
    while (running) await running;
    if (!next) return;
    const { value } = next;
    next = null;
    onStatus('saving');
    running = save(value)
      .then(
        () => {
          if (!next) onStatus('saved');
        },
        () => {
          next ??= { value };
          onStatus('failed');
        },
      )
      .finally(() => {
        running = null;
      });
    await running;
  }

  return {
    schedule(value) {
      next = { value };
      clearTimeout(timer);
      timer = setTimeout(() => void run(), delayMs);
    },
    flush: run,
    pending: () => next !== null,
  };
}
