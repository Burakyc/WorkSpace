import { vi } from 'vitest';
import type {
  Goal,
  ImportReport,
  NoteNode,
  PostDraft,
  PostDraftInput,
  Project,
  StylePrompt,
} from '../../../shared/api/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status === 400 ? 'application/problem+json' : 'application/json' },
  });

const notFound = () => json({ title: 'Not Found' }, 404);

/** An in-memory stand-in for the post assistant endpoints: stubs window.devpath and fetch. Every request is recorded. */
export function installFakePostsApi(
  options: {
    style?: StylePrompt;
    failStyle?: boolean;
    failStyleSave?: boolean;
    styleError?: string;
    drafts?: PostDraft[];
    failDrafts?: boolean;
    /** Field errors of PUT /api/posts/drafts/{id}. */
    draftError?: Record<string, string[]>;
    goals?: Goal[];
    projects?: Project[];
    notes?: NoteNode[];
    failContext?: boolean;
    /** Answer of POST /api/import. */
    importReport?: ImportReport;
  } = {},
) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  let style: StylePrompt = options.style ?? { text: '', updatedAt: null, history: [] };
  const drafts: PostDraft[] = structuredClone(options.drafts ?? []);

  function styleRoute(method: string, body: unknown): Response {
    if (method === 'GET') return options.failStyle ? json({}, 500) : json(style);
    if (options.styleError) return json({ errors: { text: [options.styleError] } }, 400);
    if (options.failStyleSave) return json({}, 500);
    const text = (body as { text: string }).text.trimEnd();
    if (text !== style.text) {
      const old =
        style.text && style.updatedAt ? [{ text: style.text, savedAt: style.updatedAt }] : [];
      style = {
        text,
        updatedAt: '2026-11-09T12:00:00Z',
        history: [...old, ...style.history].slice(0, 10),
      };
    }
    return json(style);
  }

  function draftsRoute(method: string, id: string | undefined, body: unknown): Response {
    if (options.failDrafts) return json({}, 500);
    if (method === 'GET') return json(drafts);
    const index = drafts.findIndex((draft) => draft.id === id);
    if (method === 'PUT') {
      if (options.draftError) return json({ errors: options.draftError }, 400);
      const draft = drafts[index];
      if (!draft) return notFound();
      Object.assign(draft, body as PostDraftInput);
      return json(draft);
    }
    if (index < 0) return notFound();
    drafts.splice(index, 1);
    return new Response(null, { status: 204 });
  }

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: pathname, body });
    if (pathname === '/api/posts/style') return Promise.resolve(styleRoute(method, body));
    if (pathname.startsWith('/api/posts/drafts')) {
      return Promise.resolve(draftsRoute(method, pathname.split('/')[4], body));
    }
    if (pathname === '/api/goals') return Promise.resolve(json(options.goals ?? []));
    if (pathname === '/api/projects') return Promise.resolve(json(options.projects ?? []));
    if (pathname === '/api/notes') return Promise.resolve(json(options.notes ?? []));
    if (pathname === '/api/settings') {
      return Promise.resolve(
        json({
          aiModes: { posts: 'copyPaste' },
          aiInbox: { posts: null },
          aiProvider: 'claude',
        }),
      );
    }
    if (pathname === '/api/posts/project-context') {
      if (options.failContext) return Promise.resolve(json({}, 500));
      const title = options.projects?.[0]?.title;
      return Promise.resolve(json({ topic: title, text: `Project: ${title}` }));
    }
    if (pathname === '/api/import') {
      return Promise.resolve(json({ errors: [], report: options.importReport ?? null }));
    }
    return Promise.resolve(notFound());
  });

  const openExternal = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve());
  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
    openExternal,
  });
  vi.stubGlobal('fetch', fetchFn);
  return { fetchFn, requests, drafts, openExternal };
}
