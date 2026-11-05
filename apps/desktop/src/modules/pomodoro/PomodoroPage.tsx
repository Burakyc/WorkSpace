import { Timer } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, Project } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import form from '../../shared/ui/form.module.css';
import { usePomodoro } from './PomodoroContext';
import styles from './PomodoroPage.module.css';
import { FOCUS_MINUTES, formatClock, remainingMs } from './timer';

export function PomodoroPage() {
  const id = useId();
  const pomodoro = usePomodoro();
  const { state, now } = pomodoro;
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => Promise.all([client.listGoals(false), client.listProjects(false)]))
      .then(([activeGoals, activeProjects]) => {
        if (!active) return;
        setGoals(activeGoals);
        setProjects(activeProjects);
      })
      .catch(() => {
        if (active) setError('Hedefler yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, []);

  const idle = state.status === 'idle';
  // While a session exists, the pickers show (and lock) its goal and project.
  const shownGoalId = idle ? goalId : state.goalId;
  const shownProjectId = idle ? projectId : (state.projectId ?? '');
  const goalOptions =
    !idle && goals && !goals.some((g) => g.id === state.goalId)
      ? [{ id: state.goalId, title: state.goalTitle }, ...goals]
      : (goals ?? []);
  const projectOptions = projects.filter((p) => p.goalId === shownGoalId);
  const selectedGoal = goalOptions.find((g) => g.id === shownGoalId);

  // After a session the pickers keep its goal and project, ready for the next one.
  function keepSessionSelection() {
    if (state.status === 'idle') return;
    setGoalId(goals?.some((g) => g.id === state.goalId) ? state.goalId : '');
    setProjectId(state.projectId ?? '');
  }

  function stop() {
    keepSessionSelection();
    pomodoro.stop();
  }

  function newSession() {
    keepSessionSelection();
    pomodoro.reset();
  }

  if (goals === null) {
    return (
      <>
        <h1 className={styles.title}>Pomodoro</h1>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : (
          <p className={styles.muted}>Yükleniyor…</p>
        )}
      </>
    );
  }

  if (goals.length === 0 && idle) {
    return (
      <EmptyState
        icon={Timer}
        title="Pomodoro"
        description="Bir hedef seçip odak oturumu başlatacağın yer."
        next="Pomodoro başlatmak için önce bir hedef oluştur."
      >
        <div>
          <Link className={buttons.primary} to="/goals">
            Hedeflere git
          </Link>
        </div>
      </EmptyState>
    );
  }

  const clock = idle ? formatClock(FOCUS_MINUTES * 60_000) : formatClock(remainingMs(state, now));

  return (
    <>
      <h1 className={styles.title}>Pomodoro</h1>
      <section className={styles.panel}>
        <div className={styles.pickers}>
          <div className={form.field}>
            <label htmlFor={`${id}-goal`}>Hedef</label>
            <select
              id={`${id}-goal`}
              className={form.input}
              value={shownGoalId}
              disabled={!idle}
              required
              onChange={(event) => {
                setGoalId(event.target.value);
                setProjectId('');
              }}
            >
              <option value="">Hedef seç</option>
              {goalOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
          <div className={form.field}>
            <label htmlFor={`${id}-project`}>Proje (isteğe bağlı)</label>
            <select
              id={`${id}-project`}
              className={form.input}
              value={shownProjectId}
              disabled={!idle || shownGoalId === ''}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">Proje yok</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p role="timer" aria-label="Kalan süre" className={styles.clock}>
          {clock}
        </p>

        {state.status === 'paused' && <p className={styles.state}>Duraklatıldı</p>}
        {state.status === 'finished' && <p className={styles.state}>Süre doldu.</p>}

        <div className={styles.controls}>
          {idle && (
            <button
              type="button"
              className={buttons.primary}
              disabled={!selectedGoal}
              onClick={() => selectedGoal && pomodoro.start(selectedGoal, projectId || null)}
            >
              Başlat
            </button>
          )}
          {state.status === 'running' && (
            <button type="button" className={buttons.primary} onClick={pomodoro.pause}>
              Duraklat
            </button>
          )}
          {state.status === 'paused' && (
            <button type="button" className={buttons.primary} onClick={pomodoro.resume}>
              Devam et
            </button>
          )}
          {(state.status === 'running' || state.status === 'paused') && (
            <button type="button" className={buttons.secondary} onClick={stop}>
              Durdur
            </button>
          )}
          {state.status === 'finished' && (
            <button type="button" className={buttons.primary} onClick={newSession}>
              Yeni oturum
            </button>
          )}
        </div>
      </section>
    </>
  );
}
