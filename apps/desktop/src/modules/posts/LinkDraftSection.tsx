import { useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ImportReport } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { linkAnalysisTemplate } from '../content/prompts';
import { buildDraftPrompt } from './buildDraftPrompt';
import { DraftPromptPanel } from './DraftPromptPanel';
import styles from './Posts.module.css';

const READ_FAILED = 'Bağlantı okunamadı. Alanları elle doldurabilirsin.';

interface Fields {
  title: string;
  author: string;
  description: string;
  note: string;
}

const NO_FIELDS: Fields = { title: '', author: '', description: '', note: '' };

/** Reads a link on "Oku", lets the user correct the fields and add a note, and builds the prompt. A changed field or style hides the built prompt. */
export function LinkDraftSection({
  styleVersion,
  onImported,
}: {
  styleVersion: number;
  onImported(report: ImportReport): void;
}) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState<Fields | null>(null);
  const [reading, setReading] = useState(false);
  const [readMessage, setReadMessage] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [buildFailed, setBuildFailed] = useState(false);
  const [built, setBuilt] = useState<{
    prompt: string;
    styleEmpty: boolean;
    styleVersion: number;
  } | null>(null);

  async function read(event: FormEvent) {
    event.preventDefault();
    setReading(true);
    setErrors({});
    setReadMessage(null);
    setBuilt(null);
    try {
      const client = await getApiClient();
      const answer = await client.readLink(url);
      setUrl(answer.url);
      setReadMessage(answer.error);
      setFields((old) => ({
        title: answer.title ?? '',
        author: answer.author ?? '',
        description: answer.description ?? '',
        note: old?.note ?? '',
      }));
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setErrors(e.errors);
      } else {
        setReadMessage(READ_FAILED);
        setFields((old) => old ?? NO_FIELDS);
      }
    } finally {
      setReading(false);
    }
  }

  async function build(event: FormEvent) {
    event.preventDefault();
    if (!fields) return;
    setBuilding(true);
    setErrors({});
    setBuildFailed(false);
    try {
      const client = await getApiClient();
      const [context, style] = await Promise.all([
        client.getLinkContext({ url, ...fields }),
        client.getStylePrompt(),
      ]);
      setBuilt({
        prompt: buildDraftPrompt(linkAnalysisTemplate, {
          topic: context.topic,
          style: style.text,
          source: context.text,
        }),
        styleEmpty: style.text === '',
        styleVersion,
      });
    } catch (e) {
      if (e instanceof ApiError && e.errors) setErrors(e.errors);
      else setBuildFailed(true);
    } finally {
      setBuilding(false);
    }
  }

  function change(name: keyof Fields, value: string) {
    setBuilt(null);
    setFields((old) => ({ ...(old ?? NO_FIELDS), [name]: value }));
  }

  const invalid = (name: string) => ({
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
    <section className={styles.section} aria-labelledby="link-draft">
      <h2 id="link-draft" className={styles.sectionTitle}>
        Bağlantıdan taslak
      </h2>
      <form className={styles.section} noValidate onSubmit={(event) => void read(event)}>
        <div className={form.field}>
          <label htmlFor={`${id}-url`}>Bağlantı</label>
          <input
            id={`${id}-url`}
            className={form.input}
            type="url"
            placeholder="https://"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setBuilt(null);
            }}
            {...invalid('url')}
          />
          {fieldError('url')}
        </div>
        <div className={styles.row}>
          <button
            type="submit"
            className={buttons.secondary}
            disabled={reading || url.trim() === ''}
          >
            Oku
          </button>
          <span role="status" className={styles.muted}>
            {reading && 'Okunuyor…'}
          </span>
        </div>
      </form>
      {readMessage && (
        <p role="alert" className={styles.error}>
          {readMessage}
        </p>
      )}
      {fields && (
        <form className={styles.section} noValidate onSubmit={(event) => void build(event)}>
          <div className={form.field}>
            <label htmlFor={`${id}-title`}>Başlık</label>
            <input
              id={`${id}-title`}
              className={form.input}
              value={fields.title}
              onChange={(event) => change('title', event.target.value)}
              {...invalid('title')}
            />
            {fieldError('title')}
          </div>
          <div className={form.field}>
            <label htmlFor={`${id}-author`}>Yazar / kanal</label>
            <input
              id={`${id}-author`}
              className={form.input}
              value={fields.author}
              onChange={(event) => change('author', event.target.value)}
              {...invalid('author')}
            />
            {fieldError('author')}
          </div>
          <div className={form.field}>
            <label htmlFor={`${id}-description`}>Açıklama</label>
            <textarea
              id={`${id}-description`}
              className={form.input}
              rows={4}
              value={fields.description}
              onChange={(event) => change('description', event.target.value)}
              {...invalid('description')}
            />
            {fieldError('description')}
          </div>
          <div className={form.field}>
            <label htmlFor={`${id}-note`}>Notun</label>
            <textarea
              id={`${id}-note`}
              className={form.input}
              rows={4}
              required
              placeholder="Neden paylaşmak istiyorsun? Yapay zekâ videoyu izleyemez ya da sayfayı okuyamaz; gönderi senin yorumuna dayanır."
              value={fields.note}
              onChange={(event) => change('note', event.target.value)}
              {...invalid('note')}
            />
            {fieldError('note')}
          </div>
          <div>
            <button
              type="submit"
              className={buttons.primary}
              disabled={building || fields.title.trim() === '' || fields.note.trim() === ''}
            >
              Promptu hazırla
            </button>
          </div>
          {buildFailed && (
            <p role="alert" className={styles.error}>
              Prompt hazırlanamadı.
            </p>
          )}
        </form>
      )}
      {built && built.styleVersion === styleVersion && (
        <DraftPromptPanel
          prompt={built.prompt}
          styleEmpty={built.styleEmpty}
          onImported={onImported}
        />
      )}
    </section>
  );
}
