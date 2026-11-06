import { useEffect, useState } from 'react';
import type { BackupInfo } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './SettingsPage.module.css';

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "6 Kasım 2026", or "6 Kasım 2026 14:05 · Geri yükleme öncesi" for `2026-11-06-140509`. */
export function backupLabel({ name, kind }: BackupInfo): string {
  const [year = 0, month = 1, day = 1] = name.slice(0, 10).split('-').map(Number);
  const date = dateFormat.format(new Date(year, month - 1, day));
  return kind === 'daily'
    ? date
    : `${date} ${name.slice(11, 13)}:${name.slice(13, 15)} · Geri yükleme öncesi`;
}

export function BackupsSection() {
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => window.devpath.settings.listBackups())
      .then((list) => {
        if (active) setBackups(list);
      })
      .catch(() => {
        if (active) setError('Yedekler okunamadı.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function restore(name: string) {
    setBusy(true);
    setError(null);
    try {
      // On success main reloads the window.
      await window.devpath.settings.restoreBackup(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirming(null);
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="backups-heading">
      <h2 id="backups-heading" className={styles.heading}>
        Yedekler
      </h2>
      <p className={styles.note}>
        Uygulama her gün ilk açılışta veri klasörünü yedekler; son 14 günün yedekleri saklanır.
      </p>
      {backups?.length === 0 && <p className={styles.note}>Henüz yedek yok.</p>}
      {backups && backups.length > 0 && (
        <ul className={styles.backupList}>
          {backups.map((backup) => (
            <li key={backup.name} className={styles.backupItem}>
              <div className={styles.backupRow}>
                <span>{backupLabel(backup)}</span>
                <button
                  type="button"
                  className={buttons.secondary}
                  disabled={busy}
                  onClick={() => setConfirming(backup.name)}
                >
                  Geri yükle
                </button>
              </div>
              {confirming === backup.name && (
                <div role="alertdialog" aria-label="Geri yükleme onayı">
                  <p className={styles.note}>
                    {backupLabel(backup)} yedeği geri yüklensin mi? Mevcut veriler önce yedeklenir.
                  </p>
                  <div className={form.actions}>
                    <button
                      type="button"
                      className={buttons.primary}
                      disabled={busy}
                      onClick={() => void restore(backup.name)}
                    >
                      {busy ? 'Geri yükleniyor…' : 'Geri yükle'}
                    </button>
                    <button
                      type="button"
                      className={buttons.secondary}
                      disabled={busy}
                      onClick={() => setConfirming(null)}
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
