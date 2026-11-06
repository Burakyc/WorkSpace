/** One renderer error: when, what kind and where. Never a message (it can hold note text or a token). */
export interface RendererError {
  at: string;
  kind: string;
  path: string | null;
}

export const ERROR_LOG_CAPACITY = 50;

// In memory only: a reload starts empty.
let entries: RendererError[] = [];

export function recordError(kind: string, path: string | null) {
  entries = [{ at: new Date().toISOString(), kind, path }, ...entries].slice(0, ERROR_LOG_CAPACITY);
}

/** Newest first. */
export function recentErrors(): readonly RendererError[] {
  return entries;
}

/** For tests. */
export function clearErrors() {
  entries = [];
}

/** Drops the query and replaces every segment that is not plain lower-case letters (ids, dates, slugs) with `{…}`. */
export function maskPath(path: string): string {
  return (path.split('?')[0] ?? '')
    .split('/')
    .map((segment) => (segment === '' || /^[a-z]+$/.test(segment) ? segment : '{…}'))
    .join('/');
}
