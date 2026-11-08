import type { AiModule, ContentType, ImportReport } from '../../shared/api/types';
import styles from '../content/Content.module.css';
import { CopyPromptButton } from '../content/CopyPromptButton';
import { ImportPanel } from '../content/ImportPanel';
import { AiModeSelect } from './AiModeSelect';
import { ApiRunBody } from './ApiRunBody';
import { FileImportBody } from './FileImportBody';
import { useAiMode } from './useAiMode';

interface AiContentPanelProps {
  /** Whose mode applies. */
  module: AiModule;
  /** The content type the answer must be; it is validated and merged like any import. */
  type: ContentType;
  /** The prompt to run; the type's template by default. */
  prompt?: string;
  /** Called after a save, e.g. to reload a list. */
  onImported?(report: ImportReport): void;
}

/** Runs a prompt through the module's AI mode and saves the validated answer. The one way a module gets AI content. */
export function AiContentPanel({ module, type, prompt, onImported }: AiContentPanelProps) {
  const state = useAiMode(module);
  return (
    <div className={styles.page}>
      <AiModeSelect label="Yapay zekâ modu" state={state} />
      {state.mode === 'copyPaste' && (
        <>
          <p className={styles.muted}>
            Promptu kopyala, yapay zekâya yapıştır ve aldığın JSON&apos;u aşağıya ekle.
          </p>
          <CopyPromptButton type={type} getText={prompt === undefined ? undefined : () => prompt} />
          <ImportPanel type={type} onImported={onImported} />
        </>
      )}
      {state.mode === 'file' && (
        <FileImportBody module={module} type={type} prompt={prompt} onImported={onImported} />
      )}
      {state.mode === 'api' && (
        <ApiRunBody key={prompt} type={type} prompt={prompt} onImported={onImported} />
      )}
    </div>
  );
}
