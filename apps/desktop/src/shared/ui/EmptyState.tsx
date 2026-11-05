import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** What the page is for. */
  description: string;
  /** What the user can do next. */
  next: string;
}

export function EmptyState({ icon: Icon, title, description, next }: EmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <Icon className={styles.icon} aria-hidden="true" size={40} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <p className={styles.next}>{next}</p>
    </section>
  );
}
