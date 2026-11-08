import { Timer } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useShortcutRequest } from '../../app/useShortcutRequest';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import {
  DEFAULT_POMODORO_SETTINGS,
  type Goal,
  type PomodoroSettings,
  type Project,
  type SessionInput,
} from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import form from '../../shared/ui/form.module.css';
import { progressText } from '../goals/progressText';
import { StudyPartPanel } from '../learning/StudyPartPanel';
import { usePomodoro } from './PomodoroContext';
import styles from './PomodoroPage.module.css';
import { TagInput } from './TagInput';
import { focusedMs, formatClock, remainingMs } from './timer';

/** The goal, project and tags of the last started focus session, for Ctrl+Shift+P. */
export const LAST_KEY = 'devpath.pomodoro.last';
interface LastSelection {
  goalId: string;
  projectId: string | null;
  tags: string[];
}

function loadLast(): LastSelection | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
    if (typeof value !== 'object' || value === null) return null;
    const { goalId, projectId, tags } = value as Record<string, unknown>;
    if (typeof goalId !== 'string') return null;
    return {
      goalId,
      projectId: typeof projectId === 'string' ? projectId : null,
      tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
    };
  } catch {
    return null;
  }
}

function saveLast(selection: LastSelection) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(selection));
  } catch {
    // Storage blocked: the shortcut then opens the goal picker.
  }
}

