import { describe, expect, it } from 'vitest';
import type { VocabItem } from '../../shared/api/types';
import { practiceQueue } from './practiceQueue';

const card = (id: string, mark?: VocabItem['mark']): VocabItem => ({
  id,
  addedAt: '2026-11-06T09:00:00Z',
  term: id,
  meaning: 'm',
  example: 'e',
  ...(mark ? { mark } : {}),
});

describe('practiceQueue', () => {
  it('puts repeat cards first, then unmarked ones, and leaves known ones out', () => {
    const queue = practiceQueue([
      card('a'),
      card('b', 'known'),
      card('c', 'repeat'),
      card('d'),
      card('e', 'repeat'),
    ]);

    expect(queue.map((item) => item.id)).toEqual(['c', 'e', 'a', 'd']);
  });

  it('is empty when every card is known', () => {
    expect(practiceQueue([card('a', 'known')])).toEqual([]);
  });
});
