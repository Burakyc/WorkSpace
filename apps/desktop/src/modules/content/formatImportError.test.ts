import { describe, expect, it } from 'vitest';
import { formatImportError } from './formatImportError';

describe('formatImportError', () => {
  it('shows the line and the path as written in JavaScript', () => {
    expect(
      formatImportError({ path: '/items/2/meaning', line: 14, message: 'Eksik alan: meaning' }),
    ).toBe('Satır 14 · items[2].meaning: Eksik alan: meaning');
  });

  it('leaves out a missing line or an empty path', () => {
    expect(formatImportError({ path: '/tags/0', line: null, message: 'x' })).toBe('tags[0]: x');
    expect(formatImportError({ path: '', line: 3, message: 'Geçerli JSON değil.' })).toBe(
      'Satır 3 · Geçerli JSON değil.',
    );
    expect(formatImportError({ path: '/a~1b~0c', line: null, message: 'x' })).toBe('a/b~c: x');
  });
});
