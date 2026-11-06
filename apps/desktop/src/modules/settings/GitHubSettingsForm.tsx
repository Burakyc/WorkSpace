import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

/**
 * The GitHub username (API) and the optional token (main, safeStorage). After saving, the token is never shown again:
 * the page only learns whether one exists. Saving or deleting it reloads the window (main restarts the API).
 */
export function GitHubSettingsForm() {
  const id = useId();
  const [username, setUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenUnknown, setTokenUnknown] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getGitHubSettings())
      .then((settings) => {
        if (active) setUsername(settings.username ?? '');
      })
      .catch(() => {
        if (active) setMessage('GitHub ayarları okunamadı.');
      });
    Promise.resolve()
      .then(() => window.devpath.secrets.has('githubToken'))
      .then((saved) => {
        if (active) setHasToken(saved);
      })
      .catch(() => {
        if (active) setTokenUnknown(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveUsername(event: FormEvent) {
    event.preventDefault();
    if (username === null) return;
    setSaving(true);
    setUsernameError(null);
    setMessage(null);
    try {
      const client = await getApiClient();
      await client.saveGitHubSettings(username);
      setMessage('Kaydedildi.');
    } catch (e) {
      if (e instanceof ApiError && e.errors?.['username']) {
        setUsernameError(e.errors['username'].join(' '));
      } else {
        setMessage('Kaydedilemedi. Tekrar dene.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeToken(change: () => Promise<void>) {
    setTokenBusy(true);
    setTokenError(null);
    try {
      await change();
      setToken('');
      // Main reloads the window; until then show the new state.
      setHasToken(await window.devpath.secrets.has('githubToken'));
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : 'Token kaydedilemedi.');
    } finally {
      setTokenBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        GitHub
      </h2>
      {username !== null && (
        <form
          className={styles.settingsForm}
          noValidate
          onSubmit={(event) => void saveUsername(event)}
        >
          <div className={form.field}>
            <label htmlFor={`${id}-username`}>Kullanıcı adı</label>
            <input
              id={`${id}-username`}
              className={form.input}
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? `${id}-username-error` : undefined}
            />
            {usernameError && (
              <p id={`${id}-username-error`} className={form.fieldError}>
                {usernameError}
              </p>
            )}
          </div>
          <div>
            <button type="submit" className={buttons.primary} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className={styles.note}>
          {message}
        </p>
      )}
      {hasToken === true && (
        <div className={styles.channel}>
          <span>Token kayıtlı.</span>
          <button
            type="button"
            className={buttons.secondary}
            disabled={tokenBusy}
            onClick={() => void changeToken(() => window.devpath.secrets.clear('githubToken'))}
          >
            Tokeni sil
          </button>
        </div>
      )}
      {hasToken === false && (
        <form
          className={styles.settingsForm}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (token.trim() === '') return;
            void changeToken(() => window.devpath.secrets.set('githubToken', token.trim()));
          }}
        >
          <div className={form.field}>
            <label htmlFor={`${id}-token`}>Token (isteğe bağlı)</label>
            <input
              id={`${id}-token`}
              className={form.input}
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>
          <p className={styles.note}>
            Yalnızca istek sınırını yükseltir. Bu bilgisayarda şifreli saklanır ve bir daha
            gösterilmez.
          </p>
          <div>
            <button type="submit" className={buttons.secondary} disabled={tokenBusy}>
              Tokeni kaydet
            </button>
          </div>
        </form>
      )}
      {tokenUnknown && <p className={styles.note}>Token durumu okunamadı.</p>}
      {tokenError && (
        <p role="alert" className={styles.error}>
          {tokenError}
        </p>
      )}
    </section>
  );
}
