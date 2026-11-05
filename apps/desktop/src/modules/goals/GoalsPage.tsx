import { Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal } from '../../shared/api/types';
import { EmptyState } from '../../shared/ui/EmptyState';
import { GoalCard } from './GoalCard';
import styles from './GoalsPage.module.css';

export function GoalsPage() {
  // All goals, archived included (active first, newest first); the toggle only filters what is shown.
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped after every change so the list reloads from the API.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listGoals(true))
      .then((all) => {
        if (!active) return;
        setGoals(all);
        setError(null);
      })
      .catch(() => {
        if (active) setError('Hedefler yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [version]);

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

  if (goals !== null && goals.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Hedefler"
        description="Hedeflerin ve onlara bağlı projeler burada listelenecek."
        next="İlk hedefini oluşturarak başla."
      />
    );
  }

  const visible = goals?.filter((goal) => showArchived || !goal.archived) ?? [];

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Hedefler</h1>
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
      {goals === null ? (
        <p className={styles.muted}>Yükleniyor…</p>
      ) : visible.length === 0 ? (
        <p className={styles.muted}>Aktif hedef yok.</p>
      ) : (
        <div className={styles.list}>
          {visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              busy={busyId === goal.id}
              onArchive={() => void setArchived(goal, true)}
              onRestore={() => void setArchived(goal, false)}
            />
          ))}
        </div>
      )}
    </>
  );
}
