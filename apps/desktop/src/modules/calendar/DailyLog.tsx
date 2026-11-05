import { useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import calendar from './CalendarPage.module.css';
import styles from './DayPage.module.css';

/** The free-text daily log of one day, saved with "Kaydet". */
export function DailyLog({ date, initialText }: { date: string; initialText: string }) {
  const [text, setText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = text !== savedText;

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldError(null);
    setError(null);
    try {
      const client = await getApiClient();
      const saved = await client.saveDayLog(date, text);
      setText(saved.text);
      setSavedText(saved.text);
      setJustSaved(true);
    } catch (e) {
      if (e instanceof ApiError && e.errors?.text) {
        setFieldError(e.errors.text.join(' '));
      } else {
        setError('Günlük kaydedilemedi.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="day-log">
      <h2 id="day-log" className={styles.heading}>
        Günlük
      </h2>
      <form className={styles.log} noValidate onSubmit={(event) => void save(event)}>
        <label htmlFor="day-log-text" className="visually-hidden">
          Bu gün hakkında notların
        </label>
        <textarea
          id="day-log-text"
          className={form.input}
          rows={6}
          value={text}
          placeholder="Bu gün hakkında notların"
          onChange={(event) => {
            setText(event.target.value);
            setJustSaved(false);
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'day-log-error' : undefined}
        />
        {fieldError && (
          <p id="day-log-error" className={form.fieldError}>
            {fieldError}
          </p>
        )}
        <div className={styles.row}>
          <button type="submit" className={buttons.primary} disabled={saving || !dirty}>
            Kaydet
          </button>
          <span role="status" className={calendar.muted}>
            {dirty ? 'Kaydedilmemiş değişiklik var.' : justSaved ? 'Kaydedildi.' : ''}
          </span>
        </div>
        {error && (
          <p role="alert" className={calendar.error}>
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
