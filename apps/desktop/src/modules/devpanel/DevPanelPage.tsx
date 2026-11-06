import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { DevStatus } from '../../shared/api/types';
import { recentErrors } from '../../shared/errors/errorLog';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './DevPanelPage.module.css';

type Health = { ok: true; version: string; ms: number } | { ok: false };

interface Row {
  at: string;
  source: string;
  kind: string;
  path: string | null;
}

const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${number.format(bytes / 1024)} KB`;
  return `${number.format(bytes / (1024 * 1024))} MB`;
}

const formatTime = (at: string) =>
  new Date(at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' });

/** The hidden `/dev` page (Ctrl+Shift+D): API health, recent errors and data file sizes. No content or secrets. */
export function DevPanelPage() {
  const [version, setVersion] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState<DevStatus | 'failed' | null>(null);
  const [rendererRows, setRendererRows] = useState<readonly Row[]>([]);

  useEffect(() => {
    let active = true;
    const started = performance.now();
    const client = getApiClient();
    client
      .then((c) => c.getHealth())
      .then(
        (h) => {
          if (active)
            setHealth({
              ok: h.status === 'ok',
              version: h.version,
              ms: performance.now() - started,
            });
        },
        () => {
          if (active) setHealth({ ok: false });
        },
      );
    client
      .then((c) => c.getDevStatus())
      .then(
        (s) => {
          if (active) setStatus(s);
        },
        () => {
          if (active) setStatus('failed');
        },
      )
      // After both answers, so a failed request shows up in the list.
      .then(() => {
        if (active) setRendererRows(recentErrors().map((e) => ({ ...e, source: 'Arayüz' })));
      });
    return () => {
      active = false;
    };
  }, [version]);

  const apiRows: Row[] =
    status && status !== 'failed'
      ? status.errors.map((e) => ({ ...e, source: `API (${e.source})` }))
      : [];
  const rows = [...apiRows, ...rendererRows].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Geliştirici paneli</h1>
        <button
          type="button"
          className={buttons.secondary}
          onClick={() => setVersion((v) => v + 1)}
        >
          Yenile
        </button>
      </div>

      <section className={styles.card} aria-labelledby="dev-api">
        <h2 id="dev-api" className={styles.heading}>
          API
        </h2>
        {health === null ? (
          <p className={styles.muted}>Yükleniyor…</p>
        ) : health.ok ? (
          <ul className={styles.facts}>
            <li>Durum: çalışıyor</li>
            <li>Sürüm: {health.version}</li>
            <li>Yanıt süresi: {Math.round(health.ms)} ms</li>
          </ul>
        ) : (
          <p className={styles.error}>Durum: yanıt yok</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="dev-errors">
        <h2 id="dev-errors" className={styles.heading}>
          Son hatalar
        </h2>
        {status === 'failed' && <p className={styles.error}>API hataları okunamadı.</p>}
        {rows.length === 0 ? (
          <p className={styles.muted}>Hata yok.</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Zaman</th>
                  <th scope="col">Kaynak</th>
                  <th scope="col">Tür</th>
                  <th scope="col">Yol</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.at}-${i}`}>
                    <td>{formatTime(row.at)}</td>
                    <td>{row.source}</td>
                    <td>{row.kind}</td>
                    <td className={styles.mono}>{row.path ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="dev-files">
        <h2 id="dev-files" className={styles.heading}>
          Veri dosyaları
        </h2>
        {status === null && <p className={styles.muted}>Yükleniyor…</p>}
        {status === 'failed' && <p className={styles.error}>Dosya boyutları okunamadı.</p>}
        {status && status !== 'failed' && (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Ad</th>
                  <th scope="col">Dosya</th>
                  <th scope="col">Boyut</th>
                </tr>
              </thead>
              <tbody>
                {status.files.map((f) => (
                  <tr key={f.name}>
                    <td className={styles.mono}>{f.folder ? `${f.name}/` : f.name}</td>
                    <td>{f.files}</td>
                    <td>{formatBytes(f.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Toplam: {formatBytes(status.totalBytes)}</p>
          </>
        )}
      </section>
    </>
  );
}
