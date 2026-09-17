import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { isSameOriginRequest as matchesAdminOrigin } from './adminRequestOrigin';
import type { AdminRole } from './adminRoles';
import { getClientIp } from './clientIp';
import { isSessionRevoked, revokeSession } from './adminSessionRevocation';

const COOKIE_NAME = 'banyamore-admin-session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const REMEMBERED_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_MAX_TRACKED_KEYS = 10_000;
const MIN_PRODUCTION_SESSION_SECRET_LENGTH = 32;
const MIN_PRODUCTION_PASSWORD_LENGTH = 12;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export type AdminIdentity = {
  login: string;
  role: AdminRole;
};

type AdminAccount = AdminIdentity & { password: string };

const isAdminRole = (value: unknown): value is AdminRole =>
  value === 'admin' || value === 'owner' || value === 'director';

const additionalAccounts = (): AdminAccount[] => {
  const raw = process.env.ADMIN_USERS_JSON?.trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('ADMIN_USERS_JSON must be an array.');

  return parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid admin account.');
    const account = value as { login?: unknown; password?: unknown; role?: unknown };
    if (
      typeof account.login !== 'string'
      || typeof account.password !== 'string'
      || !account.login.trim()
      || !account.password
      || !isAdminRole(account.role)
    ) {
      throw new Error('Invalid admin account.');
    }
    return { login: account.login.trim(), password: account.password, role: account.role };
  });
};

const requireAdminConfig = () => {
  const configured = [
    {
      role: 'admin' as const,
      login: process.env.ADMIN_ADMIN_LOGIN?.trim() ?? '',
      password: process.env.ADMIN_ADMIN_PASSWORD ?? '',
    },
    {
      role: 'owner' as const,
      login: process.env.ADMIN_OWNER_LOGIN?.trim() ?? '',
      password: process.env.ADMIN_OWNER_PASSWORD ?? '',
    },
    {
      role: 'director' as const,
      login: process.env.ADMIN_DIRECTOR_LOGIN?.trim() ?? '',
      password: process.env.ADMIN_DIRECTOR_PASSWORD ?? '',
    },
  ];
  const partiallyConfigured = configured.some((account) => Boolean(account.login) !== Boolean(account.password));
  const accounts: AdminAccount[] = [
    ...configured.filter((account) => account.login && account.password),
    ...additionalAccounts(),
  ];
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? '';

  if (
    !sessionSecret ||
    (process.env.NODE_ENV === 'production' && sessionSecret.length < MIN_PRODUCTION_SESSION_SECRET_LENGTH) ||
    partiallyConfigured ||
    !accounts.length ||
    (process.env.NODE_ENV === 'production' && accounts.some((account) => account.password.length < MIN_PRODUCTION_PASSWORD_LENGTH)) ||
    new Set(accounts.map((account) => account.login)).size !== accounts.length
  ) {
    throw new Error('Admin authentication is not configured.');
  }

  return { accounts, sessionSecret };
};

const sign = (value: string) => {
  const { sessionSecret } = requireAdminConfig();

  return createHmac('sha256', sessionSecret).update(value).digest('hex');
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const isAdminAuthConfigured = () => {
  try {
    requireAdminConfig();
    return true;
  } catch {
    return false;
  }
};

export const isSameOriginRequest = (request: Request) =>
  matchesAdminOrigin(request, process.env.ADMIN_PUBLIC_ORIGIN?.trim());

export const authenticateAdminCredentials = (login: string, password: string): AdminIdentity | null => {
  const config = requireAdminConfig();

  for (const account of config.accounts) {
    const loginMatches = safeEqual(login, account.login);
    const passwordMatches = safeEqual(password, account.password);

    if (loginMatches && passwordMatches) {
      return { login: account.login, role: account.role };
    }
  }

  return null;
};

export const validateAdminCredentials = (login: string, password: string) =>
  authenticateAdminCredentials(login, password) !== null;

export const isLoginRateLimited = (key: string) => {
  const now = Date.now();
  pruneLoginAttempts(now);
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    return false;
  }

  return attempt.count >= LOGIN_MAX_ATTEMPTS;
};

export const recordFailedLogin = (key: string) => {
  const now = Date.now();
  pruneLoginAttempts(now);
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  attempt.count += 1;
};

const pruneLoginAttempts = (now: number) => {
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(key);
  }

  if (loginAttempts.size <= LOGIN_MAX_TRACKED_KEYS) return;

  const excess = loginAttempts.size - LOGIN_MAX_TRACKED_KEYS;
  let removed = 0;
  for (const key of loginAttempts.keys()) {
    loginAttempts.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
};

export const clearFailedLogins = (key: string) => {
  loginAttempts.delete(key);
};

export const getClientRateLimitKey = (request: Request) => getClientIp(request);

const createSessionValue = (identity: AdminIdentity, maxAgeSeconds: number) => {
  const payload = Buffer.from(
    JSON.stringify({
      login: identity.login,
      role: identity.role,
      sid: randomUUID(),
      expiresAt: Date.now() + maxAgeSeconds * 1000,
    }),
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
};

type SessionPayload = {
  login?: string;
  role?: AdminRole;
  sid?: string;
  expiresAt?: number;
};

const readSignedSession = (sessionValue: string | undefined): SessionPayload | null => {
  if (!sessionValue) return null;

  try {
    const [payload, signature] = sessionValue.split('.');

    if (!payload || !signature || !safeEqual(signature, sign(payload))) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
};

export const getAdminSessionFromValue = (sessionValue: string | undefined): AdminIdentity | null => {
  try {
    const session = readSignedSession(sessionValue);
    if (!session) return null;

    if (typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
      return null;
    }

    if (typeof session.sid !== 'string' || !session.sid || isSessionRevoked(session.sid)) {
      return null;
    }

    const { accounts } = requireAdminConfig();
    const account = accounts.find(
      (candidate) => candidate.login === session.login && candidate.role === session.role,
    );

    return account ? { login: account.login, role: account.role } : null;
  } catch {
    return null;
  }
};

export const isValidAdminSession = (sessionValue: string | undefined) =>
  getAdminSessionFromValue(sessionValue) !== null;

export async function getAdminSession() {
  const cookieStore = await cookies();

  return getAdminSessionFromValue(cookieStore.get(COOKIE_NAME)?.value);
}

export async function hasAdminSession() {
  return (await getAdminSession()) !== null;
}

export async function setAdminSessionCookie(identity: AdminIdentity, remember = false) {
  const cookieStore = await cookies();
  const maxAge = remember ? REMEMBERED_SESSION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;

  cookieStore.set({
    name: COOKIE_NAME,
    value: createSessionValue(identity, maxAge),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge } : {}),
    priority: 'high',
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  const session = readSignedSession(cookieStore.get(COOKIE_NAME)?.value);

  if (session && typeof session.sid === 'string' && typeof session.expiresAt === 'number') {
    await revokeSession(session.sid, session.expiresAt);
  }

  cookieStore.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
