import { useState } from 'react';
import type { ContentType } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Content.module.css';
import { promptTemplates } from './prompts';

/** Copies the prompt (the type's template by default) to the clipboard, to paste into any AI chat. */
export function CopyPromptButton({ type, prompt }: { type: ContentType; prompt?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  function copy() {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(prompt ?? promptTemplates[type]))
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
