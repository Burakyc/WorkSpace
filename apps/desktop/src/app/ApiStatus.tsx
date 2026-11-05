import { useEffect, useState } from 'react';
import { createApiClient } from '../shared/api/client';

type Status = 'connecting' | 'connected' | 'disconnected';

const labels: Record<Status, string> = {
  connecting: 'API: bağlanıyor…',
  connected: 'API: bağlı',
  disconnected: 'API: bağlantı yok',
};

export function ApiStatus() {
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    let active = true;
    // Starting from Promise.resolve() turns a missing bridge into a rejection instead of a crash.
    Promise.resolve()
      .then(() => window.devpath.getApiConfig())
      .then((config) => createApiClient(config).getHealth())
      .then((health) => {
        if (active) setStatus(health.status === 'ok' ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (active) setStatus('disconnected');
      });
    return () => {
      active = false;
    };
  }, []);

  return <p role="status">{labels[status]}</p>;
}
