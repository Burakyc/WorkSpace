import { ExternalLink } from 'lucide-react';
import type { Project } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Projects.module.css';

interface ProjectItemProps {
  project: Project;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const url = project.url;
  return (
    <li className={styles.item}>
      <span className={styles.itemTitle}>{project.title}</span>
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
      </span>
    </li>
  );
}
