import { useId, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ContentType, ImportError, ImportReport } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from './Content.module.css';
import { formatImportError } from './formatImportError';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'valid' }
  | { kind: 'errors'; errors: ImportError[] }
  | { kind: 'saved'; report: ImportReport }
  | { kind: 'tooLarge' }
  | { kind: 'failed' };

interface ImportPanelProps {
  type: ContentType;
  /** Called after a save, e.g. to reload the topic list. */
  onImported?(report: ImportReport): void;
}

/** Paste box or file picker for one content type: "Kontrol et" validates, "İçe aktar" validates and saves. */
export function ImportPanel({ type, onImported }: ImportPanelProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const disabled = text.trim() === '' || status.kind === 'busy';

  function run(save: boolean) {
    setStatus({ kind: 'busy' });
    getApiClient()
      .then((client) =>
        save
          ? client.importContent(type, text)
          : client.validateImport(type, text).then(({ errors }) => ({ errors, report: null })),
      )
      .then(
        ({ errors, report }) => {
          if (errors.length > 0) {
            setStatus({ kind: 'errors', errors });
          } else if (report) {
            setText('');
            setStatus({ kind: 'saved', report });
            onImported?.(report);
          } else {
            setStatus({ kind: 'valid' });
          }
        },
        () => setStatus({ kind: 'failed' }),
      );
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus({ kind: 'tooLarge' });
      return;
    }
    file.text().then(
      (content) => {
        setText(content);
        setStatus({ kind: 'idle' });
      },
      () => setStatus({ kind: 'failed' }),
    );
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.panelTitle}>
        İçe aktar
      </h2>
      <div className={form.field}>
        <label htmlFor={`${id}-text`}>İçe aktarılacak JSON</label>
        <textarea
          id={`${id}-text`}
          className={`${form.input} ${styles.box}`}
          rows={12}
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className={form.field}>
        <label htmlFor={`${id}-file`}>Ya da bir JSON dosyası seç</label>
        <input
          id={`${id}-file`}
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <div className={form.actions}>
        <button
          type="button"
          className={buttons.secondary}
          disabled={disabled}
          onClick={() => run(false)}
        >
          Kontrol et
        </button>
        <button
          type="button"
          className={buttons.primary}
          disabled={disabled}
          onClick={() => run(true)}
        >
          İçe aktar
        </button>
      </div>
      <ImportStatus status={status} />
    </section>
  );
}

function ImportStatus({ status }: { status: Status }) {
  switch (status.kind) {
    case 'busy':
      return <p className={styles.muted}>Kontrol ediliyor…</p>;
    case 'valid':
      return (
        <p role="status" className={styles.success}>
          Sorun yok, içe aktarılabilir.
        </p>
      );
    case 'saved':
      return (
        <div role="status" className={styles.success}>
          <p>
            {status.report.topic}: {status.report.added} öğe eklendi, {status.report.skipped} öğe
            zaten vardı.
          </p>
          {status.report.levelKept && <p>Konu zaten vardı; seviyesi değiştirilmedi.</p>}
        </div>
      );
    case 'errors':
      return (
        <div role="alert" className={styles.errors}>
          <p>{status.errors.length} sorun bulundu:</p>
          <ol>
            {status.errors.map((error, index) => (
              <li key={index}>{formatImportError(error)}</li>
            ))}
          </ol>
        </div>
      );
    case 'tooLarge':
      return (
        <p role="alert" className={styles.error}>
          Dosya 2 MB&apos;tan büyük olamaz.
        </p>
      );
    case 'failed':
      return (
        <p role="alert" className={styles.error}>
          İçe aktarma yapılamadı.
        </p>
      );
    case 'idle':
      return null;
  }
}
