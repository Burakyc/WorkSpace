import { useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { VocabItem, VocabMark } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './English.module.css';
import { practiceQueue } from './practiceQueue';

interface VocabPracticeProps {
  slug: string;
  items: VocabItem[];
  /** Leaves practice; the page reloads the topic. */
  onDone(): void;
}

/** One card at a time: the term, then "Çevir" shows the back, then a mark saves and moves on. */
export function VocabPractice({ slug, items, onDone }: VocabPracticeProps) {
  // Built once when practice starts, so marking a card does not reorder the rest.
  const [queue, setQueue] = useState(() => practiceQueue(items));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = (
    <button type="button" className={buttons.secondary} onClick={onDone}>
      Bitir
    </button>
  );

  if (queue.length === 0) {
    return (
      <section className={styles.practice} aria-label="Çalışma">
        <p>Hepsini biliyorsun.</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={buttons.primary}
            onClick={() => setQueue([...items])}
            autoFocus
          >
            Hepsini çalış
          </button>
          {finish}
        </div>
      </section>
    );
  }

  const card = queue[index];
  if (!card) {
    return (
      <section className={styles.practice} aria-label="Çalışma">
        <p>Bitti: {queue.length} kart çalışıldı.</p>
        <div className={styles.actions}>
          <button type="button" className={buttons.primary} onClick={onDone} autoFocus>
            Listeye dön
          </button>
        </div>
      </section>
    );
  }

  function mark(value: VocabMark) {
    if (!card) return;
    setSaving(true);
    getApiClient()
      .then((client) => client.markItem('vocab', slug, card.id, value))
      .then(
        () => {
          setIndex(index + 1);
          setFlipped(false);
          setFailed(false);
          setSaving(false);
        },
        () => {
          setFailed(true);
          setSaving(false);
        },
      );
  }

  return (
    <section className={styles.practice} aria-label="Çalışma">
      <p className={styles.muted}>
        {index + 1} / {queue.length}
      </p>
      <p className={styles.practiceTerm}>{card.term}</p>
      {flipped ? (
        <>
          <div className={styles.reverse}>
            <p>{card.meaning}</p>
            {card.definition && <p className={styles.muted}>{card.definition}</p>}
            <p className={styles.example}>{card.example}</p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={buttons.primary}
              disabled={saving}
              onClick={() => mark('known')}
              autoFocus
            >
              Biliyorum
            </button>
            <button
              type="button"
              className={buttons.secondary}
              disabled={saving}
              onClick={() => mark('repeat')}
            >
              Tekrar et
            </button>
            {finish}
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={buttons.primary}
            onClick={() => setFlipped(true)}
            autoFocus
          >
            Çevir
          </button>
          {finish}
        </div>
      )}
      {failed && (
        <p role="alert" className={styles.error}>
          Kaydedilemedi.
        </p>
      )}
    </section>
  );
}
