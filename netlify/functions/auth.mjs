import bcrypt from 'bcryptjs';
import {
  clearSession,
  createSession,
  db,
  ensureAdminAccounts,
  jsonResponse,
  normalizeUsername,
  originIsAllowed,
  readSession,
} from './shared.mjs';

export default async function handler(request) {
  const path = new URL(request.url).pathname;

  if (path === '/api/auth/login' && request.method === 'POST') {
    if (!originIsAllowed(request)) return jsonResponse({ error: 'Origen no permitido.' }, 403);
    if (Number(request.headers.get('content-length') || 0) > 12_288) {
      return jsonResponse({ error: 'La solicitud es demasiado grande.' }, 413);
    }

    try {
      const body = await request.json();
      const usernameNormalized = normalizeUsername(body?.username);
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!usernameNormalized || !password || password.length > 256) {
        return jsonResponse({ error: 'Escribe tu usuario y contraseña.' }, 400);
      }

      await ensureAdminAccounts();
      const rows = await db.sql`
        SELECT id, username, password_hash, role
        FROM admins
        WHERE username_normalized = ${usernameNormalized} AND is_active = TRUE
        LIMIT 1
      `;
      const account = rows[0];
      const passwordMatches = account && await bcrypt.compare(password, account.password_hash);
      if (!passwordMatches) return jsonResponse({ error: 'Usuario o contraseña incorrectos.' }, 401);

      await db.sql`UPDATE admins SET last_login_at = NOW() WHERE id = ${account.id}`;
      const user = { id: String(account.id), username: account.username, role: account.role };
      return jsonResponse({ user }, 200, { 'Set-Cookie': createSession(user, request) });
    } catch (error) {
      console.error('Menumi login failed:', error.message);
      return jsonResponse({ error: 'No fue posible iniciar sesión. Intenta de nuevo.' }, 500);
    }
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await readSession(request);
    return user
      ? jsonResponse({ user: { id: user.id, username: user.username, role: user.role } })
      : jsonResponse({ error: 'Sesión no iniciada.' }, 401);
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    if (!originIsAllowed(request)) return jsonResponse({ error: 'Origen no permitido.' }, 403);
    try {
      const cookie = await clearSession(request);
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie },
      });
    } catch (error) {
      console.error('Menumi logout failed:', error.message);
      return jsonResponse({ error: 'No fue posible cerrar sesión.' }, 500);
    }
  }

  return jsonResponse({ error: 'Ruta no encontrada.' }, 404);
}

export const config = {
  path: '/api/auth/*',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 8, windowSize: 60 },
};
