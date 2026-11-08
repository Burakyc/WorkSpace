import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { PostDraft } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { parseHashtags } from './draftText';
import styles from './Posts.module.css';

/** Edits every field of a draft; the API checks them. */
export function DraftForm({
  draft,
  onSaved,
  onCancel,
}: {
  draft: PostDraft;
  onSaved(): void;
  onCancel(): void;
}) {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [hashtags, setHashtags] = useState(draft.hashtags.join(' '));
  const [sourceLink, setSourceLink] = useState(draft.sourceLink ?? '');
  const [imageSuggestion, setImageSuggestion] = useState(draft.imageSuggestion ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFailed(false);
    try {
      const client = await getApiClient();
      await client.saveDraft(draft.id, {
        title,
        body,
        hashtags: parseHashtags(hashtags),
        sourceLink: sourceLink.trim() === '' ? null : sourceLink,
        imageSuggestion: imageSuggestion.trim() === '' ? null : imageSuggestion,
      });
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      else setFailed(true);
      setSaving(false);
    }
  }

  const fieldProps = (name: string) => ({
    id: `${id}-${name}`,
    className: form.input,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  });

  const fieldError = (name: string) =>
    errors[name] && (
      <p id={`${id}-${name}-error`} className={form.fieldError}>
        {errors[name].join(' ')}
      </p>
    );

  return (
    <form className={styles.section} noValidate onSubmit={(event) => void submit(event)}>
      <div className={form.field}>
        <label htmlFor={`${id}-title`}>Başlık</label>
        <input
          ref={titleRef}
          {...fieldProps('title')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {fieldError('title')}
      </div>
      <div className={form.field}>
        <label htmlFor={`${id}-body`}>Metin</label>
        <textarea
          {...fieldProps('body')}
          rows={10}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        {fieldError('body')}
      </div>
      <div className={form.field}>
        <label htmlFor={`${id}-hashtags`}>Hashtag&apos;ler (boşlukla ayır)</label>
        <input
          {...fieldProps('hashtags')}
          value={hashtags}
          onChange={(event) => setHashtags(event.target.value)}
        />
        {fieldError('hashtags')}
      </div>
      <div className={form.field}>
        <label htmlFor={`${id}-sourceLink`}>Kaynak bağlantısı</label>
        <input
          {...fieldProps('sourceLink')}
          type="url"
          value={sourceLink}
          onChange={(event) => setSourceLink(event.target.value)}
        />
        {fieldError('sourceLink')}
      </div>
      <div className={form.field}>
        <label htmlFor={`${id}-imageSuggestion`}>Görsel önerisi</label>
        <input
          {...fieldProps('imageSuggestion')}
          value={imageSuggestion}
          onChange={(event) => setImageSuggestion(event.target.value)}
        />
        {fieldError('imageSuggestion')}
      </div>
      {failed && (
        <p role="alert" className={styles.error}>
          Taslak kaydedilemedi.
        </p>
      )}
      <div className={form.actions}>
        <button type="submit" className={buttons.primary} disabled={saving}>
          Kaydet
        </button>
        <button type="button" className={buttons.secondary} onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </form>
  );
}
