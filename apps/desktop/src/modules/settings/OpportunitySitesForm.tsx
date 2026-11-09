import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { OpportunitySite } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

type Field = 'name' | 'url';

/** The followed opportunity sites: links only, added by domain or https URL, removed with one click. */
export function OpportunitySitesForm() {
  const id = useId();
  const [sites, setSites] = useState<OpportunitySite[] | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listOpportunitySites())
      .then((list) => {
        if (active) setSites(list);
      })
      .catch(() => {
        if (active) setMessage('Fırsat siteleri yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function run(action: () => Promise<unknown>, failure: string) {
    setBusy(true);
    setFieldErrors({});
    setMessage(null);
    try {
      await action();
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      const errors = e instanceof ApiError ? e.errors : undefined;
      if (errors?.['url'] || errors?.['name']) {
        setFieldErrors({ url: errors['url']?.join(' '), name: errors['name']?.join(' ') });
      } else {
        setMessage(failure);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const client = await getApiClient();
    if (await run(() => client.addOpportunitySite(name, url), 'Site eklenemedi.')) {
      setName('');
      setUrl('');
    }
  }

  async function remove(siteId: string) {
    const client = await getApiClient();
    await run(() => client.removeOpportunitySite(siteId), 'Site kaldırılamadı.');
  }

  function field(
    key: Field,
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder: string,
  ) {
    const error = fieldErrors[key];
    return (
      <div className={form.field}>
        <label htmlFor={`${id}-${key}`}>{label}</label>
        <input
          id={`${id}-${key}`}
          className={form.input}
          placeholder={placeholder}
          value={value}
          onChange={(event) => set(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-${key}-error` : undefined}
        />
        {error && (
          <p id={`${id}-${key}-error`} className={form.fieldError}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        Fırsat siteleri
      </h2>
      <p className={styles.note}>Uygulama bu sitelerden ilan çekmez; sadece bağlantıları açar.</p>
      {sites && sites.length === 0 && <p className={styles.note}>Henüz fırsat sitesi yok.</p>}
      {sites && sites.length > 0 && (
        <ul className={styles.channels} aria-label="Takip edilen fırsat siteleri">
          {sites.map((site) => (
            <li key={site.id} className={styles.channel}>
              <span>
                {site.name || site.id} <span className={styles.note}>{site.url}</span>
              </span>
              <button
                type="button"
                className={buttons.secondary}
                aria-label={`Kaldır: ${site.name || site.id}`}
                disabled={busy}
                onClick={() => void remove(site.id)}
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={styles.settingsForm} noValidate onSubmit={(event) => void add(event)}>
        {field('name', 'Ad (isteğe bağlı)', name, setName, 'Kariyer.net')}
        {field('url', 'Adres', url, setUrl, 'kariyer.net veya https://…')}
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
