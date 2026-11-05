import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { DayDetail, DaySession } from '../../shared/api/types';
import { formatDuration } from '../../shared/format/formatDuration';
import buttons from '../../shared/ui/buttons.module.css';
import calendar from './CalendarPage.module.css';
import { DailyLog } from './DailyLog';
import styles from './DayPage.module.css';
import { isValidDate, monthOf, shiftDay } from './monthGrid';

const dayTitle = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
  timeZone: 'UTC',
});
// Session times are shown in the page's own time zone, the one sent to the API.
const clock = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

const pomodoros = (count: number, minutes: number) =>
  `${count} pomodoro · ${formatDuration(minutes)}`;

export function DayPage() {
  const { date = '' } = useParams();
  if (!isValidDate(date)) return <Navigate to="/calendar" replace />;
  // A new key per date resets the page state when stepping between days.
  return <DayView key={date} date={date} />;
}

function DayView({ date }: { date: string }) {
  const [day, setDay] = useState<DayDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getApiClient()
      .then((client) => client.getDay(date, timeZone))
      .then((result) => {
        if (active) setDay(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [date]);

  const [weekdayless, weekday] = splitWeekday(dayTitle.format(new Date(`${date}T00:00:00Z`)));

  return (
    <>
      <h1 className={calendar.title}>
        {weekdayless} <span className={styles.weekday}>{weekday}</span>
      </h1>
      <div className={calendar.toolbar}>
        <Link to={`/calendar?month=${monthOf(date)}`} className={buttons.secondary}>
          Takvime dön
        </Link>
        <Link
          to={`/calendar/${shiftDay(date, -1)}`}
          className={`${buttons.secondary} ${calendar.icon}`}
          aria-label="Önceki gün"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <Link
          to={`/calendar/${shiftDay(date, 1)}`}
          className={`${buttons.secondary} ${calendar.icon}`}
          aria-label="Sonraki gün"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      {failed && (
        <p role="alert" className={calendar.error}>
          Gün yüklenemedi.
        </p>
      )}
      {!failed && !day && <p className={calendar.muted}>Yükleniyor…</p>}
      {day && <DayContent day={day} />}
    </>
  );
}

function DayContent({ day }: { day: DayDetail }) {
  return (
    <div className={styles.sections}>
      <p className={styles.summary}>
        {day.completedSessions > 0
          ? pomodoros(day.completedSessions, day.totalMinutes)
          : 'Bu gün tamamlanan pomodoro yok.'}
      </p>

      {day.goals.length > 0 && (
        <section aria-labelledby="day-goals">
          <h2 id="day-goals" className={styles.heading}>
            Hedefler
          </h2>
          <ul className={styles.list}>
            {day.goals.map((goal) => (
              <li key={goal.goalId} className={styles.row}>
                <span>{goal.title ?? 'Silinmiş hedef'}</span>
                <span className={calendar.muted}>
                  {pomodoros(goal.completedSessions, goal.totalMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="day-sessions">
        <h2 id="day-sessions" className={styles.heading}>
          Oturumlar
        </h2>
        {day.sessions.length === 0 ? (
          <p className={calendar.muted}>Bu gün oturum yok.</p>
        ) : (
          <ul className={styles.list}>
            {day.sessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </ul>
        )}
      </section>

      <DailyLog date={day.date} initialText={day.log} />
    </div>
  );
}

function SessionItem({ session }: { session: DaySession }) {
  const range = `${clock.format(new Date(session.startedAt))}–${clock.format(new Date(session.endedAt))}`;
  return (
    <li className={styles.session}>
      <div className={styles.row}>
        <span className={styles.time}>{range}</span>
        <span>
          {session.goalTitle ?? 'Silinmiş hedef'}
          {session.projectTitle && ` · ${session.projectTitle}`}
        </span>
        <span className={calendar.muted}>{formatDuration(session.durationMinutes)}</span>
        {!session.completed && <span className={styles.stopped}>Erken durduruldu</span>}
      </div>
      {session.tags.length > 0 && (
        <p className={styles.tags}>{session.tags.map((t) => `#${t}`).join(' ')}</p>
      )}
      {session.note && <p className={styles.note}>{session.note}</p>}
    </li>
  );
}

/** "3 Kasım 2026 Salı" → ["3 Kasım 2026", "Salı"]; the weekday is the last word in tr-TR. */
function splitWeekday(title: string): [string, string] {
  const space = title.lastIndexOf(' ');
  return [title.slice(0, space), title.slice(space + 1)];
}
