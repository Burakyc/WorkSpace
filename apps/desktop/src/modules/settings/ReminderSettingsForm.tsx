import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { DevPathBridge, ReminderSettings } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

type Key = keyof ReminderSettings;

const rows: { key: Key; toggle: string; time: string }[] = [
  { key: 'english', toggle: 'İngilizce hatırlatma', time: 'İngilizce saati' },
  { key: 'tech', toggle: 'Teknik hatırlatma', time: 'Teknik saati' },
];

/** Ayarlar → the daily English and tech reminder times; main reschedules after a save. */
export function ReminderSettingsForm() {
  const id = useId();
  const [values, setValues] = useState<ReminderSettings | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string[]>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getSettings())
      .then(({ reminders }) => {
        if (active) setValues(reminders);
      })
      .catch(() => {
        if (active) setMessage('Ayarlar okunamadı.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const client = await getApiClient();
      setValues(await client.saveReminderSettings(values));
      setMessage('Kaydedildi.');
      // Main reads the new times itself; without it they apply at the next start.
      await (window.devpath as DevPathBridge | undefined)?.reminders
        ?.refresh()
        .catch(() => undefined);
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setErrors(e.errors);
      } else {
        setMessage('Kaydedilemedi. Tekrar dene.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        Hatırlatmalar
      </h2>
      {values && (
        <form className={styles.settingsForm} noValidate onSubmit={(event) => void submit(event)}>
          <div className={styles.grid}>
            {rows.map(({ key, toggle, time }) => (
              <div key={key} className={form.field}>
                <label>
                  <input
                    type="checkbox"
                    checked={values[key].enabled}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        [key]: { ...values[key], enabled: event.target.checked },
                      })
                    }
                  />{' '}
                  {toggle}
                </label>
                <label htmlFor={`${id}-${key}`}>{time}</label>
                <input
                  id={`${id}-${key}`}
                  className={form.input}
                  type="time"
                  required
                  value={values[key].time}
                  onChange={(event) =>
                    setValues({ ...values, [key]: { ...values[key], time: event.target.value } })
                  }
                  aria-invalid={errors[key] ? true : undefined}
                  aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
                />
                {errors[key] && (
                  <p id={`${id}-${key}-error`} className={form.fieldError}>
                    {errors[key].join(' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className={styles.note}>
            Uygulama açıkken (küçültülmüş olsa da) her gün bu saatte sessiz bir bildirim gelir.
          </p>
          <div>
            <button type="submit" className={buttons.primary} disabled={saving}>
              Kaydet
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className={styles.note}>
          {message}
        </p>
      )}
    </section>
  );
}
