import type { VocabItem } from '../../shared/api/types';

/** Cards to practise: "Tekrar et" ones first, then unmarked ones, each in added order. Known cards are left out. */
export function practiceQueue(items: readonly VocabItem[]): VocabItem[] {
  return [...items.filter((item) => item.mark === 'repeat'), ...items.filter((item) => !item.mark)];
}
