import { useEffect, useState } from 'react';
import { ApiError } from '../../shared/api/client';
import { getApiClient } from '../../shared/api/getApiClient';
import type { ContentTopic, LessonItem } from '../../shared/api/types';

export type LessonState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'failed' }
  | { kind: 'done'; lesson: ContentTopic<LessonItem> };

/** Loads a lesson; `reload` fetches it again and keeps the old one on screen meanwhile. */
export function useLesson(slug: string) {
  const [state, setState] = useState<LessonState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.getTopic<LessonItem>('lesson', slug))
      .then(
        (lesson) => {
          if (active) setState({ kind: 'done', lesson });
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

  return { state, reload: () => setVersion((v) => v + 1) };
}
