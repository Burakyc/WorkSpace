import { describe, expect, it } from 'vitest';
import {
  createSecretStore,
  isSecretName,
  isValidSecretValue,
  type SecretStoreDeps,
} from './secrets';

const TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';

/** An in-memory file and a reversible stand-in for safeStorage. */
function fakeDeps(available = true) {
  const file: { text: string | null } = { text: null };
  const deps: SecretStoreDeps = {
    read: () => file.text,
    write: (text) => {
      file.text = text;
    },
    encrypt: (plain) => Buffer.from(`enc:${[...plain].reverse().join('')}`),
    decrypt: (encrypted) => [...encrypted.toString().slice(4)].reverse().join(''),
    available: () => available,
  };
  return { file, deps };
}

describe('createSecretStore', () => {
  it('saves, reads and clears a secret without keeping the plain value', () => {
    const { file, deps } = fakeDeps();
    const store = createSecretStore(deps);
    expect(store.has('githubToken')).toBe(false);

    store.set('githubToken', TOKEN);

    expect(store.has('githubToken')).toBe(true);
    expect(store.get('githubToken')).toBe(TOKEN);
    expect(file.text).not.toContain(TOKEN);
    expect(JSON.parse(file.text ?? '')).toMatchObject({ schemaVersion: 1 });

    store.clear('githubToken');
    expect(store.has('githubToken')).toBe(false);
    expect(store.get('githubToken')).toBeUndefined();
  });

  it('refuses to save without OS encryption', () => {
    const { file, deps } = fakeDeps(false);

    expect(() => createSecretStore(deps).set('githubToken', TOKEN)).toThrow(
      'Bu bilgisayarda güvenli depolama kullanılamıyor.',
    );
    expect(file.text).toBeNull();
  });

  it('treats a broken file or an undecryptable value as empty', () => {
    const { file, deps } = fakeDeps();
    file.text = '{ not json';
    expect(createSecretStore(deps).has('githubToken')).toBe(false);

    file.text = JSON.stringify({ schemaVersion: 1, secrets: { githubToken: 'x', other: 'y' } });
    const store = createSecretStore({
      ...deps,
      decrypt: () => {
        throw new Error('other user');
      },
    });
    expect(store.get('githubToken')).toBeUndefined();
  });
});

describe('secret arguments', () => {
  it('allows only known names and values without whitespace', () => {
    expect(isSecretName('githubToken')).toBe(true);
    expect(isSecretName('openAiKey')).toBe(false);
    expect(isSecretName(1)).toBe(false);
    expect(isValidSecretValue(TOKEN)).toBe(true);
    expect(isValidSecretValue('')).toBe(false);
    expect(isValidSecretValue('has space')).toBe(false);
    expect(isValidSecretValue('x'.repeat(256))).toBe(false);
    expect(isValidSecretValue(null)).toBe(false);
  });
});
