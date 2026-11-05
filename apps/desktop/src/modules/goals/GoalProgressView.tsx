import type { GoalProgress } from '../../shared/api/types';
import styles from './GoalProgressView.module.css';
import { progressText } from './progressText';

interface GoalProgressViewProps {
  /** Missing until the progress request answers; shown as zero. */
  progress: GoalProgress | undefined;
  targetPomodoros: number | null;
}

export function GoalProgressView({ progress, targetPomodoros }: GoalProgressViewProps) {
  const text = progressText(progress, targetPomodoros);

  if (targetPomodoros === null) {
    return <p className={styles.text}>{text}</p>;
  }

  return (
    <div className={styles.progress}>
      <p className={styles.text}>{text}</p>
      <progress
        className={styles.bar}
        aria-label="İlerleme"
        value={progress?.percent ?? 0}
        max={100}
      />
    </div>
  );
}
