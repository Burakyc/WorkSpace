import { vi } from 'vitest';
import type {
  AiInbox,
  AiMode,
  AiModes,
  AiModule,
  AiProviderId,
  AiProviderInfo,
  AiRunResult,
  ContentItemBase,
  ContentTopic,
  ImportError,
  ImportResult,
  InboxFile,
  TopicSummary,
} from '../../../shared/api/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const notFound = () => json({ title: 'Not Found' }, 404);

export type FakeTopic = ContentTopic<ContentItemBase & Record<string, unknown>>;

/**
 * An in-memory stand-in for the content endpoints: stubs window.devpath and fetch.
 * Topics are kept and marked in memory; import answers are fixed per test. Every request is recorded.
 */
export function installFakeContentApi(
  options: {
    /** Errors of POST /api/import/validate (default: none). */
    validateErrors?: ImportError[];
    /** Answer of POST /api/import (default: nothing saved, no errors, or a report for `importTopic`). */
    importResult?: ImportResult;
    /** A topic POST /api/import adds (its items are appended when the slug exists). */
    importTopic?: FakeTopic;
    failImport?: boolean;
    topics?: FakeTopic[];
    failTopics?: boolean;
    failMark?: boolean;
    /** Saved modes in GET /api/settings (default: copy-paste everywhere). */
    aiModes?: Partial<AiModes>;
    /** GET and PUT /api/settings fail. */
    failSettings?: boolean;
    /** Only PUT /api/settings/ai-modes fails. */
    failAiModeSave?: boolean;
    aiInbox?: Partial<AiInbox>;
    /** Files of POST /api/inbox/{module}/scan; an import removes the named ones. */
    inboxFiles?: InboxFile[];
    inboxOtherTypes?: number;
    /** GET /api/ai/providers (default: Claude with a key, Gemini without). */
    aiProviders?: AiProviderInfo[];
    aiProvider?: AiProviderId;
    /** Answer of POST /api/ai/run. */
    aiRun?: AiRunResult;
    /** Secrets window.devpath.secrets starts with. */
    secrets?: string[];
    /** Answer of window.devpath.settings.pickFolder. */
    pickedFolder?: string | null;
  } = {},
) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  let inboxFiles = options.inboxFiles ?? [];
  let aiProvider = options.aiProvider ?? 'claude';
  const secrets = new Set(options.secrets ?? []);
  const aiInbox: AiInbox = { english: null, learning: null, interview: null, ...options.aiInbox };
  const topics: FakeTopic[] = structuredClone(options.topics ?? []);
  const aiModes: AiModes = {
    english: 'copyPaste',
    learning: 'copyPaste',
    interview: 'copyPaste',
    ...options.aiModes,
  };

  function summary(topic: FakeTopic): TopicSummary {
    const marks: Record<string, number> = {};
    for (const item of topic.items) {
      if (item.mark) marks[item.mark] = (marks[item.mark] ?? 0) + 1;
    }
    const { slug, topic: name, level, tags, updatedAt } = topic;
    return { slug, topic: name, level, tags, itemCount: topic.items.length, marks, updatedAt };
  }

  function importRoute(): Response {
    if (options.importResult) return json(options.importResult);
    const added = options.importTopic;
    if (!added) return json({ errors: [], report: null });
    const existing = topics.find((t) => t.type === added.type && t.slug === added.slug);
    if (existing) existing.items.push(...structuredClone(added.items));
    else topics.push(structuredClone(added));
    const report = {
      type: added.type,
      topic: existing?.topic ?? added.topic,
      slug: added.slug,
      created: !existing,
      added: added.items.length,
      skipped: 0,
      levelKept: false,
    };
    return json({ errors: [], report });
  }

  function contentRoute(method: string, parts: string[], body: unknown): Response {
    const [type, slug, , id, action] = parts;
    if (options.failTopics) return json({ title: 'Error' }, 500);
    const ofType = topics.filter((t) => t.type === type);
    if (method === 'GET' && slug === undefined) {
      return json(ofType.map(summary).sort((a, b) => a.topic.localeCompare(b.topic, 'tr')));
    }
    const topic = ofType.find((t) => t.slug === slug);
    if (!topic) return notFound();
    if (method === 'GET' && id === undefined) return json(topic);
    if (method === 'PUT' && action === 'mark') {
      if (options.failMark) return json({ title: 'Error' }, 500);
      const item = topic.items.find((i) => i.id === id);
      if (!item) return notFound();
      const { mark } = body as { mark: string | null };
      if (mark === null) {
        delete item.mark;
        delete item.markedAt;
      } else {
        item.mark = mark;
        item.markedAt = '2026-11-06T10:00:00Z';
      }
      return json(item);
    }
    return notFound();
  }

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: pathname, body });

    if (pathname.startsWith('/api/settings')) {
      if (options.failSettings) return Promise.resolve(json({ title: 'Error' }, 500));
      if (method === 'GET') return Promise.resolve(json({ aiModes, aiInbox, aiProvider }));
      if (pathname.endsWith('/ai-provider')) {
        aiProvider = (body as { provider: AiProviderId }).provider;
        return Promise.resolve(json({ provider: aiProvider }));
      }
      if (pathname.includes('/ai-inbox/')) {
        const owner = pathname.split('/').pop() as AiModule;
        aiInbox[owner] = (body as { folder: string | null }).folder;
        return Promise.resolve(json(aiInbox));
      }
      if (options.failAiModeSave) return Promise.resolve(json({ title: 'Error' }, 500));
      const module = pathname.split('/').pop() as AiModule;
      aiModes[module] = (body as { mode: AiMode }).mode;
      return Promise.resolve(json(aiModes));
    }
    if (pathname === '/api/ai/providers') {
      return Promise.resolve(json(options.aiProviders ?? FAKE_AI_PROVIDERS));
    }
    if (pathname === '/api/ai/run') return Promise.resolve(json(options.aiRun ?? {}));
    if (pathname.startsWith('/api/inbox/')) {
      const [, , , owner, action] = pathname.split('/');
      if (action === 'scan') {
        return Promise.resolve(
          json({
            folder: aiInbox[owner as AiModule],
            error: null,
            files: inboxFiles,
            otherTypeCount: options.inboxOtherTypes ?? 0,
          }),
        );
      }
      const { names } = body as { names: string[] };
      inboxFiles = inboxFiles.filter((file) => !names.includes(file.name));
      const results = names.map((name) => ({
        name,
        report: {
          type: 'vocab',
          topic: name,
          slug: name,
          created: true,
          added: 1,
          skipped: 0,
          levelKept: false,
        },
        errors: [],
        moved: true,
      }));
      return Promise.resolve(json({ results }));
    }
    if (options.failImport && pathname.startsWith('/api/import')) {
      return Promise.resolve(json({ title: 'Error' }, 500));
    }
    if (method === 'POST' && pathname === '/api/import/validate') {
      return Promise.resolve(json({ errors: options.validateErrors ?? [] }));
    }
    if (method === 'POST' && pathname === '/api/import') {
      return Promise.resolve(importRoute());
    }
    if (pathname.startsWith('/api/content/')) {
      const parts = pathname.slice('/api/content/'.length).split('/').map(decodeURIComponent);
      return Promise.resolve(contentRoute(method, parts, body));
    }
    return Promise.resolve(notFound());
  });

  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
    settings: { pickFolder: () => Promise.resolve(options.pickedFolder ?? null) },
    secrets: {
      has: (name: string) => Promise.resolve(secrets.has(name)),
      set: vi.fn((name: string) => {
        secrets.add(name);
        return Promise.resolve();
      }),
      clear: vi.fn((name: string) => {
        secrets.delete(name);
        return Promise.resolve();
      }),
    },
  });
  vi.stubGlobal('fetch', fetchFn);
  return { fetchFn, requests, topics };
}

export const FAKE_AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: 'claude',
    label: 'Claude Opus 5.5',
    model: 'claude-opus-5-5',
    inputPerMillion: 4,
    outputPerMillion: 20,
    maxOutputTokens: 16000,
    hasKey: true,
  },
  {
    id: 'gemini',
    label: 'Gemini 3.1 Pro',
    model: 'gemini-3.1-pro-preview',
    inputPerMillion: 2,
    outputPerMillion: 12,
    maxOutputTokens: 16000,
    hasKey: false,
  },
];

/** A topic for tests; items get ids and dates unless given. */
export function fakeTopic(
  overrides: Partial<FakeTopic> & Pick<FakeTopic, 'type' | 'slug' | 'topic'>,
  items: Record<string, unknown>[] = [],
): FakeTopic {
  return {
    level: 'B2',
    tags: [],
    createdAt: '2026-11-06T09:00:00Z',
    updatedAt: '2026-11-06T09:00:00Z',
    ...overrides,
    items: items.map((item, index) => ({
      id: `${overrides.slug}-${index + 1}`,
      addedAt: '2026-11-06T09:00:00Z',
      ...item,
    })),
  };
}
