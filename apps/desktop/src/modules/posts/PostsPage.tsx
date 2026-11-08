import styles from './Posts.module.css';
import { StylePromptSection } from './StylePromptSection';

/** The post assistant. It prepares text only; the user posts it by hand. */
export function PostsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <h1 className={styles.title}>Gönderiler</h1>
        <p className={styles.muted}>
          Burada yalnızca taslak hazırlanır. Uygulama hiçbir platformda paylaşım yapmaz.
        </p>
      </header>
      <StylePromptSection />
    </div>
  );
}
