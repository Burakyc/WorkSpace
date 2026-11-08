import { useId } from 'react';
import type { AiProviderId } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import styles from '../content/Content.module.css';
import type { AiProvidersState } from './useAiProviders';

/** The API mode's provider, in Ayarlar and in the mode's body. */
export function AiProviderSelect({ state }: { state: AiProvidersState }) {
  const id = useId();
  return (
    <div className={`${form.field} ${styles.modeField}`}>
      <label htmlFor={id}>Sağlayıcı</label>
      <select
        id={id}
        className={form.input}
        value={state.current?.id ?? ''}
        disabled={state.current === null}
        onChange={(event) => state.change(event.target.value as AiProviderId)}
      >
        {state.current === null && <option value="">…</option>}
        {state.providers.map(({ id: provider, label }) => (
          <option key={provider} value={provider}>
            {label}
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
