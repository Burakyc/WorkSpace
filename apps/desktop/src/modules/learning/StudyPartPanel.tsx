import { Link } from 'react-router';
import type { LessonPartRef } from '../pomodoro/timer';
import styles from './Learning.module.css';
import { PartContent } from './PartContent';
import { useLesson } from './useLesson';

/** The part being studied, next to the timer. The timer keeps working when the part cannot be shown. */
export function StudyPartPanel({ part: ref }: { part: LessonPartRef }) {
  const { state } = useLesson(ref.slug);

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  const part = state.kind === 'done' && state.lesson.items.find((i) => i.id === ref.partId);
  if (!part) {
    return (
      <p role="alert" className={styles.error}>
        {state.kind === 'failed' ? 'Parça yüklenemedi.' : 'Parça bulunamadı.'}
      </p>
    );
  }
  return (
    <article className={styles.page} aria-label={part.title}>
      <Link to={`/learning/${ref.slug}/${ref.partId}`} className={styles.back}>
        ← {ref.topic}
      </Link>
      <header className={styles.heading}>
        <h2 className={styles.title}>{part.title}</h2>
        <p className={styles.muted}>{part.summary}</p>
      </header>
      <PartContent part={part} />
    </article>
  );
}
