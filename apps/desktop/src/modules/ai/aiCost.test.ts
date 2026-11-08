import { describe, expect, it } from 'vitest';
import type { AiProviderInfo } from '../../shared/api/types';
import { estimateMaxCost, formatTokens, formatUsd } from './aiCost';

const claude: AiProviderInfo = {
  id: 'claude',
  label: 'Claude Opus 5.5',
  model: 'claude-opus-5-5',
  inputPerMillion: 4,
  outputPerMillion: 20,
  maxOutputTokens: 16000,
  hasKey: true,
};

describe('estimateMaxCost', () => {
  it('counts a full answer and the prompt, rounding the tokens up', () => {
    expect(estimateMaxCost(0, claude)).toBeCloseTo(0.32);
    expect(estimateMaxCost(3000, claude)).toBeCloseTo(0.324);
    expect(estimateMaxCost(1, claude)).toBeCloseTo(0.320004);
  });
});

describe('formats', () => {
  it('writes dollars the Turkish way and keeps small costs visible', () => {
    expect(formatUsd(0.324)).toBe('$0,32');
    expect(formatUsd(4)).toBe('$4,00');
    expect(formatUsd(0.0012)).toBe('$0,0012');
    expect(formatUsd(0)).toBe('$0,00');
  });

  it('writes token counts with Turkish grouping', () => {
    expect(formatTokens(12345)).toBe('12.345');
  });
});
