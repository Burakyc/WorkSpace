import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { YouTubeChannel } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

/** The followed YouTube channels: add by channel id or /channel/ URL (checked by the API), remove with one click. */
export function YouTubeChannelsForm() {
  const id = useId();
  const [channels, setChannels] = useState<YouTubeChannel[] | null>(null);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listYouTubeChannels())
      .then((list) => {
        if (active) setChannels(list);
      })
      .catch(() => {
        if (active) setMessage('Kanallar okunamadı.');
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setInputError(null);
    setMessage(null);
    try {
      await action();
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.errors?.['input']) {
        setInputError(e.errors['input'].join(' '));
      } else {
        setMessage('İşlem yapılamadı. Tekrar dene.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (input.trim() === '') return;
    const client = await getApiClient();
    if (await run(() => client.addYouTubeChannel(input))) setInput('');
  }

  async function remove(channelId: string) {
    const client = await getApiClient();
    await run(() => client.removeYouTubeChannel(channelId));
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        YouTube kanalları
      </h2>
      {channels && channels.length === 0 && (
        <p className={styles.note}>Henüz kanal yok. Yeni videolar Ana Sayfa'da görünecek.</p>
      )}
      {channels && channels.length > 0 && (
        <ul className={styles.channels} aria-label="Takip edilen kanallar">
          {channels.map((channel) => (
            <li key={channel.id} className={styles.channel}>
              <span>
                {channel.title} <span className={styles.note}>{channel.id}</span>
              </span>
              <button
                type="button"
                className={buttons.secondary}
                aria-label={`Kaldır: ${channel.title}`}
                disabled={busy}
                onClick={() => void remove(channel.id)}
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.settingsForm} noValidate onSubmit={(event) => void add(event)}>
        <div className={form.field}>
          <label htmlFor={`${id}-input`}>Kanal ID'si veya adresi</label>
          <input
            id={`${id}-input`}
            className={form.input}
            placeholder="UC… veya https://www.youtube.com/channel/UC…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? `${id}-input-error` : undefined}
          />
          {inputError && (
            <p id={`${id}-input-error`} className={form.fieldError}>
              {inputError}
            </p>
          )}
        </div>
        <div>
          <button type="submit" className={buttons.primary} disabled={busy}>
            {busy ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </form>
      {message && (
        <p role="status" className={styles.note}>
          {message}
        </p>
      )}
    </section>
  );
}
