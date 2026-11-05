import { FileText, Folder } from 'lucide-react';
import { Link } from 'react-router';
import type { NoteNode } from '../../shared/api/types';
import { ancestorsOf, childrenOf } from './treeHelpers';
import styles from './NotesPage.module.css';

/** The open folder or page: its path, title and children. */
export function NoteView({ nodes, id }: { nodes: NoteNode[]; id: string | null }) {
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
      <h2 className={styles.title}>{node.title}</h2>
      {node.kind === 'page' && <p className={styles.muted}>Sayfa düzenleyici yakında geliyor.</p>}
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
