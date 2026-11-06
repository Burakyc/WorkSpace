import { useId, type ReactNode } from 'react';
import styles from './HomePage.module.css';

/** One card of the home grid; `error` gives it the danger border. */
export function HomeCard({
  title,
  error = false,
  children,
}: {
  title: string;
  error?: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={error ? `${styles.card} ${styles.error}` : styles.card}
    >
      <h2 id={headingId} className={styles.cardTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}
