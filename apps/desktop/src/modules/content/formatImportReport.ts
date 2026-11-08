import type { ImportReport } from '../../shared/api/types';

/** "Konu: 2 öğe eklendi, 0 öğe zaten vardı." */
export function formatImportReport({ topic, added, skipped }: ImportReport): string {
  return `${topic}: ${added} öğe eklendi, ${skipped} öğe zaten vardı.`;
}
