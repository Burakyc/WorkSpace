import { useId, useState } from 'react';
import type { Difficulty, InterviewItem } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { CodeSample } from '../content/CodeSample';
import styles from './Interview.module.css';

export const difficultyLabels: Readonly<Record<Difficulty, string>> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

interface QuestionCardProps {
  item: InterviewItem;
  /** Saves (true) or removes (false) the practised mark; rejects on failure. */
  onPractised(practised: boolean): Promise<void>;
}

/** A question with its difficulty and tags; the answer and code open with "Cevabı göster". */
export function QuestionCard({ item, onPractised }: QuestionCardProps) {
  const answerId = useId();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const practised = item.mark === 'practised';

  function toggle() {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    onPractised(!practised).then(
      () => setSaving(false),
      () => {
        setFailed(true);
        setSaving(false);
      },
    );
  }

  return (
    <li className={styles.card}>
      <p className={styles.question}>{item.question}</p>
      <span className={styles.meta}>
        <span className={`${styles.difficulty} ${item.difficulty === 'hard' ? styles.hard : ''}`}>
          {difficultyLabels[item.difficulty]}
        </span>
        {(item.tags ?? []).map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </span>
      <div className={styles.actions}>
        <button
          type="button"
          className={buttons.secondary}
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Cevabı gizle' : 'Cevabı göster'}
        </button>
        <button
          type="button"
          className={practised ? buttons.primary : buttons.secondary}
          aria-pressed={practised}
          // Not `disabled`: a disabled button loses keyboard focus while the mark saves.
          aria-disabled={saving}
          onClick={toggle}
        >
          Çalıştım
        </button>
      </div>
      {open && (
        <div id={answerId} className={styles.answer}>
          <p>{item.answer}</p>
          {item.code && <CodeSample code={item.code} />}
        </div>
      )}
      {failed && (
        <p role="alert" className={styles.error}>
          Kaydedilemedi.
        </p>
      )}
    </li>
  );
}
