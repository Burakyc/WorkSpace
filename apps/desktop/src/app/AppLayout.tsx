import type { MouseEvent } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ApiStatus } from './ApiStatus';
import styles from './AppLayout.module.css';
import { navigation } from './navigation';

// The hash is the route (HashRouter), so the skip link moves focus itself instead of changing the hash.
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById('content')?.focus();
}

export function AppLayout() {
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
                  <span className={styles.label}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.footer}>
          <ApiStatus />
        </div>
      </div>
      <main id="content" tabIndex={-1} className={styles.content}>
        <div className={styles.page}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
