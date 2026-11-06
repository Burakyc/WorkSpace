const labels: Readonly<Record<string, string>> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

/** Turkish names of the lesson and interview levels; CEFR levels (B2) stay as they are. */
export function levelLabel(level: string): string {
  return labels[level] ?? level;
}
