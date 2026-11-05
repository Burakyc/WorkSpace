import { useEffect, useState } from 'react';
import { getApiClient } from '../shared/api/getApiClient';
import styles from './ApiStatus.module.css';

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
    getApiClient()
      .then((client) => client.getHealth())
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

  return (
    <p role="status" className={styles.status} title={labels[status]}>
      <span className={`${styles.dot} ${styles[status] ?? ''}`} aria-hidden="true" />
      <span className={styles.text}>{labels[status]}</span>
    </p>
  );
}
