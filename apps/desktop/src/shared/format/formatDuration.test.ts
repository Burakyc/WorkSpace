import { describe, expect, it } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it.each([
    [0, '0 dk'],
    [45, '45 dk'],
    [60, '1 sa'],
    [120, '2 sa'],
    [125, '2 sa 5 dk'],
  ])('%i minutes → %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});
