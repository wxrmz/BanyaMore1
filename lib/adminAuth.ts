import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const ADMIN_LOGIN = 'tolamr2005';
const ADMIN_PASSWORD = 'molostova2005';
const COOKIE_NAME = 'banyamore-admin-session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const sign = (value: string) => createHmac('sha256', ADMIN_PASSWORD).update(value).digest('hex');

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const validateAdminCredentials = (login: string, password: string) =>
  safeEqual(login, ADMIN_LOGIN) && safeEqual(password, ADMIN_PASSWORD);

const createSessionValue = () => {
  const payload = Buffer.from(
    JSON.stringify({
      login: ADMIN_LOGIN,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
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
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      login?: string;
      expiresAt?: number;
    };

    return session.login === ADMIN_LOGIN && typeof session.expiresAt === 'number' && session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

export async function hasAdminSession() {
  const cookieStore = await cookies();

  return isValidAdminSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: createSessionValue(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
