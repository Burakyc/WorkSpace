import type { StyleVersion } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Posts.module.css';

const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' });

/** The old versions, newest first; "Kutuya al" puts one in the box and saves nothing. */
export function StyleHistory({
  history,
  onTake,
}: {
  history: readonly StyleVersion[];
  onTake(text: string): void;
}) {
  return (
    <>
      <h3 className={styles.cardTitle}>Geçmiş sürümler</h3>
      {history.length === 0 && <p className={styles.muted}>Henüz eski sürüm yok.</p>}
      {history.length > 0 && (
        <ul className={styles.list}>
          {history.map(({ text, savedAt }) => {
            const date = dateTime.format(new Date(savedAt));
            return (
              <li key={savedAt} className={styles.card}>
                <span className={styles.muted}>{date}</span>
                <p className={styles.text}>{text}</p>
                <div>
                  <button
                    type="button"
                    className={buttons.secondary}
                    aria-label={`${date} sürümünü kutuya al`}
                    onClick={() => onTake(text)}
                  >
                    Kutuya al
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
