import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { AiModule } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from '../content/Content.module.css';

interface InboxFolderFieldProps {
  module: AiModule;
  /** Called with the saved folder after it loads and after each change. */
  onChange?(folder: string | null): void;
}

/** A module's inbox folder: the path, "Klasör seç…" (main's folder dialog) and "Kaldır". */
export function InboxFolderField({ module, onChange }: InboxFolderFieldProps) {
  const [folder, setFolder] = useState<string | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getSettings())
      .then(
        ({ aiInbox }) => {
          if (!active) return;
          setFolder(aiInbox[module]);
          onChange?.(aiInbox[module]);
        },
        () => {
          if (active) setFailed(true);
        },
      );
    return () => {
      active = false;
    };
    // onChange is only told about the folder; a new callback is no reason to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  function save(next: string | null) {
    setFailed(false);
    getApiClient()
      .then((client) => client.saveAiInbox(module, next))
      .then(
        (inbox) => {
          setFolder(inbox[module]);
          onChange?.(inbox[module]);
        },
        () => setFailed(true),
      );
  }

  function pick() {
    Promise.resolve()
      .then(() => window.devpath.settings.pickFolder('Gelen kutusu klasörü seç'))
      .then(
        (picked) => {
          if (picked !== null) save(picked);
        },
        () => setFailed(true),
      );
  }

  return (
    <div className={styles.row}>
      {folder === undefined ? null : folder === null ? (
        <span className={styles.muted}>Klasör seçilmedi.</span>
      ) : (
        <code className={styles.folder}>{folder}</code>
      )}
      <button type="button" className={buttons.secondary} onClick={pick}>
        Klasör seç…
      </button>
      {folder && (
        <button type="button" className={buttons.secondary} onClick={() => save(null)}>
          Kaldır
        </button>
      )}
      {failed && (
        <span role="alert" className={styles.error}>
          Klasör kaydedilemedi.
        </span>
      )}
    </div>
  );
}
