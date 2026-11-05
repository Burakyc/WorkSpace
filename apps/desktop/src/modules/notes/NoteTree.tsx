import { FilePlus, FolderPlus } from 'lucide-react';
import { useState } from 'react';
import type { NoteKind, NoteNode } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { NoteTreeItem } from './NoteTreeItem';
import { childrenOf } from './treeHelpers';
import styles from './NotesPage.module.css';

type FieldErrors = Record<string, string[]> | undefined;

/** What the tree can do; each change reloads the tree. Calls resolve with field errors from the API, if any. */
export interface TreeActions {
  create(parentId: string | null, kind: NoteKind): Promise<FieldErrors>;
  rename(id: string, title: string): Promise<FieldErrors>;
  startRename(id: string): void;
  cancelRename(): void;
  move(id: string, parentId: string | null): Promise<FieldErrors>;
  shift(id: string, offset: -1 | 1): Promise<FieldErrors>;
  remove(id: string): Promise<void>;
}

/** Which item shows its menu, its delete confirmation or its move panel; one at a time. */
export type ItemPanel = { id: string; kind: 'menu' | 'delete' | 'move' } | null;

export interface TreeState {
  nodes: NoteNode[];
  openId: string | null;
  renamingId: string | null;
  panel: ItemPanel;
  setPanel(panel: ItemPanel): void;
  collapsed: ReadonlySet<string>;
  toggle(id: string): void;
  actions: TreeActions;
}

interface NoteTreeProps {
  nodes: NoteNode[];
  openId: string | null;
  renamingId: string | null;
  actions: TreeActions;
}

export function NoteTree({ nodes, openId, renamingId, actions }: NoteTreeProps) {
  const [panel, setPanel] = useState<ItemPanel>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // A new child must be visible, so creating under an item expands it.
  const tree: TreeState = {
    nodes,
    openId,
    renamingId,
    panel,
    setPanel,
    collapsed,
    toggle: (id) =>
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    actions: {
      ...actions,
      create: (parentId, kind) => {
        if (parentId !== null) {
          setCollapsed((current) => new Set([...current].filter((id) => id !== parentId)));
        }
        return actions.create(parentId, kind);
      },
    },
  };

  return (
    <nav aria-label="Not ağacı" className={styles.tree}>
      <div className={styles.treeHeader}>
        <h1 className={styles.treeTitle}>Notlar</h1>
        <button
          type="button"
          className={`${buttons.secondary} ${styles.iconButton}`}
          aria-label="Yeni sayfa"
          title="Yeni sayfa"
          onClick={() => void tree.actions.create(null, 'page')}
        >
          <FilePlus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${buttons.secondary} ${styles.iconButton}`}
          aria-label="Yeni klasör"
          title="Yeni klasör"
          onClick={() => void tree.actions.create(null, 'folder')}
        >
          <FolderPlus size={16} aria-hidden="true" />
        </button>
      </div>
      <ul className={styles.items}>
        {childrenOf(nodes, null).map((node) => (
          <NoteTreeItem key={node.id} node={node} tree={tree} />
        ))}
      </ul>
    </nav>
  );
}
