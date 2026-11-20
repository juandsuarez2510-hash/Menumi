import { db, ensureAdminAccounts, jsonResponse, publicUser, readSession } from './shared.mjs';

export default async function handler(request) {
  if (new URL(request.url).pathname !== '/api/admin/users') {
    return jsonResponse({ error: 'Ruta no encontrada.' }, 404);
  }
  if (request.method !== 'GET') return jsonResponse({ error: 'Método no permitido.' }, 405);

  const session = await readSession(request);
  if (!session) return jsonResponse({ error: 'Inicia sesión para continuar.' }, 401);

  try {
    await ensureAdminAccounts();
    const rows = await db.sql`
      SELECT id, username, role, is_active, created_at, last_login_at
      FROM admins
      ORDER BY created_at ASC
    `;
    return jsonResponse({ users: rows.map(publicUser) });
  } catch (error) {
    console.error('Menumi admin request failed:', error.message);
    return jsonResponse({ error: 'No fue posible consultar las cuentas.' }, 500);
  }
}

export const config = {
  path: '/api/admin/*',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 60, windowSize: 60 },
};
