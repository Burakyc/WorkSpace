import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { NoteNode } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import { createAutosave, type SaveStatus } from './autosave';
import styles from './NotesPage.module.css';

// BlockNote is large; it loads the first time a page opens, so app start stays fast.
const NoteEditor = lazy(() => import('./NoteEditor').then((m) => ({ default: m.NoteEditor })));

const statusText: Record<SaveStatus, string> = {
  saving: 'Kaydediliyor…',
  saved: 'Kaydedildi.',
  failed: 'Kaydedilemedi. Yazmaya devam edince tekrar denenecek.',
};

type Rename = (id: string, title: string) => Promise<Record<string, string[]> | undefined>;

/** A page: its editable title and the editor; changes save one second after typing stops. Keyed by page id. */
export function NotePage({ node, rename }: { node: NoteNode; rename: Rename }) {
  const [blocks, setBlocks] = useState<unknown[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const [autosave] = useState(() =>
    createAutosave(
      (value: unknown[]) => getApiClient().then((c) => c.saveNoteContent(node.id, value)),
      setStatus,
    ),
  );

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getNoteContent(node.id))
      .then((content) => {
        if (active) setBlocks(content.blocks);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [node.id]);

  // Leaving the page (another page, another module) saves what is still waiting.
  useEffect(() => () => void autosave.flush(), [autosave]);

  return (
    <div className={styles.page}>
      <TitleField key={node.title} node={node} rename={rename} />
      <p className={styles.status} aria-live="polite">
        {status && statusText[status]}
      </p>
      {failed && (
        <p role="alert" className={styles.error}>
          Sayfa yüklenemedi.
        </p>
      )}
      {!failed && !blocks && <p className={styles.muted}>Yükleniyor…</p>}
      {blocks && (
        <Suspense fallback={<p className={styles.muted}>Yükleniyor…</p>}>
          <NoteEditor initialBlocks={blocks} onChange={(value) => autosave.schedule(value)} />
        </Suspense>
      )}
    </div>
  );
}

/** The page title above the editor: Enter or leaving the field saves, Escape restores. */
function TitleField({ node, rename }: { node: NoteNode; rename: Rename }) {
  const [title, setTitle] = useState(node.title);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  async function save() {
    if (saving.current || title === node.title) return;
    saving.current = true;
    const errors = await rename(node.id, title);
    saving.current = false;
    setError(errors ? (errors.title?.[0] ?? 'Kaydedilemedi.') : null);
  }

  return (
    <div className={styles.titleField}>
      <input
        className={styles.titleInput}
        aria-label="Sayfa başlığı"
        aria-invalid={error !== null}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setTitle(node.title);
            setError(null);
          }
        }}
      />
      {error && <span className={form.fieldError}>{error}</span>}
    </div>
  );
}
