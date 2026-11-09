import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { OpportunitySite } from '../../shared/api/types';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

const TITLE = 'Fırsat siteleri';

/** The followed opportunity sites as links; a click opens the site in the browser. Nothing is read from the sites. */
export function OpportunitiesCard() {
  const [sites, setSites] = useState<OpportunitySite[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listOpportunitySites())
      .then((list) => {
        if (active) setSites(list);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <HomeCard title={TITLE} error>
        <p className={styles.errorText}>Fırsat siteleri yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (sites === null) {
    return (
      <HomeCard title={TITLE}>
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }
  if (sites.length === 0) {
    return (
      <HomeCard title={TITLE}>
        <p className={styles.text}>
          Henüz fırsat sitesi yok. <Link to="/settings">Ayarlar'dan site ekle</Link>
        </p>
      </HomeCard>
    );
  }
  return (
    <HomeCard title={TITLE}>
      <ul className={styles.list} aria-label={TITLE}>
        {sites.map((site) => (
          <li key={site.id}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => void window.devpath.openExternal(site.url).catch(() => undefined)}
            >
              {site.name || site.id}
            </button>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
