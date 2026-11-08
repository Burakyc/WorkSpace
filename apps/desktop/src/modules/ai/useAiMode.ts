import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { AiMode, AiModule } from '../../shared/api/types';

export interface AiModeState {
  /** Null until loaded. Unreadable settings give copy-paste, which needs nothing, so content can still be added. */
  mode: AiMode | null;
  saving: boolean;
  saveFailed: boolean;
  change(next: AiMode): void;
}

/** A module's AI mode from the settings; a change saves at once and goes back when the save fails. */
export function useAiMode(module: AiModule): AiModeState {
  const [mode, setMode] = useState<AiMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getSettings())
      .then(({ aiModes }) => aiModes[module])
      .catch((): AiMode => 'copyPaste')
      .then((loaded) => {
        if (active) setMode(loaded);
      });
    return () => {
      active = false;
    };
  }, [module]);

  function change(next: AiMode) {
    const previous = mode;
    setMode(next);
    setSaving(true);
    setSaveFailed(false);
    getApiClient()
      .then((client) => client.saveAiMode(module, next))
      .catch(() => {
        setMode(previous);
        setSaveFailed(true);
      })
      .finally(() => setSaving(false));
  }

  return { mode, saving, saveFailed, change };
}