export function PomodoroPage() {
  const id = useId();
  const pomodoro = usePomodoro();
  const { state, now } = pomodoro;
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [savedTags, setSavedTags] = useState<string[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [breakOffer, setBreakOffer] = useState<'shortBreak' | 'longBreak' | null>(null);
  // The goal and project of the last saved focus session; a break shows them.
  const [lastFocus, setLastFocus] = useState<{
    goal: { id: string; title: string };
    projectId: string | null;
  } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const goalPicker = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) =>
        Promise.all([
          client.listGoals(false),
          client.listProjects(false),
          client.listTags().catch(() => []),
          client
            .getSettings()
            .then((s) => s.pomodoro)
            .catch(() => DEFAULT_POMODORO_SETTINGS),
        ]),
      )
      .then(([activeGoals, activeProjects, usedTags, pomodoroSettings]) => {
        if (!active) return;
        setSettings(pomodoroSettings);
        setGoals(activeGoals);
        setProjects(activeProjects);
        setSuggestions(usedTags);
      })
      .catch(() => {
        if (active) setError('Hedefler yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, []);

  const idle = state.status === 'idle';
  const onBreak = !idle && state.kind !== 'focus';
  const lessonPart = idle ? null : state.lessonPart;
  // While a session exists, the pickers show (and lock) its goal and project.
  const shownGoalId = idle ? goalId : state.goalId;
  const shownProjectId = idle ? projectId : (state.projectId ?? '');
  const shownTags = idle ? tags : state.tags;
  // The save form starts with the session's tags; edits there are kept in savedTags.
  const tagsToSave = savedTags ?? (idle ? [] : state.tags);
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
    setTags(state.tags);
  }

  /** Saves the focused minutes as a stopped session (not under 1 minute), then stops; a failed save keeps the timer. */
  async function stop() {
    if (state.status !== 'running' && state.status !== 'paused') return;
    if (state.kind !== 'focus') {
      // A break is never saved.
      keepSessionSelection();
      pomodoro.stop();
      return;
    }
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
          tags: state.tags,
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
        setSuggestions((known) => [...known, ...input.tags.filter((t) => !known.includes(t))]);
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
        tags: tagsToSave,
      },
      state.goalTitle,
    );
    if (saved) {
      keepSessionSelection();
      setNote('');
      setSavedTags(null);
      setLastFocus({
        goal: { id: state.goalId, title: state.goalTitle },
        projectId: state.projectId,
      });
      setBreakOffer(pomodoro.cycle + 1 >= settings.longBreakInterval ? 'longBreak' : 'shortBreak');
      pomodoro.recordCompletedFocus();
      pomodoro.reset();
    }
  }

  function startBreak(kind: 'shortBreak' | 'longBreak') {
    if (!lastFocus) return;
    if (kind === 'longBreak') pomodoro.resetCycle();
    setBreakOffer(null);
    const minutes = kind === 'longBreak' ? settings.longBreakMinutes : settings.shortBreakMinutes;
    pomodoro.startBreak(kind, lastFocus.goal, lastFocus.projectId, minutes * 60_000);
  }

  function skipBreak() {
    if (breakOffer === 'longBreak') pomodoro.resetCycle();
    setBreakOffer(null);
  }

  function endBreak() {
    keepSessionSelection();
    pomodoro.reset();
  }

  function start(goal = selectedGoal, chosenProjectId = projectId || null, chosenTags = tags) {
    if (!goal) return;
    setFeedback(null);
    setSaveError(null);
    setBreakOffer(null);
    saveLast({ goalId: goal.id, projectId: chosenProjectId, tags: chosenTags });
    pomodoro.start(goal, chosenProjectId, chosenTags, settings.focusMinutes * 60_000);
  }

  // Ctrl+Shift+P: stop what runs, or start with the last selection while its goal is still active.
  useShortcutRequest('pomodoro', goals !== null, () => {
    if (state.status === 'running' || state.status === 'paused') return void stop();
    if (state.status !== 'idle') return;
    const last = loadLast();
    const goal = last && goals?.find((g) => g.id === last.goalId);
    if (!last || !goal) return goalPicker.current?.focus();
    const project = projects.find((p) => p.id === last.projectId && p.goalId === goal.id);
    setGoalId(goal.id);
    setProjectId(project?.id ?? '');
    setTags(last.tags);
    start(goal, project?.id ?? null, last.tags);
  });

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

  const clock = idle
    ? formatClock(settings.focusMinutes * 60_000)
    : formatClock(remainingMs(state, now));

  return (
    <>
      <h1 className={styles.title}>Pomodoro</h1>
      {/* One tree with or without a part, so the timer keeps focus and input when a part starts. */}
      <div className={lessonPart ? styles.study : undefined}>
        <section className={styles.panel}>
          <div className={styles.pickers}>
            <div className={form.field}>
              <label htmlFor={`${id}-goal`}>Hedef</label>
              <select
                ref={goalPicker}
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
          <div className={styles.tags}>
            <TagInput
              label="Etiketler (isteğe bağlı)"
              tags={shownTags}
              onChange={setTags}
              suggestions={suggestions}
              disabled={!idle}
            />
          </div>

          <p role="timer" aria-label="Kalan süre" className={styles.clock}>
            {clock}
          </p>

          {onBreak && state.status !== 'finished' && (
            <p className={styles.state}>{state.kind === 'longBreak' ? 'Uzun mola' : 'Mola'}</p>
          )}
          {state.status === 'paused' && <p className={styles.state}>Duraklatıldı</p>}
          {state.status === 'finished' && (
            <p className={styles.state}>{onBreak ? 'Mola bitti.' : 'Süre doldu.'}</p>
          )}

          <div className={styles.controls}>
            {idle && (
              <button
                type="button"
                className={buttons.primary}
                disabled={!selectedGoal}
                onClick={() => start()}
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
                {onBreak ? 'Molayı bitir' : 'Durdur'}
              </button>
            )}
            {state.status === 'finished' && onBreak && (
              <button type="button" className={buttons.primary} onClick={endBreak}>
                Tamam
              </button>
            )}
            {idle && breakOffer && lastFocus && (
              <>
                <button
                  type="button"
                  className={buttons.secondary}
                  onClick={() => startBreak(breakOffer)}
                >
                  {breakOffer === 'longBreak'
                    ? `Uzun molaya başla (${settings.longBreakMinutes} dk)`
                    : `Molaya başla (${settings.shortBreakMinutes} dk)`}
                </button>
                <button type="button" className={buttons.secondary} onClick={skipBreak}>
                  Molayı atla
                </button>
              </>
            )}
          </div>

          {state.status === 'finished' && !onBreak && (
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
              <TagInput
                label="Oturumun etiketleri"
                tags={tagsToSave}
                onChange={setSavedTags}
                suggestions={suggestions}
              />
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
        {lessonPart && <StudyPartPanel part={lessonPart} />}
      </div>
    </>
  );
}
