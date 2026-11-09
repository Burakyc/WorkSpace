import { useEffect, useRef, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { PostDraft } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { DraftForm } from './DraftForm';
import { draftCopyText } from './draftText';
import styles from './Posts.module.css';

const dateFormat = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' });

/** One draft. "Kopyala" is the only way out of the app: the user posts the text by hand. */
export function DraftCard({ draft, onChanged }: { draft: PostDraft; onChanged(): void }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [deleteFailed, setDeleteFailed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  function copyText() {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(draftCopyText(draft)))
      .then(
        () => setCopy('copied'),
        () => setCopy('failed'),
      );
  }

  function remove() {
    setDeleteFailed(false);
    getApiClient()
      .then((client) => client.deleteDraft(draft.id))
      .then(onChanged, () => setDeleteFailed(true));
  }

  if (editing) {
    return (
      <li className={styles.card}>
        <DraftForm
          draft={draft}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      </li>
    );
  }

  return (
    <li className={styles.card}>
      <h3 className={styles.cardTitle}>{draft.title}</h3>
      <span className={styles.muted}>
        {draft.topic} · {dateFormat.format(new Date(draft.createdAt))}
      </span>
      <p className={styles.text}>{draft.body}</p>
      {draft.hashtags.length > 0 && (
        <p className={styles.muted}>{draft.hashtags.map((tag) => `#${tag}`).join(' ')}</p>
      )}
      {draft.sourceLink && (
        <div className={styles.row}>
          <span className={styles.link}>{draft.sourceLink}</span>
          <button
            type="button"
            className={buttons.secondary}
            aria-label={`Kaynağı aç: ${draft.title}`}
            onClick={() => {
              if (draft.sourceLink) {
                void window.devpath.openExternal(draft.sourceLink).catch(() => undefined);
              }
            }}
          >
            Aç
          </button>
        </div>
      )}
      {draft.imageSuggestion && <p className={styles.muted}>Görsel: {draft.imageSuggestion}</p>}
      {confirming ? (
        <div role="alertdialog" aria-label="Silme onayı" className={styles.row}>
          <span>Silinsin mi?</span>
          <button ref={confirmRef} type="button" className={buttons.primary} onClick={remove}>
            Evet, sil
          </button>
          <button type="button" className={buttons.secondary} onClick={() => setConfirming(false)}>
            Vazgeç
          </button>
        </div>
      ) : (
        <div className={form.actions}>
          <button type="button" className={buttons.primary} onClick={copyText}>
            Kopyala
          </button>
          <button type="button" className={buttons.secondary} onClick={() => setEditing(true)}>
            Düzenle
          </button>
          <button type="button" className={buttons.secondary} onClick={() => setConfirming(true)}>
            Sil
          </button>
          <span role="status" className={styles.muted}>
            {copy === 'copied' && 'Kopyalandı.'}
            {copy === 'failed' && 'Kopyalanamadı.'}
          </span>
        </div>
      )}
      {deleteFailed && (
        <p role="alert" className={styles.error}>
          Taslak silinemedi.
        </p>
      )}
    </li>
  );
}
