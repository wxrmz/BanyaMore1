import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const ADMIN_LOGIN = process.env.ADMIN_LOGIN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const COOKIE_NAME = 'banyamore-admin-session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const REMEMBERED_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const requireAdminConfig = () => {
  if (!ADMIN_LOGIN || !ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) {
    throw new Error('Admin authentication is not configured.');
  }

  return {
    login: ADMIN_LOGIN,
    password: ADMIN_PASSWORD,
    sessionSecret: ADMIN_SESSION_SECRET,
  };
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

export const isAdminAuthConfigured = () => Boolean(ADMIN_LOGIN && ADMIN_PASSWORD && ADMIN_SESSION_SECRET);

export const validateAdminCredentials = (login: string, password: string) => {
  const config = requireAdminConfig();

  return safeEqual(login, config.login) && safeEqual(password, config.password);
};

export const isLoginRateLimited = (key: string) => {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    return false;
  }

  return attempt.count >= LOGIN_MAX_ATTEMPTS;
};

export const recordFailedLogin = (key: string) => {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  attempt.count += 1;
};

export const clearFailedLogins = (key: string) => {
  loginAttempts.delete(key);
};

export const isSameOriginRequest = (request: Request) => {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  const expectedOrigin =
    requestUrl.hostname === '0.0.0.0' && host
      ? `${requestUrl.protocol}//${host}`
      : requestUrl.origin;

  if (origin) {
    return origin === expectedOrigin;
  }

  const referer = request.headers.get('referer');

  if (!referer) {
    return true;
  }

  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
};

export const getClientRateLimitKey = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const userAgent = request.headers.get('user-agent')?.slice(0, 120) ?? 'unknown';

  return `${forwardedFor || realIp || 'local'}:${userAgent}`;
};

const createSessionValue = (maxAgeSeconds: number) => {
  const { login } = requireAdminConfig();
  const payload = Buffer.from(
    JSON.stringify({
      login,
      expiresAt: Date.now() + maxAgeSeconds * 1000,
    }),
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
};

export const isValidAdminSession = (sessionValue: string | undefined) => {
  if (!sessionValue) {
    return false;
  }

  const [payload, signature] = sessionValue.split('.');

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return false;
  }

  try {
    const { login } = requireAdminConfig();
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      login?: string;
      expiresAt?: number;
    };

    return session.login === login && typeof session.expiresAt === 'number' && session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

export async function hasAdminSession() {
  const cookieStore = await cookies();

  return isValidAdminSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setAdminSessionCookie(remember = false) {
  const cookieStore = await cookies();
  const maxAge = remember ? REMEMBERED_SESSION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;

  cookieStore.set({
    name: COOKIE_NAME,
    value: createSessionValue(maxAge),
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
