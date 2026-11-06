import { useEffect, useState } from 'react';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';
import { DEFAULT_REMINDERS, reminderStatus, type ReminderStatus } from './reminders';

const statusText: Record<ReminderStatus, string> = {
  passed: 'geçti',
  next: 'sıradaki',
  later: 'sırada',
};

/** Today's daily reminders and which one comes next; recomputed every minute. */
export function RemindersCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <HomeCard title="Hatırlatmalar">
      <ul className={styles.list}>
        {reminderStatus(DEFAULT_REMINDERS, now).map(({ reminder, status }) => (
          <li key={reminder.id} className={styles.row}>
            <span>
              {reminder.time} {reminder.label}
            </span>
            <span className={status === 'next' ? styles.next : styles.muted}>
              {statusText[status]}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.muted}>Saatler ileride Ayarlar'dan değiştirilebilecek.</p>
    </HomeCard>
  );
}
