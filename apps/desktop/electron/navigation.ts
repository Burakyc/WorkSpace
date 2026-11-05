/** True only when targetUrl is the app's own page (same origin for the dev server, same file for file://). */
export function isAllowedNavigation(targetUrl: string, appUrl: string): boolean {
  let target: URL;
  let app: URL;
  try {
    target = new URL(targetUrl);
    app = new URL(appUrl);
  } catch {
    return false;
  }

  if (app.protocol === 'file:') {
    return target.protocol === 'file:' && target.pathname === app.pathname;
  }

  return target.origin === app.origin;
}

/** True only for parseable https: URLs with a host. Anything else is never handed to the OS. */
export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname !== '';
  } catch {
    return false;
  }
}
