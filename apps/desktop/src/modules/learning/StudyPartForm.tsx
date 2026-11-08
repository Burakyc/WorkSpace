import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import {
  DEFAULT_POMODORO_SETTINGS,
  type ContentTopic,
  type Goal,
  type LessonItem,
} from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { usePomodoro } from '../pomodoro/PomodoroContext';
import styles from './Learning.module.css';

const MAX_SESSION_TAGS = 10;
const goalKey = (slug: string) => `devpath.learning.goal.${slug}`;

function loadGoal(slug: string): string | null {
  try {
    return localStorage.getItem(goalKey(slug));
  } catch {
    return null;
  }
}

function saveGoal(slug: string, goalId: string) {
  try {
    localStorage.setItem(goalKey(slug), goalId);
  } catch {
    // Storage blocked: the goal is chosen again next time.
  }
}

interface StudyPartFormProps {
  lesson: ContentTopic<LessonItem>;
  part: LessonItem;
}

/** Starts a focus session on this part, with the lesson's goal preselected, and opens the timer. */
export function StudyPartForm({ lesson, part }: StudyPartFormProps) {
  const id = useId();
  const navigate = useNavigate();
  const pomodoro = usePomodoro();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_POMODORO_SETTINGS.focusMinutes);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(() => loadGoal(lesson.slug));

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) =>
        Promise.all([client.listGoals(false), client.getSettings().catch(() => null)]),
      )
      .then(
        ([activeGoals, settings]) => {
          if (!active) return;
          setGoals(activeGoals);
          if (settings) setFocusMinutes(settings.pomodoro.focusMinutes);
        },
        () => {
          if (active) setFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  if (pomodoro.state.status !== 'idle') {
    return (
      <p className={styles.study}>
        <span className={styles.muted}>Çalışan bir oturum var.</span>{' '}
        <Link to="/pomodoro">Pomodoro&apos;ya git</Link>
      </p>
    );
  }
  if (failed) {
    return (
      <p role="alert" className={styles.error}>
        Hedefler yüklenemedi.
      </p>
    );
  }
  if (goals === null) return null;
  if (goals.length === 0) {
    return (
      <p className={styles.study}>
        <span className={styles.muted}>Çalışmak için önce bir hedef oluştur.</span>{' '}
        <Link to="/goals">Hedeflere git</Link>
      </p>
    );
  }

  const selected =
    goals.find((g) => g.id === chosen) ?? (goals.length === 1 ? goals[0] : undefined);

  function start() {
    if (!selected) return;
    saveGoal(lesson.slug, selected.id);
    pomodoro.start(selected, null, lesson.tags.slice(0, MAX_SESSION_TAGS), focusMinutes * 60_000, {
      slug: lesson.slug,
      partId: part.id,
      topic: lesson.topic,
      title: part.title,
    });
    void navigate('/pomodoro');
  }

  return (
    <div className={styles.study}>
      <div className={form.field}>
        <label htmlFor={`${id}-goal`}>Hedef</label>
        <select
          id={`${id}-goal`}
          className={form.input}
          value={selected?.id ?? ''}
          onChange={(event) => setChosen(event.target.value)}
        >
          <option value="">Hedef seç</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className={buttons.primary} disabled={!selected} onClick={start}>
        Bu parçayı çalış
      </button>
    </div>
  );
}
