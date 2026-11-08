import { useId } from 'react';
import type { AiMode } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import styles from '../content/Content.module.css';
import { AI_MODES } from './aiModes';
import type { AiModeState } from './useAiMode';

/** The mode select of one module, in Ayarlar and at the top of its content panel. */
export function AiModeSelect({ label, state }: { label: string; state: AiModeState }) {
  const id = useId();
  return (
    <div className={`${form.field} ${styles.modeField}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={form.input}
        disabled={state.mode === null || state.saving}
        value={state.mode ?? ''}
        onChange={(event) => state.change(event.target.value as AiMode)}
      >
        {state.mode === null && <option value="">…</option>}
        {AI_MODES.map(({ id: mode, label: text }) => (
          <option key={mode} value={mode}>
            {text}
          </option>
        ))}
      </select>
      {state.saveFailed && (
        <p role="alert" className={styles.error}>
          Kaydedilemedi.
        </p>
      )}
    </div>
  );
}
