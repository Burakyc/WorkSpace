import { useEffect, useId, useState } from 'react';
import { AiProviderSelect } from '../ai/AiProviderSelect';
import { useAiProviders } from '../ai/useAiProviders';
import type { SecretName } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

const KEYS: readonly { name: SecretName; label: string }[] = [
  { name: 'anthropicApiKey', label: 'Claude API anahtarı' },
  { name: 'geminiApiKey', label: 'Gemini API anahtarı' },
];

/** One key: a password field until saved, then only that it exists. Saving or deleting reloads the window (main restarts the API). */
function AiKeyField({ name, label }: { name: SecretName; label: string }) {
  const id = useId();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => window.devpath.secrets.has(name))
      .then(
        (exists) => {
          if (active) setSaved(exists);
        },
        () => {
          if (active) setUnknown(true);
        },
      );
    return () => {
      active = false;
    };
  }, [name]);

  async function change(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setValue('');
      setSaved(await window.devpath.secrets.has(name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Anahtar kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {saved === true && (
        <div className={styles.channel}>
          <span>{label}: Anahtar kayıtlı.</span>
          <button
            type="button"
            className={buttons.secondary}
            disabled={busy}
            onClick={() => void change(() => window.devpath.secrets.clear(name))}
          >
            Anahtarı sil
          </button>
        </div>
      )}
      {saved === false && (
        <form
          className={styles.settingsForm}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (value.trim() === '') return;
            void change(() => window.devpath.secrets.set(name, value.trim()));
          }}
        >
          <div className={form.field}>
            <label htmlFor={id}>{label}</label>
            <input
              id={id}
              className={form.input}
              type="password"
              autoComplete="off"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div>
            <button type="submit" className={buttons.secondary} disabled={busy}>
              Anahtarı kaydet
            </button>
          </div>
        </form>
      )}
      {unknown && <p className={styles.note}>{label}: durumu okunamadı.</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}

/** Ayarlar → the API mode's provider and keys. */
export function AiApiSection() {
  const id = useId();
  const providers = useAiProviders();
  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        Yapay zekâ API&apos;leri
      </h2>
      <p className={styles.note}>
        Anahtarlar bu bilgisayarda şifreli saklanır ve bir daha gösterilmez. Çağrılar senin hesabına
        ücretlendirilir.
      </p>
      <AiProviderSelect state={providers} />
      {KEYS.map(({ name, label }) => (
        <AiKeyField key={name} name={name} label={label} />
      ))}
    </section>
  );
}
