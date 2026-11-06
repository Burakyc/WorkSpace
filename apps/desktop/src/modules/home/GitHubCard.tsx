import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { GitHubStatus } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});
const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

/** The saved user's public GitHub numbers from the API's cache; "Yenile" fetches them now. */
export function GitHubCard() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getGitHubStats())
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const client = await getApiClient();
      setStatus(await client.refreshGitHub());
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  if (failed) {
    return (
      <HomeCard title="GitHub" error>
        <p className={styles.errorText}>GitHub verisi yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (status === null) {
    return (
      <HomeCard title="GitHub">
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }
  if (status.username === null) {
    return (
      <HomeCard title="GitHub">
        <p className={styles.text}>
          GitHub kullanıcı adını <Link to="/settings">Ayarlar'dan gir</Link>.
        </p>
      </HomeCard>
    );
  }

  const { stats } = status;
  const failure = refreshFailed ? 'GitHub yenilenemedi.' : status.error;

  return (
    <HomeCard title="GitHub" error={failure !== null}>
      {failure && <p className={styles.errorText}>{failure}</p>}
      <div className={styles.row}>
        <span className={styles.muted}>
          {status.username}
          {status.lastRefreshAt &&
            ` · Son yenileme: ${dateTime.format(new Date(status.lastRefreshAt))}`}
        </span>
        <button
          type="button"
          className={buttons.secondary}
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>
      {stats === null ? (
        <p className={styles.text}>GitHub verisi henüz çekilmedi.</p>
      ) : (
        <>
          <dl className={styles.numbers}>
            <div>
              <dt>Yıldız</dt>
              <dd>{stats.stars}</dd>
            </div>
            <div>
              <dt>Takipçi</dt>
              <dd>{stats.followers}</dd>
            </div>
            <div>
              <dt>Public repo</dt>
              <dd>{stats.publicRepos}</dd>
            </div>
          </dl>
          <p className={styles.text}>Son 30 günde {stats.commitsLast30Days} commit</p>
          {stats.recentCommits.length > 0 && (
            <ul className={styles.list} aria-label="Son commit'ler">
              {stats.recentCommits.map((commit) => {
                const url = commit.url;
                return (
                  <li key={commit.sha}>
                    {url ? (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => void window.devpath.openExternal(url).catch(() => undefined)}
                      >
                        {commit.message}
                      </button>
                    ) : (
                      <strong>{commit.message}</strong>
                    )}
                    <p className={styles.muted}>
                      {commit.repo} · {day.format(new Date(commit.date))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </HomeCard>
  );
}
