import { FilePlus, FolderPlus, NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { NoteKind, NoteNode } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import { NoteTree, type TreeActions } from './NoteTree';
import { NoteView } from './NoteView';
import { descendantIds } from './treeHelpers';
import styles from './NotesPage.module.css';

const defaultTitle: Record<NoteKind, string> = { page: 'Adsız sayfa', folder: 'Yeni klasör' };

/** The Notlar page: the folder/page tree on the left, the item from `/notes/:id` on the right. */
export function NotesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<NoteNode[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [actionFailed, setActionFailed] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listNotes())
      .then((result) => {
        if (active) setNodes(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [version]);

  /** Runs one change, then reloads the tree. Field errors are returned to the caller; other failures show a message. */
  async function change(
    action: (client: Awaited<ReturnType<typeof getApiClient>>) => Promise<unknown>,
  ): Promise<Record<string, string[]> | undefined> {
    setActionFailed(false);
    try {
      await action(await getApiClient());
      return undefined;
    } catch (error) {
      if (error instanceof ApiError && error.errors) return error.errors;
      setActionFailed(true);
      return undefined;
    } finally {
      setVersion((v) => v + 1);
    }
  }

  const actions: TreeActions = {
    create: (parentId, kind) =>
      change(async (client) => {
        const node = await client.createNote(parentId, kind, defaultTitle[kind]);
        setRenamingId(node.id);
      }),
    rename: async (nodeId, title) => {
      const errors = await change((client) => client.renameNote(nodeId, title));
      if (!errors) setRenamingId(null);
      return errors;
    },
    startRename: setRenamingId,
    cancelRename: () => setRenamingId(null),
    move: (nodeId, parentId) => change((client) => client.moveNote(nodeId, parentId)),
    shift: (nodeId, offset) => change((client) => client.shiftNote(nodeId, offset)),
    remove: async (nodeId) => {
      const closesOpen =
        id !== undefined && (id === nodeId || descendantIds(nodes ?? [], nodeId).has(id));
      await change((client) => client.deleteNote(nodeId));
      if (closesOpen) void navigate('/notes');
    },
  };

  if (failed) {
    return (
      <p role="alert" className={styles.error}>
        Notlar yüklenemedi.
      </p>
    );
  }
  if (!nodes) return <p className={styles.muted}>Yükleniyor…</p>;

  const error = actionFailed && (
    <p role="alert" className={styles.error}>
      İşlem yapılamadı.
    </p>
  );

  if (nodes.length === 0) {
    return (
      <>
        {error}
        <EmptyState
          icon={NotebookPen}
          title="Notlar"
          description="Henüz not yok."
          next="Bir sayfa ya da klasör oluşturarak başla."
        >
          <div className={styles.actions}>
            <button
              type="button"
              className={buttons.primary}
              onClick={() => void actions.create(null, 'page')}
            >
              <FilePlus size={16} aria-hidden="true" /> Yeni sayfa
            </button>
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => void actions.create(null, 'folder')}
            >
              <FolderPlus size={16} aria-hidden="true" /> Yeni klasör
            </button>
          </div>
        </EmptyState>
      </>
    );
  }

  return (
    <div className={styles.layout}>
      <NoteTree nodes={nodes} openId={id ?? null} renamingId={renamingId} actions={actions} />
      <section className={styles.content}>
        {error}
        <NoteView
          nodes={nodes}
          id={id ?? null}
          rename={(nodeId, title) => change((client) => client.renameNote(nodeId, title))}
        />
      </section>
    </div>
  );
}
