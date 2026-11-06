import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { VisitChanges } from '../../shared/api/types';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

/** "+2", "−1" or "0". */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** What changed since the previous app session; opening Ana Sayfa records the visit. */
export function ChangesCard() {
  const [changes, setChanges] = useState<VisitChanges | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getApiClient()
      .then((client) => client.recordVisit(timeZone))
      .then((result) => {
        if (active) setChanges(result);
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
      <HomeCard title="Son ziyaretinden beri" error>
        <p className={styles.errorText}>Değişiklikler yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (changes === null) {
    return (
      <HomeCard title="Son ziyaretinden beri">
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }

  const rows: [string, string][] = [];
  if (changes.newStars !== null) rows.push(['Yeni yıldız', signed(changes.newStars)]);
  if (changes.newFollowers !== null) rows.push(['Yeni takipçi', signed(changes.newFollowers)]);
  if (changes.newVideos !== null) rows.push(['Yeni video', String(changes.newVideos)]);

  return (
    <HomeCard title="Son ziyaretinden beri">
      {changes.since === null && (
        <p className={styles.muted}>İlk açılış: değişiklikler bir sonraki açılışta görünecek.</p>
      )}
      <ul className={styles.list}>
        {rows.map(([label, value]) => (
          <li key={label} className={styles.row}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
        <li className={styles.row}>
          <span>Pomodoro serisi</span>
          <strong>
            {changes.streakDays > 0 ? `${changes.streakDays} gün` : 'Bugün bir pomodoro ile başla.'}
          </strong>
        </li>
      </ul>
    </HomeCard>
  );
}
