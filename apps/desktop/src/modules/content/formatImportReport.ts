import type { ImportReport } from '../../shared/api/types';

/** "Konu: 2 öğe eklendi, 0 öğe zaten vardı." A post import counts drafts. */
export function formatImportReport({ type, topic, added, skipped }: ImportReport): string {
  const noun = type === 'post' ? 'taslak' : 'öğe';
  return `${topic}: ${added} ${noun} eklendi, ${skipped} ${noun} zaten vardı.`;
}
