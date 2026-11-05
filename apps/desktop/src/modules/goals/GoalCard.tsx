import type { Goal, GoalProgress, Project } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { ProjectList } from '../projects/ProjectList';
import styles from './GoalCard.module.css';
import { GoalProgressView } from './GoalProgressView';

interface GoalCardProps {
  goal: Goal;
  progress: GoalProgress | undefined;
  /** This goal's projects, archived included. */
  projects: Project[];
  showArchived: boolean;
  busy: boolean;
  onProjectsChanged(): void;
  onEdit(): void;
  onArchive(): void;
  onRestore(): void;
}

export function GoalCard({
  goal,
  progress,
  projects,
  showArchived,
  busy,
  onProjectsChanged,
  onEdit,
  onArchive,
  onRestore,
}: GoalCardProps) {
  return (
    <article className={styles.card} aria-label={goal.title}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{goal.title}</h2>
        {goal.archived && <span className={styles.badge}>Arşivlendi</span>}
      </div>
      {goal.description && <p className={styles.description}>{goal.description}</p>}
      <p className={styles.meta}>
        {goal.targetPomodoros === null ? 'Hedef yok' : `Hedef: ${goal.targetPomodoros} pomodoro`}
      </p>
      <GoalProgressView progress={progress} targetPomodoros={goal.targetPomodoros} />
      <div className={styles.actions}>
        {goal.archived ? (
          <button type="button" className={buttons.secondary} onClick={onRestore} disabled={busy}>
            Geri al
          </button>
        ) : (
          <>
            <button type="button" className={buttons.secondary} onClick={onEdit} disabled={busy}>
              Düzenle
            </button>
            <button type="button" className={buttons.secondary} onClick={onArchive} disabled={busy}>
              Arşivle
            </button>
          </>
        )}
      </div>
      <ProjectList
        goal={goal}
        projects={projects}
        showArchived={showArchived}
        onChanged={onProjectsChanged}
      />
    </article>
  );
}
