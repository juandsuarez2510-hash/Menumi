import bcrypt from 'bcryptjs';
import {
  clearSession,
  createSession,
  db,
  ensureAdminAccounts,
  jsonResponse,
  normalizeUsername,
  originIsAllowed,
  publicUser,
  readSession,
} from './shared.mjs';

const normalizeList = (value, allowed) => Array.isArray(value)
  ? [...new Set(value.filter((item) => typeof item === 'string' && allowed.includes(item)))]
  : [];

const cuisines = ['Colombiana', 'Coreana', 'Japonesa', 'China', 'Peruana', 'Tailandesa', 'Fusión asiática'];
const diets = ['Vegetariana', 'Vegana', 'Sin gluten', 'Sin lácteos', 'Sin cerdo', 'Alergia: maní', 'Alergia: mariscos'];

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
        SELECT id, username, full_name, email, password_hash, role, favorite_cuisines,
          dietary_preferences, spice_level, profile_notes, is_active
        FROM users
        WHERE (username_normalized = ${usernameNormalized} OR email_normalized = ${usernameNormalized})
          AND is_active = TRUE
        LIMIT 1
      `;
      const account = rows[0];
      const passwordMatches = account && await bcrypt.compare(password, account.password_hash);
      if (!passwordMatches) return jsonResponse({ error: 'Usuario o contraseña incorrectos.' }, 401);

      await db.sql`UPDATE users SET last_login_at = NOW() WHERE id = ${account.id}`;
      const user = publicUser(account);
      return jsonResponse({ user }, 200, { 'Set-Cookie': createSession(user, request) });
    } catch (error) {
      console.error('Menumi login failed:', error.message);
      return jsonResponse({ error: 'No fue posible iniciar sesión. Intenta de nuevo.' }, 500);
    }
  }

  if (path === '/api/auth/register' && request.method === 'POST') {
    if (!originIsAllowed(request)) return jsonResponse({ error: 'Origen no permitido.' }, 403);
    if (Number(request.headers.get('content-length') || 0) > 12_288) {
      return jsonResponse({ error: 'La solicitud es demasiado grande.' }, 413);
    }

    try {
      const body = await request.json();
      const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      const emailNormalized = normalizeUsername(email);
      if (fullName.length < 2 || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) {
        return jsonResponse({ error: 'Revisa tu nombre, correo y contraseña (mínimo 10 caracteres).' }, 400);
      }

      await ensureAdminAccounts();
      const passwordHash = await bcrypt.hash(password, 12);
      const favoriteCuisines = normalizeList(body?.favoriteCuisines, cuisines);
      const dietaryPreferences = normalizeList(body?.dietaryPreferences, diets);
      const spiceLevel = Number.isInteger(body?.spiceLevel) ? Math.max(0, Math.min(3, body.spiceLevel)) : 2;
      const profileNotes = typeof body?.profileNotes === 'string' ? body.profileNotes.trim().slice(0, 500) : '';
      const rows = await db.sql`
        INSERT INTO users (
          id, username, username_normalized, email, email_normalized, password_hash, role, is_active,
          full_name, favorite_cuisines, dietary_preferences, spice_level, profile_notes
        ) VALUES (
          ${randomUUID()}, ${fullName}, ${emailNormalized}, ${email}, ${emailNormalized}, ${passwordHash}, 'user', TRUE,
          ${fullName}, ${favoriteCuisines}, ${dietaryPreferences}, ${spiceLevel}, ${profileNotes}
        )
        ON CONFLICT (email_normalized) DO NOTHING
        RETURNING id, username, full_name, email, role, favorite_cuisines, dietary_preferences, spice_level, profile_notes, is_active
      `;
      if (!rows[0]) return jsonResponse({ error: 'Ya existe una cuenta con ese correo.' }, 409);

      const user = publicUser(rows[0]);
      await db.sql`UPDATE users SET last_login_at = NOW() WHERE id = ${rows[0].id}`;
      return jsonResponse({ user }, 201, { 'Set-Cookie': createSession(user, request) });
    } catch (error) {
      console.error('Menumi registration failed:', error.message);
      return jsonResponse({ error: 'No fue posible crear la cuenta. Intenta de nuevo.' }, 500);
    }
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await readSession(request);
    return user
      ? jsonResponse({ user })
      : jsonResponse({ error: 'Sesión no iniciada.' }, 401);
  }

  if (path === '/api/auth/profile') {
    if (!['GET', 'PUT'].includes(request.method)) return jsonResponse({ error: 'Método no permitido.' }, 405);
    const session = await readSession(request);
    if (!session) return jsonResponse({ error: 'Inicia sesión para continuar.' }, 401);
    if (request.method === 'GET') return jsonResponse({ user: session });
    if (!originIsAllowed(request)) return jsonResponse({ error: 'Origen no permitido.' }, 403);

    try {
      const body = await request.json();
      const favoriteCuisines = normalizeList(body?.favoriteCuisines, cuisines);
      const dietaryPreferences = normalizeList(body?.dietaryPreferences, diets);
      const spiceLevel = Number.isInteger(body?.spiceLevel) ? Math.max(0, Math.min(3, body.spiceLevel)) : 2;
      const profileNotes = typeof body?.profileNotes === 'string' ? body.profileNotes.trim().slice(0, 500) : '';
      const rows = await db.sql`
        UPDATE users
        SET favorite_cuisines = ${favoriteCuisines}, dietary_preferences = ${dietaryPreferences},
          spice_level = ${spiceLevel}, profile_notes = ${profileNotes}
        WHERE id = ${session.id}
        RETURNING id, username, full_name, email, role, favorite_cuisines, dietary_preferences, spice_level, profile_notes, is_active
      `;
      return jsonResponse({ user: publicUser(rows[0]) });
    } catch (error) {
      console.error('Menumi profile update failed:', error.message);
      return jsonResponse({ error: 'No fue posible guardar tus gustos.' }, 500);
    }
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
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 20, windowSize: 60 },
};
