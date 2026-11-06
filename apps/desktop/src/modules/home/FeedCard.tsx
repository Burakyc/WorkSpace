import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { FeedResponse } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDate = (iso: string) => dateTime.format(new Date(iso));

/** The X summaries the morning agent writes to feed.json; an error card when the file is missing or invalid. */
export function FeedCard() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getFeed())
      .then((result) => {
        if (active) setFeed(result);
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
      <HomeCard title="Akış" error>
        <p className={styles.errorText}>Akış yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (feed === null) {
    return (
      <HomeCard title="Akış">
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }
  if (feed.status === 'missing') {
    return (
      <HomeCard title="Akış" error>
        <p className={styles.errorText}>Akış dosyası bulunamadı.</p>
        <p className={styles.muted}>
          Sabah görevi X özetlerini veri klasörüne feed.json olarak yazınca burada görünür.
        </p>
      </HomeCard>
    );
  }
  if (feed.status === 'invalid') {
    return (
      <HomeCard title="Akış" error>
        <p className={styles.errorText}>Akış dosyası geçersiz.</p>
        <ul className={styles.errors} aria-label="Hatalar">
          {feed.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </HomeCard>
    );
  }

  return (
    <HomeCard title="Akış">
      {feed.generatedAt && (
        <p className={styles.muted}>Güncellendi: {formatDate(feed.generatedAt)}</p>
      )}
      {feed.items.length === 0 ? (
        <p className={styles.text}>Akışta özet yok.</p>
      ) : (
        <ul className={styles.list} aria-label="Özetler">
          {feed.items.map((item, index) => {
            const meta = [item.source, item.publishedAt && formatDate(item.publishedAt)]
              .filter(Boolean)
              .join(' · ');
            const url = item.url;
            return (
              <li key={`${index}-${item.title}`}>
                <div className={styles.row}>
                  <strong>{item.title}</strong>
                  {url && (
                    <button
                      type="button"
                      className={buttons.secondary}
                      aria-label={`Aç: ${item.title}`}
                      onClick={() => void window.devpath.openExternal(url).catch(() => undefined)}
                    >
                      Aç
                    </button>
                  )}
                </div>
                {meta && <p className={styles.muted}>{meta}</p>}
                <p className={styles.summary}>{item.summary}</p>
              </li>
            );
          })}
        </ul>
      )}
    </HomeCard>
  );
}
