import { FileText, Folder } from 'lucide-react';
import { Link } from 'react-router';
import type { NoteNode } from '../../shared/api/types';
import { NotePage } from './NotePage';
import { ancestorsOf, childrenOf } from './treeHelpers';
import styles from './NotesPage.module.css';

interface NoteViewProps {
  nodes: NoteNode[];
  id: string | null;
  rename(id: string, title: string): Promise<Record<string, string[]> | undefined>;
}

/** The open folder or page: its path, title (a page also its editor) and children. */
export function NoteView({ nodes, id, rename }: NoteViewProps) {
  if (id === null) {
    return <p className={styles.muted}>Soldan bir sayfa seç ya da yeni bir sayfa oluştur.</p>;
  }
  const node = nodes.find((n) => n.id === id);
  if (!node) return <p className={styles.muted}>Not bulunamadı.</p>;

  const ancestors = ancestorsOf(nodes, id);
  const children = childrenOf(nodes, id);

  return (
    <article>
      {ancestors.length > 0 && (
        <nav aria-label="Konum" className={styles.breadcrumb}>
          {ancestors.map((a) => (
            <span key={a.id}>
              <Link to={`/notes/${a.id}`}>{a.title}</Link> /{' '}
            </span>
          ))}
        </nav>
      )}
      {node.kind === 'page' ? (
        <NotePage key={node.id} node={node} rename={rename} />
      ) : (
        <h2 className={styles.title}>{node.title}</h2>
      )}
      {children.length > 0 && (
        <section aria-labelledby="note-children">
          <h3 id="note-children" className={styles.heading}>
            Alt öğeler
          </h3>
          <ul className={styles.childList}>
            {children.map((child) => {
              const Icon = child.kind === 'folder' ? Folder : FileText;
              return (
                <li key={child.id}>
                  <Icon size={16} aria-hidden="true" className={styles.kindIcon} />{' '}
                  <Link to={`/notes/${child.id}`}>{child.title}</Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
