import type { LucideIcon } from 'lucide-react';
import type { ContentType } from '../../shared/api/types';
import { EmptyState } from '../../shared/ui/EmptyState';
import styles from './Content.module.css';
import { CopyPromptButton } from './CopyPromptButton';
import { ImportPanel } from './ImportPanel';

interface ContentEmptyPageProps {
  type: ContentType;
  icon: LucideIcon;
  title: string;
  description: string;
}

/** A content module before it has topics: what it is for, the prompt to copy and the import panel. */
export function ContentEmptyPage({ type, icon, title, description }: ContentEmptyPageProps) {
  return (
    <div className={styles.page}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        next="İlk içeriğini eklemek için promptu kopyala, yapay zekâya yapıştır ve aldığın JSON'u aşağıya ekle."
      >
        <CopyPromptButton type={type} />
      </EmptyState>
      <ImportPanel type={type} />
    </div>
  );
}
