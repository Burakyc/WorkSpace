import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ContentTopic, VocabItem } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import styles from './English.module.css';
import { vocabCounts } from './vocabCounts';
import { VocabPractice } from './VocabPractice';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'failed' }
  | { kind: 'done'; topic: ContentTopic<VocabItem> };

const markLabels = { known: 'Biliyorum', repeat: 'Tekrar et' } as const;

/** One vocabulary topic: every card, and practice behind "Çalış". */
export function VocabTopicPage() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [practising, setPractising] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getTopic<VocabItem>('vocab', slug))
      .then(
        (topic) => {
          if (active) setState({ kind: 'done', topic });
        },
        (error: unknown) => {
          if (!active) return;
          setState({
            kind: error instanceof ApiError && error.status === 404 ? 'missing' : 'failed',
          });
        },
      );
    return () => {
      active = false;
    };
  }, [slug, version]);

  const back = (
    <Link to="/english" className={styles.back}>
      ← İngilizce
    </Link>
  );

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  if (state.kind !== 'done') {
    return (
      <div className={styles.page}>
        {back}
        <p role="alert" className={styles.error}>
          {state.kind === 'missing' ? 'Konu bulunamadı.' : 'Konu yüklenemedi.'}
        </p>
      </div>
    );
  }

  const { topic } = state;
  const marks: Record<string, number> = {};
  for (const item of topic.items) {
    if (item.mark) marks[item.mark] = (marks[item.mark] ?? 0) + 1;
  }

  return (
    <div className={styles.page}>
      {back}
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{topic.topic}</h1>
          <span className={styles.meta}>
            <span className={styles.level}>{topic.level}</span>
            {topic.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
            <span>{vocabCounts({ itemCount: topic.items.length, marks })}</span>
          </span>
        </div>
        {!practising && (
          <button
            type="button"
            className={buttons.primary}
            disabled={topic.items.length === 0}
            onClick={() => setPractising(true)}
          >
            Çalış
          </button>
        )}
      </header>
      {practising ? (
        <VocabPractice
          slug={topic.slug}
          items={topic.items}
          onDone={() => {
            setPractising(false);
            setVersion((v) => v + 1);
          }}
        />
      ) : (
        <ul className={styles.cards}>
          {topic.items.map((item) => (
            <li key={item.id} className={styles.card}>
              <span className={styles.term}>{item.term}</span>
              <span>{item.meaning}</span>
              {item.definition && <span className={styles.muted}>{item.definition}</span>}
              <span className={styles.example}>{item.example}</span>
              {item.mark && <span className={styles.mark}>{markLabels[item.mark]}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
