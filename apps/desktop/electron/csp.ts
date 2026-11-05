export type CspMode = 'development' | 'production';

const production: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https://i.ytimg.com', 'https://avatars.githubusercontent.com'],
  'connect-src': ['http://127.0.0.1:*'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
};

// Only what the Vite dev server needs for hot reload: the inline React Refresh preamble and its socket.
const developmentAdditions: Record<string, string[]> = {
  'script-src': ["'unsafe-inline'"],
  'connect-src': ['ws://localhost:*', 'http://localhost:*'],
};

export function buildCsp(mode: CspMode): string {
  return Object.entries(production)
    .map(([directive, sources]) => {
      const extra = mode === 'development' ? (developmentAdditions[directive] ?? []) : [];
      return `${directive} ${[...sources, ...extra].join(' ')}`;
    })
    .join('; ');
}
