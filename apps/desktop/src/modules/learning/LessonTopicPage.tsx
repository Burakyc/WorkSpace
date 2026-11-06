import { Link, useParams } from 'react-router';
import { levelLabel } from '../content/levelLabel';
import styles from './Learning.module.css';
import { useLesson } from './useLesson';

/** A lesson: its parts in order with their summaries, done checks and the progress. */
export function LessonTopicPage() {
  const { slug = '' } = useParams();
  const { state } = useLesson(slug);

  const back = (
    <Link to="/learning" className={styles.back}>
      ← Öğrenme
    </Link>
  );

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  if (state.kind !== 'done') {
    return (
      <div className={styles.page}>
        {back}
        <p role="alert" className={styles.error}>
          {state.kind === 'missing' ? 'Konu bulunamadı.' : 'Konu yüklenemedi.'}
        </p>
      </div>
    );
  }

  const { lesson } = state;
  const done = lesson.items.filter((item) => item.mark === 'done').length;
  return (
    <div className={styles.page}>
      {back}
      <header className={styles.heading}>
        <h1 className={styles.title}>{lesson.topic}</h1>
        <span className={styles.meta}>
          <span className={styles.level}>{levelLabel(lesson.level)}</span>
          {lesson.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </span>
        <div className={styles.progress}>
          <progress aria-label="İlerleme" value={done} max={lesson.items.length} />
          <span>
            {done} / {lesson.items.length} parça
          </span>
        </div>
      </header>
      <ol className={styles.parts}>
        {lesson.items.map((part) => (
          <li key={part.id} className={styles.part}>
            <Link to={`/learning/${lesson.slug}/${part.id}`} className={styles.partLink}>
              {part.title}
            </Link>
            <span className={styles.muted}>{part.summary}</span>
            {part.mark === 'done' && <span className={styles.done}>✓ Tamamlandı</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
