import { ChevronDown, ChevronRight, FileText, Folder, MoreHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import type { NoteNode } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { MovePanel } from './MovePanel';
import type { TreeState } from './NoteTree';
import { canMoveInto, childrenOf, descendantIds } from './treeHelpers';
import styles from './NotesPage.module.css';

export function NoteTreeItem({ node, tree }: { node: NoteNode; tree: TreeState }) {
  const children = childrenOf(tree.nodes, node.id);
  const expanded = !tree.collapsed.has(node.id);
  const panel = tree.panel?.id === node.id ? tree.panel.kind : null;
  const Icon = node.kind === 'folder' ? Folder : FileText;
  const accepts = tree.dragging !== null && canMoveInto(tree.nodes, tree.dragging, node.id);

  return (
    <li>
      <div
        className={`${styles.row} ${tree.openId === node.id ? styles.open : ''} ${
          accepts && tree.dropTarget === node.id ? styles.dropTarget : ''
        }`}
        draggable={tree.renamingId !== node.id}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer?.setData('text/plain', node.id);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
          tree.setDragging(node.id);
        }}
        onDragEnd={() => tree.setDragging(null)}
        onDragOver={(event) => {
          if (!accepts) return;
          event.preventDefault();
          tree.setDropTarget(node.id);
        }}
        onDragLeave={() => tree.setDropTarget(null)}
        onDrop={(event) => {
          event.preventDefault();
          if (accepts && tree.dragging) void tree.actions.move(tree.dragging, node.id);
          tree.setDragging(null);
        }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-label={`${node.title} ${expanded ? 'daralt' : 'genişlet'}`}
            onClick={() => tree.toggle(node.id)}
          >
            {expanded ? (
              <ChevronDown size={14} aria-hidden="true" />
            ) : (
              <ChevronRight size={14} aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className={styles.toggle} />
        )}
        <Icon size={16} aria-hidden="true" className={styles.kindIcon} />
        {tree.renamingId === node.id ? (
          <RenameField node={node} tree={tree} />
        ) : (
          <Link
            to={`/notes/${node.id}`}
            className={styles.link}
            aria-current={tree.openId === node.id ? 'page' : undefined}
          >
            {node.title}
          </Link>
        )}
        <button
          type="button"
          className={styles.toggle}
          aria-label={`${node.title} için işlemler`}
          aria-expanded={panel === 'menu'}
          onClick={() => tree.setPanel(panel === 'menu' ? null : { id: node.id, kind: 'menu' })}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>

      {panel === 'menu' && <ItemMenu node={node} tree={tree} />}
      {panel === 'delete' && <DeleteConfirm node={node} tree={tree} />}
      {panel === 'move' && <MovePanel node={node} tree={tree} />}

      {children.length > 0 && expanded && (
        <ul className={styles.items}>
          {children.map((child) => (
            <NoteTreeItem key={child.id} node={child} tree={tree} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ItemMenu({ node, tree }: { node: NoteNode; tree: TreeState }) {
  const close = () => tree.setPanel(null);
  const items: [string, () => void][] = [
    ['Alt sayfa ekle', () => void tree.actions.create(node.id, 'page')],
    ['Alt klasör ekle', () => void tree.actions.create(node.id, 'folder')],
    ['Yeniden adlandır', () => tree.actions.startRename(node.id)],
    ['Yukarı taşı', () => void tree.actions.shift(node.id, -1)],
    ['Aşağı taşı', () => void tree.actions.shift(node.id, 1)],
  ];
  return (
    <ul className={styles.menu} aria-label={`${node.title} işlemleri`}>
      {items.map(([label, run]) => (
        <li key={label}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              close();
              run();
            }}
          >
            {label}
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => tree.setPanel({ id: node.id, kind: 'move' })}
        >
          Taşı…
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`${styles.menuItem} ${styles.danger}`}
          onClick={() => tree.setPanel({ id: node.id, kind: 'delete' })}
        >
          Sil
        </button>
      </li>
    </ul>
  );
}

function DeleteConfirm({ node, tree }: { node: NoteNode; tree: TreeState }) {
  const count = descendantIds(tree.nodes, node.id).size;
  return (
    <div role="alertdialog" aria-label="Silme onayı" className={styles.panel}>
      <p className={styles.panelText}>
        “{node.title}” silinsin mi?{count > 0 && ` ${count} alt öğe de silinecek.`}
      </p>
      <div className={form.actions}>
        <button
          type="button"
          className={buttons.primary}
          onClick={() => {
            tree.setPanel(null);
            void tree.actions.remove(node.id);
          }}
        >
          Sil
        </button>
        <button type="button" className={buttons.secondary} onClick={() => tree.setPanel(null)}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}

/** Inline title field: Enter or leaving the field saves, Escape cancels. */
function RenameField({ node, tree }: { node: NoteNode; tree: TreeState }) {
  const [title, setTitle] = useState(node.title);
  const [error, setError] = useState<string | null>(null);
  // Enter saves and then the field loses focus; this stops the second save.
  const settled = useRef(false);

  async function save() {
    if (settled.current) return;
    settled.current = true;
    const errors = await tree.actions.rename(node.id, title);
    if (errors) {
      settled.current = false;
      setError(errors.title?.[0] ?? 'Kaydedilemedi.');
    }
  }

  return (
    <span className={styles.rename}>
      <input
        className={form.input}
        aria-label="Başlık"
        aria-invalid={error !== null}
        value={title}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save();
          if (event.key === 'Escape') {
            settled.current = true;
            tree.actions.cancelRename();
          }
        }}
      />
      {error && <span className={form.fieldError}>{error}</span>}
    </span>
  );
}
