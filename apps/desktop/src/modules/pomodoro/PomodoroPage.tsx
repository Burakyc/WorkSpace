import { Timer } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, Project, SessionInput } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import form from '../../shared/ui/form.module.css';
import { progressText } from '../goals/progressText';
import { usePomodoro } from './PomodoroContext';
import styles from './PomodoroPage.module.css';
import { FOCUS_MINUTES, focusedMs, formatClock, remainingMs } from './timer';

export function PomodoroPage() {
  const id = useId();
  const pomodoro = usePomodoro();
  const { state, now } = pomodoro;
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  /** Saves the focused minutes as a stopped session (not under 1 minute), then stops; a failed save keeps the timer. */
  async function stop() {
    if (state.status !== 'running' && state.status !== 'paused') return;
    const t = Date.now();
    const focused = focusedMs(state, t);
    if (focused >= 60_000) {
      const saved = await saveSession(
        {
          goalId: state.goalId,
          projectId: state.projectId,
          startedAt: new Date(state.startedAt).toISOString(),
          endedAt: new Date(t).toISOString(),
          durationMinutes: Math.floor(focused / 60_000),
          completed: false,
          note: null,
          tags: [],
        },
        state.goalTitle,
      );
      if (!saved) return;
    } else {
      setFeedback(null);
    }
    keepSessionSelection();
    pomodoro.stop();
  }

  /** Saves a session, then shows the goal's new progress. Returns false (and shows why) when saving failed. */
  async function saveSession(input: SessionInput, goalTitle: string): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    setNoteError(null);
    try {
      const client = await getApiClient();
      await client.createSession(input);
      try {
        const progress = (await client.getGoalProgress()).find((p) => p.goalId === input.goalId);
        const target = goals?.find((g) => g.id === input.goalId)?.targetPomodoros ?? null;
        setFeedback(`Kaydedildi · ${goalTitle}: ${progressText(progress, target)}`);
      } catch {
        setFeedback('Kaydedildi.');
      }
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.errors?.['note']) {
        setNoteError(e.errors['note'].join(' '));
      } else {
        setSaveError('Oturum kaydedilemedi. Tekrar dene.');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveFinished() {
    if (state.status !== 'finished') return;
    const saved = await saveSession(
      {
        goalId: state.goalId,
        projectId: state.projectId,
        startedAt: new Date(state.startedAt).toISOString(),
        endedAt: new Date(state.endedAt).toISOString(),
        durationMinutes: Math.round(state.durationMs / 60_000),
        completed: true,
        note: note.trim() === '' ? null : note,
        tags: [],
      },
      state.goalTitle,
    );
    if (saved) {
      keepSessionSelection();
      setNote('');
      pomodoro.reset();
    }
  }

  function start() {
    if (!selectedGoal) return;
    setFeedback(null);
    setSaveError(null);
    pomodoro.start(selectedGoal, projectId || null);
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
              onClick={start}
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
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => void stop()}
              disabled={saving}
            >
              Durdur
            </button>
          )}
        </div>

        {state.status === 'finished' && (
          <form
            className={styles.saveForm}
            aria-label="Oturumu kaydet"
            onSubmit={(event) => {
              event.preventDefault();
              void saveFinished();
            }}
          >
            <div className={form.field}>
              <label htmlFor={`${id}-note`}>Not (isteğe bağlı)</label>
              <textarea
                id={`${id}-note`}
                className={form.input}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={noteError ? `${id}-note-error` : undefined}
              />
              {noteError && (
                <p id={`${id}-note-error`} className={form.fieldError}>
                  {noteError}
                </p>
              )}
            </div>
            <div>
              <button type="submit" className={buttons.primary} disabled={saving}>
                Kaydet
              </button>
            </div>
          </form>
        )}

        {saveError && (
          <p role="alert" className={styles.error}>
            {saveError}
          </p>
        )}
        {feedback && idle && (
          <p role="status" className={styles.feedback}>
            {feedback}
          </p>
        )}
      </section>
    </>
  );
}
