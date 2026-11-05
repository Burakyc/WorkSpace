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

export function ProjectList({ goal, projects, showArchived, onChanged }: ProjectListProps) {
  const [adding, setAdding] = useState(false);
  const visible = projects.filter((project) => showArchived || !project.archived);

  async function create(input: ProjectUpdateInput) {
    const client = await getApiClient();
    await client.createProject({ goalId: goal.id, ...input });
    setAdding(false);
    onChanged();
  }

  return (
    <section className={styles.projects} aria-label={`${goal.title} projeleri`}>
      <h3 className={styles.heading}>Projeler</h3>
      {visible.length === 0 ? (
        <p className={styles.muted}>Henüz proje yok.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </ul>
      )}
      {adding ? (
        <ProjectForm onSave={create} onCancel={() => setAdding(false)} />
      ) : (
        !goal.archived && (
          <div>
            <button type="button" className={buttons.secondary} onClick={() => setAdding(true)}>
              Proje ekle
            </button>
          </div>
        )
      )}
    </section>
  );
}
