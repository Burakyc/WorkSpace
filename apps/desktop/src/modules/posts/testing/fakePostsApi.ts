import { vi } from 'vitest';
import type { StylePrompt } from '../../../shared/api/types';

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
  } = {},
) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  let style: StylePrompt = options.style ?? { text: '', updatedAt: null, history: [] };

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

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: pathname, body });
    if (pathname === '/api/posts/style') return Promise.resolve(styleRoute(method, body));
    return Promise.resolve(notFound());
  });

  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
  });
  vi.stubGlobal('fetch', fetchFn);
  return { fetchFn, requests };
}
