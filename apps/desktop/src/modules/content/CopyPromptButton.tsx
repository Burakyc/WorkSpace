import { useState } from 'react';
import type { ContentType } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './Content.module.css';
import { promptTemplates } from './prompts';

interface CopyPromptButtonProps {
  type: ContentType;
  /** Builds the text when pressed; by default the type's template. */
  getText?(): string | Promise<string>;
  label?: string;
  disabled?: boolean;
}

/** Copies a prompt to the clipboard, to paste into any AI chat. */
export function CopyPromptButton({
  type,
  getText = () => promptTemplates[type],
  label = 'Promptu kopyala',
  disabled = false,
}: CopyPromptButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  function copy() {
    Promise.resolve()
      .then(getText)
      .then((text) => navigator.clipboard.writeText(text))
      .then(
        () => setState('copied'),
        () => setState('failed'),
      );
  }

  return (
    <div className={styles.row}>
      <button type="button" className={buttons.primary} disabled={disabled} onClick={copy}>
        {label}
      </button>
      <span role="status" className={styles.muted}>
        {state === 'copied' && 'Kopyalandı.'}
        {state === 'failed' && 'Kopyalanamadı.'}
      </span>
    </div>
  );
}
