/** The same rules as Tags.cs in the API: "#DI " → "di", "EF Core" → "ef-core", "#İngilizce" → "ingilizce". */
export const MAX_TAGS = 10;
export const TAG_RULE =
  'Etiketler en fazla 30 karakter olabilir ve yalnızca harf, rakam, - ve _ içerebilir.';
export const TOO_MANY_TAGS = 'En fazla 10 etiket eklenebilir.';

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .trim()
    .replace(/İ/g, 'i')
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/\s+/g, '-');
}

export function isValidTag(tag: string): boolean {
  return /^[\p{L}\p{N}_-]{1,30}$/u.test(tag);
}
