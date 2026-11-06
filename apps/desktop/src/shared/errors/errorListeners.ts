import { maskPath, recordError } from './errorLog';

const nameOf = (value: unknown, fallback: string) =>
  value instanceof Error && value.name ? value.name : fallback;

const currentRoute = () => maskPath(window.location.hash.replace(/^#/, '') || '/');

/** Records uncaught errors and unhandled promise rejections of the page. */
export function installErrorListeners(target: Window = window) {
  target.addEventListener('error', (event) =>
    recordError(nameOf(event.error, 'Error'), currentRoute()),
  );
  target.addEventListener('unhandledrejection', (event) =>
    recordError(nameOf(event.reason, 'UnhandledRejection'), currentRoute()),
  );
}
