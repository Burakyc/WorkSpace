import { describe, expect, it } from 'vitest';
import { levelLabel } from './levelLabel';

describe('levelLabel', () => {
  it('names the levels in Turkish and keeps CEFR levels', () => {
    expect(['beginner', 'intermediate', 'advanced', 'B2'].map(levelLabel)).toEqual([
      'Başlangıç',
      'Orta',
      'İleri',
      'B2',
    ]);
  });
});
