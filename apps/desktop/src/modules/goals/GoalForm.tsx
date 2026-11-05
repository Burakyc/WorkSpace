import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import type { Goal, GoalInput } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from '../../shared/ui/form.module.css';

interface GoalFormProps {
  /** The goal to edit; a new goal when absent. */
  goal?: Goal;
  /** Saves the input; rejects with an ApiError (field errors) or anything else (general error). */
  onSave(input: GoalInput): Promise<void>;
  onCancel(): void;
}

type FieldErrors = Partial<Record<'title' | 'description' | 'targetPomodoros', string[]>>;

export function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [target, setTarget] = useState(goal?.targetPomodoros?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      await onSave({
        title,
        description: description.trim() === '' ? null : description,
        targetPomodoros: target === '' ? null : Number(target),
      });
      // On success the page closes the form.
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setFieldErrors(e.errors);
      } else {
        setError('Kaydedilemedi. Tekrar dene.');
      }
      setSaving(false);
    }
  }

  const fieldProps = (name: keyof FieldErrors) => ({
    id: `${id}-${name}`,
    'aria-invalid': fieldErrors[name] ? true : undefined,
    'aria-describedby': fieldErrors[name] ? `${id}-${name}-error` : undefined,
  });

  const fieldError = (name: keyof FieldErrors) =>
    fieldErrors[name] && (
      <p id={`${id}-${name}-error`} className={styles.fieldError}>
        {fieldErrors[name].join(' ')}
      </p>
    );

  return (
    <form
      className={styles.form}
      aria-label={goal ? 'Hedefi düzenle' : 'Yeni hedef'}
      onSubmit={(event) => void submit(event)}
    >
      <div className={styles.field}>
        <label htmlFor={`${id}-title`}>Başlık</label>
        <input
          ref={titleRef}
          {...fieldProps('title')}
          className={styles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={120}
        />
        {fieldError('title')}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-description`}>Açıklama</label>
        <textarea
          {...fieldProps('description')}
          className={styles.input}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={3}
        />
        {fieldError('description')}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-targetPomodoros`}>Hedef pomodoro (isteğe bağlı)</label>
        <input
          {...fieldProps('targetPomodoros')}
          className={`${styles.input} ${styles.number}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={10000}
          step={1}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
        {fieldError('targetPomodoros')}
      </div>
      {error && (
        <p role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={buttons.primary} disabled={saving}>
          Kaydet
        </button>
        <button type="button" className={buttons.secondary} onClick={onCancel} disabled={saving}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
