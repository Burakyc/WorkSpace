import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { CalendarDay } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './CalendarPage.module.css';
import { buildMonthGrid, isValidDate, monthOf, shiftMonth, todayLocal } from './monthGrid';

// Dates are formatted at UTC midnight with timeZone UTC, so the Y-M-D never shifts.
const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const monthTitle = new Intl.DateTimeFormat('tr-TR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const longDate = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const weekdayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' });
// 2024-01-01 is a Monday.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => weekdayName.format(utc(`2024-01-0${i + 1}`)));

function shade(count: number): string | undefined {
  if (count >= 6) return styles.level4;
  if (count >= 4) return styles.level3;
  if (count >= 2) return styles.level2;
  if (count >= 1) return styles.level1;
  return undefined;
}

export function CalendarPage() {
  const today = todayLocal();
  const [params, setParams] = useSearchParams();
  // The month lives in state (so quick clicks step from the latest one) and is mirrored to ?month=,
  // so "Takvime dön" and the back button return to it.
  const [month, setMonth] = useState(() => {
    const requested = params.get('month') ?? '';
    return isValidDate(`${requested}-01`) ? requested : monthOf(today);
  });
  // Counts by date; a date's count is the same in every month that shows it, so loads simply merge.
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('month') !== month) setParams({ month }, { replace: true });
  }, [month, params, setParams]);

  useEffect(() => {
    let active = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getApiClient()
      .then((client) => client.getCalendar(month, timeZone))
      .then((result) => {
        if (!active) return;
        setDays((current) => ({
          ...current,
          ...Object.fromEntries(result.days.map((d) => [d.date, d])),
        }));
        setLoaded(month);
      })
      .catch(() => {
        if (active) setFailed(month);
      });
    return () => {
      active = false;
    };
  }, [month]);

  return (
    <>
      <h1 className={styles.title}>Takvim</h1>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${buttons.secondary} ${styles.icon}`}
          aria-label="Önceki ay"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className={styles.month} aria-live="polite">
          {monthTitle.format(utc(`${month}-01`))}
        </h2>
        <button
          type="button"
          className={`${buttons.secondary} ${styles.icon}`}
          aria-label="Sonraki ay"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={buttons.secondary}
          disabled={month === monthOf(today)}
          onClick={() => setMonth(monthOf(today))}
        >
          Bugün
        </button>
        {loaded !== month && failed !== month && <span className={styles.muted}>Yükleniyor…</span>}
      </div>
      {failed === month && (
        <p role="alert" className={styles.error}>
          Takvim yüklenemedi.
        </p>
      )}
      <table className={styles.grid}>
        <thead>
          <tr>
            {WEEKDAYS.map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buildMonthGrid(month).map((week) => (
            <tr key={week[0]?.date}>
              {week.map(({ date, inMonth }) => {
                const count = days[date]?.completedSessions ?? 0;
                const classes = [styles.day, inMonth ? undefined : styles.outside, shade(count)];
                return (
                  <td
                    key={date}
                    className={classes.filter(Boolean).join(' ')}
                    aria-current={date === today ? 'date' : undefined}
                  >
                    <Link
                      to={`/calendar/${date}`}
                      className={styles.dayLink}
                      aria-label={`${longDate.format(utc(date))}, ${count > 0 ? `${count} pomodoro` : 'pomodoro yok'}`}
                    >
                      <span className={styles.number}>{Number(date.slice(8))}</span>
                      {count > 0 && <span className={styles.count}>{count}</span>}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
