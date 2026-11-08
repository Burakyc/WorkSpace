import type { SecretName } from '../src/shared/api/types';

/** The only secrets the page may set; anything else is refused. */
export const SECRET_NAMES: readonly SecretName[] = [
  'githubToken',
  'anthropicApiKey',
  'geminiApiKey',
];

export function isSecretName(value: unknown): value is SecretName {
  return typeof value === 'string' && (SECRET_NAMES as readonly string[]).includes(value);
}

/** 1–255 characters without whitespace (tokens never have any). */
export function isValidSecretValue(value: unknown): value is string {
  return typeof value === 'string' && /^\S{1,255}$/.test(value);
}

/** File access and OS encryption, injected so the store can be tested without Electron. */
export interface SecretStoreDeps {
  /** The file's text, or null when it does not exist. */
  read(): string | null;
  /** Replaces the file atomically. */
  write(text: string): void;
  encrypt(plain: string): Buffer;
  decrypt(encrypted: Buffer): string;
  available(): boolean;
}

export interface SecretStore {
  has(name: SecretName): boolean;
  /** The decrypted value, for main only (never sent to the page). */
  get(name: SecretName): string | undefined;
  set(name: SecretName, value: string): void;
  clear(name: SecretName): void;
}

type Stored = Partial<Record<SecretName, string>>;

/**
 * Secrets encrypted with Electron safeStorage in userData/secrets.bin:
 * `{ "schemaVersion": 1, "secrets": { "<name>": "<base64 of the encrypted value>" } }`.
 */
export function createSecretStore(deps: SecretStoreDeps): SecretStore {
  function load(): Stored {
    try {
      const text = deps.read();
      if (text === null) return {};
      const parsed = JSON.parse(text) as { secrets?: unknown };
      const secrets = parsed.secrets;
      if (typeof secrets !== 'object' || secrets === null) return {};
      return Object.fromEntries(
        Object.entries(secrets).filter(
          ([name, value]) => isSecretName(name) && typeof value === 'string',
        ),
      ) as Stored;
    } catch {
      return {};
    }
  }

  function save(secrets: Stored): void {
    deps.write(JSON.stringify({ schemaVersion: 1, secrets }, null, 2));
  }

  return {
    has: (name) => load()[name] !== undefined,
    get: (name) => {
      const encrypted = load()[name];
      if (encrypted === undefined) return undefined;
      try {
        return deps.decrypt(Buffer.from(encrypted, 'base64'));
      } catch {
        // Encrypted by another Windows user or machine: treat as not set.
        return undefined;
      }
    },
    set: (name, value) => {
      if (!deps.available()) {
        throw new Error('Bu bilgisayarda güvenli depolama kullanılamıyor.');
      }
      save({ ...load(), [name]: deps.encrypt(value).toString('base64') });
    },
    clear: (name) => {
      const secrets = load();
      if (secrets[name] === undefined) return;
      delete secrets[name];
      save(secrets);
    },
  };
}
