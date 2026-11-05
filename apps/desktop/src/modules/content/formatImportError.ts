import type { ImportError } from '../../shared/api/types';

/** "Satır 14 · items[2].meaning: Eksik alan: meaning"; without a line or a path those parts are left out. */
export function formatImportError({ path, line, message }: ImportError): string {
  const where = path
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce(
      (text, segment) =>
        /^\d+$/.test(segment) ? `${text}[${segment}]` : text ? `${text}.${segment}` : segment,
      '',
    );
  const text = where ? `${where}: ${message}` : message;
  return line === null ? text : `Satır ${line} · ${text}`;
}
