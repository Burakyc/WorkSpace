import { once } from 'node:events';
import { createServer } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { createToken, findFreePort, TOKEN_HEADER, waitForHealth } from './apiProcess';

const baseUrl = 'http://127.0.0.1:1234';

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
