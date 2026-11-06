import { Keyboard } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { usePomodoro } from '../modules/pomodoro/PomodoroContext';
import { formatClock, remainingMs } from '../modules/pomodoro/timer';
import type { DevPathBridge } from '../shared/api/types';
import { ApiStatus } from './ApiStatus';
import styles from './AppLayout.module.css';
import { navigation } from './navigation';
import { matchShortcut } from './shortcuts';
import { ShortcutsHelp } from './ShortcutsHelp';

// The hash is the route (HashRouter), so the skip link moves focus itself instead of changing the hash.
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById('content')?.focus();
}

/** Remaining time next to "Pomodoro" while a focus session or break runs or is paused. */
function PomodoroBadge() {
  const { state, now } = usePomodoro();
  if (state.status !== 'running' && state.status !== 'paused') return null;
  const clock = formatClock(remainingMs(state, now));
  const paused = state.status === 'paused';
  return (
    <span
      className={styles.timerBadge}
      aria-label={`${state.kind === 'focus' ? 'Kalan süre' : 'Mola kalan süre'} ${clock}${paused ? ' (duraklatıldı)' : ''}`}
    >
      {clock}
    </span>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Main asks for a page, e.g. when the session-end notification is clicked.
  useEffect(
    () =>
      (window.devpath as DevPathBridge | undefined)?.onOpenPage?.((path) => void navigate(path)),
    [navigate],
  );

  const [helpOpen, setHelpOpen] = useState(false);
  // Capture phase: a matched shortcut never reaches the page (e.g. the note editor).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = matchShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      if (shortcut === 'help') return setHelpOpen(true);
      // The page carries the request out (see useShortcutRequest); Notlar keeps its open item.
      const to = pathname.startsWith('/notes') ? pathname : '/notes';
      void navigate(to, { state: { shortcut } });
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate, pathname]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#content" onClick={skipToContent}>
        İçeriğe geç
      </a>
      <div className={styles.sidebar}>
        <nav aria-label="Ana menü">
          <ul className={styles.links}>
            {navigation.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  title={label}
                  className={({ isActive }) =>
                    isActive ? `${styles.link} ${styles.active}` : styles.link
                  }
                >
                  <Icon aria-hidden="true" size={20} />
                  <span className={styles.label}>
                    {label}
                    {path === '/pomodoro' && <PomodoroBadge />}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.link}
            title="Kısayollar"
            onClick={() => setHelpOpen(true)}
          >
            <Keyboard aria-hidden="true" size={20} />
            <span className={styles.label}>Kısayollar</span>
          </button>
          <ApiStatus />
        </div>
      </div>
      <main id="content" tabIndex={-1} className={styles.content}>
        <div className={styles.page}>
          <Outlet />
        </div>
      </main>
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
