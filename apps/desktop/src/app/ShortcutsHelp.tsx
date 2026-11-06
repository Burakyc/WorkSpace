import { useEffect, useId, useRef } from 'react';
import buttons from '../shared/ui/buttons.module.css';
import { shortcuts } from './shortcuts';
import styles from './ShortcutsHelp.module.css';

/** The shortcut list in a modal window. Escape and "Kapat" close it; the browser returns focus. */
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId} className={styles.title}>
        Klavye kısayolları
      </h2>
      <dl className={styles.list}>
        {shortcuts.map(({ id, keys, description }) => (
          <div key={id} className={styles.row}>
            <dt>
              {keys.map((key, i) => (
                <span key={key}>
                  {i > 0 && ' + '}
                  <kbd className={styles.key}>{key}</kbd>
                </span>
              ))}
            </dt>
            <dd className={styles.description}>{description}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className={buttons.secondary} onClick={() => ref.current?.close()}>
        Kapat
      </button>
    </dialog>
  );
}
