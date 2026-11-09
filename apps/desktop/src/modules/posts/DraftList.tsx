import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { PostDraft } from '../../shared/api/types';
import { DraftCard } from './DraftCard';
import styles from './Posts.module.css';

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'done'; drafts: PostDraft[] };

/** The saved drafts, newest first. A change of `version` reloads them, e.g. after an import. */
export function DraftList({ version }: { version: number }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [changes, setChanges] = useState(0);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listDrafts())
      .then(
        (drafts) => {
          if (active) setState({ kind: 'done', drafts });
        },
        () => {
          if (active) setState({ kind: 'failed' });
        },
      );
    return () => {
      active = false;
    };
  }, [version, changes]);

  return (
    <section className={styles.section} aria-labelledby="post-drafts">
      <h2 id="post-drafts" className={styles.sectionTitle}>
        Taslaklar
      </h2>
      {state.kind === 'loading' && <p className={styles.muted}>Yükleniyor…</p>}
      {state.kind === 'failed' && (
        <p role="alert" className={styles.error}>
          Taslaklar yüklenemedi.
        </p>
      )}
      {state.kind === 'done' && state.drafts.length === 0 && (
        <p className={styles.muted}>Henüz taslak yok. Bir proje seçip ilk taslağını oluştur.</p>
      )}
      {state.kind === 'done' && state.drafts.length > 0 && (
        <ul className={styles.list}>
          {state.drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onChanged={() => setChanges((count) => count + 1)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
