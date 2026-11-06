import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Learning.module.css';
import { LessonBody } from './LessonBody';
import { useLesson } from './useLesson';

/** One part of a lesson: body, exercises, the done toggle and links to the neighbouring parts. */
export function LessonPartPage() {
  const { slug = '', partId = '' } = useParams();
  const { state, reload } = useLesson(slug);
  const [saving, setSaving] = useState(false);
  // The part whose last save failed, so the message goes away on another part.
  const [failedPart, setFailedPart] = useState<string | null>(null);
  const failed = failedPart === partId;

  // A new part starts at the top.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
  }, [partId]);

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  if (state.kind !== 'done') {
    return (
      <div className={styles.page}>
        <Link to="/learning" className={styles.back}>
          ← Öğrenme
        </Link>
        <p role="alert" className={styles.error}>
          {state.kind === 'missing' ? 'Konu bulunamadı.' : 'Konu yüklenemedi.'}
        </p>
      </div>
    );
  }

  const { lesson } = state;
  const index = lesson.items.findIndex((item) => item.id === partId);
  const part = lesson.items[index];
  const back = (
    <Link to={`/learning/${lesson.slug}`} className={styles.back}>
      ← {lesson.topic}
    </Link>
  );
  if (!part) {
    return (
      <div className={styles.page}>
        {back}
        <p role="alert" className={styles.error}>
          Parça bulunamadı.
        </p>
      </div>
    );
  }

  const done = part.mark === 'done';
  const previous = lesson.items[index - 1];
  const next = lesson.items[index + 1];
  const partPath = (id: string) => `/learning/${lesson.slug}/${id}`;

  function toggleDone() {
    if (!part) return;
    setSaving(true);
    setFailedPart(null);
    getApiClient()
      .then((client) => client.markItem('lesson', lesson.slug, part.id, done ? null : 'done'))
      .then(
        () => {
          setSaving(false);
          reload();
        },
        () => {
          setSaving(false);
          setFailedPart(partId);
        },
      );
  }

  return (
    <article className={styles.page}>
      {back}
      <header className={styles.heading}>
        <p className={styles.muted}>
          Parça {index + 1} / {lesson.items.length}
        </p>
        <h1 className={styles.title}>{part.title}</h1>
        <p className={styles.muted}>{part.summary}</p>
      </header>
      <LessonBody body={part.body} />
      {part.exercises && part.exercises.length > 0 && (
        <section className={styles.exercises} aria-labelledby="exercises-title">
          <h2 id="exercises-title" className={styles.subtitle}>
            Alıştırmalar
          </h2>
          <ol>
            {part.exercises.map((exercise, i) => (
              <li key={i}>{exercise}</li>
            ))}
          </ol>
        </section>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={done ? buttons.primary : buttons.secondary}
          aria-pressed={done}
          disabled={saving}
          onClick={toggleDone}
        >
          Tamamlandı
        </button>
        {failed && (
          <p role="alert" className={styles.error}>
            Kaydedilemedi.
          </p>
        )}
      </div>
      <nav className={styles.pager} aria-label="Parçalar">
        {previous && <Link to={partPath(previous.id)}>← Önceki</Link>}
        {next && (
          <Link to={partPath(next.id)} className={styles.next}>
            Sonraki →
          </Link>
        )}
      </nav>
    </article>
  );
}
