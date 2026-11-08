import { useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type {
  AiModule,
  ContentType,
  ImportReport,
  InboxImportResult,
  InboxScan,
} from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from '../content/Content.module.css';
import { CopyPromptButton } from '../content/CopyPromptButton';
import { formatImportError } from '../content/formatImportError';
import { formatImportReport } from '../content/formatImportReport';
import { InboxFolderField } from './InboxFolderField';

interface FileImportBodyProps {
  module: AiModule;
  type: ContentType;
  prompt?: string;
  onImported?(report: ImportReport): void;
}

/** The file mode: "İçe aktar" lists the inbox folder's files; the valid ones are imported and move to done/. */
export function FileImportBody({ module, type, prompt, onImported }: FileImportBodyProps) {
  const [folder, setFolder] = useState<string | null>(null);
  const [scan, setScan] = useState<InboxScan | null>(null);
  const [results, setResults] = useState<InboxImportResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const valid = scan?.files.filter((file) => file.errors.length === 0) ?? [];

  /** Runs one request, then lists the folder again. */
  function run(work?: () => Promise<void>) {
    setBusy(true);
    setFailed(false);
    Promise.resolve()
      .then(work)
      .then(() => getApiClient())
      .then((client) => client.scanInbox(module, type))
      .then(setScan, () => setFailed(true))
      .finally(() => setBusy(false));
  }

  function list() {
    setResults([]);
    run();
  }

  function importValid() {
    run(async () => {
      const client = await getApiClient();
      const answer = await client.importInbox(
        module,
        type,
        valid.map((file) => file.name),
      );
      setResults(answer.results);
      for (const { report } of answer.results) {
        if (report) onImported?.(report);
      }
    });
  }

  return (
    <>
      <p className={styles.muted}>
        Promptu kopyala, yapay zekânın cevabını klasöre .json dosyası olarak kaydet.
      </p>
      <CopyPromptButton type={type} getText={prompt === undefined ? undefined : () => prompt} />
      <InboxFolderField
        module={module}
        onChange={(next) => {
          setFolder(next);
          setScan(null);
          setResults([]);
        }}
      />
      <div>
        <button
          type="button"
          className={buttons.primary}
          disabled={folder === null || busy}
          onClick={list}
        >
          İçe aktar
        </button>
      </div>
      {failed && (
        <p role="alert" className={styles.error}>
          Klasör okunamadı.
        </p>
      )}
      {results.length > 0 && (
        <ul role="status" className={styles.inboxResults}>
          {results.map(({ name, report, errors }) => (
            <li key={name} className={report ? styles.success : styles.error}>
              {report ? formatImportReport(report) : `${name}: ${errors[0]?.message ?? ''}`}
            </li>
          ))}
        </ul>
      )}
      {scan && <ScanList scan={scan} />}
      {valid.length > 0 && (
        <div>
          <button type="button" className={buttons.primary} disabled={busy} onClick={importValid}>
            Geçerlileri içe aktar ({valid.length})
          </button>
        </div>
      )}
    </>
  );
}

function ScanList({ scan }: { scan: InboxScan }) {
  if (scan.error) {
    return (
      <p role="alert" className={styles.error}>
        {scan.error}
      </p>
    );
  }
  return (
    <>
      {scan.files.length === 0 && <p className={styles.muted}>Yeni dosya yok.</p>}
      {scan.files.length > 0 && (
        <ul className={styles.inboxFiles}>
          {scan.files.map(({ name, errors }) => (
            <li key={name}>
              <code>{name}</code>{' '}
              {errors.length === 0 ? (
                <span className={styles.success}>Geçerli</span>
              ) : (
                <div className={styles.errors}>
                  <ol>
                    {errors.map((error, index) => (
                      <li key={index}>{formatImportError(error)}</li>
                    ))}
                  </ol>
                  <p className={styles.muted}>Hata raporu: {name}.errors.txt</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {scan.otherTypeCount > 0 && (
        <p className={styles.muted}>Başka türden {scan.otherTypeCount} dosya atlandı.</p>
      )}
    </>
  );
}
