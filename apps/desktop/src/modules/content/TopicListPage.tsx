import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
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
  /** Another way to add content: a button next to "İçerik ekle" and its panel. */
  extra?: { label: string; render(topics: TopicSummary[], onImported: () => void): ReactNode };
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
  extra,
}: TopicListPageProps) {
  const panelId = useId();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  // Which panel is open; only one, since each holds an import box.
  const [open, setOpen] = useState<'import' | 'extra' | null>(null);

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
  const reload = () => setVersion((v) => v + 1);
  const extraButton = extra && (
    <button
      type="button"
      className={buttons.secondary}
      aria-expanded={open === 'extra'}
      aria-controls={panelId}
      onClick={() => setOpen(open === 'extra' ? null : 'extra')}
    >
      {extra.label}
    </button>
  );
  // The panel keeps its place in the tree when the first import turns the empty state into the list.
  return (
    <div className={styles.page}>
      {empty ? (
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          next="İlk içeriğini aşağıdan ekle."
        >
          {extraButton}
        </EmptyState>
      ) : (
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.row}>
            {extraButton}
            <button
              type="button"
              className={buttons.secondary}
              aria-expanded={open === 'import'}
              aria-controls={panelId}
              onClick={() => setOpen(open === 'import' ? null : 'import')}
            >
              İçerik ekle
            </button>
          </div>
        </header>
      )}
      {open === 'extra' && extra ? (
        <div id={panelId} className={styles.page}>
          {extra.render(state.topics, reload)}
        </div>
      ) : (
        (empty || open === 'import') && (
          <div id={panelId} className={styles.page}>
            <AiContentPanel
              module={AI_MODULE_OF_TYPE[type]}
              type={type}
              onImported={() => {
                setOpen('import');
                reload();
              }}
            />
          </div>
        )
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
