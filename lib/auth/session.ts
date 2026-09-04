import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionPayload } from './types';

const DEFAULT_FALLBACK_SECRET = 'maluzen-warehouse-default-fallback-auth-secret-key-32-bytes-minimum!';
const secretKey = process.env.AUTH_SECRET || DEFAULT_FALLBACK_SECRET;
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[SECURITY WARNING] AUTH_SECRET environment variable is not set in production. Using fallback secret.');
}
const key = new TextEncoder().encode(secretKey);

export const COOKIE_NAME = 'auth_token';
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt(payload);

  cookies().set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const session = cookies().get(COOKIE_NAME)?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function clearSession() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
