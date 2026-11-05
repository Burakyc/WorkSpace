import { vi } from 'vitest';
import type { ImportError, ImportResult } from '../../../shared/api/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * An in-memory stand-in for the content endpoints: stubs window.devpath and fetch.
 * Import answers are fixed per test; every request body is recorded.
 */
export function installFakeContentApi(
  options: {
    /** Errors of POST /api/import/validate (default: none). */
    validateErrors?: ImportError[];
    /** Answer of POST /api/import (default: nothing saved, no errors). */
    importResult?: ImportResult;
    failImport?: boolean;
  } = {},
) {
  const requests: { method: string; path: string; body: unknown }[] = [];

  const fetchFn = vi.fn<typeof fetch>((url, init) => {
    const { pathname } = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: pathname, body });

    if (options.failImport && pathname.startsWith('/api/import')) {
      return Promise.resolve(json({ title: 'Error' }, 500));
    }
    if (method === 'POST' && pathname === '/api/import/validate') {
      return Promise.resolve(json({ errors: options.validateErrors ?? [] }));
    }
    if (method === 'POST' && pathname === '/api/import') {
      return Promise.resolve(json(options.importResult ?? { errors: [], report: null }));
    }
    return Promise.resolve(json({ title: 'Not Found' }, 404));
  });

  vi.stubGlobal('devpath', {
    getApiConfig: () => Promise.resolve({ baseUrl: 'http://api.test', token: 't' }),
  });
  vi.stubGlobal('fetch', fetchFn);
  return { fetchFn, requests };
}
