import { useState } from 'react';
import type { ContentType } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Content.module.css';
import { promptTemplates } from './prompts';

/** Copies the type's prompt template to the clipboard, to paste into any AI chat. */
export function CopyPromptButton({ type }: { type: ContentType }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  function copy() {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(promptTemplates[type]))
      .then(
        () => setState('copied'),
        () => setState('failed'),
      );
  }

  return (
    <div className={styles.row}>
      <button type="button" className={buttons.primary} onClick={copy}>
        Promptu kopyala
      </button>
      <span role="status" className={styles.muted}>
        {state === 'copied' && 'Kopyalandı.'}
        {state === 'failed' && 'Kopyalanamadı.'}
      </span>
    </div>
  );
}
