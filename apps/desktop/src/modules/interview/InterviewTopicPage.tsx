import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ContentTopic, Difficulty, InterviewItem } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import { levelLabel } from '../content/levelLabel';
import {
  ALL_QUESTIONS,
  filterQuestions,
  questionTags,
  type QuestionFilter,
} from './filterQuestions';
import { interviewCounts } from './interviewCounts';
import styles from './Interview.module.css';
import { difficultyLabels, QuestionCard } from './QuestionCard';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'failed' }
  | { kind: 'done'; topic: ContentTopic<InterviewItem> };

/** One interview topic: its questions, filtered by difficulty, tag and practised state. */
export function InterviewTopicPage() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<QuestionFilter>(ALL_QUESTIONS);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getTopic<InterviewItem>('interview', slug))
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
    <Link to="/interview" className={styles.back}>
      ← Mülakat
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
  const practised = topic.items.filter((item) => item.mark === 'practised').length;
  const tags = questionTags(topic.items);
  const shown = filterQuestions(topic.items, filter);

  // The reload keeps this page mounted, so the filters and the opened answers stay.
  const markPractised = (item: InterviewItem, on: boolean) =>
    getApiClient()
      .then((client) => client.markItem('interview', topic.slug, item.id, on ? 'practised' : null))
      .then(() => setVersion((v) => v + 1));

  return (
    <div className={styles.page}>
      {back}
      <header className={styles.heading}>
        <h1 className={styles.title}>{topic.topic}</h1>
        <span className={styles.meta}>
          <span className={styles.level}>{levelLabel(topic.level)}</span>
          {topic.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
          <span>{interviewCounts({ itemCount: topic.items.length, marks: { practised } })}</span>
        </span>
      </header>
      <div className={styles.filters}>
        <label className={form.field}>
          Zorluk
          <select
            className={form.input}
            value={filter.difficulty}
            onChange={(e) =>
              setFilter({ ...filter, difficulty: e.target.value as Difficulty | 'all' })
            }
          >
            <option value="all">Hepsi</option>
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {tags.length > 0 && (
          <label className={form.field}>
            Etiket
            <select
              className={form.input}
              value={filter.tag}
              onChange={(e) => setFilter({ ...filter, tag: e.target.value })}
            >
              <option value="all">Hepsi</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={form.field}>
          Durum
          <select
            className={form.input}
            value={filter.status}
            onChange={(e) =>
              setFilter({ ...filter, status: e.target.value as QuestionFilter['status'] })
            }
          >
            <option value="all">Hepsi</option>
            <option value="open">Çalışılmadı</option>
            <option value="practised">Çalışıldı</option>
          </select>
        </label>
        <p className={styles.muted} aria-live="polite">
          {shown.length} / {topic.items.length} soru
        </p>
      </div>
      {shown.length === 0 ? (
        <p className={styles.muted}>Bu filtreye uyan soru yok.</p>
      ) : (
        <ul className={styles.cards}>
          {shown.map((item) => (
            <QuestionCard key={item.id} item={item} onPractised={(on) => markPractised(item, on)} />
          ))}
        </ul>
      )}
    </div>
  );
}
