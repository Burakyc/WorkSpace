import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { AiProviderId, AiProviderInfo } from '../../shared/api/types';

export interface AiProvidersState {
  providers: AiProviderInfo[];
  /** Null until loaded. */
  current: AiProviderInfo | null;
  loadFailed: boolean;
  saveFailed: boolean;
  change(id: AiProviderId): void;
}

/** The providers and the one chosen in the settings; a change saves at once and goes back when the save fails. */
export function useAiProviders(): AiProvidersState {
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [currentId, setCurrentId] = useState<AiProviderId | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => Promise.all([client.listAiProviders(), client.getSettings()]))
      .then(
        ([list, settings]) => {
          if (!active) return;
          setProviders(list);
          setCurrentId(settings.aiProvider);
        },
        () => {
          if (active) setLoadFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  function change(id: AiProviderId) {
    const previous = currentId;
    setCurrentId(id);
    setSaveFailed(false);
    getApiClient()
      .then((client) => client.saveAiProvider(id))
      .catch(() => {
        setCurrentId(previous);
        setSaveFailed(true);
      });
  }

  return {
    providers,
    current: providers.find((provider) => provider.id === currentId) ?? null,
    loadFailed,
    saveFailed,
    change,
  };
}
