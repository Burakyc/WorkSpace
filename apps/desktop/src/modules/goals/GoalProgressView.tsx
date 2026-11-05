import type { GoalProgress } from '../../shared/api/types';
import { formatDuration } from '../../shared/format/formatDuration';
import styles from './GoalProgressView.module.css';

interface GoalProgressViewProps {
  /** Missing until the progress request answers; shown as zero. */
  progress: GoalProgress | undefined;
  targetPomodoros: number | null;
}

export function GoalProgressView({ progress, targetPomodoros }: GoalProgressViewProps) {
  const completed = progress?.completedSessions ?? 0;

  if (targetPomodoros === null) {
    return (
      <p className={styles.text}>
        {`${completed} pomodoro · ${formatDuration(progress?.totalMinutes ?? 0)}`}
      </p>
    );
  }

  const percent = progress?.percent ?? 0;
  return (
    <div className={styles.progress}>
      <p className={styles.text}>{`${completed} / ${targetPomodoros} pomodoro · %${percent}`}</p>
      <progress className={styles.bar} aria-label="İlerleme" value={percent} max={100} />
    </div>
  );
}
