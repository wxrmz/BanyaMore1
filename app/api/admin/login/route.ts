import { NextResponse } from 'next/server';
import {
  authenticateAdminCredentials,
  clearFailedLogins,
  getClientRateLimitKey,
  isAdminAuthConfigured,
  isLoginRateLimited,
  isSameOriginRequest,
  recordFailedLogin,
  setAdminSessionCookie,
} from '@/lib/adminAuth';
import { getAdminAccess } from '@/lib/adminRoles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Forbidden.' }, { status: 403 });
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ ok: false, message: 'Admin authentication is not configured.' }, { status: 503 });
  }

  const rateLimitKey = getClientRateLimitKey(request);

  if (isLoginRateLimited(rateLimitKey)) {
    return NextResponse.json({ ok: false, message: 'Too many login attempts.' }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Некорректный JSON.' }, { status: 400 });
  }

  const login = typeof body === 'object' && body !== null && 'login' in body ? body.login : null;
  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : null;
  const remember = typeof body === 'object' && body !== null && 'remember' in body && body.remember === true;

  const identity =
    typeof login === 'string' && typeof password === 'string'
      ? authenticateAdminCredentials(login, password)
      : null;

  if (!identity) {
    recordFailedLogin(rateLimitKey);
    return NextResponse.json({ ok: false, message: 'Неверный логин или пароль.' }, { status: 401 });
  }

  clearFailedLogins(rateLimitKey);
  await setAdminSessionCookie(identity, remember);

  return NextResponse.json({
    ok: true,
    role: identity.role,
    access: getAdminAccess(identity.role),
  });
}
