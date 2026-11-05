import type { GoalProgress } from '../../shared/api/types';
import { formatDuration } from '../../shared/format/formatDuration';

/** "7 / 20 pomodoro · %35" with a target, "3 pomodoro · 1 sa" without; a missing progress counts as zero. */
export function progressText(
  progress: GoalProgress | undefined,
  targetPomodoros: number | null,
): string {
  const completed = progress?.completedSessions ?? 0;
  if (targetPomodoros === null) {
    return `${completed} pomodoro · ${formatDuration(progress?.totalMinutes ?? 0)}`;
  }
  return `${completed} / ${targetPomodoros} pomodoro · %${progress?.percent ?? 0}`;
}
