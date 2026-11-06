import { Languages } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { TopicSummary } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import { CopyPromptButton } from '../content/CopyPromptButton';
import { ImportPanel } from '../content/ImportPanel';
import styles from './English.module.css';
import { vocabCounts } from './vocabCounts';

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'done'; topics: TopicSummary[] };

/** The vocabulary topics, with the prompt and the import panel behind "İçerik ekle" (always shown while empty). */
export function EnglishPage() {
  const panelId = useId();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  // The list stays on screen while it reloads after an import, so the import summary is kept.
  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listTopics('vocab'))
      .then(
        (topics) => {
          if (active) setState({ kind: 'done', topics });
        },
        () => {
          if (active) setState({ kind: 'failed' });
        },
      );
    return () => {
      active = false;
    };
  }, [version]);

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  if (state.kind === 'failed') {
    return (
      <p role="alert" className={styles.error}>
        Konular yüklenemedi.
      </p>
    );
  }

  const empty = state.topics.length === 0;
  return (
    <div className={styles.page}>
      {empty ? (
        <EmptyState
          icon={Languages}
          title="İngilizce"
          description="Kendi eklediğin kelime ve ifade kartları burada olacak."
          next="İlk içeriğini eklemek için promptu kopyala, yapay zekâya yapıştır ve aldığın JSON'u aşağıya ekle."
        >
          <CopyPromptButton type="vocab" />
        </EmptyState>
      ) : (
        <header className={styles.header}>
          <h1 className={styles.title}>İngilizce</h1>
          <button
            type="button"
            className={buttons.secondary}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            İçerik ekle
          </button>
        </header>
      )}
      {(empty || open) && (
        <div id={panelId} className={styles.addPanel}>
          {!empty && <CopyPromptButton type="vocab" />}
          <ImportPanel
            type="vocab"
            onImported={() => {
              setOpen(true);
              setVersion((v) => v + 1);
            }}
          />
        </div>
      )}
      {!empty && (
        <ul className={styles.topics}>
          {state.topics.map((topic) => (
            <li key={topic.slug} className={styles.topic}>
              <Link to={`/english/${topic.slug}`} className={styles.topicLink}>
                {topic.topic}
              </Link>
              <span className={styles.meta}>
                <span className={styles.level}>{topic.level}</span>
                {topic.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </span>
              <span className={styles.muted}>{vocabCounts(topic)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
