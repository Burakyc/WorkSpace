export interface CloseGuard {
  /** The window's `close` handler: holds the first close and asks the page to finish its work. */
  onClose(event: { preventDefault(): void }): void;
  /** The page answered: close now. */
  ready(): void;
}

/**
 * Lets the page save pending changes before the window closes. The first close is held, the page is asked
 * (`requestFlush`), and the window closes when the page answers or after `timeoutMs`, whichever is first.
 */
export function createCloseGuard(options: {
  requestFlush(): void;
  close(): void;
  timeoutMs?: number;
}): CloseGuard {
  const { requestFlush, close, timeoutMs = 3000 } = options;
  let allowed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function finish() {
    if (allowed) return;
    clearTimeout(timer);
    allowed = true;
    close();
  }

  return {
    onClose(event) {
      if (allowed) return;
      event.preventDefault();
      if (timer !== undefined) return;
      timer = setTimeout(finish, timeoutMs);
      requestFlush();
    },
    ready() {
      if (timer !== undefined) finish();
    },
  };
}
