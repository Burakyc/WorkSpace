import { describe, expect, it } from 'vitest';
import { highlightCSharp } from './highlight';

describe('highlightCSharp', () => {
  it('gives coloured tokens per line that join back to the code', async () => {
    const code = 'var x = 1;\npublic class A { }';

    const lines = await highlightCSharp(code);

    expect(lines.map((line) => line.map((t) => t.content).join('')).join('\n')).toBe(code);
    const keyword = lines[0]?.find((t) => t.content === 'var');
    expect(keyword?.light).toMatch(/^#/);
    expect(keyword?.dark).toMatch(/^#/);
    expect(keyword?.light).not.toBe(keyword?.dark);
  });
});
