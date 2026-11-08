import { once } from 'node:events';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { TOKEN_HEADER } from '../src/shared/api/client';
import {
  apiEnvironment,
  createToken,
  findFreePort,
  resolveApiExePath,
  waitForHealth,
} from './apiProcess';

const baseUrl = 'http://127.0.0.1:1234';

describe('resolveApiExePath', () => {
  const paths = {
    resourcesPath: 'C:\\Apps\\DevPath\\resources',
    appPath: 'C:\\Repo\\apps\\desktop',
  };

  it('uses the bundled API when packaged', () => {
    expect(resolveApiExePath({ packaged: true, ...paths })).toBe(
      join(paths.resourcesPath, 'api', 'DevPath.Api.exe'),
    );
  });

  it('uses the Debug build next to the desktop app in development', () => {
    expect(resolveApiExePath({ packaged: false, ...paths })).toBe(
      resolve('C:\\Repo\\apps\\api\\DevPath.Api\\bin\\Debug\\net10.0\\DevPath.Api.exe'),
    );
  });
});

describe('findFreePort', () => {
  it('returns a port a server can listen on at 127.0.0.1', async () => {
    const port = await findFreePort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);

    const server = createServer().listen(port, '127.0.0.1');
    await once(server, 'listening');
    server.close();
  });
});

describe('createToken', () => {
  it('is 43 base64url characters and new every time', () => {
    const token = createToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createToken()).not.toBe(token);
  });
});

describe('waitForHealth', () => {
  it('retries until /api/health answers 200, always sending the token', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await waitForHealth(baseUrl, 'secret', { timeoutMs: 2000, intervalMs: 5, fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    for (const [url, init] of fetchFn.mock.calls) {
      expect(url).toBe(`${baseUrl}/api/health`);
      expect(init?.headers).toEqual({ [TOKEN_HEADER]: 'secret' });
    }
  });

  it('rejects after the timeout when the API never answers', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      waitForHealth(baseUrl, 'secret', { timeoutMs: 50, intervalMs: 5, fetchFn }),
    ).rejects.toThrow('yanıt vermedi');
  });

  it('rejects at once when the API process exits', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'));
    const started = Date.now();

    await expect(
      waitForHealth(baseUrl, 'secret', {
        timeoutMs: 5000,
        intervalMs: 5,
        fetchFn,
        exited: Promise.resolve(1),
      }),
    ).rejects.toThrow('kapandı');
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('does not treat 401 as healthy', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      waitForHealth(baseUrl, 'wrong', { timeoutMs: 50, intervalMs: 5, fetchFn }),
    ).rejects.toThrow('yanıt vermedi');
  });
});

describe('apiEnvironment', () => {
  it('passes the token when one is saved and always the launch id', () => {
    expect(apiEnvironment('ghp_x', 'launch-1', { anthropic: 'a', gemini: 'g' })).toEqual({
      DEVPATH_GITHUB_TOKEN: 'ghp_x',
      DEVPATH_ANTHROPIC_API_KEY: 'a',
      DEVPATH_GEMINI_API_KEY: 'g',
      DEVPATH_LAUNCH_ID: 'launch-1',
    });
  });

  it('overrides an inherited token with an empty value when none is saved', () => {
    expect(apiEnvironment(undefined, 'launch-1')).toEqual({
      DEVPATH_GITHUB_TOKEN: '',
      DEVPATH_ANTHROPIC_API_KEY: '',
      DEVPATH_GEMINI_API_KEY: '',
      DEVPATH_LAUNCH_ID: 'launch-1',
    });
  });
});
