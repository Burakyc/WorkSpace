import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';
import {
  DEFAULT_REMINDERS,
  reminderStatus,
  remindersFrom,
  type Reminder,
  type ReminderStatus,
} from './reminders';

const statusText: Record<ReminderStatus, string> = {
  passed: 'geçti',
  next: 'sıradaki',
  later: 'sırada',
};

/** Today's enabled reminders from the settings and which one comes next; recomputed every minute. */
export function RemindersCard() {
  const [now, setNow] = useState(() => new Date());
  // null while loading; the defaults when the settings cannot be read.
  const [reminders, setReminders] = useState<readonly Reminder[] | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getSettings())
      .then(
        (settings) => {
          if (active) setReminders(remindersFrom(settings.reminders));
        },
        () => {
          if (active) setReminders(DEFAULT_REMINDERS);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <HomeCard title="Hatırlatmalar">
      {reminders?.length === 0 && <p className={styles.muted}>Hatırlatmalar kapalı.</p>}
      {reminders && reminders.length > 0 && (
        <ul className={styles.list}>
          {reminderStatus(reminders, now).map(({ reminder, status }) => (
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
      )}
      <p className={styles.muted}>
        <Link to="/settings">Saatleri Ayarlar'dan değiştir.</Link>
      </p>
    </HomeCard>
  );
}
