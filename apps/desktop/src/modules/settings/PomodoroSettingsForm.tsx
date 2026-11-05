import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { PomodoroSettings } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

type Field = keyof PomodoroSettings;

const fields: { name: Field; label: string; min: number; max: number }[] = [
  { name: 'focusMinutes', label: 'Odak (dk)', min: 1, max: 120 },
  { name: 'shortBreakMinutes', label: 'Kısa mola (dk)', min: 1, max: 60 },
  { name: 'longBreakMinutes', label: 'Uzun mola (dk)', min: 1, max: 60 },
  { name: 'longBreakInterval', label: 'Uzun mola aralığı (oturum)', min: 2, max: 10 },
];

type Values = Record<Field, string>;

export function PomodoroSettingsForm() {
  const id = useId();
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string[]>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getSettings())
      .then(({ pomodoro }) => {
        if (!active) return;
        setValues({
          focusMinutes: String(pomodoro.focusMinutes),
          shortBreakMinutes: String(pomodoro.shortBreakMinutes),
          longBreakMinutes: String(pomodoro.longBreakMinutes),
          longBreakInterval: String(pomodoro.longBreakInterval),
        });
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
      await client.savePomodoroSettings({
        focusMinutes: Number(values.focusMinutes),
        shortBreakMinutes: Number(values.shortBreakMinutes),
        longBreakMinutes: Number(values.longBreakMinutes),
        longBreakInterval: Number(values.longBreakInterval),
      });
      setMessage('Kaydedildi.');
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
        Pomodoro süreleri
      </h2>
      {values && (
        <form className={styles.settingsForm} noValidate onSubmit={(event) => void submit(event)}>
          <div className={styles.grid}>
            {fields.map(({ name, label, min, max }) => (
              <div key={name} className={form.field}>
                <label htmlFor={`${id}-${name}`}>{label}</label>
                <input
                  id={`${id}-${name}`}
                  className={form.input}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  required
                  value={values[name]}
                  onChange={(event) => setValues({ ...values, [name]: event.target.value })}
                  aria-invalid={errors[name] ? true : undefined}
                  aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
                />
                {errors[name] && (
                  <p id={`${id}-${name}-error`} className={form.fieldError}>
                    {errors[name].join(' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className={styles.note}>
            Değişiklikler bir sonraki zamanlayıcıdan itibaren geçerli olur.
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
