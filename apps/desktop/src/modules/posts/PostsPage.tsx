import { useState } from 'react';
import { DraftList } from './DraftList';
import styles from './Posts.module.css';
import { ProjectDraftSection } from './ProjectDraftSection';
import { StylePromptSection } from './StylePromptSection';

/** The post assistant. It prepares text only; the user posts it by hand. */
export function PostsPage() {
  const [draftsVersion, setDraftsVersion] = useState(0);
  const [styleVersion, setStyleVersion] = useState(0);
  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <h1 className={styles.title}>Gönderiler</h1>
        <p className={styles.muted}>
          Burada yalnızca taslak hazırlanır. Uygulama hiçbir platformda paylaşım yapmaz.
        </p>
      </header>
      <ProjectDraftSection
        styleVersion={styleVersion}
        onImported={() => setDraftsVersion((version) => version + 1)}
      />
      <DraftList version={draftsVersion} />
      <StylePromptSection onSaved={() => setStyleVersion((version) => version + 1)} />
    </div>
  );
}
