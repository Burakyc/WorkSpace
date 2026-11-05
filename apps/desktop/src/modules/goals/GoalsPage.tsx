import { Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, GoalInput, GoalProgress, Project } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';
import styles from './GoalsPage.module.css';

/** `'new'` while the create form is open, a goal id while that goal is edited. */
type Editing = 'new' | string | null;

export function GoalsPage() {
  // All goals, archived included (active first, newest first); the toggle only filters what is shown.
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped after every change so the list reloads from the API.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) =>
        Promise.all([client.listGoals(true), client.getGoalProgress(), client.listProjects(true)]),
      )
      .then(([all, allProgress, allProjects]) => {
        if (!active) return;
        setGoals(all);
        setProgress(allProgress);
        setProjects(allProjects);
        setError(null);
      })
      .catch(() => {
        if (active) setError('Hedefler yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function save(input: GoalInput, goal?: Goal) {
    const client = await getApiClient();
    await (goal ? client.updateGoal(goal.id, input) : client.createGoal(input));
    setEditing(null);
    reload();
  }

  async function setArchived(goal: Goal, archived: boolean) {
    setBusyId(goal.id);
    try {
      const client = await getApiClient();
      await (archived ? client.archiveGoal(goal.id) : client.restoreGoal(goal.id));
      reload();
    } catch {
      setError('İşlem tamamlanamadı.');
    } finally {
      setBusyId(null);
    }
  }

  const newGoalButton = (
    <div>
      <button
        type="button"
        className={buttons.primary}
        onClick={() => setEditing('new')}
        disabled={editing === 'new'}
      >
        Yeni hedef
      </button>
    </div>
  );

  if (goals === null) {
    // Only the heading while loading, so no control appears and then disappears.
    return (
      <>
        <h1 className={styles.title}>Hedefler</h1>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : (
          <p className={styles.muted}>Yükleniyor…</p>
        )}
      </>
    );
  }

  if (goals.length === 0 && editing !== 'new') {
    return (
      <EmptyState
        icon={Target}
        title="Hedefler"
        description="Hedeflerin ve onlara bağlı projeler burada listelenecek."
        next="İlk hedefini oluşturarak başla."
      >
        {newGoalButton}
      </EmptyState>
    );
  }

  const visible = goals.filter((goal) => showArchived || !goal.archived);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Hedefler</h1>
        {newGoalButton}
      </div>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => setShowArchived(event.target.checked)}
        />
        Arşivlenenleri göster
      </label>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {editing === 'new' && (
        <GoalForm onSave={(input) => save(input)} onCancel={() => setEditing(null)} />
      )}
      {visible.length === 0 ? (
        editing !== 'new' && <p className={styles.muted}>Aktif hedef yok.</p>
      ) : (
        <div className={styles.list}>
          {visible.map((goal) =>
            editing === goal.id ? (
              <GoalForm
                key={goal.id}
                goal={goal}
                onSave={(input) => save(input, goal)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={progress.find((p) => p.goalId === goal.id)}
                projects={projects.filter((p) => p.goalId === goal.id)}
                showArchived={showArchived}
                busy={busyId === goal.id}
                onProjectsChanged={reload}
                onEdit={() => setEditing(goal.id)}
                onArchive={() => void setArchived(goal, true)}
                onRestore={() => void setArchived(goal, false)}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
