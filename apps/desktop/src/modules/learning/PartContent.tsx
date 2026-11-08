import { useId } from 'react';
import type { LessonItem } from '../../shared/api/types';
import styles from './Learning.module.css';
import { LessonBody } from './LessonBody';

/** A part's body and exercises, on the part page and next to the timer. */
export function PartContent({ part }: { part: LessonItem }) {
  const exercisesId = useId();
  return (
    <>
      <LessonBody body={part.body} />
      {part.exercises && part.exercises.length > 0 && (
        <section className={styles.exercises} aria-labelledby={exercisesId}>
          <h2 id={exercisesId} className={styles.subtitle}>
            Alıştırmalar
          </h2>
          <ol>
            {part.exercises.map((exercise, i) => (
              <li key={i}>{exercise}</li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
