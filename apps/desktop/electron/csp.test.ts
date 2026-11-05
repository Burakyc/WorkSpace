import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp';

const productionPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https://i.ytimg.com https://avatars.githubusercontent.com; " +
  "connect-src http://127.0.0.1:*; object-src 'none'; base-uri 'none'";

const directive = (policy: string, name: string) =>
  policy.split('; ').find((d) => d.startsWith(`${name} `));

describe('buildCsp', () => {
  it('returns the production policy from the spec', () => {
    const policy = buildCsp('production');

    expect(policy).toBe(productionPolicy);
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain('ws:');
    expect(policy).not.toContain('localhost');
  });

  it('adds only the hot-reload sources in development', () => {
    const policy = buildCsp('development');

    expect(policy).toBe(
      productionPolicy
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace(
          'connect-src http://127.0.0.1:*',
          'connect-src http://127.0.0.1:* ws://localhost:* http://localhost:*',
        ),
    );
  });

  it.each(['development', 'production'] as const)('locks down objects and base in %s', (mode) => {
    const policy = buildCsp(mode);

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
  });
});
