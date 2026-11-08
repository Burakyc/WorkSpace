import type { AiProviderInfo } from '../../shared/api/types';

/** A rough, safe side count; the real number comes from the provider after the call. */
const CHARACTERS_PER_TOKEN = 3;

/** The most a prompt should cost: all its tokens at the input price, and a full answer at the output price. */
export function estimateMaxCost(promptLength: number, provider: AiProviderInfo): number {
  const inputTokens = Math.ceil(promptLength / CHARACTERS_PER_TOKEN);
  return (
    (inputTokens * provider.inputPerMillion +
      provider.maxOutputTokens * provider.outputPerMillion) /
    1_000_000
  );
}

/** "$0,33"; under a cent keeps four decimals, so a small call does not read as free. */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: amount > 0 && amount < 0.01 ? 4 : 2,
  }).format(amount);
}

export function formatTokens(count: number): string {
  return new Intl.NumberFormat('tr-TR').format(count);
}
