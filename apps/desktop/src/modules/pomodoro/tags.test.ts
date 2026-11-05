import { describe, expect, it } from 'vitest';
import { isValidTag, normalizeTag } from './tags';

describe('normalizeTag', () => {
  it.each([
    [' #DI ', 'di'],
    ['##API', 'api'],
    ['#İngilizce', 'ingilizce'],
    ['clean   code', 'clean-code'],
    ['ef_core-8', 'ef_core-8'],
  ])('%j → %s', (raw, expected) => {
    expect(normalizeTag(raw)).toBe(expected);
    expect(isValidTag(normalizeTag(raw))).toBe(true);
  });

  it.each(['', '#', 'a/b', 'c#', 'a'.repeat(31)])('rejects %j', (raw) => {
    expect(isValidTag(normalizeTag(raw))).toBe(false);
  });
});
