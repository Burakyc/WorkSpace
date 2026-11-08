import type { AiMode, AiModule, ContentType } from '../../shared/api/types';

/** The rows of Ayarlar → "Yapay zekâ modları". */
export const AI_MODULES: readonly { id: AiModule; label: string }[] = [
  { id: 'english', label: 'İngilizce' },
  { id: 'learning', label: 'Öğrenme' },
  { id: 'interview', label: 'Mülakat' },
  { id: 'posts', label: 'Gönderiler' },
];

export const AI_MODES: readonly { id: AiMode; label: string }[] = [
  { id: 'copyPaste', label: 'Kopyala-yapıştır' },
  { id: 'file', label: 'Dosyadan içe aktar' },
  { id: 'api', label: 'API' },
];

/** The module whose mode applies to a content type's topic list. */
export const AI_MODULE_OF_TYPE: Readonly<Record<ContentType, AiModule>> = {
  vocab: 'english',
  lesson: 'learning',
  interview: 'interview',
  post: 'posts',
};
