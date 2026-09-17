import { mkdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * Sessions closed with "Выйти" are remembered until their natural expiry,
 * so a copied cookie stops working after logout (also across restarts).
 */
const revokedPath = path.join(process.cwd(), 'data', 'admin-revoked-sessions.json');
const MAX_REVOKED = 5_000;

const globalState = globalThis as typeof globalThis & {
  __banyaMoreRevokedSessions?: Map<string, number>;
};

const load = () => {
  const revoked = new Map<string, number>();
  try {
    const raw = JSON.parse(readFileSync(revokedPath, 'utf8')) as Record<string, unknown>;
    const now = Date.now();
    for (const [sid, expiresAt] of Object.entries(raw)) {
      if (typeof expiresAt === 'number' && expiresAt > now) revoked.set(sid, expiresAt);
    }
  } catch {
    // No file yet or unreadable: start empty.
  }
  return revoked;
};

const revoked = globalState.__banyaMoreRevokedSessions ?? load();
globalState.__banyaMoreRevokedSessions = revoked;

const prune = () => {
  const now = Date.now();
  for (const [sid, expiresAt] of revoked) {
    if (expiresAt <= now) revoked.delete(sid);
  }
  while (revoked.size > MAX_REVOKED) {
    const oldest = revoked.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    revoked.delete(oldest);
  }
};

export const isSessionRevoked = (sid: string) => {
  const expiresAt = revoked.get(sid);
  return expiresAt !== undefined && expiresAt > Date.now();
};

export async function revokeSession(sid: string, expiresAt: number) {
  if (!sid || expiresAt <= Date.now()) return;
  revoked.set(sid, expiresAt);
  prune();
  try {
    mkdirSync(path.dirname(revokedPath), { recursive: true });
    await writeFile(revokedPath, `${JSON.stringify(Object.fromEntries(revoked))}\n`, 'utf8');
  } catch {
    // Memory still blocks the session in this process.
  }
}
