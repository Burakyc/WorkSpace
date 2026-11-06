import { beforeEach, describe, expect, it } from 'vitest';
import { installErrorListeners } from './errorListeners';
import { clearErrors, maskPath, recentErrors, recordError } from './errorLog';

beforeEach(() => {
  clearErrors();
});

describe('errorLog', () => {
  it('keeps only the last 50, newest first', () => {
    for (let i = 0; i < 60; i++) recordError(`K${i}`, null);

    const recent = recentErrors();
    expect(recent).toHaveLength(50);
    expect(recent[0]?.kind).toBe('K59');
    expect(recent[49]?.kind).toBe('K10');
  });

  it('masks ids, dates, slugs and the query in paths', () => {
    expect(maskPath('/api/notes/0f8f6d3e-1111-2222-3333-444455556666/content?x=1')).toBe(
      '/api/notes/{…}/content',
    );
    expect(maskPath('/calendar/2026-11-07')).toBe('/calendar/{…}');
    expect(maskPath('/english/phrasal-verbs')).toBe('/english/{…}');
  });

  it('records window errors and unhandled rejections by name', () => {
    const target = new EventTarget() as Window;
    installErrorListeners(target);
    window.location.hash = '#/notes/abc-123';

    target.dispatchEvent(new ErrorEvent('error', { error: new TypeError('secret text') }));
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: 'not an error' });
    target.dispatchEvent(rejection);

    expect(recentErrors().map(({ kind, path }) => [kind, path])).toEqual([
      ['UnhandledRejection', '/notes/{…}'],
      ['TypeError', '/notes/{…}'],
    ]);
    expect(JSON.stringify(recentErrors())).not.toContain('secret');
  });
});
