import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { AiRunResult, ContentType, ImportReport } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import styles from '../content/Content.module.css';
import { formatImportError } from '../content/formatImportError';
import { formatImportReport } from '../content/formatImportReport';
import { promptTemplates } from '../content/prompts';
import { estimateMaxCost, formatTokens, formatUsd } from './aiCost';
import { AiProviderSelect } from './AiProviderSelect';
import { useAiProviders } from './useAiProviders';

interface ApiRunBodyProps {
  type: ContentType;
  prompt?: string;
  onImported?(report: ImportReport): void;
}

/** The API mode: an editable prompt, the cost note, and a paid call only after a confirmation. Nothing here calls on its own. */
export function ApiRunBody({ type, prompt, onImported }: ApiRunBodyProps) {
  const id = useId();
  const providers = useAiProviders();
  const initial = prompt ?? promptTemplates[type];
  const [text, setText] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AiRunResult | null>(null);
  const [failed, setFailed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { current } = providers;
  const estimate = current && formatUsd(estimateMaxCost(text.length, current));

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  function run() {
    if (!current || running) return;
    setRunning(true);
    setConfirming(false);
    setResult(null);
    setFailed(false);
    getApiClient()
      .then((client) => client.runAi(current.id, type, text))
      .then(
        (answer) => {
          setResult(answer);
          if (answer.report) onImported?.(answer.report);
        },
        () => setFailed(true),
      )
      .finally(() => setRunning(false));
  }

  return (
    <>
      <AiProviderSelect state={providers} />
      {providers.loadFailed && (
        <p role="alert" className={styles.error}>
          Sağlayıcılar okunamadı.
        </p>
      )}
      <div className={form.field}>
        <label htmlFor={`${id}-prompt`}>Prompt</label>
        <textarea
          id={`${id}-prompt`}
          className={`${form.input} ${styles.box}`}
          rows={12}
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      {current && (
        <p className={styles.muted}>
          {current.label} · 1M giriş tokeni {formatUsd(current.inputPerMillion)} · 1M çıkış tokeni{' '}
          {formatUsd(current.outputPerMillion)}. Bu çağrı için tahmini üst sınır: {estimate}. Sen
          onaylamadan hiçbir çağrı yapılmaz.
        </p>
      )}
      {current && !current.hasKey && (
        <p className={styles.muted}>
          API anahtarı kayıtlı değil. <Link to="/settings">Ayarlar&apos;dan ekle</Link>.
        </p>
      )}
      {confirming ? (
        <div role="alertdialog" aria-label="Ücretli çağrı onayı" className={styles.panel}>
          <p className={styles.muted}>
            {current?.label} hesabına ücretli bir çağrı yapılacak. Tahmini üst sınır: {estimate}.
          </p>
          <div className={form.actions}>
            <button ref={confirmRef} type="button" className={buttons.primary} onClick={run}>
              Ücretli çağrıyı onayla
            </button>
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => setConfirming(false)}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className={buttons.primary}
            disabled={!current?.hasKey || text.trim() === '' || running}
            onClick={() => setConfirming(true)}
          >
            Yapay zekâya gönder
          </button>
        </div>
      )}
      {running && (
        <p role="status" className={styles.muted}>
          Yapay zekâ yanıtlıyor…
        </p>
      )}
      {failed && (
        <p role="alert" className={styles.error}>
          İstek gönderilemedi.
        </p>
      )}
      {result && <RunResult result={result} />}
    </>
  );
}

function RunResult({ result }: { result: AiRunResult }) {
  const { error, errors, report, usage, output } = result;
  return (
    <>
      {report && (
        <div role="status" className={styles.success}>
          <p>{formatImportReport(report)}</p>
          {report.levelKept && <p>Konu zaten vardı; seviyesi değiştirilmedi.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className={styles.errors}>
          <p>Cevap kaydedilmedi. {errors.length} sorun bulundu:</p>
          <ol>
            {errors.map((item, index) => (
              <li key={index}>{formatImportError(item)}</li>
            ))}
          </ol>
        </div>
      )}
      {usage && (
        <p className={styles.muted}>
          {formatTokens(usage.inputTokens)} giriş, {formatTokens(usage.outputTokens)} çıkış tokeni ·{' '}
          {formatUsd(usage.costUsd)}
        </p>
      )}
      {!report && output && (
        <details>
          <summary>Yapay zekânın cevabı</summary>
          <textarea
            aria-label="Yapay zekânın cevabı"
            className={`${form.input} ${styles.box}`}
            rows={12}
            readOnly
            value={output}
          />
        </details>
      )}
    </>
  );
}
