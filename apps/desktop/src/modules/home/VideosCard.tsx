import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { YouTubeVideos } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});
const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

interface Loaded {
  channelCount: number;
  videos: YouTubeVideos;
}

/** The newest videos of the followed channels, from the API's cache; "Yenile" fetches them now. */
export function VideosCard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => Promise.all([client.listYouTubeChannels(), client.getYouTubeVideos()]))
      .then(([channels, videos]) => {
        if (active) setLoaded({ channelCount: channels.length, videos });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh(current: Loaded) {
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const client = await getApiClient();
      setLoaded({ ...current, videos: await client.refreshYouTube() });
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  if (failed) {
    return (
      <HomeCard title="Yeni videolar" error>
        <p className={styles.errorText}>Videolar yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (loaded === null) {
    return (
      <HomeCard title="Yeni videolar">
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }
  if (loaded.channelCount === 0) {
    return (
      <HomeCard title="Yeni videolar">
        <p className={styles.text}>
          Henüz kanal yok. <Link to="/settings">Ayarlar'dan kanal ekle</Link>
        </p>
      </HomeCard>
    );
  }

  const { videos, lastRefreshAt, error } = loaded.videos;
  const failure = refreshFailed ? 'Videolar yenilenemedi.' : error;

  return (
    <HomeCard title="Yeni videolar" error={failure !== null}>
      {failure && <p className={styles.errorText}>{failure}</p>}
      <div className={styles.row}>
        <span className={styles.muted}>
          {lastRefreshAt ? `Son yenileme: ${dateTime.format(new Date(lastRefreshAt))}` : ''}
        </span>
        <button
          type="button"
          className={buttons.secondary}
          disabled={refreshing}
          onClick={() => void refresh(loaded)}
        >
          {refreshing ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>
      {videos.length === 0 ? (
        <p className={styles.text}>Videolar henüz çekilmedi.</p>
      ) : (
        <ul className={styles.list} aria-label="Videolar">
          {videos.map((video) => (
            <li key={video.id} className={styles.video}>
              <img
                className={styles.thumbnail}
                src={video.thumbnailUrl}
                alt=""
                loading="lazy"
                width={120}
                height={68}
              />
              <div>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => void window.devpath.openExternal(video.url).catch(() => undefined)}
                >
                  {video.title}
                </button>
                <p className={styles.muted}>
                  {video.channelTitle} · {day.format(new Date(video.publishedAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}
