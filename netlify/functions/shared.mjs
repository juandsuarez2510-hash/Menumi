import { randomUUID, randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '@netlify/database';

export const db = getDatabase();
const SESSION_COOKIE = 'menumi.sid';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const accounts = [
  { username: 'Juan suarez', passwordEnv: 'ADMIN_JUAN_SUAREZ_PASSWORD' },
  { username: 'Juan puentes', passwordEnv: 'ADMIN_JUAN_PUENTES_PASSWORD' },
];

export function jsonResponse(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}

export function normalizeUsername(value) {
  return String(value || '').trim().toLocaleLowerCase('es-CO');
}

export function originIsAllowed(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function ensureAdminAccounts() {
  for (const account of accounts) {
    const password = process.env[account.passwordEnv];
    if (!password) throw new Error(`Falta el secreto ${account.passwordEnv}.`);

    const usernameNormalized = normalizeUsername(account.username);
    const existing = await db.sql`SELECT id FROM admins WHERE username_normalized = ${usernameNormalized} LIMIT 1`;
    if (existing.length) continue;

    const passwordHash = await bcrypt.hash(password, 12);
    await db.sql`
      INSERT INTO admins (id, username, username_normalized, password_hash, role, is_active)
      VALUES (${randomUUID()}, ${account.username}, ${usernameNormalized}, ${passwordHash}, 'admin', TRUE)
      ON CONFLICT (username_normalized) DO NOTHING
    `;
  }
}

const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

export async function createSession(user, request) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.sql`
    INSERT INTO admin_sessions (token_hash, admin_id, expires_at)
    VALUES (${hashSessionToken(token)}, ${user.id}, ${expiresAt})
  `;
  const secure = new URL(request.url).protocol === 'https:';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`;
}

export async function readSession(request) {
  const rawCookie = request.headers.get('cookie') || '';
  const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;

  const token = cookie.slice(SESSION_COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const sessions = await db.sql`
    SELECT a.id, a.username, a.role
    FROM admin_sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ${hashSessionToken(token)}
      AND s.expires_at > NOW()
      AND a.is_active = TRUE
    LIMIT 1
  `;
  return sessions[0] ? { id: String(sessions[0].id), username: sessions[0].username, role: sessions[0].role } : null;
}

export async function clearSession(request) {
  const rawCookie = request.headers.get('cookie') || '';
  const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (cookie) {
    const token = cookie.slice(SESSION_COOKIE.length + 1);
    if (/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      await db.sql`DELETE FROM admin_sessions WHERE token_hash = ${hashSessionToken(token)}`;
    }
  }
  await db.sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`;
  const secure = new URL(request.url).protocol === 'https:';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function publicUser(user) {
  return {
    id: String(user.id),
    username: user.username,
    role: user.role,
    active: user.is_active !== false,
  };
}
