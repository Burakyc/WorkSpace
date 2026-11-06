import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, GoalProgress, PomodoroSettings } from '../../shared/api/types';
import { DEFAULT_POMODORO_SETTINGS } from '../../shared/api/types';
import { formatDuration } from '../../shared/format/formatDuration';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { todayLocal } from '../calendar/monthGrid';
import { progressText } from '../goals/progressText';
import { usePomodoro } from '../pomodoro/PomodoroContext';
import { HomeCard } from './HomeCard';
import styles from './HomePage.module.css';

interface Today {
  completedSessions: number;
  totalMinutes: number;
  goals: Goal[];
  progress: GoalProgress[];
  settings: PomodoroSettings;
}

/** Today's pomodoros, the active goals and a two-click start (goal, then "Başlat"). */
export function TodayCard() {
  const id = useId();
  const pomodoro = usePomodoro();
  const [today, setToday] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
    let active = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getApiClient()
      .then((client) =>
        Promise.all([
          client.getDay(todayLocal(), timeZone),
          client.listGoals(),
          client.getGoalProgress(),
          client
            .getSettings()
            .then((s) => s.pomodoro)
            .catch(() => DEFAULT_POMODORO_SETTINGS),
        ]),
      )
      .then(([day, goals, progress, settings]) => {
        if (active) {
          setToday({
            completedSessions: day.completedSessions,
            totalMinutes: day.totalMinutes,
            goals,
            progress,
            settings,
          });
        }
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
      <HomeCard title="Bugün" error>
        <p className={styles.errorText}>Bugünün özeti yüklenemedi.</p>
      </HomeCard>
    );
  }
  if (today === null) {
    return (
      <HomeCard title="Bugün">
        <p className={styles.muted}>Yükleniyor…</p>
      </HomeCard>
    );
  }

  const selected = today.goals.find((g) => g.id === goalId);

  return (
    <HomeCard title="Bugün">
      <p className={styles.text}>
        Bugün {today.completedSessions} pomodoro · {formatDuration(today.totalMinutes)}
      </p>
      {today.goals.length === 0 ? (
        <p className={styles.text}>
          Önce bir hedef ekle. <Link to="/goals">Hedeflere git</Link>
        </p>
      ) : (
        <>
          <ul className={styles.list} aria-label="Aktif hedefler">
            {today.goals.map((g) => (
              <li key={g.id} className={styles.row}>
                <span>{g.title}</span>
                <span className={styles.muted}>
                  {progressText(
                    today.progress.find((p) => p.goalId === g.id),
                    g.targetPomodoros,
                  )}
                </span>
              </li>
            ))}
          </ul>
          {pomodoro.state.status === 'idle' ? (
            <form
              className={styles.start}
              onSubmit={(event) => {
                event.preventDefault();
                if (!selected) return;
                pomodoro.start(selected, null, [], today.settings.focusMinutes * 60_000);
              }}
            >
              <div className={form.field}>
                <label htmlFor={`${id}-goal`}>Hedef</label>
                <select
                  id={`${id}-goal`}
                  className={form.input}
                  value={goalId}
                  onChange={(event) => setGoalId(event.target.value)}
                >
                  <option value="">Hedef seç</option>
                  {today.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttons.primary} disabled={!selected}>
                Başlat
              </button>
            </form>
          ) : (
            <p className={styles.text}>
              Pomodoro sürüyor. <Link to="/pomodoro">Pomodoro'ya git</Link>
            </p>
          )}
        </>
      )}
    </HomeCard>
  );
}
