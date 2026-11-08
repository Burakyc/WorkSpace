import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ContentType, TopicSummary } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import { EmptyState } from '../../shared/ui/EmptyState';
import { AiContentPanel } from '../ai/AiContentPanel';
import { AI_MODULE_OF_TYPE } from '../ai/aiModes';
import styles from './Content.module.css';
import { levelLabel as defaultLevelLabel } from './levelLabel';

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'done'; topics: TopicSummary[] };

interface TopicListPageProps {
  type: ContentType;
  /** Topic pages are at `${basePath}/<slug>`. */
  basePath: string;
  icon: LucideIcon;
  title: string;
  /** What the module is for, shown in the empty state. */
  description: string;
  /** "12 kart · 5 biliyorum" for a topic row. */
  counts(topic: TopicSummary): string;
  levelLabel?(level: string): string;
}

/** A content module's topics, with the AI content panel behind "İçerik ekle" (always shown while empty). */
export function TopicListPage({
  type,
  basePath,
  icon,
  title,
  description,
  counts,
  levelLabel = defaultLevelLabel,
}: TopicListPageProps) {
  const panelId = useId();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  // The list stays on screen while it reloads after an import, so the import summary is kept.
  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listTopics(type))
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
  }, [type, version]);

  if (state.kind === 'loading') return <p className={styles.muted}>Yükleniyor…</p>;
  if (state.kind === 'failed') {
    return (
      <p role="alert" className={styles.error}>
        Konular yüklenemedi.
      </p>
    );
  }

  const empty = state.topics.length === 0;
  // The panel keeps its place in the tree when the first import turns the empty state into the list.
  return (
    <div className={styles.page}>
      {empty ? (
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          next="İlk içeriğini aşağıdan ekle."
        />
      ) : (
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
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
        <div id={panelId} className={styles.page}>
          <AiContentPanel
            module={AI_MODULE_OF_TYPE[type]}
            type={type}
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
              <Link to={`${basePath}/${topic.slug}`} className={styles.topicLink}>
                {topic.topic}
              </Link>
              <span className={styles.meta}>
                <span className={styles.level}>{levelLabel(topic.level)}</span>
                {topic.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </span>
              <span className={styles.muted}>{counts(topic)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
