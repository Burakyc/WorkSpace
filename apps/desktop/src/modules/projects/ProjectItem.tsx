import { ExternalLink } from 'lucide-react';
import type { Project } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Projects.module.css';

interface ProjectItemProps {
  project: Project;
  busy: boolean;
  onEdit(): void;
  onArchive(): void;
  onRestore(): void;
}

export function ProjectItem({ project, busy, onEdit, onArchive, onRestore }: ProjectItemProps) {
  const url = project.url;
  return (
    <li className={styles.item} aria-label={project.title}>
      <span className={styles.itemTitle}>
        {project.title}
        {project.archived && <span className={styles.badge}>Arşivlendi</span>}
      </span>
      <span className={styles.itemActions}>
        {url && (
          <button
            type="button"
            className={buttons.secondary}
            title={url}
            onClick={() => void window.devpath.openExternal(url).catch(() => undefined)}
          >
            <ExternalLink aria-hidden="true" size={14} /> Bağlantıyı aç
          </button>
        )}
        {project.archived ? (
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
      </span>
    </li>
  );
}
