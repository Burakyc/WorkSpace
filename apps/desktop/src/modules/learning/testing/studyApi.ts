import { vi } from 'vitest';
import type { Goal } from '../../../shared/api/types';
import { installFakeContentApi } from '../../content/testing/fakeContentApi';
import { installFakeGoalsApi } from '../../goals/testing/fakeGoalsApi';

type ContentOptions = NonNullable<Parameters<typeof installFakeContentApi>[0]>;
type GoalsOptions = NonNullable<Parameters<typeof installFakeGoalsApi>[1]>;

/** Both fakes behind one fetch: content routes go to the content fake, the rest to the goals fake. */
export function installStudyApi(
  goals: Goal[],
  options: { content?: ContentOptions; goals?: GoalsOptions } = {},
) {
  const goalsApi = installFakeGoalsApi(goals, options.goals);
  const contentApi = installFakeContentApi(options.content);
  const goalsFetch = goalsApi.fetchFn;
  const contentFetch = contentApi.fetchFn;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((url, init) =>
      new URL(String(url)).pathname.startsWith('/api/content/')
        ? contentFetch(url, init)
        : goalsFetch(url, init),
    ),
  );
  return { goalsApi, contentApi };
}
