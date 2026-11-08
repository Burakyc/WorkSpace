import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { StylePrompt } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './Posts.module.css';
import { StyleExamples } from './StyleExamples';
import { StyleHistory } from './StyleHistory';

/** The style prompt the drafts follow: the box, the examples and the old versions. */
export function StylePromptSection() {
  const [saved, setSaved] = useState<StylePrompt | null>(null);
  const [text, setText] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getStylePrompt())
      .then(
        (style) => {
          if (!active) return;
          setSaved(style);
          setText(style.text);
        },
        () => {
          if (active) setLoadFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  function take(next: string) {
    setText(next);
    setJustSaved(false);
    boxRef.current?.focus();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldError(null);
    setError(null);
    try {
      const client = await getApiClient();
      const style = await client.saveStylePrompt(text);
      setSaved(style);
      setText(style.text);
      setJustSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.errors?.text) {
        setFieldError(e.errors.text.join(' '));
      } else {
        setError('Stil promptu kaydedilemedi.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadFailed) {
    return (
      <p role="alert" className={styles.error}>
        Stil promptu yüklenemedi.
      </p>
    );
  }
  if (!saved) return <p className={styles.muted}>Yükleniyor…</p>;

  const dirty = text !== saved.text;
  return (
    <section className={styles.section} aria-labelledby="style-prompt">
      <h2 id="style-prompt" className={styles.sectionTitle}>
        Stil promptu
      </h2>
      {saved.text === '' && (
        <p className={styles.muted}>
          Henüz stil promptun yok. Bir örneği kutuya al ya da kendin yaz.
        </p>
      )}
      <form className={styles.section} noValidate onSubmit={(event) => void save(event)}>
        <div className={form.field}>
          <label htmlFor="style-prompt-text">Stil promptun</label>
          <textarea
            ref={boxRef}
            id="style-prompt-text"
            className={form.input}
            rows={10}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setJustSaved(false);
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'style-prompt-error' : undefined}
          />
          {fieldError && (
            <p id="style-prompt-error" className={form.fieldError}>
              {fieldError}
            </p>
          )}
        </div>
        <div className={styles.row}>
          <button type="submit" className={buttons.primary} disabled={saving || !dirty}>
            Kaydet
          </button>
          <span role="status" className={styles.muted}>
            {dirty ? 'Kaydedilmemiş değişiklik var.' : justSaved ? 'Kaydedildi.' : ''}
          </span>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </form>
      <StyleExamples onTake={take} />
      <StyleHistory history={saved.history} onTake={take} />
    </section>
  );
}
