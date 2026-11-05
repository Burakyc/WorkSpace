import { useEffect, useState } from 'react';
import buttons from '../../shared/ui/buttons.module.css';
import { PomodoroSettingsForm } from './PomodoroSettingsForm';
import styles from './SettingsPage.module.css';
import { YouTubeChannelsForm } from './YouTubeChannelsForm';

export function SettingsPage() {
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => window.devpath.settings.getDataDir())
      .then((dir) => {
        if (active) setDataDir(dir);
      })
      .catch(() => {
        if (active) setError('Veri klasörü okunamadı.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function changeDataDir() {
    setBusy(true);
    setError(null);
    try {
      const next = await window.devpath.settings.changeDataDir();
      if (next !== null) setDataDir(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>Ayarlar</h1>
      <section className={styles.card} aria-labelledby="data-dir-heading">
        <h2 id="data-dir-heading" className={styles.heading}>
          Veri klasörü
        </h2>
        <p className={styles.path}>
          <code>{dataDir ?? '…'}</code>
        </p>
        <p className={styles.note}>Klasörü değiştirmek mevcut verileri taşımaz.</p>
        <div>
          <button
            type="button"
            className={buttons.primary}
            onClick={() => void changeDataDir()}
            disabled={busy}
          >
            {busy ? 'Değiştiriliyor…' : 'Klasör seç…'}
          </button>
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </section>
      <PomodoroSettingsForm />
      <YouTubeChannelsForm />
    </>
  );
}
