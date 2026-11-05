import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import type { Project, ProjectUpdateInput } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from '../../shared/ui/form.module.css';

interface ProjectFormProps {
  /** The project to edit; a new project when absent. */
  project?: Project;
  /** Saves title and url; rejects with an ApiError (field errors) or anything else (general error). */
  onSave(input: ProjectUpdateInput): Promise<void>;
  onCancel(): void;
}

type FieldErrors = Partial<Record<'title' | 'url', string[]>>;

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(project?.title ?? '');
  const [url, setUrl] = useState(project?.url ?? '');
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
      await onSave({ title, url: url.trim() === '' ? null : url });
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        const { title: titleErrors, url: urlErrors, ...others } = e.errors;
        setFieldErrors({ title: titleErrors, url: urlErrors });
        const other = Object.values(others).flat();
        if (other.length > 0) setError(other.join(' '));
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
      aria-label={project ? 'Projeyi düzenle' : 'Yeni proje'}
      onSubmit={(event) => void submit(event)}
    >
      <div className={styles.field}>
        <label htmlFor={`${id}-title`}>Proje adı</label>
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
        <label htmlFor={`${id}-url`}>Bağlantı (isteğe bağlı)</label>
        <input
          {...fieldProps('url')}
          className={styles.input}
          type="url"
          placeholder="https://"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={2048}
        />
        {fieldError('url')}
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
