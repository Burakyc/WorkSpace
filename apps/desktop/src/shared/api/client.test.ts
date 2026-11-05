import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, TOKEN_HEADER } from './client';

const config = { baseUrl: 'http://127.0.0.1:4321', token: 'secret' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createApiClient', () => {
  it('calls the base URL with the token header', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ status: 'ok', version: '0.0.1' }));

    await createApiClient(config, fetchFn).getHealth();

    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:4321/api/health', {
      headers: { [TOKEN_HEADER]: 'secret' },
    });
  });

  it('returns the typed health response', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ status: 'ok', version: '0.0.1' }));

    const health = await createApiClient(config, fetchFn).getHealth();

    expect(health).toEqual({ status: 'ok', version: '0.0.1' });
  });

  it('throws ApiError with the status on a non-2xx response', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json({ title: 'no' }, 401));

    const error = await createApiClient(config, fetchFn)
      .getHealth()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });
});
