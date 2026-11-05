import { useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, Project, ProjectUpdateInput } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { ProjectForm } from './ProjectForm';
import { ProjectItem } from './ProjectItem';
import styles from './Projects.module.css';

interface ProjectListProps {
  goal: Goal;
  /** This goal's projects, archived included, in creation order. */
  projects: Project[];
  showArchived: boolean;
  /** Called after a change so the page reloads from the API. */
  onChanged(): void;
}

/** `'new'` while the add form is open, a project id while that project is edited. */
type Editing = 'new' | string | null;

export function ProjectList({ goal, projects, showArchived, onChanged }: ProjectListProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = projects.filter((project) => showArchived || !project.archived);

  async function save(input: ProjectUpdateInput, project?: Project) {
    const client = await getApiClient();
    await (project
      ? client.updateProject(project.id, input)
      : client.createProject({ goalId: goal.id, ...input }));
    setEditing(null);
    onChanged();
  }

  async function setArchived(project: Project, archived: boolean) {
    setBusyId(project.id);
    setError(null);
    try {
      const client = await getApiClient();
      await (archived ? client.archiveProject(project.id) : client.restoreProject(project.id));
      onChanged();
    } catch {
      setError('İşlem tamamlanamadı.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.projects} aria-label={`${goal.title} projeleri`}>
      <h3 className={styles.heading}>Projeler</h3>
      {error && (
        <p role="alert" className={styles.muted}>
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <p className={styles.muted}>Henüz proje yok.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((project) =>
            editing === project.id ? (
              <li key={project.id}>
                <ProjectForm
                  project={project}
                  onSave={(input) => save(input, project)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <ProjectItem
                key={project.id}
                project={project}
                busy={busyId === project.id}
                onEdit={() => setEditing(project.id)}
                onArchive={() => void setArchived(project, true)}
                onRestore={() => void setArchived(project, false)}
              />
            ),
          )}
        </ul>
      )}
      {editing === 'new' ? (
        <ProjectForm onSave={(input) => save(input)} onCancel={() => setEditing(null)} />
      ) : (
        !goal.archived && (
          <div>
            <button type="button" className={buttons.secondary} onClick={() => setEditing('new')}>
              Proje ekle
            </button>
          </div>
        )
      )}
    </section>
  );
}
