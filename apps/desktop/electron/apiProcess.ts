import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { dirname } from 'node:path';
import { TOKEN_HEADER } from '../src/shared/api/client';

export interface ApiHandle {
  baseUrl: string;
  token: string;
  stop(): void;
}

export interface StartApiOptions {
  exePath: string;
  /** The renderer's origin for CORS: the Vite dev server origin, or 'null' for file://. */
  origin: string;
  /** Absolute data folder, passed as DEVPATH_DATA_DIR. */
  dataDir: string;
  development: boolean;
  timeoutMs?: number;
}

// ponytail: the port can be taken between close() and the API binding it; start-up then fails with the error window.
export async function findFreePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  server.close();
  await once(server, 'close');
  if (address === null || typeof address === 'string') {
    throw new Error('Boş port bulunamadı.');
  }
  return address.port;
}

export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface HealthWaitOptions {
  timeoutMs: number;
  intervalMs?: number;
  fetchFn?: typeof fetch;
  /** Settles when the API process exits; waiting then fails at once. */
  exited?: Promise<unknown>;
}

export async function waitForHealth(
  baseUrl: string,
  token: string,
  { timeoutMs, intervalMs = 200, fetchFn = fetch, exited }: HealthWaitOptions,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let done = false;

  const isHealthy = async (): Promise<boolean> => {
    try {
      const response = await fetchFn(`${baseUrl}/api/health`, {
        headers: { [TOKEN_HEADER]: token },
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const poll = async (): Promise<void> => {
    while (!done) {
      if (await isHealthy()) {
        return;
      }
      if (Date.now() >= deadline) {
        throw new Error(`API ${timeoutMs / 1000} saniye içinde yanıt vermedi.`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  };

  const failOnExit = new Promise<never>((_, reject) => {
    void exited?.then(() => reject(new Error('API süreci beklenmedik şekilde kapandı.')));
  });

  try {
    await Promise.race([poll(), failOnExit]);
  } finally {
    done = true;
  }
}

export async function startApi({
  exePath,
  origin,
  dataDir,
  development,
  timeoutMs = 10_000,
}: StartApiOptions): Promise<ApiHandle> {
  const port = await findFreePort();
  const token = createToken();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(exePath, [], {
    // The API reads appsettings.json (AllowedHosts) from its working directory.
    cwd: dirname(exePath),
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: development ? 'Development' : 'Production',
      DEVPATH_PORT: String(port),
      DEVPATH_TOKEN: token,
      DEVPATH_ORIGIN: origin,
      DEVPATH_DATA_DIR: dataDir,
      DEVPATH_PARENT_PID: String(process.pid),
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  const exited = new Promise((resolve) => {
    child.once('exit', resolve);
    child.once('error', resolve);
  });
  const stop = (): void => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  };

  try {
    await waitForHealth(baseUrl, token, { timeoutMs, exited });
  } catch (error) {
    stop();
    throw error;
  }

  return { baseUrl, token, stop };
}
